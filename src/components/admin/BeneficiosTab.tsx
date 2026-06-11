import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Info,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { TipoCanal } from '../../types'

type TipoBeneficio = 'sin_cargo' | 'descuento' | 'material' | 'diluyente' | 'combo'

// Qué campos de botellas muestra cada tipo (costo y nota van en todos).
const TIPOS: Record<
  TipoBeneficio,
  { label: string; fields: ('fact' | 'sin')[] }
> = {
  sin_cargo: { label: 'Sin cargo', fields: ['sin'] },
  descuento: { label: 'Descuento', fields: ['fact'] },
  material: { label: 'Material POP', fields: [] },
  diluyente: { label: 'Diluyente', fields: [] },
  combo: { label: 'Combo', fields: ['fact', 'sin'] },
}
const TIPO_IDS = Object.keys(TIPOS) as TipoBeneficio[]

const uno = <T,>(x: T | T[] | null | undefined): T | null =>
  Array.isArray(x) ? (x[0] ?? null) : (x ?? null)

interface DinRow {
  id: string
  tipo: TipoCanal
  objetivo: string | null
  productos: string | null
  condicion: string | null
  figuritas:
    | { nombre: string; proveedores: { nombre: string; pagina_num: number | null } | { nombre: string; pagina_num: number | null }[] | null }
    | { nombre: string; proveedores: { nombre: string; pagina_num: number | null } | { nombre: string; pagina_num: number | null }[] | null }[]
    | null
}

interface Ben {
  localKey: string
  id: string | null
  tipo: TipoBeneficio
  botellas_facturadas: number
  botellas_sin_cargo: number
  costo: number
  nota: string
}

const input =
  'rounded-md border border-dorado/30 bg-morado/50 px-2 py-1.5 text-sm text-crema outline-none focus:border-naranja focus:ring-2 focus:ring-naranja/30'

