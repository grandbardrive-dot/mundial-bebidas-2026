-- columnas nuevas
alter table public.vendedores add column if not exists sucursal text;
alter table public.vendedores add column if not exists tipo text;
alter table public.clientes  add column if not exists sucursal text;
-- limpio datos previos de catálogo (NO tocar clientes)
delete from public.vendedores;
delete from public.canales;
-- canales con su tipo
insert into public.canales (id,nombre,tipo) values
 (gen_random_uuid(),'Bar','ON'),
 (gen_random_uuid(),'Restaurante','ON'),
 (gen_random_uuid(),'Hotel','ON'),
 (gen_random_uuid(),'Eventos','ON'),
 (gen_random_uuid(),'Catering','ON'),
 (gen_random_uuid(),'Vinoteca','OFF'),
 (gen_random_uuid(),'Autoservicio','OFF');
-- vendedores reales (sucursal + tipo; los que atienden ambos van 2 veces)
insert into public.vendedores (id,nombre,whatsapp,sucursal,tipo,activo) values
 (gen_random_uuid(),'Carolina Heluani','5492617046801','Mendoza','ON',true),
 (gen_random_uuid(),'Franco Roldán','5492616604455','Mendoza','ON',true),
 (gen_random_uuid(),'Juan Pablo Mollar','5492613734548','Mendoza','ON',true),
 (gen_random_uuid(),'Pablo Cofano','5492612507633','Mendoza','ON',true),
 (gen_random_uuid(),'Nicolás García','5492617229952','Mendoza','ON',true),
 (gen_random_uuid(),'Diego Sebastianelli','5492616612400','Mendoza','OFF',true),
 (gen_random_uuid(),'Exequiel Gimenez','5492615709723','Mendoza','OFF',true),
 (gen_random_uuid(),'Facundo Ojer','5492616624800','Mendoza','OFF',true),
 (gen_random_uuid(),'Juan Pablo Fransó','5492615897733','Mendoza','OFF',true),
 (gen_random_uuid(),'Franco Fernández','5492657323720','San Luis','ON',true),
 (gen_random_uuid(),'Lucas Juarez','5492664324202','San Luis','ON',true),
 (gen_random_uuid(),'Daniel Perez','5492664640327','San Luis','OFF',true),
 (gen_random_uuid(),'Franco Fernández','5492657323720','San Luis','OFF',true),
 (gen_random_uuid(),'Jhonattan Guigue','5492664907144','San Luis','OFF',true),
 (gen_random_uuid(),'Lucas Juarez','5492664324202','San Luis','OFF',true);
