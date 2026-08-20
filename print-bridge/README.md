# Bridge de impresión — ComandaCafé

Programa chico que corre en la compu que tiene la impresora térmica conectada por USB. Revisa la base de datos cada 8 segundos buscando comandas nuevas y las imprime **directo en ESC/POS** (el lenguaje nativo de la impresora), sin pasar por el driver de Windows que venía imprimiendo todo desordenado.

No reemplaza a la página web — sigue siendo la misma ComandaCafé de siempre. Esto es solo un ayudante que corre al lado, mirando la misma base de datos, encargado nada más que de imprimir bien.

## Requisitos

- Windows en la compu donde está conectada la impresora por USB.
- [Node.js](https://nodejs.org) instalado (versión 18 o más nueva — el instalador de la web es "click, siguiente, siguiente, listo", no hace falta nada raro).

## Paso 1 — Compartir la impresora en Windows

Esto es necesario porque el truco que usa este programa para mandar los datos "en crudo" (sin que Windows los interprete) requiere que la impresora esté compartida, aunque sea solo para esta misma compu.

1. Abrí **Configuración → Bluetooth y dispositivos → Impresoras y escáneres**.
2. Hacé clic en tu impresora (la que aparecía como "CONTROL" en tus capturas) → **Propiedades de la impresora**.
3. Pestaña **Compartir**.
4. Activá **"Compartir esta impresora"**.
5. En **"Nombre del recurso compartido"**, poné algo simple sin espacios, por ejemplo `CONTROL` (podés dejar el que Windows te sugiera).
6. Aceptar.

## Paso 2 — Configurar

Abrí `config.js` con el Bloc de notas y revisá:

- `PRINTER_SHARE_NAME`: tiene que ser **exactamente** el nombre que le pusiste en el paso 1.
- El resto (usuario/clave, dirección de la base) ya viene configurado, no hace falta tocarlo.

## Paso 3 — Instalar e iniciar

Abrí una terminal (buscá "cmd" o "PowerShell" en el menú de inicio) en esta carpeta y ejecutá:

```bash
npm install
npm start
```

Va a mostrar algo como:

```
ComandaCafé — bridge de impresión
Recurso compartido configurado: \\localhost\CONTROL
Sesión iniciada como admin@comandacafe.local.
Listo. 0 comanda(s) ya en curso marcadas como vistas.
Revisando comandas nuevas cada 8s... (Ctrl+C para cerrar)
```

Mientras esa ventana quede abierta, cada vez que alguien mande un pedido a cocina desde cualquiera de las dos compus, va a imprimir sola acá. Para cerrarlo: `Ctrl+C` en esa misma ventana.

## Paso 4 — Que arranque solo con Windows (opcional pero recomendado)

Para no tener que abrir la terminal a mano todos los días:

1. `Win + R`, escribí `shell:startup`, Enter — se abre una carpeta.
2. Ahí adentro, creá un acceso directo nuevo que apunte a este comando (reemplazá la ruta si esta carpeta está en otro lado):
   ```
   cmd /k "cd /d C:\ruta\a\print-bridge && npm start"
   ```
3. Listo — la próxima vez que se prenda esa compu, el bridge arranca solo (va a aparecer una ventana de terminal minimizable, es normal que quede abierta).

## Si algo no anda

- **"No se pudo conectar con la impresora"** o error al copiar: revisá que `PRINTER_SHARE_NAME` en `config.js` sea EXACTO al nombre compartido (mayúsculas incluidas), y que la impresora esté prendida.
- **"No se pudo iniciar sesión"**: puede ser que no haya internet en ese momento — el programa reintenta solo cuando vuelve.
- Si imprime pero sale mal formateado igual que antes: avisá, puede que esta impresora en particular necesite algún comando ESC/POS distinto (hay variaciones entre marcas) — no es algo que se note hasta probarlo en la impresora real.
- Si querés cambiar cada cuánto revisa, el tamaño de letra, o el ancho de caracteres, todo eso está en `config.js` con comentarios explicando cada cosa.
