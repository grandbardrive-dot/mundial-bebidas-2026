-- =============================================================================
-- Política TEMPORAL para la pantalla interna /asignar
-- Mundial de Bebidas 2026 — GrandBar Distribuciones
--
-- La pantalla /asignar vincula cada figurita con su archivo de imagen escribiendo
-- `imagen_url`. Como `figuritas` solo tiene lectura pública, un UPDATE anónimo se
-- bloquea por RLS. Esta política habilita el UPDATE para poder hacer la asignación.
--
-- ⚠️ ES DE USO INTERNO Y POR ÚNICA VEZ. Cuando termines de asignar las 30 imágenes,
--    ELIMINÁ esta política (ver bloque al final) para que nadie pueda modificar las
--    figuritas con la anon key.
--
-- Cómo usar: ejecutá este bloque en el SQL Editor ANTES de abrir /asignar.
-- =============================================================================

drop policy if exists "asignar imagenes figuritas" on public.figuritas;
create policy "asignar imagenes figuritas"
  on public.figuritas for update
  to anon, authenticated
  using (true)
  with check (true);

-- =============================================================================
-- AL TERMINAR: descomentá y ejecutá esto para revertir (recomendado)
-- =============================================================================
-- drop policy if exists "asignar imagenes figuritas" on public.figuritas;
