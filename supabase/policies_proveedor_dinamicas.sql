-- =============================================================================
-- Scope de `dinamicas` para el panel de proveedores (KPIs de volumen)
-- Mundial de Bebidas 2026 — GrandBar Distribuciones
--
-- El panel del proveedor ahora lee `dinamicas` (botellas_facturadas /
-- botellas_sin_cargo) para estimar el volumen de SU marca.
--
-- Hoy `dinamicas` tiene lectura PÚBLICA ("lectura publica dinamicas"), que aplica
-- también al rol authenticated -> el proveedor podría leer dinámicas de OTRAS
-- marcas. Acá la pasamos a `anon` (que es quien la usa: álbum del cliente y
-- /admin) y agregamos una política acotada para el proveedor (authenticated)
-- filtrada por su marca.
--
-- Cómo usar: pegá todo en el SQL Editor y ejecutá. Idempotente.
-- (Si ya corriste policies_proveedor_fix.sql las funciones ya existen; igual las
--  re-creamos por las dudas.)
-- =============================================================================

-- Funciones helper (por si no se corrió el fix anterior)
create or replace function public.mi_proveedor_id()
returns uuid language sql security definer stable set search_path = public as $$
  select proveedor_id from public.proveedor_usuarios where user_id = auth.uid() limit 1;
$$;

create or replace function public.figurita_es_de_mi_marca(p_fig uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.figuritas f
    where f.id = p_fig and f.proveedor_id = public.mi_proveedor_id()
  );
$$;

grant execute on function public.mi_proveedor_id() to anon, authenticated;
grant execute on function public.figurita_es_de_mi_marca(uuid) to anon, authenticated;

-- 1) Lectura amplia de dinamicas -> SOLO anon (cliente del álbum + admin)
drop policy if exists "lectura publica dinamicas" on public.dinamicas;
drop policy if exists "lectura dinamicas (anon)" on public.dinamicas;
create policy "lectura dinamicas (anon)"
  on public.dinamicas for select
  to anon
  using (true);

-- 2) Lectura acotada para el proveedor (authenticated): solo dinámicas de su marca
drop policy if exists "proveedor lee sus dinamicas" on public.dinamicas;
create policy "proveedor lee sus dinamicas"
  on public.dinamicas for select
  to authenticated
  using (public.figurita_es_de_mi_marca(figurita_id));

-- Nota: `canales` (que el panel lee para el tipo ON/OFF del cliente) queda con su
-- lectura pública: es data de referencia no sensible, no específica de marca.
