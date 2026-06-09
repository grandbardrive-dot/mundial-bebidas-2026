-- =============================================================================
-- Políticas RLS para identificación POR DISPOSITIVO (sin Supabase Auth)
-- Mundial de Bebidas 2026 — GrandBar Distribuciones
--
-- Contexto: el onboarding del cliente NO usa contraseñas. Se identifica al
-- cliente guardando su id en localStorage del dispositivo. Por eso el front
-- usa la anon key (sin JWT de usuario) para CREAR y LEER su ficha en `clientes`.
--
-- El schema.sql original dejó políticas de `clientes` atadas a auth.uid()
-- (pensadas para Supabase Auth), que bloquean al usuario anónimo. Este archivo
-- agrega las políticas necesarias para el flujo por dispositivo.
--
-- ⚠️ NOTA DE SEGURIDAD: estas políticas hacen la tabla `clientes` insertable
--    y legible con la anon key (es lo que requiere un login sin contraseña por
--    dispositivo). Para la promo es aceptable. Si más adelante querés endurecer,
--    lo ideal es un "device token" secreto por cliente y filtrar el SELECT por
--    ese token en vez de `using (true)`.
--
-- Cómo usar: ejecutá esto en el SQL Editor (una vez).
-- =============================================================================

alter table public.clientes enable row level security;

-- Crear ficha de cliente (onboarding) desde el dispositivo
drop policy if exists "device crea cliente" on public.clientes;
create policy "device crea cliente"
  on public.clientes for insert
  to anon, authenticated
  with check (true);

-- Leer ficha de cliente (recuperar por id de localStorage / dedupe por local+tel)
drop policy if exists "device lee clientes" on public.clientes;
create policy "device lee clientes"
  on public.clientes for select
  to anon, authenticated
  using (true);
