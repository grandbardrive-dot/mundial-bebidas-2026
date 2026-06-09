import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Loader2, LogIn } from 'lucide-react'
import { supabaseAuth } from '../lib/supabaseAuth'

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
    <main className="flex min-h-screen items-center justify-center bg-morado px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-dorado/25 bg-vino/40 p-6 shadow-lg shadow-black/30"
      >
        <div className="mb-1 flex items-center gap-2 text-dorado">
          <LogIn size={20} />
          <h1 className="font-display text-2xl text-crema">Panel de Proveedores</h1>
        </div>
        <p className="mb-5 text-sm text-crema/60">
          Ingresá con el email y la contraseña de tu marca.
        </p>

        <label className="mb-1 block text-sm text-crema/80" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 w-full rounded-lg border border-dorado/30 bg-morado/50 px-4 py-3 text-crema outline-none focus:border-naranja focus:ring-2 focus:ring-naranja/40"
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
          className="w-full rounded-lg border border-dorado/30 bg-morado/50 px-4 py-3 text-crema outline-none focus:border-naranja focus:ring-2 focus:ring-naranja/40"
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
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-naranja px-6 py-3 text-sm font-semibold text-crema transition hover:bg-[#e0633a] disabled:opacity-60"
        >
          {cargando ? <Loader2 className="animate-spin" size={16} /> : null}
          Ingresar
        </button>
      </form>
    </main>
  )
}
