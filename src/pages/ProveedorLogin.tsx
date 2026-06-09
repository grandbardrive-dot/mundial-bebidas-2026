import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { supabaseAuth } from '../lib/supabaseAuth'
import { FondoProveedor } from '../components/proveedor/FondoProveedor'

export function ProveedorLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Si ya hay sesión, ir directo al panel
  useEffect(() => {
    let activo = true
    supabaseAuth.auth.getSession().then(({ data }) => {
      if (activo && data.session) navigate('/proveedor', { replace: true })
    })
    return () => {
      activo = false
    }
  }, [navigate])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError('Completá email y contraseña.')
      return
    }
    setCargando(true)
    const { error } = await supabaseAuth.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setCargando(false)
    if (error) {
      setError('Email o contraseña incorrectos.')
      return
    }
    navigate('/proveedor', { replace: true })
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-10 text-crema">
      <FondoProveedor />

      <div className="w-full max-w-sm">
        {/* 1) Escudo del proyecto */}
        <img
          src="/brand/escudo.png"
          alt="Escudo Mundial de Bebidas GrandBar"
          className="mx-auto mb-6 h-32 w-auto drop-shadow-[0_6px_24px_rgba(0,0,0,0.5)]"
        />

        {/* 2) Título */}
        <h1 className="text-center font-display text-3xl text-crema sm:text-4xl">
          Portal de Proveedores
        </h1>

        {/* 3) Subtítulo / explicación */}
        <p className="mx-auto mt-3 max-w-xs text-center text-sm leading-relaxed text-crema/80">
          Seguí en tiempo real cómo avanzan tus clientes en el Mundial de Bebidas
          2026: progreso de figuritas, páginas completadas y premios reclamados de
          tu marca.
        </p>

        {/* 4) Formulario */}
        <form
          onSubmit={submit}
          className="mt-7 rounded-2xl border border-dorado/30 bg-white/5 p-6 shadow-xl shadow-black/30 backdrop-blur-sm"
        >
          <label className="mb-1 block text-sm text-crema/80" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-3 w-full rounded-lg border border-dorado/30 bg-white/10 px-4 py-3 text-crema outline-none focus:border-dorado focus:ring-2 focus:ring-dorado/40"
            placeholder="marca@ejemplo.com"
          />

          <label className="mb-1 block text-sm text-crema/80" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-dorado/30 bg-white/10 px-4 py-3 text-crema outline-none focus:border-dorado focus:ring-2 focus:ring-dorado/40"
            placeholder="••••••••"
          />

          {error && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-naranja">
              <AlertTriangle size={15} /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-dorado px-6 py-3 text-sm font-semibold text-azul-oscuro transition hover:bg-[#d9b97a] disabled:opacity-60"
          >
            {cargando ? <Loader2 className="animate-spin" size={16} /> : null}
            Ingresar
          </button>
        </form>

        {/* 5) Pie corporativo */}
        <div className="mt-8 flex items-center justify-center gap-2 text-crema/55">
          <img
            src="/brand/escudo.png"
            alt=""
            aria-hidden="true"
            className="h-6 w-auto opacity-80"
          />
          <span className="text-xs font-medium tracking-wide">
            GrandBar Distribuciones
          </span>
        </div>
      </div>
    </main>
  )
}
