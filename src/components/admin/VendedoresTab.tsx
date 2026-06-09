import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertTriangle, Loader2, Pencil, Plus, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { TipoCanal, Vendedor } from '../../types'

const SUCURSALES = ['Mendoza', 'San Luis']
const TIPOS: TipoCanal[] = ['ON', 'OFF']

const input =
  'w-full rounded-lg border border-dorado/30 bg-morado/50 px-3 py-2 text-sm text-crema outline-none focus:border-naranja focus:ring-2 focus:ring-naranja/30'

interface FormState {
  nombre: string
  whatsapp: string
  sucursal: string
  tipo: string
  activo: boolean
}

const VACIO: FormState = {
  nombre: '',
  whatsapp: '',
  sucursal: 'Mendoza',
  tipo: 'ON',
  activo: true,
}

export function VendedoresTab() {
  const [lista, setLista] = useState<Vendedor[]>([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>(VACIO)
  const [editId, setEditId] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setErrorCarga(null)
    const { data, error } = await supabase
      .from('vendedores')
      .select('id, nombre, whatsapp, sucursal, tipo, activo')
      .order('sucursal', { ascending: true })
      .order('tipo', { ascending: true })
      .order('nombre', { ascending: true })
    if (error) setErrorCarga(error.message)
    else setLista((data ?? []) as Vendedor[])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  function nuevo() {
    setEditId(null)
    setForm(VACIO)
    setErrorForm(null)
  }

  function editar(v: Vendedor) {
    setEditId(v.id)
    setForm({
      nombre: v.nombre ?? '',
      whatsapp: v.whatsapp ?? '',
      sucursal: v.sucursal ?? 'Mendoza',
      tipo: v.tipo ?? 'ON',
      activo: v.activo,
    })
    setErrorForm(null)
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setErrorForm(null)
    if (!form.nombre.trim()) {
      setErrorForm('El nombre es obligatorio.')
      return
    }
    if (!/^\d{10,15}$/.test(form.whatsapp.trim())) {
      setErrorForm(
        'WhatsApp inválido: solo dígitos, formato internacional (ej 5492610000001).',
      )
      return
    }

    setGuardando(true)
    const payload = {
      nombre: form.nombre.trim(),
      whatsapp: form.whatsapp.trim(),
      sucursal: form.sucursal,
      tipo: form.tipo,
      activo: form.activo,
    }
    const res = editId
      ? await supabase.from('vendedores').update(payload).eq('id', editId)
      : await supabase.from('vendedores').insert(payload)
    setGuardando(false)

    if (res.error) {
      setErrorForm(res.error.message)
      return
    }
    nuevo()
    cargar()
  }

  async function toggleActivo(v: Vendedor) {
    const { error } = await supabase
      .from('vendedores')
      .update({ activo: !v.activo })
      .eq('id', v.id)
    if (error) setErrorCarga(error.message)
    else cargar()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Lista */}
      <div className="order-2 lg:order-1">
        <h2 className="mb-3 font-display text-xl text-crema">
          Vendedores{' '}
          <span className="text-sm font-normal text-crema/50">({lista.length})</span>
        </h2>

        {cargando && (
          <div className="flex items-center gap-2 py-8 text-crema/60">
            <Loader2 className="animate-spin" size={18} /> Cargando…
          </div>
        )}
        {errorCarga && (
          <p className="flex items-center gap-2 text-sm text-naranja">
            <AlertTriangle size={16} /> {errorCarga}
          </p>
        )}

        {!cargando && !errorCarga && (
          <div className="overflow-x-auto rounded-xl border border-dorado/15">
            <table className="w-full text-left text-sm">
              <thead className="bg-vino/40 text-xs uppercase tracking-wide text-crema/60">
                <tr>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">WhatsApp</th>
                  <th className="px-3 py-2">Suc.</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {lista.map((v) => (
                  <tr
                    key={v.id}
                    className="border-t border-dorado/10 hover:bg-vino/20"
                  >
                    <td className="px-3 py-2 font-medium text-crema">{v.nombre}</td>
                    <td className="px-3 py-2 text-crema/70">{v.whatsapp}</td>
                    <td className="px-3 py-2 text-crema/70">{v.sucursal}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-azul/30 px-2 py-0.5 text-xs text-crema/80">
                        {v.tipo}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => toggleActivo(v)}
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          v.activo
                            ? 'bg-dorado/20 text-dorado'
                            : 'bg-crema/10 text-crema/50'
                        }`}
                      >
                        {v.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => editar(v)}
                        className="text-crema/60 hover:text-dorado"
                        aria-label="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {lista.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-crema/50">
                      No hay vendedores cargados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Formulario */}
      <div className="order-1 lg:order-2">
        <form
          onSubmit={guardar}
          className="rounded-2xl border border-dorado/25 bg-vino/30 p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg text-crema">
              {editId ? 'Editar vendedor' : 'Nuevo vendedor'}
            </h3>
            {editId && (
              <button
                type="button"
                onClick={nuevo}
                className="text-crema/50 hover:text-crema"
                aria-label="Cancelar edición"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-crema/70">Nombre</label>
              <input
                className={input}
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Nombre y apellido"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-crema/70">
                WhatsApp (solo dígitos)
              </label>
              <input
                className={input}
                value={form.whatsapp}
                onChange={(e) =>
                  setForm({ ...form, whatsapp: e.target.value.replace(/\D/g, '') })
                }
                inputMode="numeric"
                placeholder="5492610000001"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-crema/70">Sucursal</label>
                <select
                  className={input}
                  value={form.sucursal}
                  onChange={(e) => setForm({ ...form, sucursal: e.target.value })}
                >
                  {SUCURSALES.map((s) => (
                    <option key={s} value={s} className="bg-morado">
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-crema/70">Tipo</label>
                <select
                  className={input}
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                >
                  {TIPOS.map((t) => (
                    <option key={t} value={t} className="bg-morado">
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-crema/80">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) => setForm({ ...form, activo: e.target.checked })}
              />
              Activo
            </label>

            {errorForm && (
              <p className="flex items-start gap-1.5 text-xs text-naranja">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {errorForm}
              </p>
            )}

            <button
              type="submit"
              disabled={guardando}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-naranja px-4 py-2.5 text-sm font-semibold text-crema transition hover:bg-[#e0633a] disabled:opacity-60"
            >
              {guardando ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Plus size={16} />
              )}
              {editId ? 'Guardar cambios' : 'Crear vendedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
