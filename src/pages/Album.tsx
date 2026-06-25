import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Gift, LogOut, Trophy } from 'lucide-react'
import confetti from 'canvas-confetti'
import { supabase } from '../lib/supabase'
import type { Dinamica, Figurita, Proveedor, TipoCanal } from '../types'
import { FiguritaCard } from '../components/FiguritaCard'
import { ReclamoModal } from '../components/ReclamoModal'
import { RankingClientes } from '../components/RankingClientes'
import { Ganadores } from '../components/Ganadores'
import { GanadoresTV } from '../components/GanadoresTV'

interface Props {
  clienteId: string
  onReset: () => void
}

interface FiguritaConProv extends Figurita {
  proveedores: Proveedor | Proveedor[] | null
}

type Estado =
  | { status: 'cargando' }
  | {
      status: 'ok'
      nombreLocal: string
      tipo: TipoCanal
      vendedor: { nombre: string; whatsapp: string | null } | null
      figuritas: FiguritaConProv[]
      dinaPorFigurita: Record<string, Dinamica>
    }
  | { status: 'error'; mensaje: string }
  | { status: 'sin-cliente' }

function provDe(f: FiguritaConProv): Proveedor | null {
  const p = f.proveedores
  if (!p) return null
  return Array.isArray(p) ? (p[0] ?? null) : p
}

