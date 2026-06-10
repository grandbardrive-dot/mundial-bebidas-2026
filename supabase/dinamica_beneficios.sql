-- =============================================================================
-- Modelo nuevo: dinamica_beneficios (varios beneficios por dinámica)
-- Mundial de Bebidas 2026 — GrandBar Distribuciones
--
-- Una dinámica puede tener VARIOS beneficios; el volumen de la dinámica es la
-- SUMA de las botellas de sus beneficios. Migra 1 beneficio por dinámica desde
-- las columnas viejas de `dinamicas`.
--
-- RLS:
--   • anon (admin): lectura + escritura completas (incluye `costo`).
--   • authenticated (proveedor): lectura SOLO de SU marca, y SIN la columna
--     `costo` (se oculta con column-level GRANT). Solo SELECT, nada de escribir.
--
-- Cómo usar: pegá todo en el SQL Editor y ejecutá. Re-ejecutable.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Tabla
-- ---------------------------------------------------------------------------
create table if not exists public.dinamica_beneficios (
  id                  uuid primary key default gen_random_uuid(),
  dinamica_id         uuid not null references public.dinamicas (id) on delete cascade,
  concepto            text,
  botellas_facturadas int not null default 0,
  botellas_sin_cargo  int not null default 0,
  costo               numeric not null default 0,
  created_at          timestamptz not null default now()
);
create index if not exists idx_dinamica_beneficios_din
  on public.dinamica_beneficios (dinamica_id);

-- ---------------------------------------------------------------------------
-- 2) Migración: 1 beneficio por dinámica desde las columnas viejas
--    (solo si esa dinámica todavía no tiene beneficios -> re-ejecutable)
-- ---------------------------------------------------------------------------
insert into public.dinamica_beneficios
  (dinamica_id, concepto, botellas_facturadas, botellas_sin_cargo, costo)
select d.id,
       'Migrado de estimación',
       coalesce(d.botellas_facturadas, 0),
       coalesce(d.botellas_sin_cargo, 0),
       0
from public.dinamicas d
where not exists (
  select 1 from public.dinamica_beneficios b where b.dinamica_id = d.id
);

-- ---------------------------------------------------------------------------
-- 3) Función helper: ¿la dinámica es de mi marca? (SECURITY DEFINER, sin recursión)
-- ---------------------------------------------------------------------------
create or replace function public.mi_proveedor_id()
returns uuid language sql security definer stable set search_path = public as $$
  select proveedor_id from public.proveedor_usuarios where user_id = auth.uid() limit 1;
$$;

create or replace function public.dinamica_es_de_mi_marca(p_din uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from public.dinamicas d
    join public.figuritas f on f.id = d.figurita_id
    where d.id = p_din and f.proveedor_id = public.mi_proveedor_id()
  );
$$;

grant execute on function public.mi_proveedor_id() to anon, authenticated;
grant execute on function public.dinamica_es_de_mi_marca(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) RLS + grants
-- ---------------------------------------------------------------------------
alter table public.dinamica_beneficios enable row level security;

-- anon (admin): CRUD completo
grant select, insert, update, delete on public.dinamica_beneficios to anon;

drop policy if exists "beneficios lee (anon)" on public.dinamica_beneficios;
create policy "beneficios lee (anon)"
  on public.dinamica_beneficios for select to anon using (true);

drop policy if exists "beneficios inserta (anon)" on public.dinamica_beneficios;
create policy "beneficios inserta (anon)"
  on public.dinamica_beneficios for insert to anon with check (true);

drop policy if exists "beneficios actualiza (anon)" on public.dinamica_beneficios;
create policy "beneficios actualiza (anon)"
  on public.dinamica_beneficios for update to anon using (true) with check (true);

drop policy if exists "beneficios borra (anon)" on public.dinamica_beneficios;
create policy "beneficios borra (anon)"
  on public.dinamica_beneficios for delete to anon using (true);

-- authenticated (proveedor): SELECT scopeado a su marca, SIN la columna `costo`
--   (revocamos el SELECT de tabla y damos GRANT solo a las columnas permitidas)
revoke select on public.dinamica_beneficios from authenticated;
grant select (id, dinamica_id, concepto, botellas_facturadas, botellas_sin_cargo, created_at)
  on public.dinamica_beneficios to authenticated;

drop policy if exists "proveedor lee beneficios" on public.dinamica_beneficios;
create policy "proveedor lee beneficios"
  on public.dinamica_beneficios for select to authenticated
  using (public.dinamica_es_de_mi_marca(dinamica_id));

-- ---------------------------------------------------------------------------
-- Verificación (opcional):
--   select count(*) from public.dinamica_beneficios;
-- ---------------------------------------------------------------------------
