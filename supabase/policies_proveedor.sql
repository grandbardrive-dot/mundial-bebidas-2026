-- =============================================================================
-- PANEL DE PROVEEDORES — Autenticación y seguridad (RLS por marca)
-- Mundial de Bebidas 2026 — GrandBar Distribuciones
--
-- MODELO DE ROLES (clave para entender todo este archivo):
--   • anon          -> admin (/admin con clave simple) y clientes (álbum por
--                      dispositivo). Usan la anon key SIN sesión de Supabase Auth.
--   • authenticated -> proveedores logueados (Supabase Auth). Solo lectura, y SOLO
--                      de los datos de SU marca.
--
-- Como las políticas RLS se combinan con OR, si una política amplia incluye
-- `authenticated` (o es pública), el proveedor logueado heredaría ese acceso.
-- Por eso acá:
--   1) creamos el vínculo usuario->proveedor,
--   2) agregamos políticas SELECT acotadas para `authenticated`,
--   3) RE-DEFINIMOS las políticas amplias actuales para que apliquen SOLO a `anon`
--      (así el admin y los clientes siguen funcionando igual, pero el proveedor
--      queda acotado y sin escritura).
--
-- ⚠️ Correr DESPUÉS de schema.sql y de los demás policies_*.sql.
-- =============================================================================


-- =============================================================================
-- 1) TABLA DE VÍNCULO usuario (auth) -> proveedor
-- =============================================================================
create table if not exists public.proveedor_usuarios (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  proveedor_id uuid not null references public.proveedores (id) on delete cascade,
  created_at   timestamptz not null default now()
);

alter table public.proveedor_usuarios enable row level security;

-- El proveedor puede leer SU propia fila de vínculo (para saber su proveedor_id).
-- No damos insert/update: los vínculos los crea el super admin desde el SQL Editor
-- (el editor corre como service_role y saltea RLS).
drop policy if exists "proveedor lee su vinculo" on public.proveedor_usuarios;
create policy "proveedor lee su vinculo"
  on public.proveedor_usuarios for select
  to authenticated
  using (user_id = auth.uid());


-- =============================================================================
-- 2) LECTURAS ACOTADAS PARA EL PROVEEDOR (rol authenticated)
--    Usamos funciones SECURITY DEFINER para los chequeos: corren como owner y
--    saltean RLS, evitando recursión entre políticas (clientes <-> coleccion).
-- =============================================================================

-- proveedor_id de la marca del usuario logueado
create or replace function public.mi_proveedor_id()
returns uuid language sql security definer stable set search_path = public as $$
  select proveedor_id from public.proveedor_usuarios where user_id = auth.uid() limit 1;
$$;

-- ¿la figurita pertenece a mi marca?
create or replace function public.figurita_es_de_mi_marca(p_fig uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.figuritas f
    where f.id = p_fig and f.proveedor_id = public.mi_proveedor_id()
  );
$$;

