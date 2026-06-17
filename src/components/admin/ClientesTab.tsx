import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, Loader2, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { EstadoReclamo } from '../../types'

interface CliRow {
  id: string
  nombre_local: string
  contacto: string | null
  telefono: string | null
  sucursal: string | null
  created_at: string
  canales: { nombre: string } | { nombre: string }[] | null
  vendedores: { nombre: string } | { nombre: string }[] | null
}
interface ColRow {
  cliente_id: string
  figurita_id: string
  tiene: boolean
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

const PRIORIDAD: Record<EstadoReclamo, number> = {
  confirmado: 3,
  reservado: 2,
  rechazado: 1,
}
const colorEstado: Record<EstadoReclamo, string> = {
  reservado: 'bg-azul/30 text-crema/80',
  confirmado: 'bg-dorado/20 text-dorado',
  rechazado: 'bg-naranja/20 text-naranja',
}

interface Calc {
  id: string
  nombre_local: string
  contacto: string
  telefono: string
  sucursal: string
  canal: string
  vendedor: string
  created_at: string
  pct: number
  count: number
  total: number
  reclamo: { nombre: string; estado: EstadoReclamo } | null
}

type SortCol = 'nombre' | 'fecha'

export function ClientesTab() {
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clientes, setClientes] = useState<CliRow[]>([])
  const [coleccion, setColeccion] = useState<ColRow[]>([])
  const [reclamos, setReclamos] = useState<ReclamoRow[]>([])
  const [totalFig, setTotalFig] = useState(30)

  const [sel, setSel] = useState<Set<string>>(new Set())
  const [sortCol, setSortCol] = useState<SortCol>('nombre')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const [modal, setModal] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [resultado, setResultado] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    const [cliRes, colRes, reclRes, figRes] = await Promise.all([
      supabase
        .from('clientes')
        .select(
          'id, nombre_local, contacto, telefono, sucursal, created_at, canales ( nombre ), vendedores ( nombre )',
        ),
      supabase.from('coleccion_cliente').select('cliente_id, figurita_id, tiene'),
      supabase
        .from('reclamos_premio')
        .select('cliente_id, estado, premios_proveedor_semana ( nombre_premio )'),
      supabase.from('figuritas').select('id', { count: 'exact', head: true }),
    ])
    const err = cliRes.error || colRes.error || reclRes.error
    if (err) {
      setError(err.message)
      setCargando(false)
      return
    }
    setClientes((cliRes.data ?? []) as unknown as CliRow[])
    setColeccion((colRes.data ?? []) as ColRow[])
    setReclamos((reclRes.data ?? []) as unknown as ReclamoRow[])
    if (figRes.count != null && figRes.count > 0) setTotalFig(figRes.count)
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const filas = useMemo(() => {
    const tienePorCliente = new Map<string, number>()
    for (const c of coleccion) {
      if (!c.tiene) continue
      tienePorCliente.set(c.cliente_id, (tienePorCliente.get(c.cliente_id) ?? 0) + 1)
    }
    const reclamoPorCliente = new Map<string, { nombre: string; estado: EstadoReclamo }>()
    for (const r of reclamos) {
      const prev = reclamoPorCliente.get(r.cliente_id)
      if (prev && PRIORIDAD[prev.estado] >= PRIORIDAD[r.estado]) continue
      reclamoPorCliente.set(r.cliente_id, {
        nombre: uno(r.premios_proveedor_semana)?.nombre_premio ?? '—',
        estado: r.estado,
      })
    }
    const arr: Calc[] = clientes.map((c) => {
      const count = tienePorCliente.get(c.id) ?? 0
      return {
        id: c.id,
        nombre_local: c.nombre_local,
        contacto: c.contacto ?? '—',
        telefono: c.telefono ?? '—',
        sucursal: c.sucursal ?? '—',
        canal: uno(c.canales)?.nombre ?? '—',
        vendedor: uno(c.vendedores)?.nombre ?? '—',
        created_at: c.created_at,
        count,
        total: totalFig,
        pct: totalFig > 0 ? Math.round((count / totalFig) * 100) : 0,
        reclamo: reclamoPorCliente.get(c.id) ?? null,
      }
    })
    arr.sort((a, b) => {
      const d =
        sortCol === 'nombre'
          ? a.nombre_local.localeCompare(b.nombre_local)
          : Date.parse(a.created_at) - Date.parse(b.created_at)
      return sortDir === 'asc' ? d : -d
    })
    return arr
  }, [clientes, coleccion, reclamos, totalFig, sortCol, sortDir])

  const nombrePorId = useMemo(
    () => new Map(filas.map((f) => [f.id, f.nombre_local])),
    [filas],
  )

  const todosMarcados = filas.length > 0 && filas.every((f) => sel.has(f.id))

