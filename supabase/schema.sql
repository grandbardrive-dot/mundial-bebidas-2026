-- =============================================================================
-- Mundial de Bebidas 2026 — GrandBar Distribuciones
-- Esquema de base de datos (Postgres / Supabase)
--
-- Cómo usar: pegá este archivo completo en el SQL Editor de Supabase y ejecutá.
-- Es idempotente en lo razonable (usa IF NOT EXISTS / create or replace).
-- =============================================================================

-- Extensión para gen_random_uuid()
create extension if not exists "pgcrypto";

-- =============================================================================
-- TABLAS
-- =============================================================================

-- Vendedores de GrandBar
create table if not exists public.vendedores (
  id        uuid primary key default gen_random_uuid(),
  nombre    text not null,
  whatsapp  text,
  activo    boolean not null default true
);

-- Canales de venta: ON (consumo en el local) / OFF (venta para llevar)
create table if not exists public.canales (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo   text not null check (tipo in ('ON', 'OFF'))
);

-- Clientes (bares, restaurantes, vinotecas, autoservicios)
create table if not exists public.clientes (
  id           uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  nombre_local text not null,
  contacto     text,
  telefono     text,
  canal_id     uuid references public.canales (id),
  vendedor_id  uuid references public.vendedores (id),
  created_at   timestamptz not null default now()
);

-- Proveedores (marcas que aportan figuritas), una página del álbum cada uno
create table if not exists public.proveedores (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  pagina_num int
);

-- Figuritas del álbum
create table if not exists public.figuritas (
  id            uuid primary key default gen_random_uuid(),
  proveedor_id  uuid references public.proveedores (id) on delete cascade,
  nombre        text not null,
  es_dorada     boolean not null default false,
  imagen_url    text,
  orden         int
);

-- Dinámicas: cómo se gana cada figurita. 2 filas por figurita (ON y OFF).
create table if not exists public.dinamicas (
  id            uuid primary key default gen_random_uuid(),
  figurita_id   uuid references public.figuritas (id) on delete cascade,
  tipo          text not null check (tipo in ('ON', 'OFF')),
  objetivo      text,
  productos     text,
  condicion     text,
  observaciones text,
  -- KPIs de volumen (estimados): botellas que implica cumplir la dinámica.
  botellas_facturadas int,
  botellas_sin_cargo  int,
  estimacion_manual   boolean not null default false, -- true = el admin debe revisarla
  unique (figurita_id, tipo)
);

-- Colección del cliente: qué figuritas tiene
create table if not exists public.coleccion_cliente (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.clientes (id) on delete cascade,
  figurita_id uuid not null references public.figuritas (id) on delete cascade,
  tiene       boolean not null default false,
  updated_at  timestamptz not null default now(),
  unique (cliente_id, figurita_id)
);

-- Premios generales (por completar el álbum / hitos semanales)
create table if not exists public.premios_generales (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  descripcion text,
  tipo        text check (tipo in ('semanal_1', 'semanal_2')),
  semana      int,
  imagen_url  text,
  cantidad    int
);

-- Premios por proveedor y semana (con stock controlado)
create table if not exists public.premios_proveedor_semana (
  id               uuid primary key default gen_random_uuid(),
  proveedor_id     uuid references public.proveedores (id) on delete cascade,
  semana           int,
  nombre_premio    text not null,
  imagen_url       text,
  stock_inicial    int not null default 0,
  stock_disponible int not null default 0,
  condicion        text
);

-- Reclamos de premios de proveedor
create table if not exists public.reclamos_premio (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references public.clientes (id) on delete cascade,
  premio_id      uuid not null references public.premios_proveedor_semana (id) on delete cascade,
  proveedor_id   uuid,
  semana         int,
  foto_pagina_url text,
  estado         text not null default 'reservado'
                   check (estado in ('reservado', 'confirmado', 'rechazado')),
  created_at     timestamptz not null default now()
);

-- Índices útiles para las queries más frecuentes
create index if not exists idx_figuritas_proveedor on public.figuritas (proveedor_id);
create index if not exists idx_coleccion_cliente_cliente on public.coleccion_cliente (cliente_id);
create index if not exists idx_reclamos_cliente on public.reclamos_premio (cliente_id);
create index if not exists idx_premios_prov_semana on public.premios_proveedor_semana (proveedor_id, semana);

