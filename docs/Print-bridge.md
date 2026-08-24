# Print-bridge

**Qué hace:** programa Node.js aparte (no parte de la app web) que corre en la compu que tiene la
impresora térmica conectada, mira Supabase cada `INTERVALO_MS` (3s por default) y manda a imprimir por
ESC/POS: comandas de cocina/barra, tickets de cobro, y facturas electrónicas ya emitidas (con QR fiscal
nativo de la impresora, vía `printer.printQR()` -- no una imagen).

## Cobro y factura: dedup en la base, no en memoria

A diferencia de las comandas (dedup con un `Set` en memoria, se pierde si el programa se reinicia),
cobro y factura marcan `ticket_impreso_at` directo en `ventas`/`facturas_electronicas` al imprimir con
éxito -- sobrevive un reinicio del programa. La migración que agregó esa columna hizo *backfill* a
`created_at` en todas las filas existentes, así el primer arranque de esta función no intentó reimprimir
el historial completo de golpe.

Esto también dejó **obsoleto el auto-print del navegador** para el cobro real (no la reimpresión manual
vieja, esa se mantiene): `PedidoPanel.tsx` ya no llama a `window.print()` después de cobrar, porque
print-bridge lo hace solo. La Factura B nunca tuvo auto-print automático (`GenerarFacturaModal` no
imprime nada -- el que imprime es un click deliberado en "Ver factura" en Ventas), así que no hizo falta
tocar eso.

## `NOMBRE_LOCAL`/`PIE_TICKET` están duplicados en `config.js`

Print-bridge no puede leer `ticketConfig.ts` (vive en `localStorage` del navegador, no en la base) --
si se cambia el nombre del local en Ajustes → Tipografía del ticket, hay que cambiarlo también a mano en
`config.js` de cada compu con print-bridge corriendo.

**Archivos clave:** `print-bridge/index.js`, `print-bridge/config.js` (local, gitignoreado — tiene
secretos), `print-bridge/config.example.js`, `print-bridge/README.md` (instructivo en criollo)

## No pasa por el build de la app principal

Ni `tsc` ni `oxlint` del proyecto tocan esta carpeta. Si se edita `index.js`, correr
`node --check index.js` a mano para pescar errores de sintaxis — ya pasó una vez que un `Edit` borró sin
querer la línea `async function imprimir(ticket) {` dejando el cuerpo con `return` sueltos, y no lo
agarró nada del pipeline normal.

## Dos modos de impresora

`PRINTER_MODE` en `config.js`:
- `'usb-compartida'`: escribe un `.prn` temporal y hace `copy /b` a un recurso compartido de Windows
  (`\\localhost\<PRINTER_SHARE_NAME>`)
- `'red'`: manda los bytes directo por TCP a `PRINTER_IP:PRINTER_PORT` (default 9100), sin compartir
  nada en Windows — usa `node-thermal-printer` con `interface: 'tcp://IP:PORT'`

## Separación cocina/barra

Ver [[Categorias-y-Recetas]] para de dónde sale el destino de cada producto. `agruparPorRonda` parte
cada tanda en hasta 2 tickets (cocina / barra), cada uno con su propio encabezado.

## Dedup es solo en memoria, por proceso

El `Set` de "ya impreso" no se sincroniza entre instancias. Si corre en dos compus con impresora real
cada una, **va a duplicar** — es el comportamiento esperado si algún día hay 2 impresoras reales, no un
bug. Con 2 compus y 1 sola impresora real, solo una debería tener `PRINTER_MODE` apuntando a la
impresora de verdad.

## PIN de login

`450422`, mismo PIN de fricción que en [[Salon]] — ver
[[Convenciones#PIN de fricción, no de seguridad]].

**Relacionado:** [[Categorias-y-Recetas]], [[Arquitectura]]
