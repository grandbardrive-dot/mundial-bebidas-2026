import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  BookCheck,
  Boxes,
  Loader2,
  Lock,
  Repeat,
  Users,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { TipoCanal } from '../../types'

// 1 caja = N botellas (configurable). Por defecto mostramos botellas.
const BOTELLAS_POR_CAJA = 6

const C = {
  dorado: '#CBA86A',
  naranja: '#D2552A',
  azul: '#1F447F',
  crema: '#F2E8D5',
  tip: '#2E1A3A',
}

const uno = <T,>(x: T | T[] | null | undefined): T | null =>
  Array.isArray(x) ? (x[0] ?? null) : (x ?? null)

interface CliRow {
  id: string
  created_at: string | null
  canales: { tipo: TipoCanal } | { tipo: TipoCanal }[] | null
}
interface FigRow {
  id: string
  proveedor_id: string | null
}
interface ProvRow {
  id: string
  nombre: string
  pagina_num: number | null
}
interface ColRow {
  cliente_id: string
  figurita_id: string
  tiene: boolean
}
interface BenRow {
  botellas_facturadas: number | null
  dinamicas:
    | { figurita_id: string; tipo: TipoCanal }
    | { figurita_id: string; tipo: TipoCanal }[]
    | null
}

type Carga =
  | { status: 'cargando' }
  | {
      status: 'ok'
      clientes: CliRow[]
      figuritas: FigRow[]
      proveedores: ProvRow[]
      coleccion: ColRow[]
      beneficios: BenRow[]
    }
  | { status: 'error'; mensaje: string }