// ---------------- Editor de UN beneficio ----------------
function BeneficioEditor({
  dinamicaId,
  ben,
  onChange,
  onSaved,
  onDelete,
}: {
  dinamicaId: string
  ben: Ben
  onChange: (patch: Partial<Ben>) => void
  onSaved: (id: string) => void
  onDelete: () => void
}) {
  const [estado, setEstado] = useState<'idle' | 'guardando' | 'ok' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const cfg = TIPOS[ben.tipo]

  async function guardar() {
    setEstado('guardando')
    setError(null)
    const payload = {
      dinamica_id: dinamicaId,
      tipo: ben.tipo,
      botellas_facturadas: cfg.fields.includes('fact') ? ben.botellas_facturadas : 0,
      botellas_sin_cargo: cfg.fields.includes('sin') ? ben.botellas_sin_cargo : 0,
      costo: ben.costo,
      nota: ben.nota.trim() || null,
    }
    const res = ben.id
      ? await supabase.from('dinamica_beneficios').update(payload).eq('id', ben.id)
      : await supabase.from('dinamica_beneficios').insert(payload).select('id').single()
    if (res.error) {
      setEstado('error')
      setError(res.error.message)
      return
    }
    if (!ben.id && res.data) onSaved((res.data as { id: string }).id)
    setEstado('ok')
    window.setTimeout(() => setEstado('idle'), 1500)
  }

  async function eliminar() {
    if (ben.id) {
      const { error } = await supabase
        .from('dinamica_beneficios')
        .delete()
        .eq('id', ben.id)
      if (error) {
        setError(error.message)
        setEstado('error')
        return
      }
    }
    onDelete()
  }

  return (
    <div className="rounded-lg border border-dorado/15 bg-morado/30 p-3">
      <div className="flex flex-wrap items-end gap-3">
        {/* Tipo */}
        <label className="text-xs text-crema/60">
          <span className="mb-1 block">Tipo</span>
          <select
            className={`${input} w-32`}
            value={ben.tipo}
            onChange={(e) => onChange({ tipo: e.target.value as TipoBeneficio })}
          >
            {TIPO_IDS.map((t) => (
              <option key={t} value={t} className="bg-morado">
                {TIPOS[t].label}
              </option>
            ))}
          </select>
        </label>

        {/* Botellas facturadas */}
        {cfg.fields.includes('fact') && (
          <label className="text-xs text-crema/60">
            <span className="mb-1 block">Botellas facturadas</span>
            <input
              type="number"
              min={0}
              className={`${input} w-24`}
              value={ben.botellas_facturadas}
              onChange={(e) =>
                onChange({ botellas_facturadas: Number(e.target.value) || 0 })
              }
            />
          </label>
        )}

        {/* Botellas sin cargo */}
        {cfg.fields.includes('sin') && (
          <label className="text-xs text-crema/60">
            <span className="mb-1 block">Botellas sin cargo</span>
            <input
              type="number"
              min={0}
              className={`${input} w-24`}
              value={ben.botellas_sin_cargo}
              onChange={(e) =>
                onChange({ botellas_sin_cargo: Number(e.target.value) || 0 })
              }
            />
          </label>
        )}

        {/* Costo */}
        <label className="text-xs text-crema/60">
          <span className="mb-1 block">Costo</span>
          <input
            type="number"
            min={0}
            step="0.01"
            className={`${input} w-24`}
            value={ben.costo}
            onChange={(e) => onChange({ costo: Number(e.target.value) || 0 })}
          />
        </label>

        {/* Nota */}
        <label className="min-w-[160px] flex-1 text-xs text-crema/60">
          <span className="mb-1 block">Nota</span>
          <input
            type="text"
            className={`${input} w-full`}
            value={ben.nota}
            onChange={(e) => onChange({ nota: e.target.value })}
            placeholder="opcional"
          />
        </label>

        {/* Acciones */}
        <div className="flex items-center gap-2 pb-0.5">
          <button
            type="button"
            onClick={guardar}
            disabled={estado === 'guardando'}
            className="flex items-center gap-1 rounded-full bg-naranja px-3 py-1.5 text-xs font-semibold text-crema hover:bg-[#e0633a] disabled:opacity-60"
          >
            {estado === 'guardando' ? (
              <Loader2 className="animate-spin" size={13} />
            ) : estado === 'ok' ? (
              <Check size={13} />
            ) : null}
            Guardar
          </button>
          <button
            type="button"
            onClick={eliminar}
            className="text-crema/50 hover:text-naranja"
            aria-label="Eliminar beneficio"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      {error && (
        <p className="mt-2 flex items-center gap-1 text-xs text-naranja">
          <AlertTriangle size={13} /> {error}
        </p>
      )}
    </div>
  )
}