-- ¿el cliente tiene actividad con mi marca? (colección o reclamo de mi proveedor)
create or replace function public.cliente_es_de_mi_marca(p_cliente uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select
    exists (
      select 1 from public.coleccion_cliente cc
      join public.figuritas f on f.id = cc.figurita_id
      where cc.cliente_id = p_cliente and f.proveedor_id = public.mi_proveedor_id()
    )
    or exists (
      select 1 from public.reclamos_premio r
      where r.cliente_id = p_cliente and r.proveedor_id = public.mi_proveedor_id()
    );
$$;

grant execute on function public.mi_proveedor_id() to anon, authenticated;
grant execute on function public.figurita_es_de_mi_marca(uuid) to anon, authenticated;
grant execute on function public.cliente_es_de_mi_marca(uuid) to anon, authenticated;

-- Borrar políticas vestigiales (modelo cliente-con-Auth, sin uso) que cierran el
-- ciclo de recursión (clientes <-> coleccion/reclamos). Los clientes anónimos no
-- las necesitan: usan las políticas "(anon)" y la RPC reclamar_premio.
drop policy if exists "cliente ve su coleccion"        on public.coleccion_cliente;
drop policy if exists "cliente inserta en su coleccion" on public.coleccion_cliente;
drop policy if exists "cliente actualiza su coleccion"  on public.coleccion_cliente;
drop policy if exists "cliente ve sus reclamos"  on public.reclamos_premio;
drop policy if exists "cliente crea sus reclamos" on public.reclamos_premio;
drop policy if exists "cliente ve su ficha"       on public.clientes;
drop policy if exists "cliente actualiza su ficha" on public.clientes;

-- Figuritas de su marca
drop policy if exists "proveedor lee sus figuritas" on public.figuritas;
create policy "proveedor lee sus figuritas"
  on public.figuritas for select
  to authenticated
  using (proveedor_id = public.mi_proveedor_id());

-- Premios de su marca
drop policy if exists "proveedor lee sus premios" on public.premios_proveedor_semana;
create policy "proveedor lee sus premios"
  on public.premios_proveedor_semana for select
  to authenticated
  using (proveedor_id = public.mi_proveedor_id());

-- Reclamos de su marca
drop policy if exists "proveedor lee sus reclamos" on public.reclamos_premio;
create policy "proveedor lee sus reclamos"
  on public.reclamos_premio for select
  to authenticated
  using (proveedor_id = public.mi_proveedor_id());

-- Colección: filas cuya figurita pertenece a su marca
drop policy if exists "proveedor lee coleccion de su marca" on public.coleccion_cliente;
create policy "proveedor lee coleccion de su marca"
  on public.coleccion_cliente for select
  to authenticated
  using (public.figurita_es_de_mi_marca(figurita_id));

-- Clientes con actividad en su marca
drop policy if exists "proveedor lee clientes de su marca" on public.clientes;
create policy "proveedor lee clientes de su marca"
  on public.clientes for select
  to authenticated
  using (public.cliente_es_de_mi_marca(id));

-- Dinámicas de su marca (para los KPIs de volumen)
drop policy if exists "proveedor lee sus dinamicas" on public.dinamicas;
create policy "proveedor lee sus dinamicas"
  on public.dinamicas for select
  to authenticated
  using (public.figurita_es_de_mi_marca(figurita_id));


-- =============================================================================
-- 3) RE-DEFINIR LAS LECTURAS AMPLIAS ACTUALES -> SOLO `anon`
--    (Antes eran públicas o to anon,authenticated. Las pasamos a anon para que
--     el proveedor authenticated NO las herede. El admin y los clientes son anon,
--     así que siguen funcionando igual.)
-- =============================================================================

-- figuritas (la usaban: álbum del cliente y /asignar, ambos anon)
drop policy if exists "lectura publica figuritas" on public.figuritas;
drop policy if exists "lectura figuritas (anon)" on public.figuritas;
create policy "lectura figuritas (anon)"
  on public.figuritas for select to anon using (true);

-- premios_proveedor_semana (cliente reclamo + admin, anon)
drop policy if exists "lectura publica premios_proveedor_semana" on public.premios_proveedor_semana;
drop policy if exists "lectura premios prov (anon)" on public.premios_proveedor_semana;
create policy "lectura premios prov (anon)"
  on public.premios_proveedor_semana for select to anon using (true);

-- clientes (onboarding recupera + álbum, anon)
drop policy if exists "device lee clientes" on public.clientes;
drop policy if exists "lectura clientes (anon)" on public.clientes;
create policy "lectura clientes (anon)"
  on public.clientes for select to anon using (true);

-- coleccion_cliente (álbum, anon)
drop policy if exists "device lee coleccion" on public.coleccion_cliente;
drop policy if exists "lectura coleccion (anon)" on public.coleccion_cliente;
create policy "lectura coleccion (anon)"
  on public.coleccion_cliente for select to anon using (true);

