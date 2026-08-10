// Estados de un pedido que cuentan como "mesa activa" (no libre, no
// cobrada). Estaba repetido literal en pedidos/api.ts, turnos/api.ts y
// salon/api.ts -- si se agrega un estado nuevo hay que acordarse de tocar
// un solo lugar.
export const ESTADOS_PEDIDO_ACTIVO = ['abierto', 'enviado_cocina', 'entregado'] as const;

export const METODOS_PAGO = ['Efectivo', 'Tarjeta', 'Transferencia'] as const;
