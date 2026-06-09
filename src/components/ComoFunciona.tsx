import { ShoppingCart, BookOpenCheck, Gift } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Paso {
  icono: LucideIcon
  titulo: string
  texto: string
}

const PASOS: Paso[] = [
  {
    icono: ShoppingCart,
    titulo: 'Comprá y sumá figuritas',
    texto: 'Cada compra de productos participantes te suma figuritas para tu álbum.',
  },
  {
    icono: BookOpenCheck,
    titulo: 'Completá las páginas',
    texto: 'Pegá tus figuritas y completá las páginas de cada proveedor.',
  },
  {
    icono: Gift,
    titulo: 'Reclamá tus premios',
    texto: 'Cuando completes, reclamá premios semanales y de proveedores.',
  },
]

export function ComoFunciona() {
  return (
    <section className="bg-vino px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-naranja">
          En 3 pasos
        </p>
        <h2 className="font-display text-3xl text-crema sm:text-4xl">
          Cómo funciona
        </h2>

        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          {PASOS.map((paso, i) => {
            const Icono = paso.icono
            return (
              <div
                key={paso.titulo}
                className="group relative flex flex-col items-center rounded-2xl border border-dorado/25 bg-morado p-8 text-center shadow-lg shadow-black/20 transition hover:-translate-y-1 hover:border-dorado/50"
              >
                <span className="absolute -top-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-naranja text-sm font-bold text-crema shadow">
                  {i + 1}
                </span>
                <div className="mb-5 mt-2 flex h-16 w-16 items-center justify-center rounded-full bg-dorado/15 text-dorado transition group-hover:bg-dorado/25">
                  <Icono size={30} strokeWidth={1.8} />
                </div>
                <h3 className="font-display text-xl text-crema">{paso.titulo}</h3>
                <p className="mt-3 text-sm leading-relaxed text-crema/70">
                  {paso.texto}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
