-- =============================================================================
-- dinamica_beneficios: agregar TIPO de beneficio + NOTA (editor nuevo del admin)
-- Mundial de Bebidas 2026 — GrandBar Distribuciones
--
-- La tabla dinamica_beneficios ya existe y está migrada. Esto agrega:
--   • tipo: sin_cargo | descuento | material | diluyente | combo
--   • nota: texto libre
-- y hace backfill de los beneficios ya migrados.
--
-- Cómo usar: pegá todo en el SQL Editor y ejecutá. Re-ejecutable.
-- =============================================================================

-- 1) Columnas nuevas
alter table public.dinamica_beneficios add column if not exists tipo text;
alter table public.dinamica_beneficios add column if not exists nota text;

-- 2) Backfill de los beneficios migrados (tipo nulo) según sus botellas
update public.dinamica_beneficios
set tipo = case
             when coalesce(botellas_facturadas,0) > 0 and coalesce(botellas_sin_cargo,0) > 0 then 'combo'
             when coalesce(botellas_sin_cargo,0) > 0 then 'sin_cargo'
             when coalesce(botellas_facturadas,0) > 0 then 'descuento'
             else 'material'
           end,
    nota = coalesce(nota, nullif(concepto, ''))
where tipo is null;

-- 3) Constraint de tipos válidos (idempotente). Permite null (no rompe inserts parciales).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'dinamica_beneficios_tipo_check'
  ) then
    alter table public.dinamica_beneficios
      add constraint dinamica_beneficios_tipo_check
      check (tipo in ('sin_cargo','descuento','material','diluyente','combo'));
  end if;
end $$;

-- 4) Re-grant de columnas para el proveedor (authenticated): suma tipo y nota,
--    sigue SIN exponer `costo`.
revoke select on public.dinamica_beneficios from authenticated;
grant select (id, dinamica_id, tipo, botellas_facturadas, botellas_sin_cargo, nota, created_at)
  on public.dinamica_beneficios to authenticated;

-- Verificación (opcional):
--   select tipo, count(*) from public.dinamica_beneficios group by tipo;
