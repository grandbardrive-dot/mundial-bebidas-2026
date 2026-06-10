import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertTriangle, Check, ChevronDown, Trophy, X } from 'lucide-react'
import { supabaseAuth } from '../../lib/supabaseAuth'
import type { TipoCanal } from '../../types'

// Paleta corporativa del panel de proveedores
const C = {
  dorado: '#CBA86A',
  azulClaro: '#9DB8DC',
  azulMedio: '#3C5C8A',
  crema: '#F2E8D5',
  panel: '#16335E',
}

type EstadoReclamo = 'reservado' | 'confirmado' | 'rechazado'

interface Figu {
  id: string
  nombre: string
  orden: number | null
  es_dorada: boolean
}
interface ColRow {
  cliente_id: string
  figurita_id: string
  tiene: boolean
}
interface CliRow {
  id: string
  nombre_local: string
  canales: { nombre: string; tipo: TipoCanal } | { nombre: string; tipo: TipoCanal }[] | null
  vendedores: { nombre: string } | { nombre: string }[] | null
}
interface BenRow {
  botellas_facturadas: number | null
  botellas_sin_cargo: number | null
  dinamicas:
    | { figurita_id: string; tipo: TipoCanal }
    | { figurita_id: string; tipo: TipoCanal }[]
    | null
}
interface ReclamoRow {
  cliente_id: string
  estado: EstadoReclamo
  premios_proveedor_semana:
    | { nombre_premio: string }
    | { nombre_premio: string }[]
    | null
}

const uno = <T,>(x: T | T[] | null | undefined): T | null =>
  Array.isArray(x) ? (x[0] ?? null) : (x ?? null)

interface ClienteCalc {
  id: string
  nombre_local: string
  canal: string
  canalTipo: TipoCanal | null
  vendedor: string
  tieneSet: Set<string>
  count: number
  pct: number
  reclamo: { nombre: string; estado: EstadoReclamo } | null
}

interface Props {
  // Las queries se filtran por RLS a la marca del proveedor logueado, así que el
  // componente no necesita el id/nombre para scopear; se reciben por consistencia.
  proveedorId: string
  nombre: string
}

type Carga =
  | { status: 'cargando' }
  | {
      status: 'ok'
      figuritas: Figu[]
      coleccion: ColRow[]
      clientes: CliRow[]
      reclamos: ReclamoRow[]
      beneficios: BenRow[]
    }
  | { status: 'error'; mensaje: string }

const PRIORIDAD: Record<EstadoReclamo, number> = {
  confirmado: 3,
  reservado: 2,
  rechazado: 1,
}

type SortCol = 'local' | 'count' | 'pct'

