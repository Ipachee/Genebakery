-- Para separar el ticket de cocina en dos (comida a la cocina, bebida a
-- la barra) el bridge de impresión necesita saber qué categorías son
-- bebida -- "Bebidas" ya existe como categoría pero no había forma de
-- distinguirla de las demás por código, solo por el nombre a ojo.
alter table public.categorias
  add column destino text not null default 'cocina' check (destino in ('cocina', 'barra'));

update public.categorias set destino = 'barra' where nombre = 'Bebidas';
