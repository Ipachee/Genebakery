# Bridge de impresión — ComandaCafé

Programa chico que corre en una compu de la red y le manda los tickets a la impresora térmica **directo en ESC/POS** (el lenguaje nativo de la impresora), sin pasar por el driver de Windows que venía imprimiendo todo desordenado. Revisa la base de datos cada 8 segundos buscando comandas nuevas ("Enviar a cocina") y las imprime -- separando automáticamente cocina de barra según cómo esté configurada cada categoría en la web (Categorías → columna "Destino").

No reemplaza a la página web — sigue siendo la misma ComandaCafé de siempre. Esto es solo un ayudante que corre al lado, mirando la misma base de datos, encargado nada más que de imprimir bien.

**No hace falta estar en la misma compu ni en la misma red que el mozo/salón para que esto funcione** — el programa mira la base de datos en la nube, no una conexión directa al navegador. Lo único que importa es dónde está conectada la impresora.

## Dos formas de conectar la impresora

**Si tu impresora tiene puerto Ethernet propio (revisá atrás del equipo -- un conector como el de un cable de red común)**, esa es la opción más simple y la recomendada: conectala directo al router con un cable de red, y el programa le habla por la red sin depender de ninguna compu en particular ni de compartir nada en Windows. Ver "Modo red" más abajo.

**Si tu impresora solo tiene USB**, hace falta compartirla en Windows y correr el programa en esa misma compu. Ver "Modo USB compartido" más abajo.

## Requisitos

- [Node.js](https://nodejs.org) instalado (versión 18 o más nueva — el instalador de la web es "click, siguiente, siguiente, listo", no hace falta nada raro).
- Si vas por USB: Windows en la compu donde está conectada la impresora.

## Modo red (impresora con Ethernet propio)

1. Conectá la impresora al router con un cable de red.
2. Buscá su IP: la mayoría de las impresoras térmicas la muestran en un "autotest" (se hace apretando algún botón mientras se prende, depende del modelo -- revisá el manual) o en un menú de configuración con una pantallita/botones. Anotá esa IP (algo como `192.168.0.XX`).
3. En `config.js`, poné:
   ```js
   PRINTER_MODE: 'red',
   PRINTER_IP: '192.168.0.XX', // la que anotaste
   PRINTER_PORT: 9100, // casi nunca hace falta cambiarlo
   ```
4. Seguí directo con "Configurar e instalar" más abajo -- no hace falta compartir nada en Windows.

## Modo USB compartido

Esto es necesario porque el truco que usa este programa para mandar los datos "en crudo" (sin que Windows los interprete) requiere que la impresora esté compartida, aunque sea solo para esta misma compu.

1. Abrí **Configuración → Bluetooth y dispositivos → Impresoras y escáneres**.
2. Hacé clic en tu impresora (la que aparecía como "CONTROL" en tus capturas) → **Propiedades de la impresora**.
3. Pestaña **Compartir**.
4. Activá **"Compartir esta impresora"**.
5. En **"Nombre del recurso compartido"**, poné algo simple sin espacios, por ejemplo `CONTROL` (podés dejar el que Windows te sugiera).
6. Aceptar.
7. En `config.js`, poné `PRINTER_MODE: 'usb-compartida'` y `PRINTER_SHARE_NAME` **exactamente** igual al nombre que pusiste en el paso 5.

## Configurar e instalar

Copiá `config.example.js` y renombrá la copia a `config.js` (este archivo, con la clave real adentro, no se sube a GitHub a propósito -- por eso no viene ya creado). Abrilo con el Bloc de notas y completá (además de `PRINTER_MODE`/`PRINTER_IP`/`PRINTER_SHARE_NAME` de la sección que te corresponda arriba):

- `LOGIN_PASSWORD`: el PIN de las cuentas (450422, o el que esté usando el local en ese momento).
- El resto (dirección de la base) ya viene configurado, no hace falta tocarlo.

### Instalar e iniciar

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

Mientras esa ventana quede abierta, cada vez que alguien mande un pedido a cocina desde cualquier dispositivo, va a imprimir sola acá -- separado en un ticket de cocina y otro de barra si la tanda mezcla categorías de los dos destinos. Para cerrarlo: `Ctrl+C` en esa misma ventana.

## Que arranque solo con Windows (opcional pero recomendado)

Para no tener que abrir la terminal a mano todos los días:

1. `Win + R`, escribí `shell:startup`, Enter — se abre una carpeta.
2. Ahí adentro, creá un acceso directo nuevo que apunte a este comando (reemplazá la ruta si esta carpeta está en otro lado):
   ```
   cmd /k "cd /d C:\ruta\a\print-bridge && npm start"
   ```
3. Listo — la próxima vez que se prenda esa compu, el bridge arranca solo (va a aparecer una ventana de terminal minimizable, es normal que quede abierta).

## Si algo no anda

- **Modo red, error de conexión/timeout**: revisá que `PRINTER_IP` sea la correcta (puede cambiar si el router la reasigna -- lo ideal es configurar una IP fija para la impresora en el router, "DHCP reservation" o "IP estática", así no cambia sola) y que la impresora esté prendida y conectada al mismo router.
- **Modo USB, "No se pudo conectar con la impresora"** o error al copiar: revisá que `PRINTER_SHARE_NAME` en `config.js` sea EXACTO al nombre compartido (mayúsculas incluidas), y que la impresora esté prendida.
- **"No se pudo iniciar sesión"**: puede ser que no haya internet en ese momento — el programa reintenta solo cuando vuelve.
- Si imprime pero sale mal formateado igual que antes: avisá, puede que esta impresora en particular necesite algún comando ESC/POS distinto (hay variaciones entre marcas) — no es algo que se note hasta probarlo en la impresora real.
- Si un ticket sale mezclando cocina y barra cuando no debería, revisá en Categorías (en la web) que cada categoría tenga el "Destino" correcto.
- Si querés cambiar cada cuánto revisa, el tamaño de letra, o el ancho de caracteres, todo eso está en `config.js` con comentarios explicando cada cosa.