-- =============================================================================
-- FUNCIÓN RPC: reclamar_premio
-- Descuenta stock e inserta el reclamo de forma atómica para evitar
-- condiciones de carrera cuando varios clientes reclaman a la vez.
-- SECURITY DEFINER + bloqueo de fila (FOR UPDATE) garantizan la atomicidad.
-- =============================================================================
create or replace function public.reclamar_premio(
  p_premio_id  uuid,
  p_cliente_id uuid,
  p_foto_url   text
)
returns public.reclamos_premio
language plpgsql
security definer
set search_path = public
as $$
declare
  v_premio  public.premios_proveedor_semana;
  v_reclamo public.reclamos_premio;
begin
  -- Bloquea la fila del premio hasta el fin de la transacción
  select * into v_premio
  from public.premios_proveedor_semana
  where id = p_premio_id
  for update;

  if not found then
    raise exception 'El premio no existe' using errcode = 'no_data_found';
  end if;

  if v_premio.stock_disponible <= 0 then
    raise exception 'Sin stock disponible para este premio'
      using errcode = 'check_violation';
  end if;

  -- Descuenta una unidad
  update public.premios_proveedor_semana
  set stock_disponible = stock_disponible - 1
  where id = p_premio_id;

  -- Inserta el reclamo en estado 'reservado'
  insert into public.reclamos_premio (
    cliente_id, premio_id, proveedor_id, semana, foto_pagina_url, estado
  )
  values (
    p_cliente_id, p_premio_id, v_premio.proveedor_id, v_premio.semana,
    p_foto_url, 'reservado'
  )
  returning * into v_reclamo;

  return v_reclamo;
end;
$$;

-- =============================================================================
-- STORAGE: bucket privado para las fotos de páginas completadas
-- Se sirven con signed URLs (el bucket no es público).
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('paginas-completadas', 'paginas-completadas', false)
on conflict (id) do nothing;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Habilitar RLS en todas las tablas
alter table public.vendedores               enable row level security;
alter table public.canales                  enable row level security;
alter table public.clientes                 enable row level security;
alter table public.proveedores              enable row level security;
alter table public.figuritas                enable row level security;
alter table public.dinamicas                enable row level security;
alter table public.coleccion_cliente        enable row level security;
alter table public.premios_generales        enable row level security;
alter table public.premios_proveedor_semana enable row level security;
alter table public.reclamos_premio          enable row level security;

-- ---------------------------------------------------------------------------
-- Lectura pública (catálogo del juego): cualquier visitante puede leer
-- ---------------------------------------------------------------------------
drop policy if exists "lectura publica vendedores" on public.vendedores;
create policy "lectura publica vendedores"
  on public.vendedores for select using (true);

drop policy if exists "lectura publica canales" on public.canales;
create policy "lectura publica canales"
  on public.canales for select using (true);

drop policy if exists "lectura publica proveedores" on public.proveedores;
create policy "lectura publica proveedores"
  on public.proveedores for select using (true);

drop policy if exists "lectura publica figuritas" on public.figuritas;
create policy "lectura publica figuritas"
  on public.figuritas for select using (true);

drop policy if exists "lectura publica dinamicas" on public.dinamicas;
create policy "lectura publica dinamicas"
  on public.dinamicas for select using (true);

drop policy if exists "lectura publica premios_generales" on public.premios_generales;
create policy "lectura publica premios_generales"
  on public.premios_generales for select using (true);

drop policy if exists "lectura publica premios_proveedor_semana" on public.premios_proveedor_semana;
create policy "lectura publica premios_proveedor_semana"
  on public.premios_proveedor_semana for select using (true);

-- ---------------------------------------------------------------------------
-- clientes: cada usuario autenticado ve/edita su propia ficha de cliente
-- ---------------------------------------------------------------------------
drop policy if exists "cliente ve su ficha" on public.clientes;
create policy "cliente ve su ficha"
  on public.clientes for select
  using (auth.uid() = auth_user_id);

