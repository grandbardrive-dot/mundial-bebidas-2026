import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertTriangle, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { CategoriaGasto, GastoProyecto } from '../../types'

const CATEGORIAS: { id: CategoriaGasto; label: string }[] = [
  { id: 'impresion', label: 'Impresión' },
  { id: 'premio_general', label: 'Premio general' },
  { id: 'otro', label: 'Otro' },
]
const labelCat = (c: string) =>
  CATEGORIAS.find((x) => x.id === c)?.label ?? c

const input =
  'w-full rounded-lg border border-dorado/30 bg-morado/50 px-3 py-2 text-sm text-crema outline-none focus:border-naranja focus:ring-2 focus:ring-naranja/30'

const money = (n: number) =>
  '$' + (n ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })

interface FormState {
  concepto: string
  monto: string
  categoria: CategoriaGasto
}
const VACIO: FormState = { concepto: '', monto: '', categoria: 'otro' }

export function GastosTab() {
  const [lista, setLista] = useState<GastoProyecto[]>([])
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
      .from('gastos_proyecto')
      .select('id, concepto, monto, categoria, created_at')
      .order('created_at', { ascending: true })
    if (error) setErrorCarga(error.message)
    else setLista((data ?? []) as GastoProyecto[])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const total = useMemo(() => lista.reduce((a, g) => a + (g.monto ?? 0), 0), [lista])
  const porParte = total / 7

  function nuevo() {
    setEditId(null)
    setForm(VACIO)
    setErrorForm(null)
  }
  function editar(g: GastoProyecto) {
    setEditId(g.id)
    setForm({ concepto: g.concepto, monto: String(g.monto), categoria: g.categoria })
    setErrorForm(null)
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setErrorForm(null)
    if (!form.concepto.trim()) return setErrorForm('Ingresá el concepto.')
    if (form.monto === '' || isNaN(Number(form.monto)))
      return setErrorForm('Ingresá un monto válido.')

    setGuardando(true)
    const payload = {
      concepto: form.concepto.trim(),
      monto: Number(form.monto),
      categoria: form.categoria,
    }
    const res = editId
      ? await supabase.from('gastos_proyecto').update(payload).eq('id', editId)
      : await supabase.from('gastos_proyecto').insert(payload)
    setGuardando(false)
    if (res.error) return setErrorForm(res.error.message)
    nuevo()
    cargar()
  }

  async function eliminar(g: GastoProyecto) {
    if (!window.confirm(`¿Eliminar el gasto "${g.concepto}"?`)) return
    const { error } = await supabase.from('gastos_proyecto').delete().eq('id', g.id)
    if (error) setErrorCarga(error.message)
    else {
      if (editId === g.id) nuevo()
      cargar()
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Lista + totales */}
      <div className="order-2 lg:order-1">
        <h2 className="mb-3 font-display text-xl text-crema">
          Inversión / Gastos{' '}
          <span className="text-sm font-normal text-crema/50">({lista.length})</span>
        </h2>

        {/* Totales */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-dorado/20 bg-vino/20 p-4">
            <p className="text-xs text-crema/60">Total gastos compartidos</p>
            <p className="mt-1 font-display text-2xl text-crema">{money(total)}</p>
          </div>
          <div className="rounded-2xl border border-dorado/50 bg-dorado/10 p-4">
            <p className="text-xs text-crema/60">÷ 7 = por parte</p>
            <p className="mt-1 font-display text-2xl text-dorado">{money(porParte)}</p>
          </div>
        </div>

        {cargando && (
          <div className="flex items-center gap-2 py-6 text-crema/60">
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
                  <th className="px-3 py-2">Concepto</th>
                  <th className="px-3 py-2">Categoría</th>
                  <th className="px-3 py-2 text-right">Monto</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {lista.map((g) => (
                  <tr key={g.id} className="border-t border-dorado/10 hover:bg-vino/20">
                    <td className="px-3 py-2 font-medium text-crema">{g.concepto}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-azul/30 px-2 py-0.5 text-xs text-crema/80">
                        {labelCat(g.categoria)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-crema/80">
                      {money(g.monto)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => editar(g)}
                          className="text-crema/60 hover:text-dorado"
                          aria-label="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminar(g)}
                          className="text-crema/60 hover:text-naranja"
                          aria-label="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {lista.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-crema/50">
                      No hay gastos cargados.
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
              {editId ? 'Editar gasto' : 'Nuevo gasto'}
            </h3>
            {editId && (
              <button
                type="button"
                onClick={nuevo}
                className="text-crema/50 hover:text-crema"
                aria-label="Cancelar"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-crema/70">Concepto</label>
              <input
                className={input}
                value={form.concepto}
                onChange={(e) => setForm({ ...form, concepto: e.target.value })}
                placeholder='Ej: Smart TV 50" / Impresión álbumes'
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-crema/70">Monto</label>
              <input
                className={input}
                type="number"
                min={0}
                step="0.01"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-crema/70">Categoría</label>
              <select
                className={input}
                value={form.categoria}
                onChange={(e) =>
                  setForm({ ...form, categoria: e.target.value as CategoriaGasto })
                }
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.id} value={c.id} className="bg-morado">
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

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
              {editId ? 'Guardar cambios' : 'Agregar gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
