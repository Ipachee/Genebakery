-- Estado "Cobrando" real: hasta ahora el panel de cobro solo tenía un
-- useState local en PedidoPanel -- nadie más viendo el plano se enteraba de
-- que esa mesa estaba con el cobro abierto. cobrando_desde persiste esa
-- marca (timestamptz en vez de boolean para poder mostrar/depurar desde
-- cuándo, aunque hoy no se use para nada más que "está seteado o no").
alter table pedidos add column cobrando_desde timestamptz;
