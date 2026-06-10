-- =============================================================================
-- KPIs de volumen (estimados) en `dinamicas`
-- Mundial de Bebidas 2026 — GrandBar Distribuciones
--
-- Agrega columnas de estimación y las rellena parseando la `condicion`:
--   • condición con patrón "X+Y" (ej "5+1", "4+1", "3+3", "1+1 en caja",
--     "2+2 sin cargo")  -> facturadas = X, sin_cargo = Y, estimacion_manual = false
--   • "2+1 hasta 1+1" (XIPA OFF) -> conservador 1+1
--   • cualquier otra (combos, mix, "% OFF", "ejecutar en punto de venta", etc.)
--     -> estimado tentativo facturadas = 6, sin_cargo = 0, estimacion_manual = true
--     (esas son las que el admin revisa a mano en /admin -> Estimaciones de volumen)
--
-- RE-EJECUTABLE y NO PISA ajustes manuales: solo rellena filas cuyo
-- botellas_facturadas todavía es NULL. Si querés RE-PARSEAR todo desde cero,
-- descomentá el bloque "RESET" de más abajo antes de correr.
--
-- Cómo usar: pegá todo en el SQL Editor de Supabase y ejecutá.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Columnas (si no existen)
-- ---------------------------------------------------------------------------
alter table public.dinamicas add column if not exists botellas_facturadas int;
alter table public.dinamicas add column if not exists botellas_sin_cargo  int;
alter table public.dinamicas add column if not exists estimacion_manual   boolean not null default false;

-- ---------------------------------------------------------------------------
-- (OPCIONAL) RESET para re-parsear TODO desde la condición (pisa ajustes manuales):
-- update public.dinamicas set botellas_facturadas = null, botellas_sin_cargo = null;
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 2a) Caso especial "... hasta X+Y" -> usar el MÁS CONSERVADOR (el último X+Y)
--      ej "2+1 hasta 1+1" => 1+1
-- ---------------------------------------------------------------------------
update public.dinamicas d
set botellas_facturadas = (regexp_match(d.condicion, '(\d+)\s*\+\s*(\d+)\D*$'))[1]::int,
    botellas_sin_cargo  = (regexp_match(d.condicion, '(\d+)\s*\+\s*(\d+)\D*$'))[2]::int,
    estimacion_manual   = false
where d.botellas_facturadas is null
  and d.condicion ~* 'hasta'
  and d.condicion ~ '\d+\s*\+\s*\d+';

-- ---------------------------------------------------------------------------
-- 2b) Caso general "X+Y" (sin "hasta") -> usar el PRIMER X+Y de la condición
--      ej "5+1", "4+1", "3+3", "1+2", "1+1 en caja", "2+2 sin cargo"
-- ---------------------------------------------------------------------------
update public.dinamicas d
set botellas_facturadas = (regexp_match(d.condicion, '(\d+)\s*\+\s*(\d+)'))[1]::int,
    botellas_sin_cargo  = (regexp_match(d.condicion, '(\d+)\s*\+\s*(\d+)'))[2]::int,
    estimacion_manual   = false
where d.botellas_facturadas is null
  and d.condicion ~ '\d+\s*\+\s*\d+'
  and d.condicion !~* 'hasta';

-- ---------------------------------------------------------------------------
-- 2c) Resto (sin patrón X+Y, o condición nula) -> estimado tentativo a revisar
-- ---------------------------------------------------------------------------
update public.dinamicas d
set botellas_facturadas = 6,
    botellas_sin_cargo  = 0,
    estimacion_manual   = true
where d.botellas_facturadas is null;

-- ---------------------------------------------------------------------------
-- 3) RLS: el admin (anon) puede ACTUALIZAR las estimaciones en `dinamicas`.
--    (La lectura ya es pública. El proveedor NO escribe: solo damos a `anon`.)
-- ---------------------------------------------------------------------------
drop policy if exists "admin actualiza dinamicas (anon)" on public.dinamicas;
create policy "admin actualiza dinamicas (anon)"
  on public.dinamicas for update
  to anon
  using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Verificación rápida (opcional):
--   select tipo, condicion, botellas_facturadas, botellas_sin_cargo, estimacion_manual
--   from public.dinamicas order by estimacion_manual desc, condicion;
-- ---------------------------------------------------------------------------
