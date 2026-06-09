// Fondo corporativo del panel de proveedores: degradé azul GrandBar + siluetas
// de pelotas de fútbol flotando muy lento. 100% CSS, decorativo y discreto.
// pointer-events-none para no interferir con la UI.

function Pelota({
  className,
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <polygon
        points="50,30 64,40 59,57 41,57 36,40"
        fill="currentColor"
        fillOpacity="0.35"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <line x1="50" y1="30" x2="50" y2="6" stroke="currentColor" strokeWidth="2" />
      <line x1="64" y1="40" x2="86" y2="29" stroke="currentColor" strokeWidth="2" />
      <line x1="59" y1="57" x2="73" y2="80" stroke="currentColor" strokeWidth="2" />
      <line x1="41" y1="57" x2="27" y2="80" stroke="currentColor" strokeWidth="2" />
      <line x1="36" y1="40" x2="14" y2="29" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

export function FondoProveedor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Degradé base azul GrandBar */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(160deg, #1F447F 0%, #16335E 100%)',
        }}
      />
      {/* Viñeta sutil para foco central */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(203,168,106,0.06) 0%, transparent 60%)',
        }}
      />

      {/* Líneas de cancha muy tenues: círculo central */}
      <div className="absolute left-1/2 top-1/2 h-[55vmin] w-[55vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dorado/[0.06]" />
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-dorado/[0.05]" />

      {/* Pelotas flotantes (algunas solo en >= sm para aligerar mobile) */}
      <Pelota
        className="flota-a absolute left-[6%] top-[14%] h-16 w-16 text-dorado opacity-[0.09]"
      />
      <Pelota
        className="flota-b absolute right-[8%] top-[22%] h-24 w-24 text-crema opacity-[0.06]"
      />
      <Pelota
        className="flota-c absolute bottom-[12%] left-[16%] hidden h-20 w-20 text-dorado opacity-[0.07] sm:block"
      />
      <Pelota
        className="flota-a absolute bottom-[18%] right-[14%] hidden h-14 w-14 text-crema opacity-[0.06] sm:block"
      />
      <Pelota
        className="flota-b absolute right-[40%] top-[60%] hidden h-28 w-28 text-dorado opacity-[0.05] lg:block"
      />
    </div>
  )
}
