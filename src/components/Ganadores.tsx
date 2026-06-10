import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Award, Loader2, PartyPopper, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface RankRow {
  id: string
  nombre_local: string
  completado_at: string | null
}

interface PremioRow {
  nombre: string
  tipo: 'semanal_1' | 'semanal_2' | null
}

function fmtFecha(iso: string) {
  try {
    return new Date(iso).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function Ganadores() {
  const [filas, setFilas] = useState<RankRow[] | null>(null)
  const [premios, setPremios] = useState<PremioRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    ;(async () => {
      const [rk, pr] = await Promise.all([
        supabase.from('vw_ranking').select('id, nombre_local, completado_at'),
        supabase.from('premios_generales').select('nombre, tipo'),
      ])
      if (!activo) return
      if (rk.error) {
        setError(rk.error.message)
        return
      }
      setFilas((rk.data ?? []) as RankRow[])
      if (!pr.error) setPremios((pr.data ?? []) as PremioRow[])
    })()
    return () => {
      activo = false
    }
  }, [])

  const ganadores = useMemo(() => {
    if (!filas) return []
    return filas
      .filter((f) => f.completado_at)
      .sort((a, b) => Date.parse(a.completado_at!) - Date.parse(b.completado_at!))
  }, [filas])

  const premioMayor =
    premios.find((p) => p.tipo === 'semanal_1')?.nombre ?? 'Smart TV'
  const premiosSegundo = premios
    .filter((p) => p.tipo === 'semanal_2')
    .map((p) => p.nombre)

  return (
    <section className="rounded-2xl border border-dorado/25 bg-morado/50 p-5 shadow-lg shadow-black/20">
      <div className="mb-1 flex items-center gap-2">
        <Award className="text-dorado" size={20} />
        <h2 className="font-display text-2xl text-crema">Ganadores</h2>
      </div>
      <p className="mb-4 text-xs text-crema/55">
        Premio mayor (1er puesto): <span className="text-dorado">{premioMayor}</span>.
        {premiosSegundo.length > 0 && (
          <> 2° puesto: {premiosSegundo.join(' · ')}.</>
        )}
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
          {ganadores.map((g, i) => {
            const esGanador = i === 0
            return (
              <li
                key={g.id}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                  esGanador
                    ? 'border-2 border-dorado bg-dorado/15'
                    : 'border border-dorado/15 bg-vino/20'
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    esGanador ? 'bg-dorado text-morado' : 'bg-morado/70 text-crema/70'
                  }`}
                >
                  {esGanador ? <Star size={18} /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-crema">{g.nombre_local}</p>
                  <p className="text-xs text-crema/55">
                    Completó el {fmtFecha(g.completado_at!)}
                  </p>
                </div>
                {esGanador && (
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
