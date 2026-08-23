-- El QR obligatorio de ARCA necesita el CUIT y el punto de venta EXACTOS
-- con los que se emitió el comprobante -- en modo prueba eso es el CUIT
-- demo de AfipSDK, no el del negocio, así que no alcanza con leerlo de
-- perfil_negocio al momento de imprimir. Se guardan en la propia fila
-- para que el ticket impreso siempre coincida con lo que ARCA autorizó.
alter table public.facturas_electronicas
  add column cuit_emisor text,
  add column punto_venta integer;