drop policy if exists "cliente actualiza su ficha" on public.clientes;
create policy "cliente actualiza su ficha"
  on public.clientes for update
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

-- Identificación POR DISPOSITIVO (sin Supabase Auth): el onboarding usa la anon
-- key para crear y leer la ficha (el id queda en localStorage del dispositivo).
-- ⚠️ Seguridad: esto deja `clientes` insertable/legible con la anon key. Aceptable
--    para la promo; endurecer con un device token si hace falta. Ver también
--    supabase/policies_clientes_device.sql.
drop policy if exists "device crea cliente" on public.clientes;
create policy "device crea cliente"
  on public.clientes for insert
  to anon, authenticated
  with check (true);

drop policy if exists "device lee clientes" on public.clientes;
create policy "device lee clientes"
  on public.clientes for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- coleccion_cliente: cada cliente ve/edita SOLO su propia colección
-- (el vínculo es vía clientes.auth_user_id = auth.uid())
-- ---------------------------------------------------------------------------
drop policy if exists "cliente ve su coleccion" on public.coleccion_cliente;
create policy "cliente ve su coleccion"
  on public.coleccion_cliente for select
  using (
    exists (
      select 1 from public.clientes c
      where c.id = coleccion_cliente.cliente_id
        and c.auth_user_id = auth.uid()
    )
  );

drop policy if exists "cliente inserta en su coleccion" on public.coleccion_cliente;
create policy "cliente inserta en su coleccion"
  on public.coleccion_cliente for insert
  with check (
    exists (
      select 1 from public.clientes c
      where c.id = coleccion_cliente.cliente_id
        and c.auth_user_id = auth.uid()
    )
  );

drop policy if exists "cliente actualiza su coleccion" on public.coleccion_cliente;
create policy "cliente actualiza su coleccion"
  on public.coleccion_cliente for update
  using (
    exists (
      select 1 from public.clientes c
      where c.id = coleccion_cliente.cliente_id
        and c.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clientes c
      where c.id = coleccion_cliente.cliente_id
        and c.auth_user_id = auth.uid()
    )
  );

-- Colección POR DISPOSITIVO (sin Supabase Auth): la vista del álbum tilda
-- figuritas con la anon key. Ver también supabase/policies_coleccion_device.sql.
-- ⚠️ Seguridad: deja coleccion_cliente legible/escribible con la anon key.
drop policy if exists "device lee coleccion" on public.coleccion_cliente;
create policy "device lee coleccion"
  on public.coleccion_cliente for select
  to anon, authenticated using (true);

drop policy if exists "device inserta coleccion" on public.coleccion_cliente;
create policy "device inserta coleccion"
  on public.coleccion_cliente for insert
  to anon, authenticated with check (true);

drop policy if exists "device actualiza coleccion" on public.coleccion_cliente;
create policy "device actualiza coleccion"
  on public.coleccion_cliente for update
  to anon, authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- reclamos_premio: cada cliente ve/crea SOLO sus propios reclamos
-- (la creación normalmente pasa por la RPC reclamar_premio)
-- ---------------------------------------------------------------------------
drop policy if exists "cliente ve sus reclamos" on public.reclamos_premio;
create policy "cliente ve sus reclamos"
  on public.reclamos_premio for select
  using (
    exists (
      select 1 from public.clientes c
      where c.id = reclamos_premio.cliente_id
        and c.auth_user_id = auth.uid()
    )
  );

drop policy if exists "cliente crea sus reclamos" on public.reclamos_premio;
create policy "cliente crea sus reclamos"
  on public.reclamos_premio for insert
  with check (
    exists (
      select 1 from public.clientes c
      where c.id = reclamos_premio.cliente_id
        and c.auth_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: políticas del bucket privado "paginas-completadas"
-- Cada usuario autenticado gestiona los objetos dentro de su carpeta
-- (convención: primer segmento del path = auth.uid()).
-- ---------------------------------------------------------------------------
drop policy if exists "subida de pagina propia" on storage.objects;
create policy "subida de pagina propia"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'paginas-completadas'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "lectura de pagina propia" on storage.objects;
create policy "lectura de pagina propia"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'paginas-completadas'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- FIN DEL ESQUEMA
-- =============================================================================
