import { useState } from 'react'
import { Check, ChevronDown, ImageOff, Lock, Sparkles } from 'lucide-react'
import type { Dinamica, Figurita } from '../types'

interface Props {
  figurita: Figurita
  dinamica: Dinamica | null
  tiene: boolean
  bloqueada: boolean
  onToggle: () => void
}

function Imagen({ src, alt, dorada }: { src: string | null; alt: string; dorada: boolean }) {
  const [falla, setFalla] = useState(!src)
  if (falla || !src) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <ImageOff className={dorada ? 'text-dorado/50' : 'text-crema/25'} size={28} />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFalla(true)}
      className="h-full w-full object-contain"
    />
  )
}

/** Una fila de dinámica (label + valor), solo si hay valor. */
function Campo({ label, valor }: { label: string; valor: string | null }) {
  if (!valor) return null
  return (
    <p className="text-xs leading-snug text-crema/75">
      <span className="font-semibold text-dorado">{label}: </span>
      {valor}
    </p>
  )
}

export function FiguritaCard({ figurita, dinamica, tiene, bloqueada, onToggle }: Props) {
  const [abierta, setAbierta] = useState(false)
  const dorada = figurita.es_dorada
  const hayDinamica =
    dinamica &&
    (dinamica.objetivo ||
      dinamica.productos ||
      dinamica.condicion ||
      dinamica.observaciones)

  // Estilos del marco/fondo
  const marco = dorada
    ? 'col-span-2 sm:col-span-3 border-dorado animate-glow-dorado'
    : 'border-dorado/20'

  const fondo = tiene
    ? 'bg-vino/50 shadow-lg shadow-black/25'
    : dorada
      ? 'bg-morado/60 opacity-90'
      : 'bg-morado/60 opacity-75 grayscale-[0.3]'

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-2xl border transition ${marco} ${fondo}`}
    >
      {/* Imagen (entera, object-contain sobre fondo oscuro) */}
      <div
        className={`relative w-full overflow-hidden bg-morado p-2 ${
          dorada ? 'aspect-[16/10]' : 'aspect-square'
        }`}
      >
        <Imagen src={figurita.imagen_url} alt={figurita.nombre} dorada={dorada} />

        {dorada && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-dorado px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-morado shadow">
            <Sparkles size={10} /> Dorada
          </span>
        )}

        {tiene && (
          <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-dorado text-morado shadow">
            <Check size={16} strokeWidth={3} />
          </span>
        )}
      </div>

      {/* Cuerpo */}
      <div className="flex flex-1 flex-col p-3">
        <h4 className="font-display text-base leading-tight text-crema">
          {figurita.nombre}
        </h4>

        {/* Cómo conseguirla (dinámica del tipo del canal) */}
        {hayDinamica ? (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setAbierta((v) => !v)}
              className="flex w-full items-center justify-between gap-1 text-left text-xs font-semibold text-dorado/90"
              aria-expanded={abierta}
            >
              Cómo conseguirla
              <ChevronDown
                size={14}
                className={`transition ${abierta ? 'rotate-180' : ''}`}
              />
            </button>
            {abierta && (
              <div className="mt-2 space-y-1.5 border-l-2 border-dorado/30 pl-2.5">
                <Campo label="Objetivo" valor={dinamica!.objetivo} />
                <Campo label="Productos" valor={dinamica!.productos} />
                <Campo label="Condición" valor={dinamica!.condicion} />
                <Campo label="Obs." valor={dinamica!.observaciones} />
              </div>
            )}
          </div>
        ) : (
          <p className="mt-2 text-xs italic text-crema/40">
            Sin dinámica cargada para tu canal.
          </p>
        )}

        {/* Tilde (se deshabilita si la página está completa/bloqueada) */}
        <button
          type="button"
          onClick={onToggle}
          disabled={bloqueada}
          aria-pressed={tiene}
          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed ${
            tiene
              ? 'bg-dorado text-morado hover:bg-[#d9b97a] disabled:hover:bg-dorado'
              : 'border border-dorado/40 text-crema hover:bg-dorado/10'
          }`}
        >
          {bloqueada ? (
            <>
              <Lock size={14} /> Completada
            </>
          ) : (
            <>
              <span
                className={`flex h-4 w-4 items-center justify-center rounded border ${
                  tiene ? 'border-morado bg-morado/20' : 'border-crema/50'
                }`}
              >
                {tiene && <Check size={12} strokeWidth={3} />}
              </span>
              {tiene ? 'Ya la tengo' : 'Marcar que la tengo'}
            </>
          )}
        </button>
      </div>
    </article>
  )
}
