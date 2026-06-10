import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, Info, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { TipoCanal } from '../../types'

interface DinRow {
  id: string
  tipo: TipoCanal
  objetivo: string | null
  productos: string | null
  condicion: string | null
  botellas_facturadas: number | null
  botellas_sin_cargo: number | null
  estimacion_manual: boolean
  figuritas:
    | {
        nombre: string
        proveedores:
          | { nombre: string; pagina_num: number | null }
          | { nombre: string; pagina_num: number | null }[]
          | null
      }
    | {
        nombre: string
        proveedores:
          | { nombre: string; pagina_num: number | null }
          | { nombre: string; pagina_num: number | null }[]
          | null
      }[]
    | null
}

const uno = <T,>(x: T | T[] | null | undefined): T | null =>
  Array.isArray(x) ? (x[0] ?? null) : (x ?? null)

const numInput =
  'w-16 rounded-md border bg-morado/50 px-2 py-1.5 text-center text-sm text-crema outline-none focus:border-naranja focus:ring-2 focus:ring-naranja/30'

function EstimacionRow({ d }: { d: DinRow }) {
  const fig = uno(d.figuritas)
  const prov = uno(fig?.proveedores ?? null)

  const [fact, setFact] = useState(
    d.botellas_facturadas != null ? String(d.botellas_facturadas) : '',
  )
  const [sin, setSin] = useState(
    d.botellas_sin_cargo != null ? String(d.botellas_sin_cargo) : '',
  )
  const [orig, setOrig] = useState({
    fact: d.botellas_facturadas,
    sin: d.botellas_sin_cargo,
  })
  const [estado, setEstado] = useState<'idle' | 'guardando' | 'ok' | 'error'>('idle')

  async function guardar(campo: 'botellas_facturadas' | 'botellas_sin_cargo', valor: string) {
    const num = valor === '' ? null : Number(valor)
    const previo = campo === 'botellas_facturadas' ? orig.fact : orig.sin
    if (num === previo) return // sin cambios reales

    setEstado('guardando')
    const { error } = await supabase
      .from('dinamicas')
      .update({ [campo]: num })
      .eq('id', d.id)
    if (error) {
      setEstado('error')
      return
    }
    setOrig((o) => ({
      ...o,
      [campo === 'botellas_facturadas' ? 'fact' : 'sin']: num,
    }))
    setEstado('ok')
    window.setTimeout(() => setEstado('idle'), 1500)
  }

  return (
    <tr
      className={`border-t border-dorado/10 align-top ${
        d.estimacion_manual ? 'bg-naranja/10' : 'hover:bg-vino/20'
      }`}
    >
      <td className="px-3 py-2 text-crema/80">{prov?.nombre ?? '—'}</td>
      <td className="px-3 py-2 font-medium text-crema">
        <div className="flex items-center gap-1.5">
          {fig?.nombre ?? '—'}
          {d.estimacion_manual && (
            <span className="rounded-full bg-naranja/30 px-1.5 py-0.5 text-[10px] font-bold uppercase text-naranja">
              revisar
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2">
        <span className="rounded-full bg-azul/30 px-2 py-0.5 text-xs text-crema/80">
          {d.tipo}
        </span>
      </td>
      <td className="px-3 py-2 text-xs text-crema/60">{d.objetivo ?? '—'}</td>
      <td className="px-3 py-2 text-xs text-crema/60">{d.productos ?? '—'}</td>
      <td className="px-3 py-2 text-xs text-crema/70">{d.condicion ?? '—'}</td>
      <td className="px-3 py-2">
        <input
          type="number"
          min={0}
          value={fact}
          onChange={(e) => setFact(e.target.value)}
          onBlur={(e) => guardar('botellas_facturadas', e.target.value)}
          className={`${numInput} ${d.estimacion_manual ? 'border-naranja/50' : 'border-dorado/30'}`}
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          min={0}
          value={sin}
          onChange={(e) => setSin(e.target.value)}
          onBlur={(e) => guardar('botellas_sin_cargo', e.target.value)}
          className={`${numInput} ${d.estimacion_manual ? 'border-naranja/50' : 'border-dorado/30'}`}
        />
      </td>
      <td className="px-2 py-2 text-center">
        {estado === 'guardando' && (
          <Loader2 className="mx-auto animate-spin text-crema/50" size={15} />
        )}
        {estado === 'ok' && <Check className="mx-auto text-dorado" size={15} />}
        {estado === 'error' && (
          <AlertTriangle className="mx-auto text-naranja" size={15} />
        )}
      </td>
    </tr>
  )
}

export function EstimacionesTab() {
  const [filas, setFilas] = useState<DinRow[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    ;(async () => {
      const { data, error } = await supabase
        .from('dinamicas')
        .select(
          'id, tipo, objetivo, productos, condicion, botellas_facturadas, botellas_sin_cargo, estimacion_manual, figuritas ( nombre, proveedores ( nombre, pagina_num ) )',
        )
      if (!activo) return
      if (error) setError(error.message)
      else setFilas((data ?? []) as unknown as DinRow[])
      setCargando(false)
    })()
    return () => {
      activo = false
    }
  }, [])

  const ordenadas = useMemo(() => {
    const arr = [...filas]
    arr.sort((a, b) => {
      const pa = uno(uno(a.figuritas)?.proveedores ?? null)?.pagina_num ?? 999
      const pb = uno(uno(b.figuritas)?.proveedores ?? null)?.pagina_num ?? 999
      if (pa !== pb) return pa - pb
      const na = uno(a.figuritas)?.nombre ?? ''
      const nb = uno(b.figuritas)?.nombre ?? ''
      if (na !== nb) return na.localeCompare(nb)
      return a.tipo.localeCompare(b.tipo)
    })
    return arr
  }, [filas])

  const aRevisar = filas.filter((d) => d.estimacion_manual).length

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl text-crema">
          Estimaciones de volumen{' '}
          <span className="text-sm font-normal text-crema/50">
            ({filas.length})
          </span>
        </h2>
        {aRevisar > 0 && (
          <span className="rounded-full bg-naranja/20 px-3 py-1 text-xs font-semibold text-naranja">
            {aRevisar} a revisar
          </span>
        )}
      </div>

      {/* Aclaración */}
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-dorado/25 bg-vino/20 px-4 py-3 text-sm text-crema/80">
        <Info className="mt-0.5 shrink-0 text-dorado" size={16} />
        <p>
          <span className="font-semibold text-crema">Botellas sin cargo</span> = solo
          botellas de la marca (no contar diluyentes, jugos ni regalos de otras
          marcas). Las filas marcadas{' '}
          <span className="font-semibold text-naranja">“revisar”</span> son
          estimaciones tentativas que conviene ajustar a mano. Los cambios se guardan
          al salir de cada celda.
        </p>
      </div>

      {cargando && (
        <div className="flex items-center gap-2 py-8 text-crema/60">
          <Loader2 className="animate-spin" size={18} /> Cargando…
        </div>
      )}
      {error && (
        <p className="flex items-center gap-2 text-sm text-naranja">
          <AlertTriangle size={16} /> {error}
        </p>
      )}

      {!cargando && !error && (
        <div className="overflow-x-auto rounded-xl border border-dorado/15">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-vino/40 text-xs uppercase tracking-wide text-crema/60">
              <tr>
                <th className="px-3 py-2">Proveedor</th>
                <th className="px-3 py-2">Figurita</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Objetivo</th>
                <th className="px-3 py-2">Productos</th>
                <th className="px-3 py-2">Condición</th>
                <th className="px-3 py-2">Facturadas</th>
                <th className="px-3 py-2">Sin cargo</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((d) => (
                <EstimacionRow key={d.id} d={d} />
              ))}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-crema/50">
                    No hay dinámicas cargadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
