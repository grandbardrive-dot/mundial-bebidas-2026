-- =============================================================================
-- Permitir SUBIR la foto de la página al bucket privado "paginas-completadas"
-- Mundial de Bebidas 2026 — GrandBar Distribuciones
--
-- Problema: al reclamar un premio, la subida fallaba con
--   "new row violates row-level security policy"
-- porque storage.objects tiene RLS y no había policy de INSERT para el cliente
-- (anon, identificado por dispositivo).
--
-- Este archivo SOLO habilita la SUBIDA (INSERT). El bucket SIGUE PRIVADO:
-- la lectura de las fotos se hace con signed URLs (no se expone públicamente).
--
-- ⚠️ Uso interno durante el proyecto. Endurecer al cierre (ver bloque final).
-- Cómo usar: pegá todo en el SQL Editor de Supabase y ejecutá.
-- =============================================================================

-- 1) Asegurar que el bucket exista y sea PRIVADO (public = false)
insert into storage.buckets (id, name, public)
values ('paginas-completadas', 'paginas-completadas', false)
on conflict (id) do nothing;

-- 2) Política de INSERT: el cliente (anon o autenticado) puede subir objetos
--    SOLO a este bucket. No agrega lectura pública.
drop policy if exists "subir foto pagina (anon)" on storage.objects;
create policy "subir foto pagina (anon)"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'paginas-completadas');

-- =============================================================================
-- AL CERRAR EL PROYECTO: revertir / endurecer (descomentar lo que corresponda)
-- =============================================================================
-- Opción A — quitar la subida anónima por completo:
-- drop policy if exists "subir foto pagina (anon)" on storage.objects;
--
-- Opción B — restringir la subida a una carpeta por cliente
--   (si más adelante usás un device-id como primer segmento del path):
-- drop policy if exists "subir foto pagina (anon)" on storage.objects;
-- create policy "subir foto pagina (anon)"
--   on storage.objects for insert
--   to anon, authenticated
--   with check (
--     bucket_id = 'paginas-completadas'
--     and (storage.foldername(name))[1] is not null
--   );
