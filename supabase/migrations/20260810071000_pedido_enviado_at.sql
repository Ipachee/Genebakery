-- Para el timer "hace cuanto se mando a cocina" en el panel de pedido y en
-- la Comandera.
alter table pedidos add column enviado_at timestamptz;
