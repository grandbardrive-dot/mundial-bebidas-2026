-- =============================================================================
-- Políticas para el PANEL ADMIN interno (/admin)
-- Mundial de Bebidas 2026 — GrandBar Distribuciones
--
-- El admin escribe con la anon key (la puerta es una clave simple en el front).
-- Este archivo habilita lo necesario: escritura anónima en las tablas de gestión,
-- update de reclamos, y el bucket público de fotos de premios.
--
-- ⚠️ Esto deja varias tablas escribibles con la anon key. Es para uso interno
--    mientras dura el proyecto. Al cierre, REVERTIR (ver bloque al final).
--
-- Cómo usar: ejecutá todo en el SQL Editor de Supabase.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- STORAGE: bucket PÚBLICO "premios-img" (fotos de premios por proveedor)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('premios-img', 'premios-img', true)
on conflict (id) do nothing;

drop policy if exists "premios-img lectura publica" on storage.objects;
create policy "premios-img lectura publica"
  on storage.objects for select
  using (bucket_id = 'premios-img');

drop policy if exists "premios-img escribe admin" on storage.objects;
create policy "premios-img escribe admin"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'premios-img');

drop policy if exists "premios-img actualiza admin" on storage.objects;
create policy "premios-img actualiza admin"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'premios-img')
  with check (bucket_id = 'premios-img');

drop policy if exists "premios-img borra admin" on storage.objects;
create policy "premios-img borra admin"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'premios-img');

-- ---------------------------------------------------------------------------
-- STORAGE: el admin necesita FIRMAR urls de "paginas-completadas" (bucket privado)
-- para ver las fotos de los reclamos -> requiere poder leer esos objetos.
-- ---------------------------------------------------------------------------
drop policy if exists "paginas admin lee" on storage.objects;
create policy "paginas admin lee"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'paginas-completadas');

-- ---------------------------------------------------------------------------
-- premios_proveedor_semana: alta/baja/modificación (ya tiene lectura pública)
-- ---------------------------------------------------------------------------
drop policy if exists "admin inserta premio prov" on public.premios_proveedor_semana;
create policy "admin inserta premio prov"
  on public.premios_proveedor_semana for insert
  to anon, authenticated with check (true);

drop policy if exists "admin actualiza premio prov" on public.premios_proveedor_semana;
create policy "admin actualiza premio prov"
  on public.premios_proveedor_semana for update
  to anon, authenticated using (true) with check (true);

drop policy if exists "admin borra premio prov" on public.premios_proveedor_semana;
create policy "admin borra premio prov"
  on public.premios_proveedor_semana for delete
  to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- premios_generales: solo edición (ya tiene lectura pública)
-- ---------------------------------------------------------------------------
drop policy if exists "admin actualiza premios generales" on public.premios_generales;
create policy "admin actualiza premios generales"
  on public.premios_generales for update
  to anon, authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- vendedores: alta/edición/activar-desactivar (ya tiene lectura pública)
-- ---------------------------------------------------------------------------
drop policy if exists "admin inserta vendedor" on public.vendedores;
create policy "admin inserta vendedor"
  on public.vendedores for insert
  to anon, authenticated with check (true);

drop policy if exists "admin actualiza vendedor" on public.vendedores;
create policy "admin actualiza vendedor"
  on public.vendedores for update
  to anon, authenticated using (true) with check (true);

drop policy if exists "admin borra vendedor" on public.vendedores;
create policy "admin borra vendedor"
  on public.vendedores for delete
  to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- reclamos_premio: el admin LISTA todos y los confirma/rechaza (update)
-- ---------------------------------------------------------------------------
drop policy if exists "admin lee reclamos" on public.reclamos_premio;
create policy "admin lee reclamos"
  on public.reclamos_premio for select
  to anon, authenticated using (true);

drop policy if exists "admin actualiza reclamos" on public.reclamos_premio;
create policy "admin actualiza reclamos"
  on public.reclamos_premio for update
  to anon, authenticated using (true) with check (true);

-- =============================================================================
-- AL CERRAR EL PROYECTO: revertir (descomentar y ejecutar)
-- =============================================================================
-- drop policy if exists "premios-img lectura publica" on storage.objects;
-- drop policy if exists "premios-img escribe admin" on storage.objects;
-- drop policy if exists "premios-img actualiza admin" on storage.objects;
-- drop policy if exists "premios-img borra admin" on storage.objects;
-- drop policy if exists "paginas admin lee" on storage.objects;
-- drop policy if exists "admin inserta premio prov" on public.premios_proveedor_semana;
-- drop policy if exists "admin actualiza premio prov" on public.premios_proveedor_semana;
-- drop policy if exists "admin borra premio prov" on public.premios_proveedor_semana;
-- drop policy if exists "admin actualiza premios generales" on public.premios_generales;
-- drop policy if exists "admin inserta vendedor" on public.vendedores;
-- drop policy if exists "admin actualiza vendedor" on public.vendedores;
-- drop policy if exists "admin borra vendedor" on public.vendedores;
-- drop policy if exists "admin lee reclamos" on public.reclamos_premio;
-- drop policy if exists "admin actualiza reclamos" on public.reclamos_premio;
