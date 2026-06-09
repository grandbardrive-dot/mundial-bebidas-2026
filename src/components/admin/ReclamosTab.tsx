import { useEffect, useState } from 'react'
import { AlertTriangle, Check, ImageOff, Loader2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { EstadoReclamo } from '../../types'

interface ReclamoRow {
  id: string
  premio_id: string | null
  estado: EstadoReclamo
  created_at: string
  foto_pagina_url: string | null
  clientes: { nombre_local: string } | { nombre_local: string }[] | null
  premios_proveedor_semana:
    | {
        nombre_premio: string
        proveedores: { nombre: string } | { nombre: string }[] | null
      }
    | {
        nombre_premio: string
        proveedores: { nombre: string } | { nombre: string }[] | null
      }[]
    | null
}

const uno = <T,>(x: T | T[] | null): T | null =>
  Array.isArray(x) ? (x[0] ?? null) : x

const FILTROS: { id: EstadoReclamo | 'todos'; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'reservado', label: 'Reservados' },
  { id: 'confirmado', label: 'Confirmados' },
  { id: 'rechazado', label: 'Rechazados' },
]

const colorEstado: Record<EstadoReclamo, string> = {
  reservado: 'bg-azul/30 text-crema/80',
  confirmado: 'bg-dorado/20 text-dorado',
  rechazado: 'bg-naranja/20 text-naranja',
}

/** Muestra la foto de la página firmando una URL temporal del bucket privado. */
function FotoReclamo({ path }: { path: string | null }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let activo = true
    if (!path) {
      setError(true)
      return
    }
    if (/^https?:\/\//.test(path)) {
      setUrl(path)
      return
    }
    supabase.storage
      .from('paginas-completadas')
      .createSignedUrl(path, 120)
      .then(({ data, error }) => {
        if (!activo) return
        if (error || !data) setError(true)
        else setUrl(data.signedUrl)
      })
    return () => {
      activo = false
    }
  }, [path])

  if (error || !path)
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dorado/20 bg-morado">
        <ImageOff className="text-crema/30" size={20} />
      </div>
    )
  if (!url)
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dorado/20 bg-morado">
        <Loader2 className="animate-spin text-crema/40" size={16} />
      </div>
    )
  return (
    <a href={url} target="_blank" rel="noreferrer" className="shrink-0">
      <img
        src={url}
        alt="Página"
        className="h-16 w-16 rounded-lg border border-dorado/20 object-cover"
      />
    </a>
  )
}

export function ReclamosTab() {
  const [lista, setLista] = useState<ReclamoRow[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<EstadoReclamo | 'todos'>('todos')
  const [accionando, setAccionando] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    const { data, error } = await supabase
      .from('reclamos_premio')
      .select(
        'id, premio_id, estado, created_at, foto_pagina_url, clientes ( nombre_local ), premios_proveedor_semana ( nombre_premio, proveedores ( nombre ) )',
      )
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setLista((data ?? []) as unknown as ReclamoRow[])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  async function confirmar(r: ReclamoRow) {
    setAccionando(r.id)
    const { error } = await supabase
      .from('reclamos_premio')
      .update({ estado: 'confirmado' })
      .eq('id', r.id)
    setAccionando(null)
    if (error) setError(error.message)
    else cargar()
  }

  async function rechazar(r: ReclamoRow) {
    setAccionando(r.id)
    setError(null)
    try {
      // 1) marcar rechazado
      const upd = await supabase
        .from('reclamos_premio')
        .update({ estado: 'rechazado' })
        .eq('id', r.id)
      if (upd.error) throw upd.error

      // 2) devolver stock (stock_disponible + 1) del premio
      if (r.premio_id) {
        const { data: prem, error: e1 } = await supabase
          .from('premios_proveedor_semana')
          .select('stock_disponible')
          .eq('id', r.premio_id)
          .maybeSingle()
        if (e1) throw e1
        if (prem) {
          const e2 = await supabase
            .from('premios_proveedor_semana')
            .update({ stock_disponible: (prem.stock_disponible ?? 0) + 1 })
            .eq('id', r.premio_id)
          if (e2.error) throw e2.error
        }
      }
      cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo rechazar.')
    } finally {
      setAccionando(null)
    }
  }

  const visibles = lista.filter((r) => filtro === 'todos' || r.estado === filtro)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl text-crema">
          Reclamos{' '}
          <span className="text-sm font-normal text-crema/50">({lista.length})</span>
        </h2>
        <div className="flex gap-1">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                filtro === f.id
                  ? 'bg-naranja text-crema'
                  : 'bg-vino/30 text-crema/60 hover:text-crema'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {cargando && (
        <div className="flex items-center gap-2 py-8 text-crema/60">
          <Loader2 className="animate-spin" size={18} /> Cargando…
        </div>
      )}
      {error && (
        <p className="mb-3 flex items-center gap-2 text-sm text-naranja">
          <AlertTriangle size={16} /> {error}
        </p>
      )}

      {!cargando && visibles.length === 0 && (
        <p className="rounded-xl border border-dorado/20 bg-vino/20 px-4 py-8 text-center text-sm text-crema/60">
          No hay reclamos {filtro !== 'todos' ? `en estado "${filtro}"` : 'cargados'}.
        </p>
      )}

      <div className="space-y-2">
        {visibles.map((r) => {
          const cliente = uno(r.clientes)?.nombre_local ?? '—'
          const premio = uno(r.premios_proveedor_semana)
          const nombrePremio = premio?.nombre_premio ?? '—'
          const proveedor = uno(premio?.proveedores ?? null)?.nombre ?? '—'
          return (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-xl border border-dorado/15 bg-vino/30 p-3"
            >
              <FotoReclamo path={r.foto_pagina_url} />

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-crema">{cliente}</p>
                <p className="truncate text-xs text-crema/70">
                  {nombrePremio} · {proveedor}
                </p>
                <p className="mt-0.5 text-[11px] text-crema/45">
                  {new Date(r.created_at).toLocaleString('es-AR')}
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colorEstado[r.estado]}`}
                >
                  {r.estado}
                </span>
                {r.estado === 'reservado' && (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => confirmar(r)}
                      disabled={accionando === r.id}
                      className="inline-flex items-center gap-1 rounded-full bg-dorado/20 px-2.5 py-1 text-xs font-semibold text-dorado hover:bg-dorado/30 disabled:opacity-50"
                    >
                      <Check size={13} /> Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => rechazar(r)}
                      disabled={accionando === r.id}
                      className="inline-flex items-center gap-1 rounded-full bg-naranja/20 px-2.5 py-1 text-xs font-semibold text-naranja hover:bg-naranja/30 disabled:opacity-50"
                    >
                      <X size={13} /> Rechazar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
