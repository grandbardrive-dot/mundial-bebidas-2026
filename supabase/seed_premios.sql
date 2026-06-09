-- =============================================================================
-- Seed de ejemplo: premios_generales
-- Mundial de Bebidas 2026 — GrandBar Distribuciones
--
-- Cómo usar: ejecutá esto en el SQL Editor de Supabase DESPUÉS de schema.sql.
--
-- NOTA sobre las imágenes:
--   Los archivos viven en /public/premios/ del frontend (NO en Storage):
--   tv.jpg, cava.jpg y camiseta.jpg (fotos reales de los premios).
-- =============================================================================

-- Limpieza opcional para re-correr el seed sin duplicar (descomentar si hace falta):
-- delete from public.premios_generales;

-- ---------------------------------------------------------------------------
-- PREMIO MAYOR — 1 por semana (tipo 'semanal_1'), semanas 1 a 4
-- ---------------------------------------------------------------------------
insert into public.premios_generales (nombre, descripcion, tipo, semana, imagen_url, cantidad) values
  ('Smart TV 50" Sansei Google TV 4K', 'Para el primer cliente que complete el álbum completo esa semana.', 'semanal_1', 1, '/premios/tv.jpg', 1),
  ('Smart TV 50" Sansei Google TV 4K', 'Para el primer cliente que complete el álbum completo esa semana.', 'semanal_1', 2, '/premios/tv.jpg', 1),
  ('Smart TV 50" Sansei Google TV 4K', 'Para el primer cliente que complete el álbum completo esa semana.', 'semanal_1', 3, '/premios/tv.jpg', 1),
  ('Smart TV 50" Sansei Google TV 4K', 'Para el primer cliente que complete el álbum completo esa semana.', 'semanal_1', 4, '/premios/tv.jpg', 1);

-- ---------------------------------------------------------------------------
-- 2° PUESTO — premios a elección (tipo 'semanal_2'), sin semana fija
-- ---------------------------------------------------------------------------
insert into public.premios_generales (nombre, descripcion, tipo, semana, imagen_url, cantidad) values
  ('Cava de Vinos Ranser WC7000 (18 bot.)', 'Si completás segundo, elegís entre estos premios.', 'semanal_2', null, '/premios/cava.jpg', 2),
  ('Camiseta Titular Selección Argentina', 'Si completás segundo, elegís entre estos premios.', 'semanal_2', null, '/premios/camiseta.jpg', 4);
