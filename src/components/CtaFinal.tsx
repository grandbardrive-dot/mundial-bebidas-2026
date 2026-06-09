import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export function CtaFinal() {
  return (
    <section className="relative overflow-hidden bg-vino px-6 py-24 text-center">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'radial-gradient(circle, #CBA86A 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="relative mx-auto max-w-2xl">
        <h2 className="font-display text-3xl text-crema sm:text-4xl">
          Tu álbum te está esperando
        </h2>
        <p className="mt-4 text-crema/75">
          Seguí tu colección, mirá qué te falta y reclamá tus premios.
        </p>
        <Link
          to="/app"
          className="mt-10 inline-flex items-center gap-2 rounded-full bg-naranja px-8 py-4 text-base font-semibold text-crema shadow-lg shadow-black/40 transition hover:scale-[1.03] hover:bg-[#e0633a] active:scale-100"
        >
          Ingresá a tu álbum
          <ArrowRight size={18} strokeWidth={2.4} />
        </Link>
      </div>
    </section>
  )
}
