# Facturación electrónica (AfipSDK / ARCA)

**Qué hace:** emite CAE real contra ARCA vía [AfipSDK](https://afipsdk.com), genera el QR obligatorio
(RG 4892) y arma el ticket imprimible.

**Archivos clave:** `src/features/facturacion/components/FacturacionView.tsx`, `api.ts`, `hooks.ts`,
`supabase/functions/emitir-factura/index.ts`, `src/lib/facturaQr.ts`,
`src/features/ventas/components/FacturaTicket.tsx`

## Modo dev / prod

`credenciales_facturacion.modo` (`'dev'` por default, o `'prod'`). En modo dev se puede probar todo el
flujo (incluida la impresión del ticket con QR) usando el CUIT de demo de AfipSDK
(`20409378472`), sin certificado real ni datos del negocio. El pase a `'prod'` con el CUIT real del
local queda pendiente hasta que el testeo en dev salga bien y se confirme con el dueño.

## Contrato de AfipSDK (verificado, no asumido)

- `POST /api/v1/afip/auth` → `{token, sign, expiration}`
- `POST /api/v1/afip/requests` con `method: 'FECompUltimoAutorizado'` y luego `'FECAESolicitar'` →
  `{CAE, CAEFchVto, Resultado, Observaciones}`

El QR es un JSON (`ver, fecha, cuit, ptoVta, tipoCmp, nroCmp, importe, moneda, ctz, tipoDocRec,
nroDocRec, tipoCodAut, codAut`) codificado en base64 dentro de `https://www.afip.gob.ar/fe/qr/?p=...`.

## `emitir-factura` — dos clientes Supabase distintos, a propósito

Lee `facturas_electronicas`/`ventas`/`clientes` con el cliente **anon** + JWT del que llama (respeta
RLS, cualquier empleado activo puede). Lee `credenciales_facturacion` con un cliente
**service_role** aparte — esa tabla no tiene ninguna policy de RLS que la abra a usuarios normales,
solo a `SECURITY DEFINER`/service_role.

`cuit_emisor`/`punto_venta` se guardan por factura (no se leen de `perfil_negocio` al vuelo) porque el
CUIT contra el que ARCA autorizó en modo dev es el de demo, no necesariamente el real del negocio — el
QR tiene que reflejar el que efectivamente autorizó.

## Ojo con `Request.clone()`

No se puede releer el body de un `Request` después de `.json()`. El id de la factura se captura en una
variable fuera del `try` antes de tocar el body, así el `catch` (que marca `estado='error'`) nunca
necesita re-leer el request.

**Relacionado:** [[Ventas]], [[Convenciones]]
