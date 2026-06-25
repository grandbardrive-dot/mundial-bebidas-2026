-- =============================================================================
-- gastos_proyecto — Inversión COMPARTIDA del proyecto (se divide ÷7)
-- Mundial de Bebidas 2026 — GrandBar Distribuciones
--
-- Los gastos cargados acá se suman y se dividen en partes iguales entre 7
-- (6 proveedores + GrandBar). Cada proveedor ve "su parte" (total / 7).
-- categoria: 'impresion' | 'premio_general' | 'otro' (solo para el desglose).
--
-- RLS:
--   • Lectura: anon (admin) Y authenticated (proveedor) -> son gastos
--     COMPARTIDOS, todos los pueden leer (no hay nada por marca acá).
--   • Escritura: solo anon (admin).
--
-- Cómo usar: pegá todo en el SQL Editor y ejecutá. Re-ejecutable.
-- =============================================================================

create table if not exists public.gastos_proyecto (
  id         uuid primary key default gen_random_uuid(),
  concepto   text not null,
  monto      numeric not null default 0,
  categoria  text not null default 'otro'
             check (categoria in ('impresion', 'premio_general', 'otro')),
  created_at timestamptz not null default now()
);

alter table public.gastos_proyecto enable row level security;

grant select, insert, update, delete on public.gastos_proyecto to anon;
grant select on public.gastos_proyecto to authenticated;

-- Lectura compartida (admin con anon, proveedor con authenticated)
drop policy if exists "gastos lee (todos)" on public.gastos_proyecto;
create policy "gastos lee (todos)"
  on public.gastos_proyecto for select
  to anon, authenticated
  using (true);

-- Escritura solo admin (anon)
drop policy if exists "gastos inserta (anon)" on public.gastos_proyecto;
create policy "gastos inserta (anon)"
  on public.gastos_proyecto for insert to anon with check (true);

drop policy if exists "gastos actualiza (anon)" on public.gastos_proyecto;
create policy "gastos actualiza (anon)"
  on public.gastos_proyecto for update to anon using (true) with check (true);

drop policy if exists "gastos borra (anon)" on public.gastos_proyecto;
create policy "gastos borra (anon)"
  on public.gastos_proyecto for delete to anon using (true);

-- Verificación (opcional):
--   select categoria, sum(monto) from public.gastos_proyecto group by categoria;
