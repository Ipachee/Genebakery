# Print-bridge

**Qué hace:** programa Node.js aparte (no parte de la app web) que corre en la compu que tiene la
impresora térmica conectada, mira Supabase cada `INTERVALO_MS` (8s por default) y manda a imprimir los
tickets de lo que se envió a cocina/barra.

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