-- reclamos_premio (admin lista, anon). Consolidamos las dos lecturas amplias.
drop policy if exists "admin lee reclamos" on public.reclamos_premio;
drop policy if exists "device lee reclamos" on public.reclamos_premio;
drop policy if exists "lectura reclamos (anon)" on public.reclamos_premio;
create policy "lectura reclamos (anon)"
  on public.reclamos_premio for select to anon using (true);

-- dinamicas (álbum del cliente + admin, anon). Pública -> anon para no filtrar al proveedor.
drop policy if exists "lectura publica dinamicas" on public.dinamicas;
drop policy if exists "lectura dinamicas (anon)" on public.dinamicas;
create policy "lectura dinamicas (anon)"
  on public.dinamicas for select to anon using (true);


-- =============================================================================
-- 4) RE-DEFINIR LAS ESCRITURAS -> SOLO `anon` (proveedor = solo lectura)
--    El admin/clientes escriben como anon, así que no cambia su comportamiento.
-- =============================================================================

-- clientes: alta (onboarding)
drop policy if exists "device crea cliente" on public.clientes;
drop policy if exists "device crea cliente (anon)" on public.clientes;
create policy "device crea cliente (anon)"
  on public.clientes for insert to anon with check (true);

-- coleccion_cliente: tildar (insert/update)
drop policy if exists "device inserta coleccion" on public.coleccion_cliente;
drop policy if exists "device inserta coleccion (anon)" on public.coleccion_cliente;
create policy "device inserta coleccion (anon)"
  on public.coleccion_cliente for insert to anon with check (true);

drop policy if exists "device actualiza coleccion" on public.coleccion_cliente;
drop policy if exists "device actualiza coleccion (anon)" on public.coleccion_cliente;
create policy "device actualiza coleccion (anon)"
  on public.coleccion_cliente for update to anon using (true) with check (true);

-- premios_proveedor_semana: CRUD del admin
drop policy if exists "admin inserta premio prov" on public.premios_proveedor_semana;
drop policy if exists "admin inserta premio prov (anon)" on public.premios_proveedor_semana;
create policy "admin inserta premio prov (anon)"
  on public.premios_proveedor_semana for insert to anon with check (true);

drop policy if exists "admin actualiza premio prov" on public.premios_proveedor_semana;
drop policy if exists "admin actualiza premio prov (anon)" on public.premios_proveedor_semana;
create policy "admin actualiza premio prov (anon)"
  on public.premios_proveedor_semana for update to anon using (true) with check (true);

drop policy if exists "admin borra premio prov" on public.premios_proveedor_semana;
drop policy if exists "admin borra premio prov (anon)" on public.premios_proveedor_semana;
create policy "admin borra premio prov (anon)"
  on public.premios_proveedor_semana for delete to anon using (true);

-- premios_generales: update del admin
drop policy if exists "admin actualiza premios generales" on public.premios_generales;
drop policy if exists "admin actualiza premios generales (anon)" on public.premios_generales;
create policy "admin actualiza premios generales (anon)"
  on public.premios_generales for update to anon using (true) with check (true);

-- vendedores: CRUD del admin
drop policy if exists "admin inserta vendedor" on public.vendedores;
drop policy if exists "admin inserta vendedor (anon)" on public.vendedores;
create policy "admin inserta vendedor (anon)"
  on public.vendedores for insert to anon with check (true);

drop policy if exists "admin actualiza vendedor" on public.vendedores;
drop policy if exists "admin actualiza vendedor (anon)" on public.vendedores;
create policy "admin actualiza vendedor (anon)"
  on public.vendedores for update to anon using (true) with check (true);

drop policy if exists "admin borra vendedor" on public.vendedores;
drop policy if exists "admin borra vendedor (anon)" on public.vendedores;
create policy "admin borra vendedor (anon)"
  on public.vendedores for delete to anon using (true);

-- reclamos_premio: update del admin (confirmar/rechazar). OJO: el proveedor NO
-- puede actualizar (no creamos ninguna policy de update para authenticated).
drop policy if exists "admin actualiza reclamos" on public.reclamos_premio;
drop policy if exists "admin actualiza reclamos (anon)" on public.reclamos_premio;
create policy "admin actualiza reclamos (anon)"
  on public.reclamos_premio for update to anon using (true) with check (true);

