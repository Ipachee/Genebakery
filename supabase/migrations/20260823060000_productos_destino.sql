-- El destino por categoría (migración anterior) alcanza para la mayoría,
-- pero el día a día pide poder afinar producto por producto (ej: una
-- "Bebida" que en realidad se prepara en cocina, o un plato que sale de
-- la barra) -- nullable a propósito: sin elegir nada, sigue usando el
-- destino de la categoría como hasta ahora. Se decide desde Recetas.
alter table public.productos
  add column destino text check (destino in ('cocina', 'barra'));
