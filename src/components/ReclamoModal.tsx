import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ImageOff,
  Loader2,
  Lock,
  Upload,
  X,
  ZoomIn,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { EstadoReclamo, PremioProveedor } from '../types'

interface Props {
  clienteId: string
  nombreLocal: string
  vendedor: { nombre: string; whatsapp: string | null } | null
  proveedorId: string
  proveedorNombre: string
  paginaCompleta: boolean
  onClose: () => void
}

const uno = <T,>(x: T | T[] | null | undefined): T | null =>
  Array.isArray(x) ? (x[0] ?? null) : (x ?? null)

const estadoLabel: Record<EstadoReclamo, string> = {
  reservado: 'Reservado (pendiente de confirmación)',
  confirmado: 'Confirmado',
  rechazado: 'Rechazado',
}
const estadoColor: Record<EstadoReclamo, string> = {
  reservado: 'bg-azul/30 text-crema',
  confirmado: 'bg-dorado/20 text-dorado',
  rechazado: 'bg-naranja/20 text-naranja',
}

function PremioItem({
  premio,
  modo,
  seleccionado,
  onSelect,
  onAmpliar,
}: {
  premio: PremioProveedor
  modo: 'preview' | 'elegir'
  seleccionado?: boolean
  onSelect?: () => void
  onAmpliar: (url: string) => void
}) {
  const sinStock = (premio.stock_disponible ?? 0) <= 0
  const elegible = modo === 'elegir' && !sinStock
  return (
    <div
      onClick={elegible ? onSelect : undefined}
      className={`overflow-hidden rounded-xl border transition ${
        seleccionado
          ? 'border-dorado bg-dorado/10'
          : 'border-dorado/20 bg-morado/40'
      } ${elegible ? 'cursor-pointer hover:border-dorado/60' : ''} ${
        sinStock ? 'opacity-60' : ''
      }`}
    >
      {/* Foto grande, clickeable para ampliar (lightbox) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (premio.imagen_url) onAmpliar(premio.imagen_url)
        }}
        className="relative block h-44 w-full bg-morado"
        aria-label="Ampliar foto del premio"
      >
        {premio.imagen_url ? (
          <img
            src={premio.imagen_url}
            alt={premio.nombre_premio}
            className="h-full w-full object-contain p-2"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <ImageOff className="text-crema/30" size={34} />
          </span>
        )}
        {premio.imagen_url && (
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-medium text-crema/85">
            <ZoomIn size={11} /> Ampliar
          </span>
        )}
      </button>

      <div className="flex items-center gap-3 p-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-base leading-tight text-crema">
            {premio.nombre_premio}
          </p>
          {premio.condicion && (
            <p className="mt-0.5 text-xs text-crema/60">{premio.condicion}</p>
          )}
          <p className="mt-1 text-xs font-semibold">
            {sinStock ? (
              <span className="text-naranja">Sin stock</span>
            ) : (
              <span className="text-dorado">
                {premio.stock_disponible} disponible
                {premio.stock_disponible === 1 ? '' : 's'}
              </span>
            )}
          </p>
        </div>
        {modo === 'elegir' && !sinStock && (
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
              seleccionado ? 'border-dorado bg-dorado' : 'border-crema/40'
            }`}
          >
            {seleccionado && <span className="h-2 w-2 rounded-full bg-morado" />}
          </span>
        )}
      </div>
    </div>
  )
}

export function ReclamoModal({
  clienteId,
  nombreLocal,
  vendedor,
  proveedorId,
  proveedorNombre,
  paginaCompleta,
  onClose,
}: Props) {
  const [carga, setCarga] = useState<'cargando' | 'ok' | 'error'>('cargando')
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [premios, setPremios] = useState<PremioProveedor[]>([])
  const [reclamoExistente, setReclamoExistente] = useState<{
    nombrePremio: string
    estado: EstadoReclamo
  } | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [premioSel, setPremioSel] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [exito, setExito] = useState<{ nombrePremio: string } | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    ;(async () => {
      setCarga('cargando')
      const [premRes, reclRes] = await Promise.all([
        supabase
          .from('premios_proveedor_semana')
          .select(
            'id, proveedor_id, semana, nombre_premio, imagen_url, stock_inicial, stock_disponible, condicion',
          )
          .eq('proveedor_id', proveedorId)
          .order('nombre_premio'),
        supabase
          .from('reclamos_premio')
          .select('id, estado, created_at, premios_proveedor_semana ( nombre_premio )')
          .eq('cliente_id', clienteId)
          .eq('proveedor_id', proveedorId)
          .order('created_at', { ascending: false }),
      ])

      if (!activo) return
      if (premRes.error) {
        setErrorCarga(premRes.error.message)
        setCarga('error')
        return
      }
      if (reclRes.error) {
        setErrorCarga(reclRes.error.message)
        setCarga('error')
        return
      }

      setPremios((premRes.data ?? []) as PremioProveedor[])

      // Reclamo más reciente; si no fue rechazado, bloquea nuevos reclamos
      const ultimo = (reclRes.data ?? [])[0] as
        | {
            estado: EstadoReclamo
            premios_proveedor_semana:
              | { nombre_premio: string }
              | { nombre_premio: string }[]
              | null
          }
        | undefined
      if (ultimo && ultimo.estado !== 'rechazado') {
        setReclamoExistente({
          nombrePremio: uno(ultimo.premios_proveedor_semana)?.nombre_premio ?? '—',
          estado: ultimo.estado,
        })
      }
      setCarga('ok')
    })()
    return () => {
      activo = false
    }
  }, [clienteId, proveedorId])

  function abrirWhatsapp(nombrePremio: string) {
    if (!vendedor?.whatsapp) return
    const digits = vendedor.whatsapp.replace(/\D/g, '')
    if (!digits) return
    const msg = `Hola ${vendedor.nombre}, soy ${nombreLocal}. Completé la página de ${proveedorNombre} en el Mundial de Bebidas y quiero reclamar mi premio: ${nombrePremio}.`
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  async function reclamar() {
    if (!file || !premioSel) return
    setEnviando(true)
    setErrorEnvio(null)
    try {
      // 1) Subir la foto al bucket privado
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${clienteId}/${proveedorId}-${Date.now()}.${ext}`
      const up = await supabase.storage
        .from('paginas-completadas')
        .upload(path, file, { upsert: true })
      if (up.error) throw new Error('No se pudo subir la foto: ' + up.error.message)

      // 2) RPC atómica: descuenta stock e inserta el reclamo (estado 'reservado')
      const { error } = await supabase.rpc('reclamar_premio', {
        p_premio_id: premioSel,
        p_cliente_id: clienteId,
        p_foto_url: path,
      })
      if (error) throw new Error(error.message)

      const premio = premios.find((p) => p.id === premioSel)
      const nombrePremio = premio?.nombre_premio ?? 'tu premio'
      abrirWhatsapp(nombrePremio)
      setExito({ nombrePremio })
    } catch (e) {
      setErrorEnvio(e instanceof Error ? e.message : 'No se pudo reclamar.')
    } finally {
      setEnviando(false)
    }
  }

  const premioSeleccionado = premios.find((p) => p.id === premioSel)
  const puedeReclamar =
    !!file && !!premioSeleccionado && (premioSeleccionado.stock_disponible ?? 0) > 0

  return (
    <>
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-dorado/25 bg-morado shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dorado/20 px-5 py-3">
          <h3 className="font-display text-lg text-crema">
            Premios · <span className="text-dorado">{proveedorNombre}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-crema/60 hover:text-crema"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {carga === 'cargando' && (
            <div className="flex items-center justify-center gap-2 py-12 text-crema/60">
              <Loader2 className="animate-spin" size={20} /> Cargando premios…
            </div>
          )}

          {carga === 'error' && (
            <div className="flex items-start gap-2 rounded-xl border border-naranja/40 bg-naranja/10 px-4 py-3 text-sm text-crema/85">
              <AlertTriangle className="mt-0.5 shrink-0 text-naranja" size={18} />
              {errorCarga}
            </div>
          )}

          {carga === 'ok' && (
            <>
              {/* Éxito */}
              {exito ? (
                <div className="py-6 text-center">
                  <CheckCircle2 className="mx-auto text-dorado" size={48} />
                  <h4 className="mt-4 font-display text-2xl text-crema">
                    ¡Reclamo enviado!
                  </h4>
                  <p className="mt-2 text-sm text-crema/70">
                    Reservaste <span className="text-dorado">{exito.nombrePremio}</span>
                    . Tu vendedor lo va a confirmar.
                  </p>
                  {vendedor?.whatsapp && (
                    <p className="mt-2 text-xs text-crema/50">
                      Te abrimos WhatsApp para avisarle a {vendedor.nombre}.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-6 rounded-full bg-naranja px-6 py-2.5 text-sm font-semibold text-crema hover:bg-[#e0633a]"
                  >
                    Listo
                  </button>
                </div>
              ) : reclamoExistente ? (
                /* Ya tiene un reclamo activo en este proveedor */
                <div className="py-4 text-center">
                  <Lock className="mx-auto text-dorado" size={36} />
                  <h4 className="mt-3 font-display text-xl text-crema">
                    Ya reclamaste en esta página
                  </h4>
                  <p className="mt-2 text-sm text-crema/70">
                    Premio:{' '}
                    <span className="text-dorado">{reclamoExistente.nombrePremio}</span>
                  </p>
                  <span
                    className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${estadoColor[reclamoExistente.estado]}`}
                  >
                    {estadoLabel[reclamoExistente.estado]}
                  </span>
                  <p className="mt-4 text-xs text-crema/50">
                    Solo se puede reclamar un premio por página completada.
                  </p>
                </div>
              ) : (
                <>
                  {/* Banner según completitud */}
                  {paginaCompleta ? (
                    <p className="mb-4 rounded-lg border border-dorado/30 bg-dorado/10 px-3 py-2 text-sm text-dorado">
                      ¡Página completa! Subí la foto y elegí tu premio.
                    </p>
                  ) : (
                    <p className="mb-4 rounded-lg border border-crema/15 bg-morado/40 px-3 py-2 text-sm text-crema/70">
                      Completá esta página y reclamá tu favorito.
                    </p>
                  )}

                  {/* Paso 1: foto (solo si completa) */}
                  {paginaCompleta && (
                    <div className="mb-4">
                      <label className="mb-1.5 block text-sm font-medium text-crema/90">
                        1. Foto de la página completada
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-dorado/40 bg-morado/40 px-3 py-3 text-sm text-crema/70 hover:border-dorado/70">
                        <Upload size={16} className="text-dorado" />
                        {file ? file.name : 'Tocá para subir una foto'}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        />
                      </label>
                    </div>
                  )}

                  {/* Lista de premios */}
                  <p className="mb-2 text-sm font-medium text-crema/90">
                    {paginaCompleta ? '2. Elegí tu premio' : 'Premios de esta página'}
                  </p>
                  <div className="space-y-2">
                    {premios.map((p) => (
                      <PremioItem
                        key={p.id}
                        premio={p}
                        modo={paginaCompleta ? 'elegir' : 'preview'}
                        seleccionado={premioSel === p.id}
                        onSelect={() => setPremioSel(p.id)}
                        onAmpliar={setLightbox}
                      />
                    ))}
                    {premios.length === 0 && (
                      <p className="py-6 text-center text-sm text-crema/50">
                        Este proveedor todavía no tiene premios cargados.
                      </p>
                    )}
                  </div>

                  {errorEnvio && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-naranja/40 bg-naranja/10 px-3 py-2 text-sm text-crema/85">
                      <AlertTriangle className="mt-0.5 shrink-0 text-naranja" size={16} />
                      {errorEnvio}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer con acción de reclamar */}
        {carga === 'ok' && !exito && !reclamoExistente && paginaCompleta && (
          <div className="border-t border-dorado/20 p-4">
            <button
              type="button"
              onClick={reclamar}
              disabled={!puedeReclamar || enviando}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-naranja px-6 py-3 text-sm font-semibold text-crema transition hover:bg-[#e0633a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {enviando ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Reclamando…
                </>
              ) : (
                'Reclamar premio'
              )}
            </button>
            {!puedeReclamar && (
              <p className="mt-2 text-center text-xs text-crema/45">
                Subí la foto y elegí un premio con stock para continuar.
              </p>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Lightbox: foto del premio ampliada */}
    {lightbox && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
        onClick={() => setLightbox(null)}
      >
        <button
          type="button"
          onClick={() => setLightbox(null)}
          className="absolute right-4 top-4 text-crema/80 transition hover:text-crema"
          aria-label="Cerrar"
        >
          <X size={28} />
        </button>
        <img
          src={lightbox}
          alt="Premio ampliado"
          className="max-h-[88vh] max-w-full rounded-lg object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    )}
    </>
  )
}
