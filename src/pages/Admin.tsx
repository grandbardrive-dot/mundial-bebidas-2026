import { useState } from 'react'
import type { FormEvent } from 'react'
import { Lock, LogOut } from 'lucide-react'
import { PremiosProveedorTab } from '../components/admin/PremiosProveedorTab'
import { PremiosGeneralesTab } from '../components/admin/PremiosGeneralesTab'
import { VendedoresTab } from '../components/admin/VendedoresTab'
import { ReclamosTab } from '../components/admin/ReclamosTab'
import { BeneficiosTab } from '../components/admin/BeneficiosTab'
import { KpisDashboard } from '../components/admin/KpisDashboard'

const FLAG = 'gb_admin_ok'

type TabId =
  | 'dashboard'
  | 'proveedor'
  | 'generales'
  | 'vendedores'
  | 'reclamos'
  | 'estimaciones'
const TABS: { id: TabId; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'proveedor', label: 'Premios por proveedor' },
  { id: 'generales', label: 'Premios generales' },
  { id: 'vendedores', label: 'Vendedores' },
  { id: 'reclamos', label: 'Reclamos' },
  { id: 'estimaciones', label: 'Estimaciones de volumen' },
]

function Gate({ onOk }: { onOk: () => void }) {
  const [pass, setPass] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const esperado = import.meta.env.VITE_ADMIN_PASSWORD

  function submit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!esperado) {
      setErr('Falta configurar VITE_ADMIN_PASSWORD en el entorno.')
      return
    }
    if (pass === esperado) {
      sessionStorage.setItem(FLAG, '1')
      onOk()
    } else {
      setErr('Contraseña incorrecta.')
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-morado px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-dorado/25 bg-vino/40 p-6 shadow-lg shadow-black/30"
      >
        <div className="mb-5 flex items-center gap-2 text-dorado">
          <Lock size={20} />
          <h1 className="font-display text-2xl text-crema">Panel Admin</h1>
        </div>
        <label className="mb-1.5 block text-sm text-crema/80" htmlFor="pass">
          Contraseña
        </label>
        <input
          id="pass"
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          autoFocus
          className="w-full rounded-lg border border-dorado/30 bg-morado/50 px-4 py-3 text-crema outline-none focus:border-naranja focus:ring-2 focus:ring-naranja/40"
          placeholder="••••••••"
        />
        {err && <p className="mt-2 text-sm text-naranja">{err}</p>}
        <button
          type="submit"
          className="mt-5 w-full rounded-full bg-naranja px-6 py-3 text-sm font-semibold text-crema transition hover:bg-[#e0633a]"
        >
          Entrar
        </button>
      </form>
    </main>
  )
}

export function Admin() {
  const [ok, setOk] = useState(() => sessionStorage.getItem(FLAG) === '1')
  const [tab, setTab] = useState<TabId>('dashboard')

  if (!ok) return <Gate onOk={() => setOk(true)} />

  function salir() {
    sessionStorage.removeItem(FLAG)
    setOk(false)
  }

  return (
    <main className="min-h-screen bg-morado text-crema">
      {/* Top bar */}
      <div className="sticky top-0 z-20 border-b border-dorado/20 bg-morado/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <h1 className="font-display text-xl text-crema">
            Panel Admin <span className="text-dorado">GrandBar</span>
          </h1>
          <button
            type="button"
            onClick={salir}
            className="inline-flex items-center gap-1.5 rounded-full border border-dorado/40 px-3 py-1.5 text-xs font-semibold text-dorado transition hover:bg-dorado/10"
          >
            <LogOut size={14} /> Salir
          </button>
        </div>
        {/* Tabs */}
        <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 sm:px-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                tab === t.id
                  ? 'border-naranja text-crema'
                  : 'border-transparent text-crema/55 hover:text-crema/80'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {tab === 'dashboard' && <KpisDashboard />}
        {tab === 'proveedor' && <PremiosProveedorTab />}
        {tab === 'generales' && <PremiosGeneralesTab />}
        {tab === 'vendedores' && <VendedoresTab />}
        {tab === 'reclamos' && <ReclamosTab />}
        {tab === 'estimaciones' && <BeneficiosTab />}
      </div>
    </main>
  )
}
