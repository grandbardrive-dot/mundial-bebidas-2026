-- =============================================================================
-- Políticas para el FLUJO DE RECLAMO del cliente (por dispositivo, sin Auth)
-- Mundial de Bebidas 2026 — GrandBar Distribuciones
--
-- El cliente, identificado por dispositivo (anon key), necesita:
--   1) subir la foto de la página completada al bucket privado "paginas-completadas"
--   2) consultar si ya reclamó por ese proveedor (lectura de reclamos_premio)
--   3) ejecutar la RPC reclamar_premio (descuenta stock e inserta el reclamo)
--
-- La inserción del reclamo y el descuento de stock los hace la RPC (SECURITY
-- DEFINER), por eso NO hace falta insert anónimo directo en reclamos_premio.
--
-- ⚠️ Uso interno durante el proyecto. Endurecer al cierre (device token).
-- Cómo usar: ejecutá todo en el SQL Editor (una vez).
-- =============================================================================

-- 1) Subir foto al bucket privado "paginas-completadas"
drop policy if exists "device sube pagina" on storage.objects;
create policy "device sube pagina"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'paginas-completadas');

-- (opcional) leer lo que subió en ese bucket
drop policy if exists "device lee pagina" on storage.objects;
create policy "device lee pagina"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'paginas-completadas');

-- 2) Consultar sus reclamos (regla "un premio por proveedor")
drop policy if exists "device lee reclamos" on public.reclamos_premio;
create policy "device lee reclamos"
  on public.reclamos_premio for select
  to anon, authenticated
  using (true);

-- 3) Permitir ejecutar la RPC con la anon key
grant execute on function public.reclamar_premio(uuid, uuid, text) to anon, authenticated;

-- =============================================================================
-- Revertir al cierre (descomentar):
-- =============================================================================
-- drop policy if exists "device sube pagina" on storage.objects;
-- drop policy if exists "device lee pagina" on storage.objects;
-- drop policy if exists "device lee reclamos" on public.reclamos_premio;
-- revoke execute on function public.reclamar_premio(uuid, uuid, text) from anon, authenticated;
