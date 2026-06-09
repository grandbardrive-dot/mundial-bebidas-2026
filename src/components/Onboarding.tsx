import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Canal, Vendedor } from '../types'

// Orden de presentación de los canales (los desconocidos van al final)
const ORDEN_CANALES = [
  'Bar',
  'Restaurante',
  'Hotel',
  'Eventos',
  'Catering',
  'Vinoteca',
  'Autoservicio',
]

const ordenCanal = (nombre: string) => {
  const i = ORDEN_CANALES.indexOf(nombre)
  return i === -1 ? ORDEN_CANALES.length : i
}

const SUCURSALES = ['Mendoza', 'San Luis']

interface Props {
  onComplete: (clienteId: string) => void
}

type Carga =
  | { status: 'cargando' }
  | { status: 'ok'; vendedores: Vendedor[]; canales: Canal[] }
  | { status: 'error'; mensaje: string }

interface FormState {
  nombre_local: string
  contacto: string
  telefono: string
  sucursal: string
  canal_id: string
  vendedor_id: string
}

const FORM_INICIAL: FormState = {
  nombre_local: '',
  contacto: '',
  telefono: '',
  sucursal: '',
  canal_id: '',
  vendedor_id: '',
}

const inputBase =
  'w-full rounded-lg border bg-morado/50 px-4 py-3 text-crema placeholder-crema/35 outline-none transition focus:ring-2 focus:ring-naranja/40'

