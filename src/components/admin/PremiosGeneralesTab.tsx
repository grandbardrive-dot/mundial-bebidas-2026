import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { PremioGeneral } from '../../types'

const input =
  'w-full rounded-lg border border-dorado/30 bg-morado/50 px-3 py-2 text-sm text-crema outline-none focus:border-naranja focus:ring-2 focus:ring-naranja/30'

function PremioRow({ premio }: { premio: PremioGeneral }) {
  const [nombre, setNombre] = useState(premio.nombre ?? '')
  const [descripcion, setDescripcion] = useState(premio.descripcion ?? '')
  const [cantidad, setCantidad] = useState<string>(
    premio.cantidad != null ? String(premio.cantidad) : '',
  )
  const [imagenUrl, setImagenUrl] = useState(premio.imagen_url ?? '')
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    setGuardando(true)
    setError(null)
    setOk(false)
    const { error } = await supabase
      .from('premios_generales')
      .update({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        cantidad: cantidad === '' ? null : Number(cantidad),
        imagen_url: imagenUrl.trim() || null,
      })
      .eq('id', premio.id)
    setGuardando(false)
    if (error) setError(error.message)
    else {
      setOk(true)
      window.setTimeout(() => setOk(false), 2000)
    }
  }

  return (
    <div className="rounded-xl border border-dorado/20 bg-vino/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full bg-azul/30 px-2 py-0.5 text-xs font-semibold text-crema/80">
          {premio.tipo === 'semanal_1' ? 'Premio mayor' : '2° puesto'}
        </span>
        {premio.semana != null && (
          <span className="text-xs text-crema/50">Semana {premio.semana}</span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-crema/70">Nombre</label>
          <input className={input} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-crema/70">Descripción</label>
          <textarea
            className={`${input} min-h-[60px]`}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-crema/70">Cantidad</label>
          <input
            className={input}
            type="number"
            min={0}
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-crema/70">Imagen URL</label>
          <input
            className={input}
            value={imagenUrl}
            onChange={(e) => setImagenUrl(e.target.value)}
            placeholder="/premios/tv.jpg"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="flex items-center gap-2 rounded-full bg-naranja px-4 py-2 text-sm font-semibold text-crema transition hover:bg-[#e0633a] disabled:opacity-60"
        >
          {guardando ? <Loader2 className="animate-spin" size={15} /> : null}
          Guardar
        </button>
        {ok && (
          <span className="flex items-center gap-1 text-sm text-dorado">
            <Check size={15} /> Guardado
          </span>
        )}
        {error && (
          <span className="flex items-center gap-1 text-sm text-naranja">
            <AlertTriangle size={15} /> {error}
          </span>
        )}
      </div>
    </div>
  )
}

export function PremiosGeneralesTab() {
  const [lista, setLista] = useState<PremioGeneral[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    ;(async () => {
      const { data, error } = await supabase
        .from('premios_generales')
        .select('id, nombre, descripcion, tipo, semana, imagen_url, cantidad')
        .order('tipo', { ascending: true })
        .order('semana', { ascending: true, nullsFirst: false })
      if (!activo) return
      if (error) setError(error.message)
      else setLista((data ?? []) as PremioGeneral[])
      setCargando(false)
    })()
    return () => {
      activo = false
    }
  }, [])

  if (cargando)
    return (
      <div className="flex items-center gap-2 py-8 text-crema/60">
        <Loader2 className="animate-spin" size={18} /> Cargando…
      </div>
    )
  if (error)
    return (
      <p className="flex items-center gap-2 text-sm text-naranja">
        <AlertTriangle size={16} /> {error}
      </p>
    )

  return (
    <div>
      <h2 className="mb-3 font-display text-xl text-crema">
        Premios generales{' '}
        <span className="text-sm font-normal text-crema/50">
          (editar los existentes)
        </span>
      </h2>
      <div className="grid gap-4">
        {lista.map((p) => (
          <PremioRow key={p.id} premio={p} />
        ))}
        {lista.length === 0 && (
          <p className="text-sm text-crema/50">No hay premios generales cargados.</p>
        )}
      </div>
    </div>
  )
}