// ---------------- Card de UNA dinámica ----------------
function DinamicaCard({
  din,
  iniciales,
}: {
  din: DinRow
  iniciales: Ben[]
}) {
  const fig = uno(din.figuritas)
  const [items, setItems] = useState<Ben[]>(iniciales)
  const [abierto, setAbierto] = useState(false)

  const resumen = useMemo(() => {
    const fact = items.reduce((a, b) => a + (b.botellas_facturadas || 0), 0)
    const sin = items.reduce((a, b) => a + (b.botellas_sin_cargo || 0), 0)
    return { n: items.length, fact, sin }
  }, [items])

  function agregar() {
    setItems((prev) => [
      ...prev,
      {
        localKey: crypto.randomUUID(),
        id: null,
        tipo: 'sin_cargo',
        botellas_facturadas: 0,
        botellas_sin_cargo: 0,
        costo: 0,
        nota: '',
      },
    ])
    setAbierto(true)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-dorado/15 bg-vino/20">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <span className="font-medium text-crema">{fig?.nombre ?? '—'}</span>
          <span className="ml-2 rounded-full bg-azul/30 px-2 py-0.5 text-[11px] text-crema/80">
            {din.tipo}
          </span>
          {din.condicion && (
            <span className="ml-2 text-xs text-crema/50">{din.condicion}</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-crema/60">
          <span>
            {resumen.n} benef · <span className="text-dorado">{resumen.fact}</span> fact
            / {resumen.sin} s/c
          </span>
          <ChevronDown
            size={16}
            className={`transition ${abierto ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {abierto && (
        <div className="space-y-2 border-t border-dorado/10 p-3">
          {items.map((b) => (
            <BeneficioEditor
              key={b.localKey}
              dinamicaId={din.id}
              ben={b}
              onChange={(patch) =>
                setItems((prev) =>
                  prev.map((it) =>
                    it.localKey === b.localKey ? { ...it, ...patch } : it,
                  ),
                )
              }
              onSaved={(id) =>
                setItems((prev) =>
                  prev.map((it) =>
                    it.localKey === b.localKey ? { ...it, id } : it,
                  ),
                )
              }
              onDelete={() =>
                setItems((prev) => prev.filter((it) => it.localKey !== b.localKey))
              }
            />
          ))}
          {items.length === 0 && (
            <p className="px-1 py-2 text-xs text-crema/40">Sin beneficios todavía.</p>
          )}
          <button
            type="button"
            onClick={agregar}
            className="flex items-center gap-1.5 rounded-full border border-dorado/40 px-3 py-1.5 text-xs font-semibold text-dorado hover:bg-dorado/10"
          >
            <Plus size={14} /> Agregar beneficio
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------- Tab ----------------
export function BeneficiosTab() {
  const [dinamicas, setDinamicas] = useState<DinRow[]>([])
  const [benPorDin, setBenPorDin] = useState<Record<string, Ben[]>>({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtroProv, setFiltroProv] = useState('') // '' = todos
  const [filtroTipo, setFiltroTipo] = useState<'' | 'ON' | 'OFF'>('')

  useEffect(() => {
    let activo = true
    ;(async () => {
      const [dinRes, benRes] = await Promise.all([
        supabase
          .from('dinamicas')
          .select(
            'id, tipo, objetivo, productos, condicion, figuritas ( nombre, proveedores ( nombre, pagina_num ) )',
          ),
        supabase
          .from('dinamica_beneficios')
          .select('id, dinamica_id, tipo, botellas_facturadas, botellas_sin_cargo, costo, nota'),
      ])
      if (!activo) return
      if (dinRes.error || benRes.error) {
        setError((dinRes.error || benRes.error)!.message)
        setCargando(false)
        return
      }
      const grupos: Record<string, Ben[]> = {}
      for (const b of (benRes.data ?? []) as Record<string, unknown>[]) {
        const did = b.dinamica_id as string
        if (!grupos[did]) grupos[did] = []
        grupos[did].push({
          localKey: b.id as string,
          id: b.id as string,
          tipo: (b.tipo as TipoBeneficio) ?? 'sin_cargo',
          botellas_facturadas: (b.botellas_facturadas as number) ?? 0,
          botellas_sin_cargo: (b.botellas_sin_cargo as number) ?? 0,
          costo: (b.costo as number) ?? 0,
          nota: (b.nota as string) ?? '',
        })
      }
      setDinamicas((dinRes.data ?? []) as unknown as DinRow[])
      setBenPorDin(grupos)
      setCargando(false)
    })()
    return () => {
      activo = false
    }
  }, [])

  const ordenadas = useMemo(() => {
    const arr = [...dinamicas]
    arr.sort((a, b) => {
      const pa = uno(uno(a.figuritas)?.proveedores ?? null)?.pagina_num ?? 999
      const pb = uno(uno(b.figuritas)?.proveedores ?? null)?.pagina_num ?? 999
      if (pa !== pb) return pa - pb
      const na = uno(a.figuritas)?.nombre ?? ''
      const nb = uno(b.figuritas)?.nombre ?? ''
      if (na !== nb) return na.localeCompare(nb)
      return a.tipo.localeCompare(b.tipo)
    })
    return arr
  }, [dinamicas])

  // Lista de proveedores (para el select), ordenada por pagina_num
  const proveedoresLista = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of ordenadas) {
      const p = uno(uno(d.figuritas)?.proveedores ?? null)
      if (p?.nombre) m.set(p.nombre, p.pagina_num ?? 999)
    }
    return [...m.entries()].sort((a, b) => a[1] - b[1]).map((e) => e[0])
  }, [ordenadas])

  // Filtrado combinado (proveedor + tipo de canal)
  const filtradas = useMemo(
    () =>
      ordenadas.filter((d) => {
        const provNombre =
          uno(uno(d.figuritas)?.proveedores ?? null)?.nombre ?? ''
        if (filtroProv && provNombre !== filtroProv) return false
        if (filtroTipo && d.tipo !== filtroTipo) return false
        return true
      }),
    [ordenadas, filtroProv, filtroTipo],
  )

  const mostradas = filtradas.length
  const aRevisar = filtradas.filter(
    (d) => (benPorDin[d.id]?.length ?? 0) === 0,
  ).length

  // Agrupar por proveedor para los encabezados (sobre lo filtrado)
  const grupos = useMemo(() => {
    const map = new Map<string, DinRow[]>()
    for (const d of filtradas) {
      const prov = uno(uno(d.figuritas)?.proveedores ?? null)?.nombre ?? 'Sin proveedor'
      if (!map.has(prov)) map.set(prov, [])
      map.get(prov)!.push(d)
    }
    return [...map.entries()]
  }, [filtradas])

  return (
    <div>
      <h2 className="mb-3 font-display text-xl text-crema">
        Estimaciones de volumen{' '}
        <span className="text-sm font-normal text-crema/50">
          (beneficios por dinámica)
        </span>
      </h2>

      <div className="mb-4 flex items-start gap-2 rounded-lg border border-dorado/25 bg-vino/20 px-4 py-3 text-sm text-crema/80">
        <Info className="mt-0.5 shrink-0 text-dorado" size={16} />
        <p>
          Cada dinámica puede tener <span className="font-semibold text-crema">varios beneficios</span>{' '}
          combinables (sin cargo, descuento, material, diluyente, combo), cada uno con
          su costo y nota. El volumen suma las botellas de todos los beneficios.{' '}
          <span className="font-semibold">Botellas sin cargo</span> = solo botellas de la
          marca (no diluyentes ni regalos de otras marcas).
        </p>
      </div>

      {/* Filtros + contador */}
      {!cargando && !error && (
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="text-xs text-crema/60">
            <span className="mb-1 block">Proveedor</span>
            <select
              className={`${input} w-48`}
              value={filtroProv}
              onChange={(e) => setFiltroProv(e.target.value)}
            >
              <option value="" className="bg-morado">
                Todos
              </option>
              {proveedoresLista.map((p) => (
                <option key={p} value={p} className="bg-morado">
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-crema/60">
            <span className="mb-1 block">Canal / tipo</span>
            <select
              className={`${input} w-28`}
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as '' | 'ON' | 'OFF')}
            >
              <option value="" className="bg-morado">
                Todos
              </option>
              <option value="ON" className="bg-morado">
                ON
              </option>
              <option value="OFF" className="bg-morado">
                OFF
              </option>
            </select>
          </label>

          <div className="ml-auto pb-1 text-sm text-crema/70">
            <span className="font-semibold text-crema">{mostradas}</span> dinámicas
            {(filtroProv || filtroTipo) && <span className="text-crema/45"> (filtradas)</span>}
            {' · '}
            <span className="font-semibold text-naranja">{aRevisar}</span> a revisar
            <span className="text-crema/45"> (sin beneficios)</span>
          </div>
        </div>
      )}

      {cargando && (
        <div className="flex items-center gap-2 py-8 text-crema/60">
          <Loader2 className="animate-spin" size={18} /> Cargando…
        </div>
      )}
      {error && (
        <p className="flex items-center gap-2 text-sm text-naranja">
          <AlertTriangle size={16} /> {error}
        </p>
      )}

      {!cargando && !error && (
        <div className="space-y-6">
          {grupos.map(([prov, dins]) => (
            <section key={prov}>
              <h3 className="mb-2 font-display text-lg text-dorado">{prov}</h3>
              <div className="space-y-2">
                {dins.map((d) => (
                  <DinamicaCard key={d.id} din={d} iniciales={benPorDin[d.id] ?? []} />
                ))}
              </div>
            </section>
          ))}
          {dinamicas.length === 0 && (
            <p className="text-sm text-crema/50">No hay dinámicas cargadas.</p>
          )}
          {dinamicas.length > 0 && filtradas.length === 0 && (
            <p className="rounded-xl border border-dorado/20 bg-vino/20 px-4 py-8 text-center text-sm text-crema/55">
              No hay dinámicas con esos filtros.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
