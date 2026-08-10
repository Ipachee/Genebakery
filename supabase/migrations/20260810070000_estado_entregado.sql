-- Suma el estado "entregado" (la comida ya llego a la mesa, pero todavia no
-- se cobro) para poder distinguir en el plano: ocupada / enviado a cocina /
-- entregado / cobrando -- como referencia el dueño.
alter table pedidos drop constraint pedidos_estado_check;
alter table pedidos add constraint pedidos_estado_check
  check (estado in ('abierto', 'enviado_cocina', 'entregado', 'cobrado', 'cancelado'));
