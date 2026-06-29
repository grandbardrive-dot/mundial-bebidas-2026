import { useState } from 'react'
import { Check, Gift, Trophy } from 'lucide-react'
import type { PremioGeneral } from '../types'

/** Imagen del premio con fallback elegante si el archivo no existe. */
function PremioImagen({ src, alt }: { src: string | null; alt: string }) {
  const [falla, setFalla] = useState(!src)

  if (falla || !src) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-azul to-morado text-dorado/80">
        <Gift size={48} strokeWidth={1.4} />
        <span className="text-xs font-medium uppercase tracking-widest text-crema/50">
          Premio
        </span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFalla(true)}
      className="h-full w-full object-cover"
    />
  )
}

/** Card del PREMIO MAYOR (semanal_1): borde dorado + badge de trofeo + acento naranja.
 *  Si `entregado`, se muestra atenuada/gris con sello "Entregado". */
export function PremioMayorCard({
  premio,
  entregado,
}: {
  premio: PremioGeneral
  entregado?: boolean
}) {
  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border-2 bg-vino shadow-lg shadow-black/30 transition ${
        entregado
          ? 'border-crema/20 opacity-60 grayscale'
          : 'border-dorado hover:-translate-y-1.5 hover:shadow-xl'
      }`}
    >
      {/* Badge de semana (acento naranja) */}
      <div className="absolute left-4 top-4 z-10 rounded-full bg-naranja px-3 py-1 text-xs font-bold uppercase tracking-wide text-crema shadow">
        Semana {premio.semana}
      </div>
      {/* Badge: entregado (gris) o trofeo dorado */}
      {entregado ? (
        <div className="absolute right-4 top-4 z-10 inline-flex items-center gap-1 rounded-full bg-crema/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-crema shadow">
          <Check size={12} strokeWidth={3} /> Entregado
        </div>
      ) : (
        <div className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-dorado text-morado shadow">
          <Trophy size={18} strokeWidth={2.4} />
        </div>
      )}

      <div className="aspect-[4/3] w-full overflow-hidden">
        <PremioImagen src={premio.imagen_url} alt={premio.nombre} />
      </div>

      <div className="p-5">
        <h4 className="font-display text-lg leading-tight text-crema">
          {premio.nombre}
        </h4>
        <p className="mt-2 text-sm leading-relaxed text-crema/65">
          {entregado
            ? 'Este televisor ya fue entregado.'
            : 'Para el primer cliente que complete el álbum completo esa semana.'}
        </p>
      </div>
    </article>
  )
}

/** Card del 2° PUESTO (semanal_2): fondo oscuro, borde dorado, muestra cantidad. */
export function PremioSegundoCard({ premio }: { premio: PremioGeneral }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-dorado/40 bg-morado shadow-lg shadow-black/25 transition hover:-translate-y-1 hover:border-dorado/70">
      <div className="aspect-[4/3] w-full overflow-hidden">
        <PremioImagen src={premio.imagen_url} alt={premio.nombre} />
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h4 className="font-display text-lg leading-tight text-crema">
            {premio.nombre}
          </h4>
          {premio.cantidad != null && (
            <span className="shrink-0 rounded-full bg-naranja/20 px-2.5 py-1 text-xs font-bold text-naranja">
              {premio.cantidad} disp.
            </span>
          )}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-crema/65">
          Si completás segundo, elegís entre estos premios.
        </p>
      </div>
    </article>
  )
}
