import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, ImageOff, Loader2, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface ProveedorRef {
  nombre: string | null
  pagina_num: number | null
}

interface FiguritaRow {
  id: string
  nombre: string
  es_dorada: boolean
  imagen_url: string | null
  orden: number | null
  proveedor_id: string | null
  proveedores: ProveedorRef | ProveedorRef[] | null
}

const imgPath = (name: string) => `/figuritas/${name}`

function provDe(f: FiguritaRow): ProveedorRef | null {
  const p = f.proveedores
  if (!p) return null
  return Array.isArray(p) ? (p[0] ?? null) : p
}

type Carga =
  | { status: 'cargando' }
  | { status: 'ok' }
  | { status: 'error'; mensaje: string }

export function AsignarFiguritas() {
  const [carga, setCarga] = useState<Carga>({ status: 'cargando' })
  const [manifest, setManifest] = useState<string[]>([])
  const [figuritas, setFiguritas] = useState<FiguritaRow[]>([])
  // figuritaId -> imagen_url (path completo) | ''
  const [asign, setAsign] = useState<Record<string, string>>({})
  const [abierto, setAbierto] = useState<string | null>(null)

  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null)
  const [guardadoOk, setGuardadoOk] = useState(false)

  useEffect(() => {
    let activo = true

    async function cargar() {
      setCarga({ status: 'cargando' })
      try {
        const [manRes, figRes] = await Promise.all([
          fetch('/figuritas/manifest.json').then((r) => {
            if (!r.ok) throw new Error('No se pudo leer manifest.json')
            return r.json() as Promise<string[]>
          }),
          supabase
            .from('figuritas')
            .select(
              'id, nombre, es_dorada, imagen_url, orden, proveedor_id, proveedores ( nombre, pagina_num )',
            )
            .order('orden', { ascending: true }),
        ])

        if (!activo) return
        if (figRes.error) {
          setCarga({ status: 'error', mensaje: figRes.error.message })
          return
        }

        const figs = (figRes.data ?? []) as unknown as FiguritaRow[]
        const inicial: Record<string, string> = {}
        for (const f of figs) inicial[f.id] = f.imagen_url ?? ''

        setManifest(manRes)
        setFiguritas(figs)
        setAsign(inicial)
        setCarga({ status: 'ok' })
      } catch (e) {
        if (!activo) return
        setCarga({
          status: 'error',
          mensaje: e instanceof Error ? e.message : 'Error al cargar',
        })
      }
    }

    cargar()
    return () => {
      activo = false
    }
  }, [])

  // Agrupar por proveedor, ordenar items por `orden` y grupos por pagina_num
  const grupos = useMemo(() => {
    const map = new Map<string, { prov: ProveedorRef | null; items: FiguritaRow[] }>()
    for (const f of figuritas) {
      const key = f.proveedor_id ?? 'sin-proveedor'
      if (!map.has(key)) map.set(key, { prov: provDe(f), items: [] })
      map.get(key)!.items.push(f)
    }
    const arr = [...map.values()]
    arr.forEach((g) => g.items.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)))
    arr.sort((a, b) => (a.prov?.pagina_num ?? 999) - (b.prov?.pagina_num ?? 999))
    return arr
  }, [figuritas])

  // Path -> nombre de figurita que la usa (para avisar duplicados)
  const usadaPor = useMemo(() => {
    const m = new Map<string, string>()
    for (const f of figuritas) {
      const v = asign[f.id]
      if (v) m.set(v, f.nombre)
    }
    return m
  }, [asign, figuritas])

  const totalAsignadas = useMemo(
    () => Object.values(asign).filter(Boolean).length,
    [asign],
  )

  const hayCambios = useMemo(
    () => figuritas.some((f) => (asign[f.id] ?? '') !== (f.imagen_url ?? '')),
    [asign, figuritas],
  )

  function elegir(figId: string, name: string) {
    setAsign((a) => ({ ...a, [figId]: imgPath(name) }))
    setAbierto(null)
    setGuardadoOk(false)
  }

  function limpiar(figId: string) {
    setAsign((a) => ({ ...a, [figId]: '' }))
    setGuardadoOk(false)
  }

  async function guardar() {
    setGuardando(true)
    setErrorGuardar(null)
    setGuardadoOk(false)
    try {
      const cambios = figuritas.filter(
        (f) => (asign[f.id] ?? '') !== (f.imagen_url ?? ''),
      )
      for (const f of cambios) {
        const val = asign[f.id] ? asign[f.id] : null
        const { error } = await supabase
          .from('figuritas')
          .update({ imagen_url: val })
          .eq('id', f.id)
        if (error) throw error
      }
      // Actualizar baseline en memoria
      setFiguritas((prev) =>
        prev.map((f) => ({ ...f, imagen_url: asign[f.id] ? asign[f.id] : null })),
      )
      setGuardadoOk(true)
    } catch (e) {
      setErrorGuardar(
        e instanceof Error ? e.message : 'No se pudieron guardar las asignaciones.',
      )
    } finally {
      setGuardando(false)
    }
  }

  return (
    <main className="min-h-screen bg-morado px-4 py-8 text-crema sm:px-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-naranja">
            Uso interno
          </p>
          <h1 className="font-display text-3xl text-crema">Asignar figuritas</h1>
          <p className="mt-2 text-sm text-crema/70">
            Vinculá cada figurita con su archivo de imagen. Elegí visualmente por
            thumbnail.
          </p>
        </header>

        {carga.status === 'cargando' && (
          <div className="flex items-center gap-3 py-16 text-crema/70">
            <Loader2 className="animate-spin" size={22} />
            <span>Cargando figuritas e imágenes…</span>
          </div>
        )}

        {carga.status === 'error' && (
          <div className="flex items-start gap-3 rounded-xl border border-naranja/40 bg-naranja/10 px-5 py-4">
            <AlertTriangle className="mt-0.5 shrink-0 text-naranja" size={20} />
            <div className="text-sm">
              <p className="font-semibold">No pudimos cargar los datos.</p>
              <p className="mt-1 text-crema/80">{carga.mensaje}</p>
            </div>
          </div>
        )}

        {carga.status === 'ok' && (
          <>
            {/* Barra de progreso / guardar (sticky) */}
            <div className="sticky top-0 z-20 -mx-4 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-dorado/20 bg-morado/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
              <span className="text-sm font-medium">
                <span className="text-dorado">{totalAsignadas}</span> de{' '}
                {figuritas.length} asignadas
              </span>
              <div className="flex items-center gap-3">
                {guardadoOk && !hayCambios && (
                  <span className="flex items-center gap-1 text-sm text-dorado">
                    <Check size={16} /> Guardado
                  </span>
                )}
                <button
                  type="button"
                  onClick={guardar}
                  disabled={guardando || !hayCambios}
                  className="flex items-center justify-center gap-2 rounded-full bg-naranja px-6 py-2.5 text-sm font-semibold text-crema shadow transition hover:bg-[#e0633a] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardando ? (
                    <>
                      <Loader2 className="animate-spin" size={16} /> Guardando…
                    </>
                  ) : (
                    'Guardar asignaciones'
                  )}
                </button>
              </div>
            </div>

            {errorGuardar && (
              <div className="mb-6 flex items-start gap-2 rounded-lg border border-naranja/40 bg-naranja/10 px-4 py-3 text-sm">
                <AlertTriangle className="mt-0.5 shrink-0 text-naranja" size={18} />
                <span>{errorGuardar}</span>
              </div>
            )}

            {figuritas.length === 0 && (
              <div className="rounded-xl border border-dorado/20 bg-vino/20 px-5 py-10 text-center text-sm text-crema/70">
                No hay figuritas cargadas en Supabase todavía. Cargá las figuritas
                (y sus proveedores) en este proyecto para poder asignarles imágenes.
              </div>
            )}

            <div className="space-y-8 pb-24">
              {grupos.map((g, gi) => (
                <section key={gi}>
                  <h2 className="mb-3 border-l-2 border-dorado pl-3 font-display text-lg text-crema">
                    {g.prov?.pagina_num != null && (
                      <span className="text-dorado">Página {g.prov.pagina_num} · </span>
                    )}
                    {g.prov?.nombre ?? 'Sin proveedor'}
                  </h2>

                  <div className="space-y-3">
                    {g.items.map((f) => {
                      const sel = asign[f.id] ?? ''
                      const dupNombre = sel ? usadaPor.get(sel) : undefined
                      const esDuplicada = dupNombre && dupNombre !== f.nombre
                      const estaAbierto = abierto === f.id
                      return (
                        <div
                          key={f.id}
                          className="rounded-xl border border-dorado/20 bg-vino/30 p-3"
                        >
                          <div className="flex items-center gap-3">
                            {/* Preview */}
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dorado/20 bg-morado">
                              {sel ? (
                                <img
                                  src={sel}
                                  alt={f.nombre}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <ImageOff className="text-crema/30" size={22} />
                              )}
                            </div>

                            {/* Info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">{f.nombre}</span>
                                {f.es_dorada && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-dorado/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-dorado">
                                    <Sparkles size={11} /> Dorada
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 truncate text-xs text-crema/50">
                                {sel ? sel.replace('/figuritas/', '') : 'sin imagen'}
                                {esDuplicada && (
                                  <span className="ml-2 text-naranja">
                                    ⚠ también en “{dupNombre}”
                                  </span>
                                )}
                              </p>
                            </div>

                            {/* Acciones */}
                            <div className="flex shrink-0 flex-col gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setAbierto(estaAbierto ? null : f.id)
                                }
                                className="rounded-full border border-dorado/40 px-3 py-1.5 text-xs font-semibold text-dorado transition hover:bg-dorado/10"
                              >
                                {estaAbierto
                                  ? 'Cerrar'
                                  : sel
                                    ? 'Cambiar'
                                    : 'Elegir imagen'}
                              </button>
                              {sel && (
                                <button
                                  type="button"
                                  onClick={() => limpiar(f.id)}
                                  className="text-[11px] text-crema/40 hover:text-crema/70"
                                >
                                  Quitar
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Picker de thumbnails */}
                          {estaAbierto && (
                            <div className="mt-3 grid grid-cols-5 gap-2 rounded-lg bg-morado/60 p-3 sm:grid-cols-8">
                              {manifest.map((name) => {
                                const path = imgPath(name)
                                const elegida = sel === path
                                const usada = usadaPor.get(path)
                                return (
                                  <button
                                    type="button"
                                    key={name}
                                    onClick={() => elegir(f.id, name)}
                                    title={
                                      usada && usada !== f.nombre
                                        ? `${name} (en uso: ${usada})`
                                        : name
                                    }
                                    className={`relative aspect-square overflow-hidden rounded-md border-2 transition ${
                                      elegida
                                        ? 'border-dorado ring-2 ring-dorado/50'
                                        : 'border-transparent hover:border-dorado/50'
                                    }`}
                                  >
                                    <img
                                      src={path}
                                      alt={name}
                                      loading="lazy"
                                      className="h-full w-full object-cover"
                                    />
                                    {usada && usada !== f.nombre && !elegida && (
                                      <span className="absolute inset-x-0 bottom-0 bg-black/60 text-center text-[8px] leading-tight text-naranja">
                                        en uso
                                      </span>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
