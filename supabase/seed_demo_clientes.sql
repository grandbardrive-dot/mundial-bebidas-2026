-- =============================================================================
-- SEED DEMO: clientes de prueba para ver el RANKING y los GANADORES
-- Mundial de Bebidas 2026 — GrandBar Distribuciones
--
-- Crea ~6 clientes identificables (nombre_local empieza con "DEMO ") con distinto
-- avance, para poblar la tabla de posiciones y la sección de ganadores.
--
--  • DEMO Bar Uno          -> 100% (30/30), completó hace 2 días  => GANADOR (1°)
--  • DEMO Resto Dos        -> 100% (30/30), completó hace 1 día   => 2° en completar
--  • DEMO Vinoteca Tres    -> ~80%
--  • DEMO Hotel Cuatro     -> ~55%
--  • DEMO Catering Cinco   -> ~30%
--  • DEMO Autoservicio Seis-> ~10%
--
-- RE-EJECUTABLE: borra el demo previo al inicio y lo vuelve a crear.
-- FÁCIL DE BORRAR: al final hay un bloque "BORRAR DEMO" comentado.
--
-- Cómo usar: pegá todo en el SQL Editor y ejecutá.
-- (Requiere la columna completado_at; la agrega abajo por las dudas.)
-- =============================================================================

-- Por si no se corrió ranking_ganadores.sql todavía:
alter table public.clientes add column if not exists completado_at timestamptz;

-- ---------------------------------------------------------------------------
-- 0) Limpiar demo previo (cascade borra su coleccion_cliente)
-- ---------------------------------------------------------------------------
delete from public.clientes where nombre_local like 'DEMO %';

-- ---------------------------------------------------------------------------
-- 1) Insertar clientes demo
--    Toman un vendedor activo y un canal de su mismo tipo (ON/OFF) reales.
-- ---------------------------------------------------------------------------
with v as (
  select id, sucursal, tipo
  from public.vendedores
  where activo = true
  order by nombre
  limit 1
),
specs(nombre_local, dias_completado) as (
  values
    ('DEMO Bar Uno',            2),     -- ganador (hace 2 días)
    ('DEMO Resto Dos',          1),     -- 2° en completar (hace 1 día)
    ('DEMO Vinoteca Tres',   null),
    ('DEMO Hotel Cuatro',    null),
    ('DEMO Catering Cinco',  null),
    ('DEMO Autoservicio Seis', null)
)
insert into public.clientes
  (nombre_local, contacto, telefono, sucursal, canal_id, vendedor_id, completado_at)
select
  s.nombre_local,
  'Contacto demo',
  '0000000000',
  v.sucursal,
  (select id from public.canales where tipo = v.tipo order by nombre limit 1),
  v.id,
  case
    when s.dias_completado is not null
    then now() - (s.dias_completado || ' days')::interval
    else null
  end
from specs s cross join v;

-- ---------------------------------------------------------------------------
-- 2) Asignar figuritas tildadas según el % buscado (toma las primeras N por orden)
--    N = round(pct% * cantidad_total_de_figuritas)
-- ---------------------------------------------------------------------------
insert into public.coleccion_cliente (cliente_id, figurita_id, tiene, updated_at)
select c.id, f.id, true, now()
from (
  select cl.id,
         round((p.pct::numeric * (select count(*) from public.figuritas)) / 100.0)::int as n
  from public.clientes cl
  join (values
    ('DEMO Bar Uno',            100),
    ('DEMO Resto Dos',          100),
    ('DEMO Vinoteca Tres',       80),
    ('DEMO Hotel Cuatro',        55),
    ('DEMO Catering Cinco',      30),
    ('DEMO Autoservicio Seis',   10)
  ) p(nombre_local, pct) on p.nombre_local = cl.nombre_local
) c
join lateral (
  select id from public.figuritas order by orden nulls last, id limit c.n
) f on true
on conflict (cliente_id, figurita_id) do update set tiene = true;

-- ---------------------------------------------------------------------------
-- Verificación (opcional):
--   select nombre_local, tildadas, total, completado_at
--   from public.vw_ranking
--   where nombre_local like 'DEMO %'
--   order by tildadas desc, completado_at;
-- ---------------------------------------------------------------------------


-- =============================================================================
-- ============================ BORRAR DEMO ====================================
-- Descomentá estas 2 líneas y ejecutá para limpiar TODO el demo cuando termines:
-- =============================================================================
-- delete from public.coleccion_cliente
--   where cliente_id in (select id from public.clientes where nombre_local like 'DEMO %');
-- delete from public.clientes where nombre_local like 'DEMO %';
