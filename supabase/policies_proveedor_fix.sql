-- =============================================================================
-- FIX (definitivo): "infinite recursion detected in policy for relation
-- coleccion_cliente" — Panel de proveedores
--
-- CAUSA RAÍZ: el schema original creó políticas pensadas para clientes con
-- Supabase Auth ("cliente ve su coleccion", "cliente ve sus reclamos", etc.)
-- que consultan la tabla `clientes`. La política del PROVEEDOR sobre `clientes`
-- consulta a su vez `coleccion_cliente` / `reclamos_premio`. Resultado: las
-- políticas se referencian en círculo y Postgres aborta con recursión.
--
-- Esas políticas "cliente ..." NO se usan: en este proyecto los clientes son
-- ANÓNIMOS (identificación por dispositivo), nunca se autentican. El acceso real
-- de los clientes va por las políticas "(anon)" y por la RPC reclamar_premio.
--
-- SOLUCIÓN:
--   1) crear funciones SECURITY DEFINER para los chequeos del proveedor,
--   2) BORRAR las políticas vestigiales que cierran el ciclo,
--   3) recrear las políticas del proveedor usando las funciones.
--
-- Cómo usar: pegá TODO en el SQL Editor y ejecutá. Es idempotente.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Funciones helper (SECURITY DEFINER: corren como owner, saltean RLS)
-- ---------------------------------------------------------------------------
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

create or replace function public.cliente_es_de_mi_marca(p_cliente uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select
    exists (
      select 1 from public.coleccion_cliente cc
      join public.figuritas f on f.id = cc.figurita_id
      where cc.cliente_id = p_cliente and f.proveedor_id = public.mi_proveedor_id()
    )
    or exists (
      select 1 from public.reclamos_premio r
      where r.cliente_id = p_cliente and r.proveedor_id = public.mi_proveedor_id()
    );
$$;

grant execute on function public.mi_proveedor_id() to anon, authenticated;
grant execute on function public.figurita_es_de_mi_marca(uuid) to anon, authenticated;
grant execute on function public.cliente_es_de_mi_marca(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) BORRAR las políticas vestigiales (modelo cliente-con-Auth, sin uso) que
--    cierran el ciclo de recursión. Los clientes anónimos NO las necesitan.
-- ---------------------------------------------------------------------------
-- en coleccion_cliente (consultaban `clientes`)
drop policy if exists "cliente ve su coleccion"        on public.coleccion_cliente;
drop policy if exists "cliente inserta en su coleccion" on public.coleccion_cliente;
drop policy if exists "cliente actualiza su coleccion"  on public.coleccion_cliente;
-- en reclamos_premio (consultaban `clientes`)
drop policy if exists "cliente ve sus reclamos"  on public.reclamos_premio;
drop policy if exists "cliente crea sus reclamos" on public.reclamos_premio;
-- en clientes (basadas en auth.uid(); sin uso con clientes anónimos)
drop policy if exists "cliente ve su ficha"       on public.clientes;
drop policy if exists "cliente actualiza su ficha" on public.clientes;

-- ---------------------------------------------------------------------------
-- 3) Recrear las políticas del proveedor con las funciones (sin recursión)
-- ---------------------------------------------------------------------------
drop policy if exists "proveedor lee sus figuritas" on public.figuritas;
create policy "proveedor lee sus figuritas"
  on public.figuritas for select to authenticated
  using (proveedor_id = public.mi_proveedor_id());

drop policy if exists "proveedor lee sus premios" on public.premios_proveedor_semana;
create policy "proveedor lee sus premios"
  on public.premios_proveedor_semana for select to authenticated
  using (proveedor_id = public.mi_proveedor_id());

drop policy if exists "proveedor lee sus reclamos" on public.reclamos_premio;
create policy "proveedor lee sus reclamos"
  on public.reclamos_premio for select to authenticated
  using (proveedor_id = public.mi_proveedor_id());

drop policy if exists "proveedor lee coleccion de su marca" on public.coleccion_cliente;
create policy "proveedor lee coleccion de su marca"
  on public.coleccion_cliente for select to authenticated
  using (public.figurita_es_de_mi_marca(figurita_id));

drop policy if exists "proveedor lee clientes de su marca" on public.clientes;
create policy "proveedor lee clientes de su marca"
  on public.clientes for select to authenticated
  using (public.cliente_es_de_mi_marca(id));

-- =============================================================================
-- Verificación rápida (opcional): listar políticas activas por tabla
--   select tablename, policyname, roles, cmd
--   from pg_policies
--   where tablename in ('clientes','coleccion_cliente','reclamos_premio','figuritas')
--   order by tablename, policyname;
-- =============================================================================
