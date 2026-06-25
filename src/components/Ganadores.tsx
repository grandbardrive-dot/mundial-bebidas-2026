import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Award, Loader2, PartyPopper, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Ganador } from '../types'

interface PremioRow {
  nombre: string
  tipo: 'semanal_1' | 'semanal_2' | null
}

function fmtFecha(f: string) {
  try {
    return new Date(f + 'T00:00:00').toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
    })
  } catch {
    return f
  }
}

export function Ganadores() {
  const [filas, setFilas] = useState<Ganador[] | null>(null)
  const [premios, setPremios] = useState<PremioRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    ;(async () => {
      const [gRes, pRes] = await Promise.all([
        supabase
          .from('ganadores')
          .select('id, nombre_local, premio, orden, fecha, origen, created_at')
          .order('premio', { ascending: true })
          .order('orden', { ascending: true, nullsFirst: false }),
        supabase.from('premios_generales').select('nombre, tipo'),
      ])
      if (!activo) return
      if (gRes.error) {
        setError(gRes.error.message)
        return
      }
      setFilas((gRes.data ?? []) as Ganador[])
      if (!pRes.error) setPremios((pRes.data ?? []) as PremioRow[])
    })()
    return () => {
      activo = false
    }
  }, [])

  const premioMayor =
    premios.find((p) => p.tipo === 'semanal_1')?.nombre ?? 'Smart TV'
  const premiosSegundo = premios
    .filter((p) => p.tipo === 'semanal_2')
    .map((p) => p.nombre)

  const ganadores = useMemo(() => filas ?? [], [filas])

  return (
    <section className="rounded-2xl border border-dorado/25 bg-morado/50 p-5 shadow-lg shadow-black/20">
      <div className="mb-1 flex items-center gap-2">
        <Award className="text-dorado" size={20} />
        <h2 className="font-display text-2xl text-crema">Ganadores</h2>
      </div>
      <p className="mb-4 text-xs text-crema/55">
        Premio mayor (1er puesto): <span className="text-dorado">{premioMayor}</span>.
        {premiosSegundo.length > 0 && <> 2° puesto: {premiosSegundo.join(' · ')}.</>}
      </p>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-naranja/40 bg-naranja/10 px-4 py-3 text-sm text-crema/80">
          <AlertTriangle className="shrink-0 text-naranja" size={16} /> {error}
        </div>
      )}

      {!filas && !error && (
        <div className="flex items-center gap-2 py-6 text-crema/60">
          <Loader2 className="animate-spin" size={18} /> Cargando…
        </div>
      )}

      {filas && !error && ganadores.length === 0 && (
        <div className="rounded-xl border border-dorado/20 bg-vino/20 px-5 py-10 text-center">
          <PartyPopper className="mx-auto text-dorado/70" size={32} />
          <p className="mt-3 text-sm text-crema/70">
            Todavía nadie completó el álbum… <br />
            <span className="font-semibold text-crema">¿serás el primero?</span>
          </p>
        </div>
      )}

      {filas && !error && ganadores.length > 0 && (
        <ol className="space-y-2">
          {ganadores.map((g) => {
            const esTV = /tv/i.test(g.premio)
            return (
              <li
                key={g.id}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                  esTV
                    ? 'border-2 border-dorado bg-dorado/15'
                    : 'border border-dorado/15 bg-vino/20'
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold ${
                    esTV ? 'bg-dorado text-morado' : 'bg-morado/70 text-crema/70'
                  }`}
                >
                  {esTV ? <Star size={18} /> : (g.orden ?? '•')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-crema">{g.nombre_local}</p>
                  <p className="text-xs text-crema/55">
                    {g.premio}
                    {g.orden != null && <> · #{g.orden}</>}
                    {g.fecha && <> · {fmtFecha(g.fecha)}</>}
                  </p>
                </div>
                {esTV && (
                  <span className="shrink-0 rounded-full bg-naranja px-3 py-1 text-xs font-bold uppercase tracking-wide text-crema">
                    ¡Ganador!
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
