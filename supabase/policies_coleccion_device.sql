-- =============================================================================
-- Políticas RLS para la COLECCIÓN del cliente por dispositivo (sin Supabase Auth)
-- Mundial de Bebidas 2026 — GrandBar Distribuciones
--
-- La vista del álbum tilda/destilda figuritas y persiste en coleccion_cliente
-- (upsert por cliente_id + figurita_id). Como el cliente se identifica por
-- dispositivo (sin JWT de usuario), necesita leer/insertar/actualizar su
-- colección con la anon key. El schema original dejó políticas atadas a
-- auth.uid(), que bloquean al usuario anónimo: este archivo las habilita.
--
-- ⚠️ NOTA DE SEGURIDAD: deja coleccion_cliente legible/escribible con la anon key
--    (lo que requiere el login por dispositivo). Aceptable para la promo; endurecer
--    con un device token si hace falta.
--
-- Cómo usar: ejecutá esto en el SQL Editor (una vez).
-- =============================================================================

alter table public.coleccion_cliente enable row level security;

drop policy if exists "device lee coleccion" on public.coleccion_cliente;
create policy "device lee coleccion"
  on public.coleccion_cliente for select
  to anon, authenticated
  using (true);

drop policy if exists "device inserta coleccion" on public.coleccion_cliente;
create policy "device inserta coleccion"
  on public.coleccion_cliente for insert
  to anon, authenticated
  with check (true);

drop policy if exists "device actualiza coleccion" on public.coleccion_cliente;
create policy "device actualiza coleccion"
  on public.coleccion_cliente for update
  to anon, authenticated
  using (true)
  with check (true);
