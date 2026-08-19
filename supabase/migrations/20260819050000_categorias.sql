-- Las categorías de producto (bebida/comida/pastelería/noche) estaban
-- fijas por código: un CHECK constraint en la base + el mismo array
-- hardcodeado copiado en 4 lugares distintos del frontend (con nombres
-- inconsistentes entre uno y otro, ej. "Comidas" vs "Cocina" para el mismo
-- valor). Se reemplaza por una tabla real y editable desde Administración.
--
-- productos.categoria sigue siendo texto libre (no se vuelve una FK) --
-- categorias.nombre es tanto la clave que se guarda en productos.categoria
-- como el texto que se muestra, así no hace falta un id/slug técnico
-- aparte que alguien tenga que inventar al crear una categoría nueva.
create table categorias (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  orden int not null default 0,
  deleted_at timestamptz
);

insert into categorias (nombre, orden) values
  ('Bebidas', 1),
  ('Comidas', 2),
  ('Pastelería', 3),
  ('Noche', 4);

-- El check constraint viejo solo permite las 4 claves originales en
-- minúscula -- hay que sacarlo ANTES de escribir los nombres nuevos, si no
-- el update de abajo lo viola.
alter table productos drop constraint productos_categoria_check;

-- Los productos ya cargados usaban las claves viejas en minúscula sin
-- tilde -- se migran a los nombres canónicos nuevos para que quede una
-- sola fuente de verdad (el texto que se guarda es el mismo que se
-- muestra, sin traducciones aparte en el frontend).
update productos set categoria = 'Bebidas' where categoria = 'bebida';
update productos set categoria = 'Comidas' where categoria = 'comida';
update productos set categoria = 'Pastelería' where categoria = 'pasteleria';
update productos set categoria = 'Noche' where categoria = 'noche';

alter table categorias enable row level security;

create policy "staff activo lee categorias" on categorias for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.activo));
create policy "solo admin crea categorias" on categorias for insert
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.rol = 'admin'));
create policy "solo admin edita categorias" on categorias for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.rol = 'admin'));

-- Se suma a la papelera, mismo patrón que proveedores/facturas_proveedor.
create or replace view papelera as
  select 'insumo' as tipo, id, nombre as resumen, deleted_at from insumos where deleted_at is not null
  union all
  select 'producto', id, nombre, deleted_at from productos where deleted_at is not null
  union all
  select 'mesa', id, coalesce(label, 'Mesa ' || id), deleted_at from mesas where deleted_at is not null
  union all
  select 'salon', id, nombre, deleted_at from salones where deleted_at is not null
  union all
  select 'cliente', id, nombre || ' ' || apellido, deleted_at from clientes where deleted_at is not null
  union all
  select 'empleado', id, nombre || ' ' || apellido, deleted_at from empleados where deleted_at is not null
  union all
  select 'elaborado', id, nombre, deleted_at from elaborados where deleted_at is not null
  union all
  select 'produccion', id, 'Producción #' || id, deleted_at from producciones where deleted_at is not null
  union all
  select 'pedido', id, 'Pedido #' || id, deleted_at from pedidos where deleted_at is not null
  union all
  select 'venta', id, 'Venta #' || id, deleted_at from ventas where deleted_at is not null
  union all
  select 'gasto', id, 'Gasto #' || id, deleted_at from gastos where deleted_at is not null
  union all
  select 'proveedor', id, nombre, deleted_at from proveedores where deleted_at is not null
  union all
  select 'factura_proveedor', id, coalesce('Factura ' || numero_factura, 'Factura #' || id), deleted_at from facturas_proveedor where deleted_at is not null
  union all
  select 'categoria', id, nombre, deleted_at from categorias where deleted_at is not null
  order by deleted_at desc;

alter view public.papelera set (security_invoker = on);
