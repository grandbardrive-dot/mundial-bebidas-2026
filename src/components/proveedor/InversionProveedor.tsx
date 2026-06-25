import { useEffect, useMemo, useState } from 'react'
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { AlertTriangle, Gift, Info, Loader2, PiggyBank } from 'lucide-react'
import { supabaseAuth } from '../../lib/supabaseAuth'
import type { CategoriaGasto, GastoProyecto } from '../../types'

const C = { dorado: '#CBA86A', azulClaro: '#9DB8DC', azulMedio: '#3C5C8A', crema: '#F2E8D5', tip: '#16335E' }
const money = (n: number) =>
  '$' + (n ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })

const CAT_LABEL: Record<CategoriaGasto, string> = {
  impresion: 'Impresión',
  premio_general: 'Premios generales',
  otro: 'Otros',
}
const CAT_COLOR: Record<CategoriaGasto, string> = {
  impresion: C.dorado,
  premio_general: C.azulClaro,
  otro: C.azulMedio,
}

interface PremioRow {
  id: string
  nombre_premio: string
  imagen_url: string | null
  stock_inicial: number | null
  stock_disponible: number | null
}

export function InversionProveedor() {
  const [gastos, setGastos] = useState<GastoProyecto[] | null>(null)
  const [premios, setPremios] = useState<PremioRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    ;(async () => {
      const [gRes, pRes] = await Promise.all([
        supabaseAuth
          .from('gastos_proyecto')
          .select('id, concepto, monto, categoria, created_at'),
        supabaseAuth
          .from('premios_proveedor_semana')
          .select('id, nombre_premio, imagen_url, stock_inicial, stock_disponible'),
      ])
      if (!activo) return
      if (gRes.error) {
        setError(gRes.error.message)
        return
      }
      setGastos((gRes.data ?? []) as GastoProyecto[])
      if (!pRes.error) setPremios((pRes.data ?? []) as PremioRow[])
    })()
    return () => {
      activo = false
    }
  }, [])

  const calc = useMemo(() => {
    if (!gastos) return null
    const total = gastos.reduce((a, g) => a + (g.monto ?? 0), 0)
    const tuParte = total / 7

    // desglose por categoría
    const porCat = new Map<CategoriaGasto, GastoProyecto[]>()
    for (const g of gastos) {
      if (!porCat.has(g.categoria)) porCat.set(g.categoria, [])
      porCat.get(g.categoria)!.push(g)
    }
    const pieData = [...porCat.entries()].map(([cat, items]) => ({
      name: CAT_LABEL[cat],
      value: items.reduce((a, g) => a + (g.monto ?? 0), 0),
      color: CAT_COLOR[cat],
    }))

    // Premios de la marca: cargados (stock_inicial) y entregados (inicial - disponible)
    const cargados = premios.map((p) => ({
      nombre: p.nombre_premio,
      foto: p.imagen_url,
      cantidad: p.stock_inicial ?? 0,
    }))
    const entregados = premios
      .map((p) => ({
        nombre: p.nombre_premio,
        cantidad: (p.stock_inicial ?? 0) - (p.stock_disponible ?? 0),
      }))
      .filter((p) => p.cantidad > 0)

    return {
      total,
      tuParte,
      porCat: [...porCat.entries()],
      pieData,
      cargados,
      entregados,
      tienePremios: premios.length > 0,
    }
  }, [gastos, premios])

  return (
    <section className="rounded-2xl border border-dorado/25 bg-white/5 p-5">
      <div className="mb-4 flex items-center gap-2">
        <PiggyBank className="text-dorado" size={20} />
        <h2 className="font-display text-2xl text-crema">Inversión del proyecto</h2>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-naranja/40 bg-naranja/10 px-4 py-3 text-sm text-crema/80">
          <AlertTriangle className="shrink-0 text-naranja" size={16} /> {error}
        </div>
      )}
      {!gastos && !error && (
        <div className="flex items-center gap-2 py-6 text-crema/60">
          <Loader2 className="animate-spin" size={18} /> Cargando…
        </div>
      )}

      {calc && (
        <>
          {/* Tu parte */}
          <div className="grid gap-4 sm:grid-cols-[260px_1fr]">
            <div className="rounded-2xl border-2 border-dorado bg-dorado/10 p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-crema/70">
                Tu parte
              </p>
              <p className="mt-1 font-display text-4xl text-dorado">
                {money(calc.tuParte)}
              </p>
              <p className="mt-2 text-xs text-crema/60">
                = gasto compartido ÷ 7
              </p>
            </div>
            <div className="flex flex-col justify-center rounded-2xl border border-dorado/20 bg-white/5 p-5">
              <p className="text-sm text-crema/80">
                Gasto total compartido del proyecto:{' '}
                <span className="font-display text-xl text-crema">
                  {money(calc.total)}
                </span>
              </p>
              <p className="mt-1 text-xs text-crema/55">
                Se divide en partes iguales entre los 6 proveedores y GrandBar (÷7).
              </p>
            </div>
          </div>

          {/* Desglose + torta */}
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_280px]">
            <div className="rounded-2xl border border-dorado/20 bg-white/5 p-4">
              <h3 className="mb-2 font-display text-lg text-crema">
                Desglose de gastos compartidos
              </h3>
              {calc.porCat.length === 0 && (
                <p className="py-4 text-sm text-crema/50">
                  Todavía no hay gastos cargados.
                </p>
              )}
              {calc.porCat.map(([cat, items]) => (
                <div key={cat} className="mb-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-dorado">
                    {CAT_LABEL[cat]}
                  </p>
                  <ul className="space-y-1">
                    {items.map((g) => (
                      <li
                        key={g.id}
                        className="flex justify-between gap-3 text-sm text-crema/80"
                      >
                        <span className="truncate">{g.concepto}</span>
                        <span className="shrink-0">{money(g.monto)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {calc.pieData.length > 0 && (
              <div className="rounded-2xl border border-dorado/20 bg-white/5 p-4">
                <h3 className="mb-2 font-display text-lg text-crema">Por categoría</h3>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={calc.pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={72}
                        paddingAngle={2}
                      >
                        {calc.pieData.map((d) => (
                          <Cell key={d.name} fill={d.color} stroke={C.tip} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) => money(Number(v))}
                        contentStyle={{
                          background: C.tip,
                          border: `1px solid ${C.dorado}`,
                          borderRadius: 8,
                          color: C.crema,
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 12 }}
                        formatter={(v) => <span style={{ color: C.crema }}>{v}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Premios de la marca (aparte, NO se dividen) */}
          <div className="mt-5 rounded-2xl border border-azul/40 bg-white/5 p-4">
            <h3 className="font-display text-lg text-crema">Premios de tu marca</h3>
            <p className="mb-4 mt-1 flex items-start gap-1.5 text-xs text-crema/60">
              <Info size={14} className="mt-0.5 shrink-0 text-dorado" />
              Estos premios los aportó tu marca y <span className="font-semibold">NO</span>{' '}
              se dividen entre los 7.
            </p>

            {!calc.tienePremios ? (
              <p className="text-sm text-crema/50">
                Tu marca todavía no tiene premios cargados.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Cargados */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-dorado">
                    Premios cargados
                  </p>
                  <ul className="space-y-2">
                    {calc.cargados.map((p, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dorado/20 bg-morado">
                          {p.foto ? (
                            <img
                              src={p.foto}
                              alt={p.nombre}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Gift className="text-crema/30" size={16} />
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-crema/80">
                          {p.nombre}
                        </span>
                        <span className="shrink-0 text-crema/60">{p.cantidad}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Entregados */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-dorado">
                    Premios entregados
                  </p>
                  {calc.entregados.length === 0 ? (
                    <p className="text-sm text-crema/45">Todavía no se entregó ninguno.</p>
                  ) : (
                    <ul className="space-y-2">
                      {calc.entregados.map((p, i) => (
                        <li
                          key={i}
                          className="flex justify-between gap-3 text-sm text-crema/80"
                        >
                          <span className="min-w-0 truncate">{p.nombre}</span>
                          <span className="shrink-0 text-dorado">
                            {p.cantidad} entregado{p.cantidad === 1 ? '' : 's'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}
