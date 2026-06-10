import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Crown, Loader2, Trophy } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface RankRow {
  id: string
  nombre_local: string
  completado_at: string | null
  tildadas: number
  total: number
}

interface Calc extends RankRow {
  pct: number
  pos: number
}

interface Props {
  clienteId: string
}

export function RankingClientes({ clienteId }: Props) {
  const [filas, setFilas] = useState<RankRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    supabase
      .from('vw_ranking')
      .select('id, nombre_local, completado_at, tildadas, total')
      .then(({ data, error }) => {
        if (!activo) return
        if (error) setError(error.message)
        else setFilas((data ?? []) as RankRow[])
      })
    return () => {
      activo = false
    }
  }, [])

  const { ranking, yo } = useMemo(() => {
    if (!filas) return { ranking: [] as Calc[], yo: null as Calc | null }
    const calc = filas
      .map((f) => ({
        ...f,
        pct: f.total > 0 ? Math.round((f.tildadas / f.total) * 100) : 0,
      }))
      .sort((a, b) => {
        if (b.pct !== a.pct) return b.pct - a.pct
        // empate: primero el que completó antes
        const ca = a.completado_at ? Date.parse(a.completado_at) : Infinity
        const cb = b.completado_at ? Date.parse(b.completado_at) : Infinity
        if (ca !== cb) return ca - cb
        return a.nombre_local.localeCompare(b.nombre_local)
      })
      .map((f, i) => ({ ...f, pos: i + 1 }))
    const yo = calc.find((c) => c.id === clienteId) ?? null
    return { ranking: calc, yo }
  }, [filas, clienteId])

  return (
    <section className="rounded-2xl border border-dorado/25 bg-vino/30 p-5 shadow-lg shadow-black/20">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="text-dorado" size={20} />
        <h2 className="font-display text-2xl text-crema">Tabla de posiciones</h2>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-naranja/40 bg-naranja/10 px-4 py-3 text-sm text-crema/80">
          <AlertTriangle className="shrink-0 text-naranja" size={16} /> {error}
        </div>
      )}

      {!filas && !error && (
        <div className="flex items-center gap-2 py-6 text-crema/60">
          <Loader2 className="animate-spin" size={18} /> Cargando ranking…
        </div>
      )}

      {filas && !error && (
        <>
          <ol className="space-y-1.5">
            {ranking.slice(0, 10).map((c) => (
              <FilaRank key={c.id} c={c} esYo={c.id === clienteId} />
            ))}
            {ranking.length === 0 && (
              <li className="py-4 text-center text-sm text-crema/50">
                Todavía no hay participantes.
              </li>
            )}
          </ol>

          {/* Tu posición */}
          {yo && (
            <div className="mt-4 border-t border-dorado/15 pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-naranja">
                Tu posición
              </p>
              <FilaRank c={yo} esYo destacar />
            </div>
          )}
        </>
      )}
    </section>
  )
}

function FilaRank({
  c,
  esYo,
  destacar,
}: {
  c: Calc
  esYo: boolean
  destacar?: boolean
}) {
  const esPrimero = c.pos === 1
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
        esPrimero
          ? 'border border-dorado bg-dorado/15'
          : esYo
            ? 'border border-naranja/50 bg-naranja/10'
            : 'bg-morado/40'
      } ${destacar ? 'ring-1 ring-naranja/40' : ''}`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          esPrimero ? 'bg-dorado text-morado' : 'bg-morado/70 text-crema/80'
        }`}
      >
        {esPrimero ? <Crown size={15} /> : c.pos}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium text-crema">
        {c.nombre_local}
        {esYo && <span className="ml-2 text-xs text-naranja">(vos)</span>}
      </span>
      <div className="flex w-28 shrink-0 items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-morado/70">
          <div
            className="h-full rounded-full"
            style={{
              width: `${c.pct}%`,
              background: esPrimero ? '#CBA86A' : '#D2552A',
            }}
          />
        </div>
        <span className="w-9 text-right text-sm font-semibold text-crema">
          {c.pct}%
        </span>
      </div>
    </div>
  )
}
