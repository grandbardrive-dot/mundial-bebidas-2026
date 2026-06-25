-- =============================================================================
-- Ganadores (cargados a mano) + stock de premios generales
-- Mundial de Bebidas 2026 — GrandBar Distribuciones
--
-- 1) Tabla `ganadores`: la app del cliente muestra los ganadores DESDE acá.
--    origen 'manual' (cargados en el admin) / 'auto' (si más adelante se generan
--    por completar primero). Los manuales no se pisan.
-- 2) Stock de premios generales: TV=1, Cava=2, Camiseta=4.
--
-- Cómo usar: pegá todo en el SQL Editor y ejecutá. Re-ejecutable.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Tabla ganadores
-- ---------------------------------------------------------------------------
create table if not exists public.ganadores (
  id           uuid primary key default gen_random_uuid(),
  nombre_local text not null,
  premio       text not null,            -- 'TV' | 'cava' | 'camiseta' (libre)
  orden        int,                      -- semana o nº de orden
  fecha        date,
  origen       text not null default 'manual'
               check (origen in ('manual', 'auto')),
  created_at   timestamptz not null default now()
);

alter table public.ganadores enable row level security;

grant select, insert, update, delete on public.ganadores to anon;
grant select on public.ganadores to authenticated;

-- Lectura pública (cliente con anon, proveedor con authenticated)
drop policy if exists "ganadores lee (todos)" on public.ganadores;
create policy "ganadores lee (todos)"
  on public.ganadores for select to anon, authenticated using (true);

-- Escritura solo admin (anon)
drop policy if exists "ganadores inserta (anon)" on public.ganadores;
create policy "ganadores inserta (anon)"
  on public.ganadores for insert to anon with check (true);
drop policy if exists "ganadores actualiza (anon)" on public.ganadores;
create policy "ganadores actualiza (anon)"
  on public.ganadores for update to anon using (true) with check (true);
drop policy if exists "ganadores borra (anon)" on public.ganadores;
create policy "ganadores borra (anon)"
  on public.ganadores for delete to anon using (true);

-- ---------------------------------------------------------------------------
-- 2) Precarga de los 3 ganadores de TV (manual) — no duplica si ya existen
-- ---------------------------------------------------------------------------
insert into public.ganadores (nombre_local, premio, orden, origen)
select v.nombre_local, v.premio, v.orden, 'manual'
from (values
  ('VINOTECA LA PREVIA', 'TV', 1),
  ('VINOTECA PLUSBAR',   'TV', 2),
  ('VINOTECA EXPRESS',   'TV', 3)
) as v(nombre_local, premio, orden)
where not exists (
  select 1 from public.ganadores g
  where g.premio = v.premio and g.orden = v.orden
);

-- ---------------------------------------------------------------------------
-- 3) Stock de premios generales: TV=1, Cava=2, Camiseta=4
--    (editable luego desde /admin -> Premios generales)
-- ---------------------------------------------------------------------------
update public.premios_generales set cantidad = 1 where tipo = 'semanal_1';
update public.premios_generales set cantidad = 2
  where tipo = 'semanal_2' and nombre ilike '%cava%';
update public.premios_generales set cantidad = 4
  where tipo = 'semanal_2' and nombre ilike '%camiseta%';

-- Verificación (opcional):
--   select premio, orden, nombre_local from public.ganadores order by premio, orden;
--   select nombre, tipo, cantidad from public.premios_generales order by tipo, semana;