export function Tablero(_props: Props) {
  const [carga, setCarga] = useState<Carga>({ status: 'cargando' })
  const [expandido, setExpandido] = useState<string | null>(null)
  const [sortCol, setSortCol] = useState<SortCol>('pct')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    let activo = true
    ;(async () => {
      setCarga({ status: 'cargando' })
      // Todas estas queries vienen filtradas por RLS a la marca del proveedor.
      const [figRes, colRes, cliRes, reclRes, dinRes] = await Promise.all([
        supabaseAuth
          .from('figuritas')
          .select('id, nombre, orden, es_dorada')
          .order('orden', { ascending: true }),
        supabaseAuth.from('coleccion_cliente').select('cliente_id, figurita_id, tiene'),
        supabaseAuth
          .from('clientes')
          .select('id, nombre_local, canales ( nombre, tipo ), vendedores ( nombre )'),
        supabaseAuth
          .from('reclamos_premio')
          .select('cliente_id, estado, premios_proveedor_semana ( nombre_premio )'),
        supabaseAuth
          .from('dinamica_beneficios')
          .select('botellas_facturadas, botellas_sin_cargo, dinamicas ( figurita_id, tipo )'),
      ])

      if (!activo) return
      const err =
        figRes.error || colRes.error || cliRes.error || reclRes.error || dinRes.error
      if (err) {
        // Log claro para diagnóstico (RLS, columnas, etc.)
        console.error('[Tablero proveedor] error cargando datos:', {
          figuritas: figRes.error?.message,
          coleccion: colRes.error?.message,
          clientes: cliRes.error?.message,
          reclamos: reclRes.error?.message,
          beneficios: dinRes.error?.message,
        })
        setCarga({ status: 'error', mensaje: err.message })
        return
      }
      setCarga({
        status: 'ok',
        figuritas: (figRes.data ?? []) as Figu[],
        coleccion: (colRes.data ?? []) as ColRow[],
        clientes: (cliRes.data ?? []) as unknown as CliRow[],
        reclamos: (reclRes.data ?? []) as unknown as ReclamoRow[],
        beneficios: (dinRes.data ?? []) as unknown as BenRow[],
      })
    })()
    return () => {
      activo = false
    }
  }, [])

  const datos = useMemo(() => {
    if (carga.status !== 'ok') return null
    const { figuritas, coleccion, clientes, reclamos, beneficios } = carga
    const total = figuritas.length || 5

    // tiene=true por cliente
    const tienePorCliente = new Map<string, Set<string>>()
    for (const c of coleccion) {
      if (!c.tiene) continue
      if (!tienePorCliente.has(c.cliente_id))
        tienePorCliente.set(c.cliente_id, new Set())
      tienePorCliente.get(c.cliente_id)!.add(c.figurita_id)
    }

    // reclamo por cliente (priorizando confirmado > reservado > rechazado)
    const reclamoPorCliente = new Map<string, { nombre: string; estado: EstadoReclamo }>()
    for (const r of reclamos) {
      const prev = reclamoPorCliente.get(r.cliente_id)
      if (prev && PRIORIDAD[prev.estado] >= PRIORIDAD[r.estado]) continue
      reclamoPorCliente.set(r.cliente_id, {
        nombre: uno(r.premios_proveedor_semana)?.nombre_premio ?? '—',
        estado: r.estado,
      })
    }

    const clientesCalc: ClienteCalc[] = clientes.map((cl) => {
      const set = tienePorCliente.get(cl.id) ?? new Set<string>()
      const count = set.size
      return {
        id: cl.id,
        nombre_local: cl.nombre_local,
        canal: uno(cl.canales)?.nombre ?? '—',
        canalTipo: uno(cl.canales)?.tipo ?? null,
        vendedor: uno(cl.vendedores)?.nombre ?? '—',
        tieneSet: set,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
        reclamo: reclamoPorCliente.get(cl.id) ?? null,
      }
    })

    const conFig = clientesCalc.filter((c) => c.count >= 1)
    const completaron = clientesCalc.filter((c) => c.count === total).length
    const enProgreso = clientesCalc.filter((c) => c.count >= 1 && c.count < total).length
    const sinEmpezar = clientesCalc.filter((c) => c.count === 0).length
    const pctPromedio =
      conFig.length > 0
        ? Math.round(conFig.reduce((a, c) => a + c.pct, 0) / conFig.length)
        : 0

    const confirmados = reclamos.filter((r) => r.estado === 'confirmado').length
    const reservados = reclamos.filter((r) => r.estado === 'reservado').length

    // Barras: cuántos clientes tienen cada figurita
    const conteoPorFig = new Map<string, number>()
    for (const c of coleccion) {
      if (!c.tiene) continue
      conteoPorFig.set(c.figurita_id, (conteoPorFig.get(c.figurita_id) ?? 0) + 1)
    }
    const barData = figuritas.map((f) => ({
      nombre: f.nombre,
      clientes: conteoPorFig.get(f.id) ?? 0,
    }))

    const pieData = [
      { name: 'Completada (5/5)', value: completaron, color: C.dorado },
      { name: 'En progreso (1-4)', value: enProgreso, color: C.azulClaro },
      { name: 'Sin empezar (0)', value: sinEmpezar, color: C.azulMedio },
    ]

    // ---- Volumen estimado de la marca (modelo dinamica_beneficios) ----
    // Botellas de una dinámica = SUMA de las botellas de sus beneficios.
    // Por cada figurita que un cliente TIENE, se asume cumplida la dinámica de SU
    // tipo de canal (ON/OFF) -> se suman esas botellas.
    const dinaMap = new Map<string, { fact: number; sin: number }>()
    for (const b of beneficios) {
      const d = uno(b.dinamicas)
      if (!d) continue
      const key = `${d.figurita_id}|${d.tipo}`
      const prev = dinaMap.get(key) ?? { fact: 0, sin: 0 }
      prev.fact += b.botellas_facturadas ?? 0
      prev.sin += b.botellas_sin_cargo ?? 0
      dinaMap.set(key, prev)
    }
    let volFacturadas = 0
    let volSinCargo = 0
    for (const c of clientesCalc) {
      if (!c.canalTipo) continue
      for (const figId of c.tieneSet) {
        const dv = dinaMap.get(`${figId}|${c.canalTipo}`)
        if (dv) {
          volFacturadas += dv.fact
          volSinCargo += dv.sin
        }
      }
    }
    const hayEstimacion = beneficios.length > 0

    return {
      total,
      figuritas,
      clientesCalc,
      nConFig: conFig.length,
      completaron,
      pctPromedio,
      confirmados,
      reservados,
      barData,
      pieData,
      volFacturadas,
      volSinCargo,
      hayEstimacion,
    }
  }, [carga])

  const ranking = useMemo(() => {
    if (!datos) return []
    const arr = [...datos.clientesCalc]
    arr.sort((a, b) => {
      let d = 0
      if (sortCol === 'local') d = a.nombre_local.localeCompare(b.nombre_local)
      else if (sortCol === 'count') d = a.count - b.count
      else d = a.pct - b.pct
      return sortDir === 'asc' ? d : -d
    })
    return arr
  }, [datos, sortCol, sortDir])

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortCol(col)
      setSortDir(col === 'local' ? 'asc' : 'desc')
    }
  }

  // -------------------- estados --------------------
  if (carga.status === 'cargando') return <TableroSkeleton />

  if (carga.status === 'error')
    return (
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-naranja/40 bg-naranja/10 px-5 py-4">
        <AlertTriangle className="mt-0.5 shrink-0 text-naranja" size={20} />
        <div className="text-sm text-crema/85">
          <p className="font-semibold text-crema">No pudimos cargar tus datos.</p>
          <p className="mt-1">{carga.mensaje}</p>
        </div>
      </div>
    )

  if (!datos || datos.clientesCalc.length === 0)
    return (
      <div className="mt-8 rounded-2xl border border-dorado/20 bg-white/5 px-5 py-12 text-center text-sm text-crema/60">
        Todavía no hay clientes con figuritas de tu marca.
      </div>
    )

  return (
    <div className="mt-8 space-y-8">
      {/* 1) TOTALES */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tarjeta label="Clientes con tu marca" valor={datos.nConFig} />
        <Tarjeta label="Avance promedio" valor={`${datos.pctPromedio}%`} />
        <Tarjeta label="Completaron (5/5)" valor={datos.completaron} acento />
        <Tarjeta
          label="Premios"
          valor={`${datos.confirmados} ✓ / ${datos.reservados} ⏳`}
          sub="entregados / pendientes"
        />
      </section>

      {/* 1b) VOLUMEN ESTIMADO */}
      <section>
        <h3 className="mb-3 font-display text-lg text-crema">
          Volumen estimado de tu marca
        </h3>
        {datos.hayEstimacion ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Tarjeta
                label="Botellas facturadas (est.)"
                valor={datos.volFacturadas.toLocaleString('es-AR')}
                acento
              />
              <Tarjeta
                label="Botellas sin cargo (est.)"
                valor={datos.volSinCargo.toLocaleString('es-AR')}
              />
            </div>
            <p className="mt-2 text-xs text-crema/45">
              Estimación: por cada figurita que un cliente tiene se asume cumplida la
              dinámica de su canal (ON/OFF). Sin cargo = solo botellas de tu marca.
            </p>
          </>
        ) : (
          <div className="rounded-2xl border border-dorado/20 bg-white/5 px-5 py-6 text-center text-sm text-crema/55">
            Todavía no hay estimaciones de volumen cargadas para tus dinámicas.
          </div>
        )}
      </section>

      {/* 2) GRÁFICOS */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-dorado/20 bg-white/5 p-4">
          <h3 className="mb-3 font-display text-lg text-crema">
            Clientes por figurita
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datos.barData} margin={{ top: 5, right: 8, bottom: 5, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(242,232,213,0.1)" />
                <XAxis
                  dataKey="nombre"
                  tick={{ fill: C.crema, fontSize: 11 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={50}
                />
                <YAxis allowDecimals={false} tick={{ fill: C.crema, fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: '#16335E',
                    border: `1px solid ${C.dorado}`,
                    borderRadius: 8,
                    color: C.crema,
                  }}
                  cursor={{ fill: 'rgba(203,168,106,0.08)' }}
                />
                <Bar dataKey="clientes" fill={C.dorado} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-dorado/20 bg-white/5 p-4">
          <h3 className="mb-3 font-display text-lg text-crema">
            Clientes por estado de página
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={datos.pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {datos.pieData.map((d) => (
                    <Cell key={d.name} fill={d.color} stroke="#16335E" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#16335E',
                    border: `1px solid ${C.dorado}`,
                    borderRadius: 8,
                    color: C.crema,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: C.crema }}
                  formatter={(v) => <span style={{ color: C.crema }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* 3) RANKING + 4) DETALLE */}
      <section>
        <h3 className="mb-3 font-display text-lg text-crema">Ranking de clientes</h3>
        <div className="overflow-x-auto rounded-2xl border border-dorado/15">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/10 text-xs uppercase tracking-wide text-crema/60">
              <tr>
                <Th label="Local" onClick={() => toggleSort('local')} active={sortCol === 'local'} dir={sortDir} />
                <th className="px-3 py-2">Canal</th>
                <th className="px-3 py-2">Vendedor</th>
                <Th label="Figuritas" onClick={() => toggleSort('count')} active={sortCol === 'count'} dir={sortDir} />
                <Th label="Avance" onClick={() => toggleSort('pct')} active={sortCol === 'pct'} dir={sortDir} />
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((c) => {
                const completo = c.count === datos.total && datos.total > 0
                const abierto = expandido === c.id
                return (
                  <Fragment key={c.id}>
                    <tr
                      onClick={() => setExpandido(abierto ? null : c.id)}
                      className={`cursor-pointer border-t border-dorado/10 transition hover:bg-white/5 ${
                        completo ? 'bg-dorado/5' : ''
                      }`}
                    >
                      <td className="px-3 py-2 font-medium text-crema">
                        <span className="flex items-center gap-1.5">
                          {completo && <Trophy size={13} className="text-dorado" />}
                          {c.nombre_local}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-crema/70">{c.canal}</td>
                      <td className="px-3 py-2 text-crema/70">{c.vendedor}</td>
                      <td className="px-3 py-2">
                        <span className={completo ? 'font-semibold text-dorado' : 'text-crema/80'}>
                          {c.count}/{datos.total}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${c.pct}%`,
                                background: completo ? C.dorado : C.azulClaro,
                              }}
                            />
                          </div>
                          <span className="text-xs text-crema/70">{c.pct}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-crema/50">
                        <ChevronDown
                          size={15}
                          className={`transition ${abierto ? 'rotate-180' : ''}`}
                        />
                      </td>
                    </tr>
                    {abierto && (
                      <tr className="border-t border-dorado/10 bg-white/5">
                        <td colSpan={6} className="px-3 py-4">
                          <DetalleCliente cliente={c} figuritas={datos.figuritas} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Tarjeta({
  label,
  valor,
  sub,
  acento,
}: {
  label: string
  valor: string | number
  sub?: string
  acento?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        acento ? 'border-dorado/50 bg-dorado/10' : 'border-dorado/20 bg-white/5'
      }`}
    >
      <p className="text-xs text-crema/60">{label}</p>
      <p className={`mt-1 font-display text-2xl ${acento ? 'text-dorado' : 'text-crema'}`}>
        {valor}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-crema/45">{sub}</p>}
    </div>
  )
}

function Th({
  label,
  onClick,
  active,
  dir,
}: {
  label: string
  onClick: () => void
  active: boolean
  dir: 'asc' | 'desc'
}) {
  return (
    <th className="px-3 py-2">
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 ${active ? 'text-dorado' : 'hover:text-crema/90'}`}
      >
        {label}
        {active && <span className="text-[10px]">{dir === 'asc' ? '▲' : '▼'}</span>}
      </button>
    </th>
  )
}

function DetalleCliente({
  cliente,
  figuritas,
}: {
  cliente: ClienteCalc
  figuritas: Figu[]
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-crema/55">
          Figuritas de tu marca
        </p>
        <div className="flex flex-wrap gap-2">
          {figuritas.map((f) => {
            const tiene = cliente.tieneSet.has(f.id)
            return (
              <span
                key={f.id}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
                  tiene
                    ? 'bg-dorado/20 text-dorado'
                    : 'bg-white/10 text-crema/40 line-through'
                }`}
              >
                {tiene ? <Check size={12} /> : <X size={12} />}
                {f.nombre}
              </span>
            )
          })}
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-crema/55">
          Premio
        </p>
        {cliente.reclamo ? (
          <p className="text-sm text-crema/80">
            {cliente.reclamo.nombre}{' '}
            <span
              className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                cliente.reclamo.estado === 'confirmado'
                  ? 'bg-dorado/20 text-dorado'
                  : cliente.reclamo.estado === 'reservado'
                    ? 'bg-azul/30 text-crema'
                    : 'bg-naranja/20 text-naranja'
              }`}
            >
              {cliente.reclamo.estado}
            </span>
          </p>
        ) : (
          <p className="text-sm text-crema/45">Sin reclamo.</p>
        )}
      </div>
    </div>
  )
}

function TableroSkeleton() {
  return (
    <div className="mt-8 space-y-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-dorado/15 bg-white/5 p-4">
            <div className="h-3 w-24 animate-pulse rounded bg-crema/10" />
            <div className="mt-3 h-7 w-16 animate-pulse rounded bg-crema/10" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-2xl border border-dorado/15 bg-white/5 p-4">
            <div className="mb-3 h-5 w-40 animate-pulse rounded bg-crema/10" />
            <div className="h-56 w-full animate-pulse rounded bg-crema/5" />
          </div>
        ))}
      </div>
      <div className="h-40 w-full animate-pulse rounded-2xl bg-crema/5" />
    </div>
  )
}