function Barra({
  value,
  max,
  alta = false,
}: {
  value: number
  max: number
  alta?: boolean
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-morado/70 ${
        alta ? 'h-4' : 'h-2'
      }`}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-dorado to-naranja transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function Album({ clienteId, onReset }: Props) {
  const [estado, setEstado] = useState<Estado>({ status: 'cargando' })
  const [tiene, setTiene] = useState<Record<string, boolean>>({})
  const [errorTilde, setErrorTilde] = useState<string | null>(null)
  const [completadoAt, setCompletadoAt] = useState<string | null>(null)
  // Proveedor cuyo panel de premios está abierto
  const [modalProv, setModalProv] = useState<{
    id: string
    nombre: string
    completa: boolean
  } | null>(null)

  useEffect(() => {
    let activo = true

    async function cargar() {
      setEstado({ status: 'cargando' })

      // 1) Cliente + tipo de canal
      const { data: cli, error: e1 } = await supabase
        .from('clientes')
        .select(
          'id, nombre_local, canal_id, vendedor_id, canales ( tipo, nombre ), vendedores ( nombre, whatsapp )',
        )
        .eq('id', clienteId)
        .maybeSingle()

      if (!activo) return
      if (e1) {
        setEstado({ status: 'error', mensaje: e1.message })
        return
      }
      if (!cli) {
        setEstado({ status: 'sin-cliente' })
        return
      }

      const canalRaw = (cli as { canales: unknown }).canales
      const canal = (Array.isArray(canalRaw) ? canalRaw[0] : canalRaw) as
        | { tipo: TipoCanal; nombre: string }
        | null
      const tipo: TipoCanal = canal?.tipo ?? 'ON'

      const vendRaw = (cli as { vendedores: unknown }).vendedores
      const vendedor = (Array.isArray(vendRaw) ? vendRaw[0] : vendRaw) as
        | { nombre: string; whatsapp: string | null }
        | null

      // 2) Figuritas + dinámicas del tipo + colección (en paralelo)
      const [figRes, dinRes, colRes] = await Promise.all([
        supabase
          .from('figuritas')
          .select(
            'id, proveedor_id, nombre, es_dorada, imagen_url, orden, proveedores ( id, nombre, pagina_num )',
          ),
        supabase
          .from('dinamicas')
          .select('id, figurita_id, tipo, objetivo, productos, condicion, observaciones')
          .eq('tipo', tipo),
        supabase
          .from('coleccion_cliente')
          .select('figurita_id, tiene')
          .eq('cliente_id', clienteId),
      ])

      if (!activo) return
      const primerError = figRes.error || dinRes.error || colRes.error
      if (primerError) {
        setEstado({ status: 'error', mensaje: primerError.message })
        return
      }

      const figuritas = (figRes.data ?? []) as unknown as FiguritaConProv[]

      const dinaPorFigurita: Record<string, Dinamica> = {}
      for (const d of (dinRes.data ?? []) as Dinamica[]) {
        dinaPorFigurita[d.figurita_id] = d
      }

      const tieneInit: Record<string, boolean> = {}
      for (const f of figuritas) tieneInit[f.id] = false
      for (const c of (colRes.data ?? []) as {
        figurita_id: string
        tiene: boolean
      }[]) {
        tieneInit[c.figurita_id] = c.tiene
      }

      setTiene(tieneInit)
      // completado_at: lectura best-effort (no rompe el álbum si falta la columna)
      supabase
        .from('clientes')
        .select('completado_at')
        .eq('id', clienteId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!error && data && activo)
            setCompletadoAt(
              (data as { completado_at: string | null }).completado_at ?? null,
            )
        })
      setEstado({
        status: 'ok',
        nombreLocal: (cli as { nombre_local: string }).nombre_local,
        tipo,
        vendedor,
        figuritas,
        dinaPorFigurita,
      })
    }

    cargar()
    return () => {
      activo = false
    }
  }, [clienteId])

  // Agrupar por proveedor, ordenar items por `orden` y grupos por pagina_num
  const grupos = useMemo(() => {
    if (estado.status !== 'ok') return []
    const map = new Map<string, { prov: Proveedor | null; items: FiguritaConProv[] }>()
    for (const f of estado.figuritas) {
      const key = f.proveedor_id ?? 'sin'
      if (!map.has(key)) map.set(key, { prov: provDe(f), items: [] })
      map.get(key)!.items.push(f)
    }
    const arr = [...map.values()]
    arr.forEach((g) => g.items.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)))
    arr.sort((a, b) => (a.prov?.pagina_num ?? 999) - (b.prov?.pagina_num ?? 999))
    return arr
  }, [estado])

  const total = estado.status === 'ok' ? estado.figuritas.length : 0
  const completadas = useMemo(
    () =>
      estado.status === 'ok'
        ? estado.figuritas.filter((f) => tiene[f.id]).length
        : 0,
    [estado, tiene],
  )
  const pct = total > 0 ? Math.round((completadas / total) * 100) : 0

  // Clave estable por grupo (proveedor)
  const keyGrupo = (prov: Proveedor | null, i: number) => prov?.id ?? `sin-${i}`

  // Claves de las páginas COMPLETAS (5/5), derivadas de la colección
  const completasKey = useMemo(
    () =>
      grupos
        .map((g, i) => ({
          key: keyGrupo(g.prov, i),
          full: g.items.length > 0 && g.items.every((f) => tiene[f.id]),
        }))
        .filter((x) => x.full)
        .map((x) => x.key)
        .sort()
        .join('|'),
    [grupos, tiene],
  )

  const prevCompletas = useRef<Set<string> | null>(null)
  const [celebrando, setCelebrando] = useState<string | null>(null)

  function festejar(key: string) {
    const el = document.getElementById(`prov-sec-${key}`)
    let origin = { x: 0.5, y: 0.35 }
    if (el) {
      const r = el.getBoundingClientRect()
      origin = {
        x: (r.left + r.width / 2) / window.innerWidth,
        y: Math.min(0.85, Math.max(0.15, (r.top + r.height * 0.25) / window.innerHeight)),
      }
    }
    confetti({
      particleCount: 90,
      spread: 75,
      startVelocity: 38,
      origin,
      colors: ['#CBA86A', '#D2552A', '#F2E8D5', '#7A2236'],
      scalar: 0.9,
      disableForReducedMotion: true,
    })
  }

  // Festejar SOLO cuando una página pasa a estar completa (no en la carga/recarga)
  useEffect(() => {
    if (estado.status !== 'ok') return
    const ahora = new Set(completasKey ? completasKey.split('|') : [])
    const prev = prevCompletas.current
    if (prev === null) {
      prevCompletas.current = ahora
      return
    }
    ahora.forEach((k) => {
      if (!prev.has(k)) {
        festejar(k)
        setCelebrando(k)
        window.setTimeout(() => setCelebrando((c) => (c === k ? null : c)), 2600)
      }
    })
    prevCompletas.current = ahora
  }, [completasKey, estado.status])

  async function toggle(figId: string) {
    const previo = !!tiene[figId]
    const nuevo = !previo
    // Optimista
    setTiene((t) => ({ ...t, [figId]: nuevo }))
    setErrorTilde(null)

    const { error } = await supabase.from('coleccion_cliente').upsert(
      {
        cliente_id: clienteId,
        figurita_id: figId,
        tiene: nuevo,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'cliente_id,figurita_id' },
    )

    if (error) {
      // Revertir + avisar
      setTiene((t) => ({ ...t, [figId]: previo }))
      setErrorTilde('No se pudo guardar el cambio. Probá de nuevo.')
      window.setTimeout(() => setErrorTilde(null), 4000)
      return
    }

    // ¿Llegó a 30/30? Registrar completado_at una sola vez (server-side verifica).
    if (estado.status === 'ok' && nuevo && !completadoAt) {
      const totalFig = estado.figuritas.length
      const tildadasAhora = estado.figuritas.filter((f) =>
        f.id === figId ? true : tiene[f.id],
      ).length
      if (totalFig > 0 && tildadasAhora >= totalFig) {
        const { data } = await supabase.rpc('marcar_completado', {
          p_cliente_id: clienteId,
        })
        if (data) setCompletadoAt(data as string)
      }
    }
  }

  // -------------------- estados no felices --------------------
  if (estado.status === 'error') {
    return (
      <Centro>
        <div className="flex max-w-md items-start gap-3 rounded-xl border border-naranja/40 bg-naranja/10 px-5 py-4 text-left">
          <AlertTriangle className="mt-0.5 shrink-0 text-naranja" size={20} />
          <div className="text-sm text-crema/85">
            <p className="font-semibold text-crema">No pudimos cargar tu álbum.</p>
            <p className="mt-1">{estado.mensaje}</p>
          </div>
        </div>
      </Centro>
    )
  }

  if (estado.status === 'sin-cliente') {
    return (
      <Centro>
        <p className="text-crema/80">
          No encontramos tu ficha en este dispositivo.
        </p>
        <button
          type="button"
          onClick={onReset}
          className="mt-5 rounded-full bg-naranja px-6 py-3 text-sm font-semibold text-crema"
        >
          Volver a identificarme
        </button>
      </Centro>
    )
  }

  if (estado.status === 'cargando') {
    return <AlbumSkeleton />
  }

  // -------------------- álbum --------------------
  return (
    <main className="min-h-screen bg-morado px-4 pb-24 pt-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {/* Encabezado + progreso general */}
        <header className="mb-8 rounded-2xl border border-dorado/25 bg-vino/40 p-6 shadow-lg shadow-black/30">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-4xl text-crema">Mi Álbum</h1>
              <p className="mt-1 text-sm text-crema/70">{estado.nombreLocal}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-morado/60 px-3 py-1 text-xs font-semibold text-dorado">
              <Trophy size={13} /> Canal {estado.tipo}
            </span>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-end justify-between">
              <span className="font-display text-2xl text-crema">
                {completadas}{' '}
                <span className="text-base text-crema/60">de {total} figuritas</span>
              </span>
              <span className="font-display text-2xl text-dorado">{pct}%</span>
            </div>
            <Barra value={completadas} max={total} alta />
          </div>
        </header>

        {/* Ganadores destacados de la Smart TV (semanas 1 y 2) */}
        <div className="mb-8">
          <GanadoresTV />
        </div>

        {/* Secciones por proveedor */}
        <div className="space-y-8">
          {grupos.map((g, gi) => {
            const key = keyGrupo(g.prov, gi)
            const tieneEnGrupo = g.items.filter((f) => tiene[f.id]).length
            const bloqueada = g.items.length > 0 && tieneEnGrupo === g.items.length
            return (
              <section key={gi} id={`prov-sec-${key}`}>
                <div className="mb-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-display text-2xl text-crema">
                      {g.prov?.pagina_num != null && (
                        <span className="text-dorado">{g.prov.pagina_num}. </span>
                      )}
                      {g.prov?.nombre ?? 'Sin proveedor'}
                    </h2>
                    <span
                      className={`shrink-0 text-sm font-semibold ${
                        bloqueada ? 'text-dorado' : 'text-crema/70'
                      }`}
                    >
                      {tieneEnGrupo} de {g.items.length}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1">
                      <Barra value={tieneEnGrupo} max={g.items.length} />
                    </div>
                    {g.prov && (
                      <button
                        type="button"
                        onClick={() =>
                          setModalProv({
                            id: g.prov!.id,
                            nombre: g.prov!.nombre,
                            completa: bloqueada,
                          })
                        }
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-dorado/40 px-3 py-1.5 text-xs font-semibold text-dorado transition hover:bg-dorado/10"
                      >
                        <Gift size={13} /> Ver premios
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {g.items.map((f) => (
                      <FiguritaCard
                        key={f.id}
                        figurita={f}
                        dinamica={estado.dinaPorFigurita[f.id] ?? null}
                        tiene={!!tiene[f.id]}
                        bloqueada={bloqueada}
                        onToggle={() => toggle(f.id)}
                      />
                    ))}
                  </div>

                  {/* Página completa: overlay + sello "¡COMPLETO!" */}
                  {bloqueada && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-morado/55">
                      <div
                        className={`flex select-none items-center gap-2 rounded-2xl border-4 border-dorado bg-morado/85 px-6 py-3 shadow-2xl ${
                          celebrando === key ? 'animate-sello-pop' : ''
                        }`}
                        style={{ transform: 'rotate(-8deg)' }}
                      >
                        <Trophy className="text-naranja" size={26} />
                        <span className="font-display text-2xl tracking-wide text-dorado">
                          ¡COMPLETO!
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )
          })}

          {grupos.length === 0 && (
            <div className="rounded-xl border border-dorado/20 bg-vino/20 px-5 py-10 text-center text-sm text-crema/70">
              Todavía no hay figuritas cargadas. Volvé pronto.
            </div>
          )}
        </div>

        {/* Ranking + Ganadores */}
        <div className="mt-10 space-y-6">
          <RankingClientes clienteId={clienteId} />
          <Ganadores />
        </div>

        {/* Pie: cambiar datos */}
        <div className="mt-12 text-center">
          <Link
            to="/"
            className="text-sm text-crema/50 underline-offset-4 hover:underline"
          >
            ← Volver al inicio
          </Link>
          <div className="mt-3">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 text-xs text-crema/40 transition hover:text-crema/70"
            >
              <LogOut size={13} />
              No soy yo / cambiar datos
            </button>
          </div>
        </div>
      </div>

      {/* Toast de error de guardado */}
      {errorTilde && (
        <div className="fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full border border-naranja/50 bg-morado px-5 py-3 text-sm text-crema shadow-lg shadow-black/40">
            <AlertTriangle className="text-naranja" size={16} />
            {errorTilde}
          </div>
        </div>
      )}

      {/* Panel de premios / reclamo del proveedor */}
      {modalProv && (
        <ReclamoModal
          clienteId={clienteId}
          nombreLocal={estado.nombreLocal}
          vendedor={estado.vendedor}
          proveedorId={modalProv.id}
          proveedorNombre={modalProv.nombre}
          paginaCompleta={modalProv.completa}
          onClose={() => setModalProv(null)}
        />
      )}
    </main>
  )
}

function Centro({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-morado px-6 text-center">
      {children}
    </main>
  )
}

function AlbumSkeleton() {
  return (
    <main className="min-h-screen bg-morado px-4 pt-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 rounded-2xl border border-dorado/20 bg-vino/30 p-6">
          <div className="h-9 w-40 animate-pulse rounded bg-crema/10" />
          <div className="mt-3 h-4 w-28 animate-pulse rounded bg-crema/10" />
          <div className="mt-6 h-4 w-full animate-pulse rounded-full bg-crema/10" />
        </div>
        {[0, 1].map((s) => (
          <section key={s} className="mb-8">
            <div className="mb-3 h-6 w-44 animate-pulse rounded bg-crema/10" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[0, 1, 2, 3].map((c) => (
                <div
                  key={c}
                  className="overflow-hidden rounded-2xl border border-dorado/10 bg-vino/20"
                >
                  <div className="aspect-square w-full animate-pulse bg-crema/10" />
                  <div className="space-y-2 p-3">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-crema/10" />
                    <div className="h-8 w-full animate-pulse rounded-full bg-crema/10" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
