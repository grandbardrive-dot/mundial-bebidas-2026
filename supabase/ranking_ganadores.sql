-- =============================================================================
-- Ranking + Ganadores (app del cliente) + timestamp de completado
-- Mundial de Bebidas 2026 — GrandBar Distribuciones
--
-- 1) clientes.completado_at: cuándo el cliente llegó a 30/30 (no se borra al bajar).
-- 2) RPC marcar_completado: setea completado_at SOLO si el cliente tiene todas las
--    figuritas tildadas (verificación del lado del servidor). Idempotente.
-- 3) vw_ranking: vista PÚBLICA que expone SOLO nombre_local + completado_at + avance
--    (NO teléfono ni contacto). Es la fuente del ranking y de ganadores.
--
-- Cómo usar: pegá todo en el SQL Editor y ejecutá. Re-ejecutable.
-- =============================================================================

-- 1) Columna
alter table public.clientes add column if not exists completado_at timestamptz;

-- 2) RPC: marcar completado (verifica 30/30 server-side, setea si está null)
create or replace function public.marcar_completado(p_cliente_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
  v_tiene int;
  v_res   timestamptz;
begin
  select count(*) into v_total from public.figuritas;
  select count(*) into v_tiene
    from public.coleccion_cliente
    where cliente_id = p_cliente_id and tiene = true;

  if v_total > 0 and v_tiene >= v_total then
    update public.clientes
       set completado_at = now()
     where id = p_cliente_id
       and completado_at is null;
  end if;

  select completado_at into v_res from public.clientes where id = p_cliente_id;
  return v_res;
end;
$$;

grant execute on function public.marcar_completado(uuid) to anon, authenticated;

-- 3) Vista pública de ranking (solo campos seguros). Al pertenecer al owner
--    (postgres) saltea RLS y devuelve a todos los clientes, pero EXPONE únicamente
--    nombre_local, completado_at y el avance — nunca teléfono/contacto.
create or replace view public.vw_ranking as
select
  c.id,
  c.nombre_local,
  c.completado_at,
  coalesce(t.tildadas, 0) as tildadas,
  (select count(*) from public.figuritas) as total
from public.clientes c
left join (
  select cliente_id, count(*) as tildadas
  from public.coleccion_cliente
  where tiene = true
  group by cliente_id
) t on t.cliente_id = c.id;

grant select on public.vw_ranking to anon, authenticated;

-- Verificación (opcional):
--   select nombre_local, tildadas, total, completado_at
--   from public.vw_ranking order by tildadas desc;
