import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Loader2, LogOut, Store } from 'lucide-react'
import { supabaseAuth } from '../lib/supabaseAuth'
import { Tablero } from '../components/proveedor/Tablero'
import { InversionProveedor } from '../components/proveedor/InversionProveedor'
import { FondoProveedor } from '../components/proveedor/FondoProveedor'

type Estado =
  | { status: 'cargando' }
  | { status: 'ok'; nombre: string; proveedorId: string }
  | { status: 'sin-vinculo' }
  | { status: 'error'; mensaje: string }

const uno = <T,>(x: T | T[] | null | undefined): T | null =>
  Array.isArray(x) ? (x[0] ?? null) : (x ?? null)

export function ProveedorPanel() {
  const navigate = useNavigate()
  const [estado, setEstado] = useState<Estado>({ status: 'cargando' })

  useEffect(() => {
    let activo = true

    async function cargar() {
      const { data: ses } = await supabaseAuth.auth.getSession()
      if (!activo) return
      if (!ses.session) {
        navigate('/proveedor/login', { replace: true })
        return
      }

      // Resolver a qué proveedor pertenece el usuario logueado
      const { data, error } = await supabaseAuth
        .from('proveedor_usuarios')
        .select('proveedor_id, proveedores ( nombre )')
        .eq('user_id', ses.session.user.id)
        .maybeSingle()

      if (!activo) return
      if (error) {
        setEstado({ status: 'error', mensaje: error.message })
        return
      }
      if (!data) {
        setEstado({ status: 'sin-vinculo' })
        return
      }
      const nombre =
        uno((data as { proveedores: unknown }).proveedores as { nombre: string })
          ?.nombre ?? 'tu marca'
      const proveedorId = (data as { proveedor_id: string }).proveedor_id
      setEstado({ status: 'ok', nombre, proveedorId })
    }

    cargar()
    return () => {
      activo = false
    }
  }, [navigate])

  async function cerrarSesion() {
    await supabaseAuth.auth.signOut()
    navigate('/proveedor/login', { replace: true })
  }

  return (
    <main className="relative min-h-screen text-crema">
      <FondoProveedor />
      <div className="sticky top-0 z-10 border-b border-dorado/20 bg-azul-oscuro/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Store size={18} className="text-dorado" />
            <span className="font-display text-lg">Panel de Proveedores</span>
          </div>
          <button
            type="button"
            onClick={cerrarSesion}
            className="inline-flex items-center gap-1.5 rounded-full border border-dorado/40 px-3 py-1.5 text-xs font-semibold text-dorado transition hover:bg-dorado/10"
          >
            <LogOut size={14} /> Cerrar sesión
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {estado.status === 'cargando' && (
          <div className="flex items-center gap-2 py-16 text-crema/60">
            <Loader2 className="animate-spin" size={20} /> Cargando tu panel…
          </div>
        )}

        {estado.status === 'error' && (
          <div className="flex items-start gap-3 rounded-xl border border-naranja/40 bg-naranja/10 px-5 py-4">
            <AlertTriangle className="mt-0.5 shrink-0 text-naranja" size={20} />
            <div className="text-sm text-crema/85">
              <p className="font-semibold text-crema">No pudimos cargar tu panel.</p>
              <p className="mt-1">{estado.mensaje}</p>
            </div>
          </div>
        )}

        {estado.status === 'sin-vinculo' && (
          <div className="rounded-xl border border-dorado/20 bg-white/5 px-5 py-8 text-center text-sm text-crema/70">
            Tu usuario no está vinculado a ningún proveedor todavía. Pedile al
            administrador que cargue tu acceso.
          </div>
        )}

        {estado.status === 'ok' && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-naranja">
              Mundial de Bebidas 2026
            </p>
            <h1 className="mt-2 font-display text-4xl text-crema">
              Panel de {estado.nombre}
            </h1>
            <Tablero proveedorId={estado.proveedorId} nombre={estado.nombre} />
            <div className="mt-8">
              <InversionProveedor />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
