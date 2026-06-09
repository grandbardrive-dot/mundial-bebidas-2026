import { Link } from 'react-router-dom'

export function Hero() {
  return (
    <header className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
      {/* Fondo: arte de la tapa del álbum (carga priorizada) */}
      <img
        src="/brand/tapa.png"
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
      />
      {/* Overlay en degradé: oscuro abajo y ARRIBA para tapar el texto incrustado
          de la tapa; algo más claro en el centro para dejar ver el arte. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(to bottom, rgba(46,26,58,0.985) 0%, rgba(46,26,58,0.965) 38%, rgba(46,26,58,0.74) 64%, rgba(46,26,58,0.90) 100%)',
        }}
      />

      {/* Escudo GrandBar (no recolorear ni deformar) */}
      <img
        src="/brand/escudo.png"
        alt="Escudo GrandBar"
        width={180}
        height={180}
        className="mb-8 w-[140px] drop-shadow-[0_6px_24px_rgba(0,0,0,0.55)] md:w-[180px]"
      />

      <h1 className="font-display font-normal leading-[0.95] text-crema drop-shadow-[0_2px_20px_rgba(0,0,0,0.5)]">
        <span className="block text-4xl sm:text-6xl lg:text-7xl">
          MUNDIAL DE BEBIDAS
        </span>
        <span className="mt-2 block text-6xl text-naranja sm:text-8xl lg:text-9xl">
          2026
        </span>
      </h1>

      <p className="mt-6 text-lg font-semibold uppercase tracking-[0.3em] text-dorado sm:text-xl">
        GrandBar Distribuciones
      </p>

      <div className="mt-6 flex items-center gap-3 text-crema/90">
        <span className="hidden h-px w-8 bg-dorado/60 sm:block" />
        <p className="text-base font-medium sm:text-lg">
          Del <span className="font-semibold text-dorado">1 al 30 de junio</span>{' '}
          — completá tu álbum y ganá
        </p>
        <span className="hidden h-px w-8 bg-dorado/60 sm:block" />
      </div>

      <Link
        to="/app"
        className="mt-10 inline-flex items-center gap-2 rounded-full bg-naranja px-8 py-4 text-base font-semibold text-crema shadow-lg shadow-black/40 transition hover:scale-[1.03] hover:bg-[#e0633a] active:scale-100"
      >
        Ingresá a tu álbum
      </Link>

      {/* Indicador de scroll */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-crema/40">
        <div className="h-9 w-5 rounded-full border-2 border-current p-1">
          <div className="mx-auto h-2 w-1 animate-bounce rounded-full bg-current" />
        </div>
      </div>
    </header>
  )
}