  function toggleUno(id: string) {
    setSel((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }
  function toggleTodos() {
    setSel(todosMarcados ? new Set() : new Set(filas.map((f) => f.id)))
  }
  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  async function eliminar() {
    setEliminando(true)
    let ok = 0
    const fallidos: string[] = []
    for (const id of sel) {
      try {
        // Recolectar fotos para borrarlas del bucket (best-effort)
        const { data: recs } = await supabase
          .from('reclamos_premio')
          .select('foto_pagina_url')
          .eq('cliente_id', id)
        const paths = ((recs ?? []) as { foto_pagina_url: string | null }[])
          .map((r) => r.foto_pagina_url)
          .filter((p): p is string => !!p && !/^https?:\/\//.test(p))

        const { error } = await supabase.rpc('eliminar_cliente', {
          p_cliente_id: id,
        })
        if (error) throw error

        if (paths.length) {
          try {
            await supabase.storage.from('paginas-completadas').remove(paths)
          } catch {
            /* borrado de fotos best-effort */
          }
        }
        ok++
      } catch {
        fallidos.push(nombrePorId.get(id) ?? id)
      }
    }
    setEliminando(false)
    setModal(false)
    setSel(new Set())
    setResultado(
      `Se eliminaron ${ok} cliente${ok === 1 ? '' : 's'}.` +
        (fallidos.length ? ` Fallaron: ${fallidos.join(', ')}.` : ''),
    )
    window.setTimeout(() => setResultado(null), 6000)
    cargar()
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl text-crema">
          Clientes{' '}
          <span className="text-sm font-normal text-crema/50">({filas.length})</span>
        </h2>
        <button
          type="button"
          disabled={sel.size === 0}
          onClick={() => setModal(true)}
          className="inline-flex items-center gap-2 rounded-full bg-naranja px-4 py-2 text-sm font-semibold text-crema transition hover:bg-[#e0633a] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 size={15} />
          {sel.size === 0
            ? 'Eliminar seleccionados'
            : `Eliminar ${sel.size} cliente${sel.size === 1 ? '' : 's'}`}
        </button>
      </div>

      {resultado && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-dorado/30 bg-dorado/10 px-4 py-2 text-sm text-crema">
          <Check size={15} className="text-dorado" /> {resultado}
        </div>
      )}

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
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-vino/40 text-xs uppercase tracking-wide text-crema/60">
              <tr>
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={todosMarcados}
                    onChange={toggleTodos}
                    aria-label="Seleccionar todos"
                  />
                </th>
                <Th label="Local" onClick={() => toggleSort('nombre')} active={sortCol === 'nombre'} dir={sortDir} />
                <th className="px-3 py-2">Contacto</th>
                <th className="px-3 py-2">Teléfono</th>
                <th className="px-3 py-2">Sucursal</th>
                <th className="px-3 py-2">Canal</th>
                <th className="px-3 py-2">Vendedor</th>
                <th className="px-3 py-2">Avance</th>
                <th className="px-3 py-2">Premio</th>
                <Th label="Alta" onClick={() => toggleSort('fecha')} active={sortCol === 'fecha'} dir={sortDir} />
              </tr>
            </thead>
            <tbody>
              {filas.map((c) => (
                <tr
                  key={c.id}
                  className={`border-t border-dorado/10 ${
                    sel.has(c.id) ? 'bg-naranja/10' : 'hover:bg-vino/20'
                  }`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={sel.has(c.id)}
                      onChange={() => toggleUno(c.id)}
                      aria-label={`Seleccionar ${c.nombre_local}`}
                    />
                  </td>
                  <td className="px-3 py-2 font-medium text-crema">{c.nombre_local}</td>
                  <td className="px-3 py-2 text-crema/70">{c.contacto}</td>
                  <td className="px-3 py-2 text-crema/70">{c.telefono}</td>
                  <td className="px-3 py-2 text-crema/70">{c.sucursal}</td>
                  <td className="px-3 py-2 text-crema/70">{c.canal}</td>
                  <td className="px-3 py-2 text-crema/70">{c.vendedor}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-morado/70">
                        <div
                          className="h-full rounded-full bg-dorado"
                          style={{ width: `${c.pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-crema/80">
                        {c.count}/{c.total}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {c.reclamo ? (
                      <span className="flex flex-col">
                        <span className="text-crema/80">{c.reclamo.nombre}</span>
                        <span
                          className={`mt-0.5 w-fit rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${colorEstado[c.reclamo.estado]}`}
                        >
                          {c.reclamo.estado}
                        </span>
                      </span>
                    ) : (
                      <span className="text-crema/35">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-crema/55">
                    {new Date(c.created_at).toLocaleDateString('es-AR')}
                  </td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-center text-crema/50">
                    No hay clientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de confirmación */}
      {modal && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !eliminando && setModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-naranja/40 bg-morado p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center gap-2 text-naranja">
              <AlertTriangle size={20} />
              <h3 className="font-display text-xl text-crema">Eliminar clientes</h3>
            </div>
            <p className="text-sm text-crema/80">
              Esta acción es <span className="font-semibold text-naranja">irreversible</span>.
              ¿Eliminar estos {sel.size} cliente{sel.size === 1 ? '' : 's'}?
            </p>
            <ul className="my-3 max-h-48 list-disc overflow-y-auto rounded-lg border border-dorado/15 bg-vino/20 px-6 py-3 text-sm text-crema/80">
              {[...sel].map((id) => (
                <li key={id}>{nombrePorId.get(id) ?? id}</li>
              ))}
            </ul>
            <p className="text-xs text-crema/50">
              Se devuelve el stock de sus reclamos vigentes y se borran su colección,
              reclamos y fotos.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={eliminando}
                onClick={() => setModal(false)}
                className="inline-flex items-center gap-1.5 rounded-full border border-crema/30 px-4 py-2 text-sm text-crema/80 hover:bg-white/5 disabled:opacity-50"
              >
                <X size={15} /> Cancelar
              </button>
              <button
                type="button"
                disabled={eliminando}
                onClick={eliminar}
                className="inline-flex items-center gap-1.5 rounded-full bg-naranja px-5 py-2 text-sm font-semibold text-crema hover:bg-[#e0633a] disabled:opacity-60"
              >
                {eliminando ? (
                  <Loader2 className="animate-spin" size={15} />
                ) : (
                  <Trash2 size={15} />
                )}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
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
