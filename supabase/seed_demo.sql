-- =============================================================================
-- Seed de datos de prueba: vendedores + canales
-- Mundial de Bebidas 2026 — GrandBar Distribuciones
--
-- Cómo usar: ejecutá esto en el SQL Editor de Supabase (después de schema.sql).
-- Es re-ejecutable: no duplica filas (usa "where not exists").
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Vendedores (activos) — whatsapp ficticio en formato internacional
-- ---------------------------------------------------------------------------
insert into public.vendedores (nombre, whatsapp, activo)
select v.nombre, v.whatsapp, true
from (values
  ('Juan Pérez',   '+5492610000001'),
  ('María Gómez',  '+5492610000002'),
  ('Carlos Díaz',  '+5492610000003')
) as v(nombre, whatsapp)
where not exists (
  select 1 from public.vendedores e where e.whatsapp = v.whatsapp
);

-- ---------------------------------------------------------------------------
-- Canales — 5 ON (consumo en el local) y 2 OFF (venta para llevar)
-- ---------------------------------------------------------------------------
insert into public.canales (nombre, tipo)
select c.nombre, c.tipo
from (values
  ('Bar',          'ON'),
  ('Restaurante',  'ON'),
  ('Hotel',        'ON'),
  ('Eventos',      'ON'),
  ('Catering',     'ON'),
  ('Vinoteca',     'OFF'),
  ('Autoservicio', 'OFF')
) as c(nombre, tipo)
where not exists (
  select 1 from public.canales e where e.nombre = c.nombre
);
