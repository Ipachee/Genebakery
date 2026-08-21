-- Take away: en vez de reescribir todo PedidoPanel/hooks para que "mesa"
-- sea opcional en decenas de lugares (transferir, ronda por mesa, query
-- key por mesa_id...), se usa una única mesa REAL marcada como virtual --
-- reutiliza el 100% del flujo de pedido que ya funciona (agregar, enviar a
-- cocina, cobrar, imprimir ticket) sin tocar ese código. Se excluye del
-- dibujo del plano y de los conteos de "mesas libres/ocupadas" por el
-- flag, no por convención de nombre.
alter table mesas add column es_take_away boolean not null default false;

insert into mesas (salon_id, x, y, w, h, shape, label, es_take_away)
values ((select id from salones order by id limit 1), 0, 0, 55, 55, 'square', 'Take away', true);