-- figuritas: update de /asignar (asignar imágenes)
drop policy if exists "asignar imagenes figuritas" on public.figuritas;
drop policy if exists "asignar imagenes figuritas (anon)" on public.figuritas;
create policy "asignar imagenes figuritas (anon)"
  on public.figuritas for update to anon using (true) with check (true);


-- =============================================================================
-- 5) STORAGE -> escrituras/lecturas internas SOLO `anon`
--    (la lectura pública del bucket premios-img se mantiene; las fotos privadas
--     siguen detrás de signed URL del admin, que es anon)
-- =============================================================================
drop policy if exists "premios-img escribe admin" on storage.objects;
drop policy if exists "premios-img escribe admin (anon)" on storage.objects;
create policy "premios-img escribe admin (anon)"
  on storage.objects for insert to anon with check (bucket_id = 'premios-img');

drop policy if exists "premios-img actualiza admin" on storage.objects;
drop policy if exists "premios-img actualiza admin (anon)" on storage.objects;
create policy "premios-img actualiza admin (anon)"
  on storage.objects for update to anon
  using (bucket_id = 'premios-img') with check (bucket_id = 'premios-img');

drop policy if exists "premios-img borra admin" on storage.objects;
drop policy if exists "premios-img borra admin (anon)" on storage.objects;
create policy "premios-img borra admin (anon)"
  on storage.objects for delete to anon using (bucket_id = 'premios-img');

-- paginas-completadas: subir (cliente) y leer/firmar (admin) -> anon
drop policy if exists "device sube pagina" on storage.objects;
drop policy if exists "subir foto pagina (anon)" on storage.objects;
create policy "subir foto pagina (anon)"
  on storage.objects for insert to anon with check (bucket_id = 'paginas-completadas');

drop policy if exists "paginas admin lee" on storage.objects;
drop policy if exists "device lee pagina" on storage.objects;
drop policy if exists "paginas lee (anon)" on storage.objects;
create policy "paginas lee (anon)"
  on storage.objects for select to anon using (bucket_id = 'paginas-completadas');


-- =============================================================================
-- 6) RPC reclamar_premio: ejecutable SOLO por anon (cliente), no por proveedor
-- =============================================================================
revoke execute on function public.reclamar_premio(uuid, uuid, text) from authenticated;
grant execute on function public.reclamar_premio(uuid, uuid, text) to anon;


-- =============================================================================
-- CÓMO CREAR LOS 6 USUARIOS PROVEEDOR (lo hace el super admin, manual)
-- =============================================================================
-- a) Supabase Dashboard -> Authentication -> Users -> "Add user":
--      email = (ej) campari@grandbar.com   /   password = (una segura)
--      (Activá "Auto Confirm User" para que pueda loguear sin verificar email.)
-- b) Copiá el User UID que aparece en la lista de Users.
-- c) Buscá el id del proveedor:
--      select id, nombre from public.proveedores order by pagina_num;
-- d) Insertá el vínculo (reemplazá los UUID):
--      insert into public.proveedor_usuarios (user_id, proveedor_id) values
--        ('<USER_UID_DE_AUTH>', '<PROVEEDOR_ID>');
--    Ejemplo concreto:
--      insert into public.proveedor_usuarios (user_id, proveedor_id) values
--        ('11111111-2222-3333-4444-555555555555',
--         (select id from public.proveedores where nombre = 'Grupo Campari'));
-- Repetir a–d para cada una de las 6 marcas.


-- =============================================================================
-- REVERTIR / ENDURECER AL CIERRE (referencia)
-- =============================================================================
-- Para quitar el panel de proveedores: borrar las políticas "proveedor lee ..."
-- y la tabla proveedor_usuarios. Las políticas "(anon)" pueden quedarse (son las
-- que usan admin y clientes). Si querés volver al estado previo exacto, recreá
-- las versiones to anon,authenticated desde los policies_*.sql originales.
