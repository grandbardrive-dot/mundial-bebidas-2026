import { useEffect, useState } from 'react'
import { Trophy, Tv } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Ganador } from '../types'

// Destacado de los ganadores de la Smart TV. Lee de la tabla `ganadores`
// (premio = 'TV'). Se usa en la landing (antes del login) y en el panel /app.
export function GanadoresTV() {
  const [ganadores, setGanadores] = useState<Ganador[]>([])

  useEffect(() => {
    let activo = true
    supabase
      .from('ganadores')
      .select('id, nombre_local, premio, orden, fecha, origen, created_at')
      .ilike('premio', 'tv')
      .order('orden', { ascending: true, nullsFirst: false })
      .then(({ data }) => {
        if (activo && data) setGanadores(data as Ganador[])
      })
    return () => {
      activo = false
    }
  }, [])

  if (ganadores.length === 0) return null

  return (
    <section className="rounded-2xl border border-dorado/40 bg-vino/30 p-5 shadow-lg shadow-black/20">
      <div className="mb-4 flex items-center justify-center gap-2 text-center">
        <Tv className="text-dorado" size={22} />
        <h2 className="font-display text-2xl text-crema">
          Ganadores de la <span className="text-dorado">Smart TV</span>
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ganadores.map((g) => (
          <article
            key={g.id}
            className="relative overflow-hidden rounded-2xl border-2 border-dorado bg-morado/60 p-5 text-center"
          >
            {g.orden != null && (
              <span className="absolute left-3 top-3 rounded-full bg-dorado px-3 py-1 text-xs font-bold uppercase tracking-wide text-morado">
                #{g.orden}
              </span>
            )}
            <span className="absolute right-3 top-3 rounded-full bg-naranja px-3 py-1 text-xs font-bold uppercase tracking-wide text-crema">
              ¡Ganador!
            </span>

            <div className="mx-auto mt-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-dorado/50 bg-morado">
              <Trophy className="text-dorado" size={34} />
            </div>

            <p className="mt-4 font-display text-xl text-crema">{g.nombre_local}</p>
            <p className="mt-1 text-sm text-dorado">Ganó la Smart TV 50&quot; 4K</p>
          </article>
        ))}
      </div>
    </section>
  )
}
