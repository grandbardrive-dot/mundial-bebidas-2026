import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertTriangle, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Ganador } from '../../types'

const PREMIOS = ['TV', 'cava', 'camiseta']

const input =
  'w-full rounded-lg border border-dorado/30 bg-morado/50 px-3 py-2 text-sm text-crema outline-none focus:border-naranja focus:ring-2 focus:ring-naranja/30'

interface FormState {
  nombre_local: string
  premio: string
  orden: string
  fecha: string
}
const VACIO: FormState = { nombre_local: '', premio: 'TV', orden: '', fecha: '' }

export function GanadoresTab() {
  const [lista, setLista] = useState<Ganador[]>([])
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
      .from('ganadores')
      .select('id, nombre_local, premio, orden, fecha, origen, created_at')
      .order('premio', { ascending: true })
      .order('orden', { ascending: true, nullsFirst: false })
    if (error) setErrorCarga(error.message)
    else setLista((data ?? []) as Ganador[])
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
  function editar(g: Ganador) {
    setEditId(g.id)
    setForm({
      nombre_local: g.nombre_local,
      premio: g.premio,
      orden: g.orden != null ? String(g.orden) : '',
      fecha: g.fecha ?? '',
    })
    setErrorForm(null)
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setErrorForm(null)
    if (!form.nombre_local.trim()) return setErrorForm('Ingresá el nombre del local.')
    setGuardando(true)
    const payload = {
      nombre_local: form.nombre_local.trim(),
      premio: form.premio,
      orden: form.orden === '' ? null : Number(form.orden),
      fecha: form.fecha === '' ? null : form.fecha,
      origen: 'manual' as const,
    }
    const res = editId
      ? await supabase.from('ganadores').update(payload).eq('id', editId)
      : await supabase.from('ganadores').insert(payload)
    setGuardando(false)
    if (res.error) return setErrorForm(res.error.message)
    nuevo()
    cargar()
  }

  async function eliminar(g: Ganador) {
    if (!window.confirm(`¿Eliminar a "${g.nombre_local}" (${g.premio})?`)) return
    const { error } = await supabase.from('ganadores').delete().eq('id', g.id)
    if (error) setErrorCarga(error.message)
    else {
      if (editId === g.id) nuevo()
      cargar()
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Lista */}
      <div className="order-2 lg:order-1">
        <h2 className="mb-3 font-display text-xl text-crema">
          Ganadores{' '}
          <span className="text-sm font-normal text-crema/50">({lista.length})</span>
        </h2>

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
                  <th className="px-3 py-2">Local</th>
                  <th className="px-3 py-2">Premio</th>
                  <th className="px-3 py-2">Orden</th>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Origen</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {lista.map((g) => (
                  <tr key={g.id} className="border-t border-dorado/10 hover:bg-vino/20">
                    <td className="px-3 py-2 font-medium text-crema">{g.nombre_local}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-dorado/20 px-2 py-0.5 text-xs text-dorado">
                        {g.premio}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-crema/70">{g.orden ?? '—'}</td>
                    <td className="px-3 py-2 text-crema/70">{g.fecha ?? '—'}</td>
                    <td className="px-3 py-2 text-crema/50">{g.origen}</td>
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
                    <td colSpan={6} className="px-3 py-6 text-center text-crema/50">
                      No hay ganadores cargados.
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
              {editId ? 'Editar ganador' : 'Nuevo ganador'}
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
              <label className="mb-1 block text-xs text-crema/70">Nombre del local</label>
              <input
                className={input}
                value={form.nombre_local}
                onChange={(e) => setForm({ ...form, nombre_local: e.target.value })}
                placeholder="Ej: VINOTECA LA PREVIA"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-crema/70">Premio</label>
              <select
                className={input}
                value={form.premio}
                onChange={(e) => setForm({ ...form, premio: e.target.value })}
              >
                {PREMIOS.map((p) => (
                  <option key={p} value={p} className="bg-morado">
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-crema/70">
                  Semana / orden
                </label>
                <input
                  className={input}
                  type="number"
                  min={1}
                  value={form.orden}
                  onChange={(e) => setForm({ ...form, orden: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-crema/70">Fecha</label>
                <input
                  className={input}
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                />
              </div>
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
              {editId ? 'Guardar cambios' : 'Agregar ganador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