export function KpisDashboard() {
  const [carga, setCarga] = useState<Carga>({ status: 'cargando' })

  useEffect(() => {
    let activo = true
    ;(async () => {
      const [cliRes, figRes, provRes, colRes, benRes] = await Promise.all([
        supabase.from('clientes').select('id, created_at, canales ( tipo )'),
        supabase.from('figuritas').select('id, proveedor_id'),
        supabase.from('proveedores').select('id, nombre, pagina_num'),
        supabase.from('coleccion_cliente').select('cliente_id, figurita_id, tiene'),
        supabase
          .from('dinamica_beneficios')
          .select('botellas_facturadas, dinamicas ( figurita_id, tipo )'),
      ])
      if (!activo) return
      // Errores "core" (sin estos no hay dashboard)
      const errCore =
        cliRes.error || figRes.error || provRes.error || colRes.error
      if (errCore) {
        console.error('[KPIs dashboard] error core:', {
          clientes: cliRes.error?.message,
          figuritas: figRes.error?.message,
          proveedores: provRes.error?.message,
          coleccion: colRes.error?.message,
        })
        setCarga({ status: 'error', mensaje: errCore.message })
        return
      }
      // beneficios (volumen) es NO fatal: si falta la tabla, el KPI de cajas va en 0
      if (benRes.error) {
        console.warn(
          '[KPIs dashboard] dinamica_beneficios no disponible (volumen en 0):',
          benRes.error.message,
        )
      }
      setCarga({
        status: 'ok',
        clientes: (cliRes.data ?? []) as unknown as CliRow[],
        figuritas: (figRes.data ?? []) as FigRow[],
        proveedores: (provRes.data ?? []) as ProvRow[],
        coleccion: (colRes.data ?? []) as ColRow[],
        beneficios: benRes.error ? [] : ((benRes.data ?? []) as unknown as BenRow[]),
      })
    })()
    return () => {
      activo = false
    }
  }, [])

  const k = useMemo(() => {
    if (carga.status !== 'ok') return null
    const { clientes, figuritas, proveedores, coleccion, beneficios } = carga
    const totalFig = figuritas.length || 30
    const participantes = clientes.length

    // tiene-true por cliente
    const tienePorCliente = new Map<string, Set<string>>()
    for (const c of coleccion) {
      if (!c.tiene) continue
      if (!tienePorCliente.has(c.cliente_id))
        tienePorCliente.set(c.cliente_id, new Set())
      tienePorCliente.get(c.cliente_id)!.add(c.figurita_id)
    }

    // tipo de canal por cliente
    const tipoPorCliente = new Map<string, TipoCanal | null>()
    for (const c of clientes) tipoPorCliente.set(c.id, uno(c.canales)?.tipo ?? null)

    // completados (30/30)
    let completados = 0
    let sumaFig = 0
    const distBuckets = ['0', '1-5', '6-10', '11-15', '16-20', '21-25', '26-30']
    const dist = new Map<string, number>(distBuckets.map((b) => [b, 0]))
    const bucketDe = (n: number) =>
      n === 0
        ? '0'
        : n <= 5
          ? '1-5'
          : n <= 10
            ? '6-10'
            : n <= 15
              ? '11-15'
              : n <= 20
                ? '16-20'
                : n <= 25
                  ? '21-25'
                  : '26-30'
    for (const c of clientes) {
      const n = tienePorCliente.get(c.id)?.size ?? 0
      sumaFig += n
      if (n === totalFig && totalFig > 0) completados++
      dist.set(bucketDe(n), (dist.get(bucketDe(n)) ?? 0) + 1)
    }
    const pctCompletados =
      participantes > 0 ? Math.round((completados / participantes) * 100) : 0
    const promedioFig = participantes > 0 ? sumaFig / participantes : 0
    const distData = distBuckets.map((r) => ({ rango: r, clientes: dist.get(r) ?? 0 }))

    // Tendencia de altas (acumulado por día)
    const porDia = new Map<string, number>()
    for (const c of clientes) {
      const dia = (c.created_at ?? '').slice(0, 10)
      if (dia) porDia.set(dia, (porDia.get(dia) ?? 0) + 1)
    }
    let acc = 0
    const trend = [...porDia.keys()]
      .sort()
      .map((d) => {
        acc += porDia.get(d)!
        return { dia: d.slice(5), total: acc }
      })

    // Volumen (botellas facturadas) por proveedor
    const dinaMap = new Map<string, number>() // fig|tipo -> botellas
    for (const b of beneficios) {
      const d = uno(b.dinamicas)
      if (!d) continue
      const key = `${d.figurita_id}|${d.tipo}`
      dinaMap.set(key, (dinaMap.get(key) ?? 0) + (b.botellas_facturadas ?? 0))
    }
    const figProv = new Map(figuritas.map((f) => [f.id, f.proveedor_id]))
    const provInfo = new Map(proveedores.map((p) => [p.id, p]))
    const volByProv = new Map<string, number>()
    for (const c of clientes) {
      const tipo = tipoPorCliente.get(c.id)
      if (!tipo) continue
      for (const figId of tienePorCliente.get(c.id) ?? []) {
        const fact = dinaMap.get(`${figId}|${tipo}`) ?? 0
        const prov = figProv.get(figId)
        if (prov) volByProv.set(prov, (volByProv.get(prov) ?? 0) + fact)
      }
    }
    const provData = [...volByProv.entries()]
      .map(([pid, bot]) => ({
        nombre: provInfo.get(pid)?.nombre ?? '—',
        pagina: provInfo.get(pid)?.pagina_num ?? 999,
        botellas: bot,
      }))
      .sort((a, b) => a.pagina - b.pagina)
    const totalBotellas = provData.reduce((a, p) => a + p.botellas, 0)

    return {
      participantes,
      completados,
      pctCompletados,
      promedioFig,
      distData,
      trend,
      provData,
      totalBotellas,
    }
  }, [carga])

  if (carga.status === 'cargando')
    return (
      <div className="flex items-center gap-2 py-10 text-crema/60">
        <Loader2 className="animate-spin" size={18} /> Cargando KPIs…
      </div>
    )
  if (carga.status === 'error')
    return (
      <div className="flex items-start gap-3 rounded-xl border border-naranja/40 bg-naranja/10 px-5 py-4">
        <AlertTriangle className="mt-0.5 shrink-0 text-naranja" size={20} />
        <div className="text-sm text-crema/85">
          <p className="font-semibold text-crema">No pudimos cargar los KPIs.</p>
          <p className="mt-1">{carga.mensaje}</p>
        </div>
      </div>
    )
  if (!k) return null

  const completadosPie = [
    { name: 'Completados', value: k.completados, color: C.dorado },
    {
      name: 'Resto',
      value: Math.max(0, k.participantes - k.completados),
      color: C.azul,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {/* 1) Clientes participantes */}
      <Card titulo="Clientes participantes" icon={Users}>
        <NumGrande valor={k.participantes} />
        {k.trend.length > 1 ? (
          <MiniArea data={k.trend} />
        ) : (
          <Hint texto="Tendencia disponible con más fechas de alta." />
        )}
      </Card>

      {/* 2) Álbumes entregados */}
      <Card titulo="Álbumes entregados" icon={BookCheck}>
        <NumGrande valor={k.participantes} />
        <Hint texto="1 álbum por cliente registrado." />
      </Card>

      {/* 3) Álbumes completados */}
      <Card titulo="Álbumes completados (30/30)" icon={BookCheck}>
        <div className="flex items-center gap-4">
          <div className="h-28 w-28 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={completadosPie}
                  dataKey="value"
                  innerRadius={32}
                  outerRadius={48}
                  startAngle={90}
                  endAngle={-270}
                >
                  {completadosPie.map((d) => (
                    <Cell key={d.name} fill={d.color} stroke={C.tip} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="font-display text-3xl text-dorado">{k.pctCompletados}%</p>
            <p className="text-sm text-crema/70">
              {k.completados} de {k.participantes}
            </p>
          </div>
        </div>
      </Card>

      {/* 4) Cajas / botellas por proveedor */}
      <Card titulo="Cajas vendidas por proveedor" icon={Boxes} ancho>
        <div className="mb-2 flex items-baseline gap-2">
          <NumGrande valor={k.totalBotellas} inline />
          <span className="text-sm text-crema/60">
            botellas facturadas (est.) · 1 caja = {BOTELLAS_POR_CAJA} botellas
          </span>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={k.provData} margin={{ top: 5, right: 8, bottom: 5, left: -18 }}>
              <XAxis
                dataKey="nombre"
                tick={{ fill: C.crema, fontSize: 10 }}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={50}
              />
              <YAxis allowDecimals={false} tick={{ fill: C.crema, fontSize: 11 }} />
              <Tooltip contentStyle={tipStyle} cursor={{ fill: 'rgba(203,168,106,0.08)' }} />
              <Bar dataKey="botellas" fill={C.dorado} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 5) Frecuencia de compra */}
      <Card titulo="Frecuencia de compra" icon={Repeat} ancho>
        <div className="mb-2 flex items-baseline gap-2">
          <NumGrande valor={k.promedioFig.toFixed(1)} inline />
          <span className="text-sm text-crema/60">
            figuritas/dinámicas cumplidas por cliente (promedio)
          </span>
        </div>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={k.distData} margin={{ top: 5, right: 8, bottom: 5, left: -18 }}>
              <XAxis dataKey="rango" tick={{ fill: C.crema, fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: C.crema, fontSize: 11 }} />
              <Tooltip contentStyle={tipStyle} cursor={{ fill: 'rgba(210,85,42,0.08)' }} />
              <Bar dataKey="clientes" fill={C.naranja} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Placeholders EN PREPARACIÓN */}
      <CardBloqueada titulo="Incremento de facturación" />
      <CardBloqueada titulo="Incremento de margen de contribución" />
      <CardBloqueada titulo="ROI de la campaña" />
    </div>
  )
}

const tipStyle = {
  background: C.tip,
  border: `1px solid ${C.dorado}`,
  borderRadius: 8,
  color: C.crema,
}

function Card({
  titulo,
  icon: Icon,
  children,
  ancho,
}: {
  titulo: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  children: React.ReactNode
  ancho?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border border-dorado/20 bg-vino/20 p-4 ${
        ancho ? 'md:col-span-2 xl:col-span-2' : ''
      }`}
    >
      <div className="mb-3 flex items-center gap-2 text-crema/70">
        <Icon size={16} className="text-dorado" />
        <h3 className="text-sm font-semibold uppercase tracking-wide">{titulo}</h3>
      </div>
      {children}
    </div>
  )
}

function CardBloqueada({ titulo }: { titulo: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dorado/10 bg-morado/40 p-4 opacity-70">
      <div className="mb-3 flex items-center gap-2 text-crema/40">
        <Lock size={16} />
        <h3 className="text-sm font-semibold uppercase tracking-wide">{titulo}</h3>
      </div>
      <div className="flex h-24 flex-col items-center justify-center gap-1 text-center">
        <span className="rounded-full border border-dorado/20 px-3 py-1 text-xs text-crema/45">
          En preparación
        </span>
        <span className="text-[11px] text-crema/35">Disponible al cargar costos</span>
      </div>
    </div>
  )
}

function NumGrande({ valor, inline }: { valor: number | string; inline?: boolean }) {
  return (
    <p className={`font-display text-dorado ${inline ? 'text-3xl' : 'text-4xl'}`}>
      {typeof valor === 'number' ? valor.toLocaleString('es-AR') : valor}
    </p>
  )
}

function Hint({ texto }: { texto: string }) {
  return <p className="mt-2 text-xs text-crema/40">{texto}</p>
}

function MiniArea({ data }: { data: { dia: string; total: number }[] }) {
  return (
    <div className="mt-2 h-20 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="gradAlta" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.dorado} stopOpacity={0.5} />
              <stop offset="100%" stopColor={C.dorado} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip contentStyle={tipStyle} />
          <Area
            type="monotone"
            dataKey="total"
            stroke={C.dorado}
            fill="url(#gradAlta)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
