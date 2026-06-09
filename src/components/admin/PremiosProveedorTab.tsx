import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertTriangle, ImageOff, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { PremioProveedor, Proveedor } from '../../types'

const input =
  'w-full rounded-lg border border-dorado/30 bg-morado/50 px-3 py-2 text-sm text-crema outline-none focus:border-naranja focus:ring-2 focus:ring-naranja/30'

interface FormState {
  proveedor_id: string
  nombre_premio: string
  condicion: string
  stock_inicial: string
  stock_disponible: string
  imagen_url: string
}

const VACIO: FormState = {
  proveedor_id: '',
  nombre_premio: '',
  condicion: '',
  stock_inicial: '0',
  stock_disponible: '0',
  imagen_url: '',
}

export function PremiosProveedorTab() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [premios, setPremios] = useState<PremioProveedor[]>([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>(VACIO)
  const [editId, setEditId] = useState<string | null>(null)
  const [dispTouched, setDispTouched] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setErrorCarga(null)
    const [pRes, prRes] = await Promise.all([
      supabase.from('proveedores').select('id, nombre, pagina_num').order('pagina_num'),
      supabase
        .from('premios_proveedor_semana')
        .select(
          'id, proveedor_id, semana, nombre_premio, imagen_url, stock_inicial, stock_disponible, condicion',
        )
        .order('proveedor_id'),
    ])
    if (pRes.error) setErrorCarga(pRes.error.message)
    else setProveedores((pRes.data ?? []) as Proveedor[])
    if (prRes.error) setErrorCarga(prRes.error.message)
    else setPremios((prRes.data ?? []) as PremioProveedor[])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const nombreProv = useMemo(() => {
    const m = new Map<string, string>()
    proveedores.forEach((p) => m.set(p.id, p.nombre))
    return m
  }, [proveedores])

  function nuevo() {
    setEditId(null)
    setForm(VACIO)
    setFile(null)
    setDispTouched(false)
    setErrorForm(null)
  }

  function editar(p: PremioProveedor) {
    setEditId(p.id)
    setForm({
      proveedor_id: p.proveedor_id ?? '',
      nombre_premio: p.nombre_premio ?? '',
      condicion: p.condicion ?? '',
      stock_inicial: String(p.stock_inicial ?? 0),
      stock_disponible: String(p.stock_disponible ?? 0),
      imagen_url: p.imagen_url ?? '',
    })
    setFile(null)
    setDispTouched(true)
    setErrorForm(null)
  }

  // Al crear, stock_disponible sigue a stock_inicial mientras no se toque a mano
  function setStockInicial(v: string) {
    setForm((f) => ({
      ...f,
      stock_inicial: v,
      stock_disponible: !editId && !dispTouched ? v : f.stock_disponible,
    }))
  }

  async function subirFoto(f: File): Promise<string> {
    const ext = (f.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `premio-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
    const { error } = await supabase.storage
      .from('premios-img')
      .upload(path, f, { upsert: true, cacheControl: '3600' })
    if (error) throw error
    const { data } = supabase.storage.from('premios-img').getPublicUrl(path)
    return data.publicUrl
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setErrorForm(null)
    if (!form.proveedor_id) return setErrorForm('Elegí un proveedor.')
    if (!form.nombre_premio.trim()) return setErrorForm('Falta el nombre del premio.')

    setGuardando(true)
    try {
      let imagen_url = form.imagen_url || null
      if (file) imagen_url = await subirFoto(file)

      const payload = {
        proveedor_id: form.proveedor_id,
        semana: 1, // fijo, según pedido
        nombre_premio: form.nombre_premio.trim(),
        condicion: form.condicion.trim() || null,
        stock_inicial: Number(form.stock_inicial) || 0,
        stock_disponible: Number(form.stock_disponible) || 0,
        imagen_url,
      }

      const res = editId
        ? await supabase
            .from('premios_proveedor_semana')
            .update(payload)
            .eq('id', editId)
        : await supabase.from('premios_proveedor_semana').insert(payload)
      if (res.error) throw res.error

      nuevo()
      cargar()
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'No se pudo guardar.')
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(p: PremioProveedor) {
    if (!window.confirm(`¿Eliminar el premio "${p.nombre_premio}"?`)) return
    const { error } = await supabase
      .from('premios_proveedor_semana')
      .delete()
      .eq('id', p.id)
    if (error) setErrorCarga(error.message)
    else {
      if (editId === p.id) nuevo()
      cargar()
    }
  }

  // Agrupar premios por proveedor
  const grupos = useMemo(() => {
    const map = new Map<string, PremioProveedor[]>()
    premios.forEach((p) => {
      const k = p.proveedor_id ?? 'sin'
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(p)
    })
    return [...map.entries()]
  }, [premios])

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      {/* Lista por proveedor */}
      <div className="order-2 lg:order-1">
        <h2 className="mb-3 font-display text-xl text-crema">
          Premios por proveedor{' '}
          <span className="text-sm font-normal text-crema/50">({premios.length})</span>
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

        {!cargando && !errorCarga && premios.length === 0 && (
          <p className="rounded-xl border border-dorado/20 bg-vino/20 px-4 py-8 text-center text-sm text-crema/60">
            Todavía no hay premios por proveedor. Creá el primero con el formulario.
          </p>
        )}

        <div className="space-y-6">
          {grupos.map(([provId, items]) => (
            <section key={provId}>
              <h3 className="mb-2 font-display text-lg text-dorado">
                {nombreProv.get(provId) ?? 'Sin proveedor'}
              </h3>
              <div className="space-y-2">
                {items.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl border border-dorado/15 bg-vino/30 p-3"
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dorado/20 bg-morado">
                      {p.imagen_url ? (
                        <img
                          src={p.imagen_url}
                          alt={p.nombre_premio}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageOff className="text-crema/30" size={20} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-crema">
                        {p.nombre_premio}
                      </p>
                      <p className="text-xs text-crema/60">
                        Stock: {p.stock_disponible}/{p.stock_inicial}
                        {p.condicion ? ` · ${p.condicion}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => editar(p)}
                      className="text-crema/60 hover:text-dorado"
                      aria-label="Editar"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminar(p)}
                      className="text-crema/60 hover:text-naranja"
                      aria-label="Eliminar"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Formulario */}
      <div className="order-1 lg:order-2">
        <form
          onSubmit={guardar}
          className="rounded-2xl border border-dorado/25 bg-vino/30 p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg text-crema">
              {editId ? 'Editar premio' : 'Nuevo premio'}
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
              <label className="mb-1 block text-xs text-crema/70">Proveedor</label>
              <select
                className={input}
                value={form.proveedor_id}
                onChange={(e) => setForm({ ...form, proveedor_id: e.target.value })}
              >
                <option value="" disabled>
                  Elegí proveedor…
                </option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id} className="bg-morado">
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-crema/70">
                Nombre del premio
              </label>
              <input
                className={input}
                value={form.nombre_premio}
                onChange={(e) => setForm({ ...form, nombre_premio: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-crema/70">Condición</label>
              <textarea
                className={`${input} min-h-[54px]`}
                value={form.condicion}
                onChange={(e) => setForm({ ...form, condicion: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-crema/70">Stock inicial</label>
                <input
                  className={input}
                  type="number"
                  min={0}
                  value={form.stock_inicial}
                  onChange={(e) => setStockInicial(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-crema/70">
                  Stock disponible
                </label>
                <input
                  className={input}
                  type="number"
                  min={0}
                  value={form.stock_disponible}
                  onChange={(e) => {
                    setDispTouched(true)
                    setForm({ ...form, stock_disponible: e.target.value })
                  }}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-crema/70">
                Foto del premio
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-xs text-crema/70 file:mr-3 file:rounded-full file:border-0 file:bg-dorado/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-dorado"
              />
              {form.imagen_url && !file && (
                <p className="mt-1 truncate text-[11px] text-crema/40">
                  Actual: {form.imagen_url}
                </p>
              )}
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
              {editId ? 'Guardar cambios' : 'Crear premio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
