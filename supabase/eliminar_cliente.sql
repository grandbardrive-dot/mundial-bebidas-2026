-- =============================================================================
-- RPC: eliminar_cliente — borrado seguro y atómico de un cliente (uso admin)
-- Mundial de Bebidas 2026 — GrandBar Distribuciones
--
-- Por cada cliente:
--   1) DEVUELVE el stock de sus reclamos en estado 'reservado' o 'confirmado'
--      (stock_disponible + 1 por reclamo del premio correspondiente).
--   2) Borra el cliente. Las filas de coleccion_cliente y reclamos_premio se
--      borran solas por las FK con ON DELETE CASCADE.
--
-- Todo en una sola transacción (la función es atómica): si algo falla, no deja
-- nada a medias.
--
-- ⚠️ Las FOTOS del bucket 'paginas-completadas' las borra el front (storage),
--    de forma best-effort, antes/después de llamar a esta función.
--
-- Permisos: ejecutable SOLO por anon (el admin usa la anon key). El proveedor
-- (authenticated) NO puede ejecutarla.
--
-- Cómo usar: pegá todo en el SQL Editor y ejecutá. Re-ejecutable.
-- =============================================================================

create or replace function public.eliminar_cliente(p_cliente_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 1) Devolver stock de los reclamos vigentes (reservado/confirmado)
  update public.premios_proveedor_semana p
     set stock_disponible = stock_disponible + sub.cnt
  from (
    select premio_id, count(*) as cnt
    from public.reclamos_premio
    where cliente_id = p_cliente_id
      and estado in ('reservado', 'confirmado')
      and premio_id is not null
    group by premio_id
  ) sub
  where p.id = sub.premio_id;

  -- 2) Borrar el cliente (cascade borra coleccion_cliente y reclamos_premio)
  delete from public.clientes where id = p_cliente_id;
end;
$$;

-- Solo el admin (anon). Revocamos a authenticated por las dudas.
revoke execute on function public.eliminar_cliente(uuid) from authenticated;
grant execute on function public.eliminar_cliente(uuid) to anon;