export function Onboarding({ onComplete }: Props) {
  const [carga, setCarga] = useState<Carga>({ status: 'cargando' })
  const [form, setForm] = useState<FormState>(FORM_INICIAL)
  const [errores, setErrores] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  )
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)

  useEffect(() => {
    let activo = true

    async function cargar() {
      setCarga({ status: 'cargando' })
      const [vRes, cRes] = await Promise.all([
        supabase
          .from('vendedores')
          .select('id, nombre, whatsapp, sucursal, tipo, activo')
          .eq('activo', true)
          .order('nombre', { ascending: true }),
        supabase.from('canales').select('id, nombre, tipo'),
      ])

      if (!activo) return
      if (vRes.error) {
        setCarga({ status: 'error', mensaje: vRes.error.message })
        return
      }
      if (cRes.error) {
        setCarga({ status: 'error', mensaje: cRes.error.message })
        return
      }

      const canales = ((cRes.data ?? []) as Canal[])
        .slice()
        .sort((a, b) => ordenCanal(a.nombre) - ordenCanal(b.nombre))

      setCarga({
        status: 'ok',
        vendedores: (vRes.data ?? []) as Vendedor[],
        canales,
      })
    }

    cargar()
    return () => {
      activo = false
    }
  }, [])

  // tipo (ON/OFF) del canal elegido
  const tipoCanal = useMemo(() => {
    if (carga.status !== 'ok' || !form.canal_id) return null
    return carga.canales.find((c) => c.id === form.canal_id)?.tipo ?? null
  }, [carga, form.canal_id])

  // Vendedores filtrados por sucursal + tipo del canal
  const vendedoresFiltrados = useMemo(() => {
    if (carga.status !== 'ok' || !form.sucursal || !tipoCanal) return []
    return carga.vendedores.filter(
      (v) => v.sucursal === form.sucursal && v.tipo === tipoCanal,
    )
  }, [carga, form.sucursal, tipoCanal])

  const vendedorHabilitado = !!form.sucursal && !!form.canal_id

  function update(field: keyof FormState, value: string) {
    setForm((f) => {
      const next = { ...f, [field]: value }
      // Si cambia sucursal o canal, el vendedor previo puede dejar de ser válido
      if (field === 'sucursal' || field === 'canal_id') {
        next.vendedor_id = ''
      }
      return next
    })
    setErrores((e) => {
      if (!e[field] && !(field === 'sucursal' || field === 'canal_id')) return e
      const n = { ...e }
      delete n[field]
      if (field === 'sucursal' || field === 'canal_id') delete n.vendedor_id
      return n
    })
  }

  function validar(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (!form.nombre_local.trim()) e.nombre_local = 'Ingresá el nombre del local'
    if (!form.contacto.trim()) e.contacto = 'Ingresá el nombre de contacto'
    if (!form.telefono.trim()) e.telefono = 'Ingresá un teléfono'
    if (!form.sucursal) e.sucursal = 'Elegí una sucursal'
    if (!form.canal_id) e.canal_id = 'Elegí un canal'
    if (!form.vendedor_id) e.vendedor_id = 'Elegí un vendedor'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setErrorEnvio(null)
    if (!validar()) return

    setEnviando(true)
    try {
      // Recuperar: si ya existe una ficha con el mismo local + teléfono, la reusamos
      const { data: existente, error: errBusca } = await supabase
        .from('clientes')
        .select('id')
        .eq('nombre_local', form.nombre_local.trim())
        .eq('telefono', form.telefono.trim())
        .maybeSingle()
      if (errBusca) throw errBusca
      if (existente) {
        onComplete(existente.id)
        return
      }

      // Crear la ficha
      const { data, error } = await supabase
        .from('clientes')
        .insert({
          nombre_local: form.nombre_local.trim(),
          contacto: form.contacto.trim(),
          telefono: form.telefono.trim(),
          sucursal: form.sucursal,
          canal_id: form.canal_id,
          vendedor_id: form.vendedor_id,
        })
        .select('id')
        .single()
      if (error) throw error

      onComplete(data.id)
    } catch (err) {
      setErrorEnvio(
        err instanceof Error
          ? err.message
          : 'No pudimos guardar tus datos. Probá de nuevo.',
      )
    } finally {
      setEnviando(false)
    }
  }

  const bordeError = (campo: keyof FormState) =>
    errores[campo] ? 'border-naranja' : 'border-dorado/30 focus:border-naranja'

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-morado px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-naranja">
            Mundial de Bebidas 2026
          </p>
          <h1 className="font-display text-4xl text-crema">Sumate al álbum</h1>
          <p className="mt-3 text-sm text-crema/70">
            Completá tus datos para empezar a coleccionar y reclamar premios.
          </p>
        </div>

        {/* Error al cargar los selects desde Supabase */}
        {carga.status === 'error' && (
          <div className="flex items-start gap-3 rounded-xl border border-naranja/40 bg-naranja/10 px-5 py-4 text-crema/80">
            <AlertTriangle className="mt-0.5 shrink-0 text-naranja" size={20} />
            <div className="text-sm">
              <p className="font-semibold text-crema">
                No pudimos cargar los datos del formulario.
              </p>
              <p className="mt-1">{carga.mensaje}</p>
            </div>
          </div>
        )}

        {carga.status === 'cargando' && (
          <div className="flex items-center justify-center gap-3 py-12 text-crema/70">
            <Loader2 className="animate-spin" size={22} />
            <span>Cargando formulario…</span>
          </div>
        )}

        {carga.status === 'ok' && (
          <form
            onSubmit={onSubmit}
            noValidate
            className="space-y-5 rounded-2xl border border-dorado/25 bg-vino/40 p-6 shadow-lg shadow-black/30"
          >
            {/* 1. Nombre del local */}
            <div>
              <label
                htmlFor="nombre_local"
                className="mb-1.5 block text-sm font-medium text-crema/90"
              >
                Nombre del local
              </label>
              <input
                id="nombre_local"
                type="text"
                value={form.nombre_local}
                onChange={(e) => update('nombre_local', e.target.value)}
                aria-invalid={!!errores.nombre_local}
                className={`${inputBase} ${bordeError('nombre_local')}`}
                placeholder="Ej: Bar La Esquina"
              />
              {errores.nombre_local && (
                <p className="mt-1 text-xs text-naranja">{errores.nombre_local}</p>
              )}
            </div>

            {/* 2. Nombre de contacto */}
            <div>
              <label
                htmlFor="contacto"
                className="mb-1.5 block text-sm font-medium text-crema/90"
              >
                Nombre de contacto
              </label>
              <input
                id="contacto"
                type="text"
                value={form.contacto}
                onChange={(e) => update('contacto', e.target.value)}
                aria-invalid={!!errores.contacto}
                className={`${inputBase} ${bordeError('contacto')}`}
                placeholder="Ej: Juan Pérez"
              />
              {errores.contacto && (
                <p className="mt-1 text-xs text-naranja">{errores.contacto}</p>
              )}
            </div>

            {/* 3. Teléfono */}
            <div>
              <label
                htmlFor="telefono"
                className="mb-1.5 block text-sm font-medium text-crema/90"
              >
                Teléfono
              </label>
              <input
                id="telefono"
                type="tel"
                inputMode="tel"
                value={form.telefono}
                onChange={(e) => update('telefono', e.target.value)}
                aria-invalid={!!errores.telefono}
                className={`${inputBase} ${bordeError('telefono')}`}
                placeholder="Ej: +54 9 261 555 5555"
              />
              {errores.telefono && (
                <p className="mt-1 text-xs text-naranja">{errores.telefono}</p>
              )}
            </div>

            {/* 4. Sucursal */}
            <div>
              <label
                htmlFor="sucursal"
                className="mb-1.5 block text-sm font-medium text-crema/90"
              >
                Sucursal
              </label>
              <select
                id="sucursal"
                value={form.sucursal}
                onChange={(e) => update('sucursal', e.target.value)}
                aria-invalid={!!errores.sucursal}
                className={`${inputBase} ${bordeError('sucursal')} appearance-none`}
              >
                <option value="" disabled>
                  Elegí tu sucursal…
                </option>
                {SUCURSALES.map((s) => (
                  <option key={s} value={s} className="bg-morado text-crema">
                    {s}
                  </option>
                ))}
              </select>
              {errores.sucursal && (
                <p className="mt-1 text-xs text-naranja">{errores.sucursal}</p>
              )}
            </div>

            {/* 5. Canal */}
            <div>
              <label
                htmlFor="canal_id"
                className="mb-1.5 block text-sm font-medium text-crema/90"
              >
                Canal
              </label>
              <select
                id="canal_id"
                value={form.canal_id}
                onChange={(e) => update('canal_id', e.target.value)}
                aria-invalid={!!errores.canal_id}
                className={`${inputBase} ${bordeError('canal_id')} appearance-none`}
              >
                <option value="" disabled>
                  Elegí tu canal…
                </option>
                {carga.canales.map((c) => (
                  <option key={c.id} value={c.id} className="bg-morado text-crema">
                    {c.nombre}
                  </option>
                ))}
              </select>
              {errores.canal_id && (
                <p className="mt-1 text-xs text-naranja">{errores.canal_id}</p>
              )}
            </div>

            {/* 6. Vendedor (depende de sucursal + tipo de canal) */}
            <div>
              <label
                htmlFor="vendedor_id"
                className="mb-1.5 block text-sm font-medium text-crema/90"
              >
                Vendedor
              </label>
              <select
                id="vendedor_id"
                value={form.vendedor_id}
                onChange={(e) => update('vendedor_id', e.target.value)}
                aria-invalid={!!errores.vendedor_id}
                disabled={!vendedorHabilitado}
                className={`${inputBase} ${bordeError('vendedor_id')} appearance-none disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <option value="" disabled>
                  {vendedorHabilitado
                    ? 'Elegí tu vendedor…'
                    : 'Elegí sucursal y canal primero'}
                </option>
                {vendedoresFiltrados.map((v) => (
                  <option key={v.id} value={v.id} className="bg-morado text-crema">
                    {v.nombre}
                  </option>
                ))}
              </select>
              {vendedorHabilitado && vendedoresFiltrados.length === 0 && (
                <p className="mt-1 text-xs text-crema/60">
                  No hay vendedores para esa sucursal y canal.
                </p>
              )}
              {errores.vendedor_id && (
                <p className="mt-1 text-xs text-naranja">{errores.vendedor_id}</p>
              )}
            </div>

            {/* Error de envío (Supabase) */}
            {errorEnvio && (
              <div className="flex items-start gap-2 rounded-lg border border-naranja/40 bg-naranja/10 px-4 py-3 text-sm text-crema/85">
                <AlertTriangle className="mt-0.5 shrink-0 text-naranja" size={18} />
                <span>{errorEnvio}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-naranja px-8 py-4 text-base font-semibold text-crema shadow-lg shadow-black/40 transition hover:bg-[#e0633a] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {enviando ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Guardando…
                </>
              ) : (
                'Empezar mi álbum'
              )}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm">
          <Link to="/" className="text-crema/50 underline-offset-4 hover:underline">
            ← Volver al inicio
          </Link>
        </p>
      </div>
    </main>
  )
}
