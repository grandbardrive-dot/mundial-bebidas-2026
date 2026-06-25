// Tipos compartidos del dominio Mundial de Bebidas 2026

export type TipoPremioGeneral = 'semanal_1' | 'semanal_2'

export interface PremioGeneral {
  id: string
  nombre: string
  descripcion: string | null
  tipo: TipoPremioGeneral | null
  semana: number | null
  imagen_url: string | null
  cantidad: number | null
}

export type TipoCanal = 'ON' | 'OFF'

export interface Vendedor {
  id: string
  nombre: string
  whatsapp: string | null
  sucursal: string | null
  tipo: TipoCanal | null
  activo: boolean
}

export interface Canal {
  id: string
  nombre: string
  tipo: TipoCanal
}

export interface Cliente {
  id: string
  auth_user_id: string | null
  nombre_local: string
  contacto: string | null
  telefono: string | null
  sucursal: string | null
  canal_id: string | null
  vendedor_id: string | null
  created_at: string
}

export interface Proveedor {
  id: string
  nombre: string
  pagina_num: number | null
}

export interface Figurita {
  id: string
  proveedor_id: string | null
  nombre: string
  es_dorada: boolean
  imagen_url: string | null
  orden: number | null
}

export interface Dinamica {
  id: string
  figurita_id: string
  tipo: TipoCanal
  objetivo: string | null
  productos: string | null
  condicion: string | null
  observaciones: string | null
  botellas_facturadas: number | null
  botellas_sin_cargo: number | null
  estimacion_manual: boolean
}

export interface PremioProveedor {
  id: string
  proveedor_id: string | null
  semana: number | null
  nombre_premio: string
  imagen_url: string | null
  stock_inicial: number | null
  stock_disponible: number | null
  condicion: string | null
}

export type CategoriaGasto = 'impresion' | 'premio_general' | 'otro'

export interface GastoProyecto {
  id: string
  concepto: string
  monto: number
  categoria: CategoriaGasto
  created_at: string
}

export type EstadoReclamo = 'reservado' | 'confirmado' | 'rechazado'

export interface Reclamo {
  id: string
  cliente_id: string | null
  premio_id: string | null
  proveedor_id: string | null
  semana: number | null
  foto_pagina_url: string | null
  estado: EstadoReclamo
  created_at: string
}
