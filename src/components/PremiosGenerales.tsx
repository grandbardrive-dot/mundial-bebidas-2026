import { useEffect, useState } from 'react'
import { AlertTriangle, Crown, Medal } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { PremioGeneral } from '../types'
import { PremioMayorCard, PremioSegundoCard } from './PremioCard'

type Estado =
  | { status: 'cargando' }
  | { status: 'ok'; premios: PremioGeneral[] }
  | { status: 'error'; mensaje: string }

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-dorado/20 bg-vino/40">
      <div className="aspect-[4/3] w-full animate-pulse bg-crema/10" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-3/4 animate-pulse rounded bg-crema/10" />
        <div className="h-4 w-full animate-pulse rounded bg-crema/10" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-crema/10" />
      </div>
    </div>
  )
}

export function PremiosGenerales() {
  const [estado, setEstado] = useState<Estado>({ status: 'cargando' })
  // Semanas cuyo TV ya fue entregado (hay ganador de TV con ese orden)
  const [tvEntregadas, setTvEntregadas] = useState<Set<number>>(new Set())

  useEffect(() => {
    let activo = true

    async function cargar() {
      const [premRes, ganRes] = await Promise.all([
        supabase
          .from('premios_generales')
          .select('id, nombre, descripcion, tipo, semana, imagen_url, cantidad')
          .order('semana', { ascending: true, nullsFirst: false }),
        supabase.from('ganadores').select('orden, premio').ilike('premio', 'tv'),
      ])

      if (!activo) return
      if (premRes.error) {
        setEstado({ status: 'error', mensaje: premRes.error.message })
      } else {
        setEstado({ status: 'ok', premios: (premRes.data ?? []) as PremioGeneral[] })
      }
      if (!ganRes.error) {
        const set = new Set<number>()
        for (const g of (ganRes.data ?? []) as { orden: number | null }[]) {
          if (g.orden != null) set.add(g.orden)
        }
        setTvEntregadas(set)
      }
    }

    cargar()
    return () => {
      activo = false
    }
  }, [])

  const mayores =
    estado.status === 'ok'
      ? estado.premios.filter((p) => p.tipo === 'semanal_1')
      : []
  const segundos =
    estado.status === 'ok'
      ? estado.premios.filter((p) => p.tipo === 'semanal_2')
      : []

  return (
    <section className="bg-morado px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-naranja">
            Premios generales
          </p>
          <h2 className="font-display text-3xl text-crema sm:text-4xl">
            Lo que podés ganar
          </h2>
        </div>

        {/* Estado de error */}
        {estado.status === 'error' && (
          <div className="mx-auto mt-12 flex max-w-md items-center gap-3 rounded-xl border border-naranja/40 bg-naranja/10 px-5 py-4 text-center text-crema/80">
            <AlertTriangle className="shrink-0 text-naranja" size={22} />
            <p className="text-sm">
              No pudimos cargar los premios. {estado.mensaje}
            </p>
          </div>
        )}

        {/* PREMIO MAYOR */}
        <div className="mt-16">
          <div className="mb-8 flex items-center justify-center gap-3">
            <Crown className="text-dorado" size={26} />
            <h3 className="font-display text-2xl text-dorado">
              Premio Mayor
              <span className="ml-2 text-base text-crema/60">— 1 por semana</span>
            </h3>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {estado.status === 'cargando' &&
              Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}

            {estado.status === 'ok' &&
              mayores.map((p) => (
                <PremioMayorCard
                  key={p.id}
                  premio={p}
                  entregado={p.semana != null && tvEntregadas.has(p.semana)}
                />
              ))}

            {estado.status === 'ok' && mayores.length === 0 && (
              <p className="col-span-full text-center text-crema/50">
                Próximamente anunciamos los premios mayores.
              </p>
            )}
          </div>
        </div>

        {/* 2° PUESTO */}
        <div className="mt-20">
          <div className="mb-8 flex items-center justify-center gap-3">
            <Medal className="text-crema/80" size={26} />
            <h3 className="font-display text-2xl text-crema">2° Puesto</h3>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {estado.status === 'cargando' &&
              Array.from({ length: 2 }).map((_, i) => <CardSkeleton key={i} />)}

            {estado.status === 'ok' &&
              segundos.map((p) => <PremioSegundoCard key={p.id} premio={p} />)}

            {estado.status === 'ok' && segundos.length === 0 && (
              <p className="col-span-full text-center text-crema/50">
                Próximamente anunciamos los premios de segundo puesto.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
