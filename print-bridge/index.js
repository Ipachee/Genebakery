// Bridge de impresión de ComandaCafé -- corre en la compu que tiene la
// impresora térmica conectada (por USB o por red, ver PRINTER_MODE en
// config.js). Revisa la base de datos cada tanto buscando comandas nuevas
// ("enviado a cocina") y las manda directo en ESC/POS -- el lenguaje
// nativo de la impresora -- salteando por completo el driver de Windows
// que venía rompiendo el diseño de la página web.
//
// Separa cocina de barra: cada categoría de producto tiene un "destino"
// (cocina o barra, configurable desde Categorías en la web) -- una misma
// tanda de "Enviar a cocina" puede salir como dos tickets separados si
// mezcla, por ejemplo, una torta y una cerveza.
//
// Cómo manda los datos en modo 'usb-compartida': arma el ticket en un
// archivo temporal con los comandos ESC/POS ya calculados, y usa el
// propio "copy /b" de Windows para mandarlo en crudo (RAW) al recurso
// compartido de la impresora -- así no hace falta ningún paquete de npm
// con compilación nativa (se probó con el paquete "printer" y falla al
// compilar en Windows sin herramientas de desarrollo instaladas). En modo
// 'red' no hace falta nada de esto -- node-thermal-printer le manda los
// bytes directo por un socket TCP a la IP de la impresora.
//
// Requisito de Windows (solo en modo 'usb-compartida'): la impresora
// tiene que estar COMPARTIDA (ver README.md) -- por eso PRINTER_SHARE_NAME
// en config.js.
//
// Se queda corriendo en la terminal (o en segundo plano si se configura
// para arrancar solo, ver el README). Para cerrarlo: Ctrl+C.
const os = require('os');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const { createClient } = require('@supabase/supabase-js');
const { printer: ThermalPrinter, types: PrinterTypes } = require('node-thermal-printer');
const config = require('./config');

const execAsync = util.promisify(exec);
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
const MODO_RED = config.PRINTER_MODE === 'red';

// Se van guardando acá los tickets ya impresos (pedido-ronda-destino) para
// no repetir -- vive solo en memoria, se reinicia si se reinicia el
// programa (mismo criterio que ya usa la Comandera de la página web). Si
// este mismo programa corre en dos compus a la vez apuntando a impresoras
// distintas, cada una imprime lo suyo sin coordinarse con la otra -- es
// esperable que las dos impriman si las dos tienen impresora de verdad.
const impresos = new Set();

const TITULO_DESTINO = { cocina: 'COCINA', barra: 'BARRA' };

async function imprimir(ticket) {
  // En modo 'usb-compartida' la interface es un archivo temporal (se
  // escriben ahí los bytes ESC/POS, y después se copian en crudo al
  // recurso compartido -- ver más abajo); en modo 'red' es la IP:puerto
  // de la impresora, y node-thermal-printer manda los bytes solo por un
  // socket TCP, sin archivo de por medio.
  const tempPath = MODO_RED ? null : path.join(os.tmpdir(), `comandacafe-${Date.now()}-${Math.random().toString(36).slice(2)}.prn`);
  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: MODO_RED ? `tcp://${config.PRINTER_IP}:${config.PRINTER_PORT || 9100}` : tempPath,
    width: config.ANCHO_CARACTERES,
    removeSpecialCharacters: false,
  });

  printer.alignCenter();
  printer.setTextDoubleHeight();
  printer.bold(true);
  printer.println(TITULO_DESTINO[ticket.destino] ?? 'COCINA');
  printer.bold(false);
  printer.setTextNormal();
  printer.alignLeft();
  printer.println(`${ticket.fecha}   ${ticket.hora}`);
  printer.println(`Mesa: ${ticket.mesaLabel}`);
  printer.drawLine();

  for (const item of ticket.items) {
    printer.setTextDoubleHeight();
    printer.bold(true);
    printer.println(`${item.cantidad}x ${item.nombre}`);
    printer.bold(false);
    printer.setTextNormal();
    if (item.nota) {
      printer.println(`  * ${item.nota}`);
    }
  }

  printer.drawLine();
  printer.cut();

  if (MODO_RED) {
    try {
      await printer.execute();
      return true;
    } catch (err) {
      console.error('⚠ Error mandando el ticket a imprimir (red):', err.message);
      return false;
    }
  }

  try {
    // Esto solo escribe el archivo temporal con los bytes ESC/POS -- no
    // manda nada a la impresora todavía.
    await printer.execute();

    // "copy /b" en modo binario, al recurso compartido -- Windows lo
    // manda tal cual (RAW) sin que ningún driver intente "interpretarlo"
    // como una página con diseño.
    const destino = `\\\\localhost\\${config.PRINTER_SHARE_NAME}`;
    await execAsync(`copy /b "${tempPath}" "${destino}"`, { shell: 'cmd.exe' });
    return true;
  } catch (err) {
    console.error('⚠ Error mandando el ticket a imprimir:', err.message);
    return false;
  } finally {
    if (tempPath) fs.unlink(tempPath, () => {});
  }
}

async function traerPedidosActivos() {
  const { data, error } = await supabase
    .from('pedidos')
    .select('id, mesa_id, mesas(label), pedido_items(id, cantidad, nota, ronda, enviado_cocina_at, productos(nombre, categoria))')
    .in('estado', ['abierto', 'enviado_cocina', 'entregado'])
    .is('deleted_at', null);
  if (error) {
    console.error('⚠ Error leyendo pedidos:', error.message);
    return [];
  }
  return data ?? [];
}

// "cocina"/"barra" por nombre de categoría -- se vuelve a pedir en cada
// revisión (es una tabla chica) para que si alguien cambia el destino de
// una categoría desde la web, el bridge lo note sin tener que reiniciarlo.
async function traerDestinoCategorias() {
  const { data, error } = await supabase.from('categorias').select('nombre, destino').is('deleted_at', null);
  if (error) {
    console.error('⚠ Error leyendo categorías (se asume "cocina" para todo):', error.message);
    return new Map();
  }
  return new Map((data ?? []).map((c) => [c.nombre, c.destino]));
}

// Agrupa por ronda (cada tanda de "Enviar a cocina" es un ticket aparte,
// igual que la Comandera de la web) y DENTRO de cada ronda separa por
// destino de categoría -- una ronda con una torta y una cerveza sale como
// dos tickets, uno para cocina y otro para barra.
function agruparPorRonda(pedidos, destinoDeCategoria) {
  const tickets = [];
  for (const pedido of pedidos) {
    const porRonda = new Map();
    for (const it of pedido.pedido_items) {
      if (it.ronda == null) continue;
      if (!porRonda.has(it.ronda)) porRonda.set(it.ronda, []);
      porRonda.get(it.ronda).push(it);
    }
    for (const [ronda, items] of porRonda) {
      const porDestino = new Map(); // 'cocina' | 'barra' -> items[]
      for (const it of items) {
        const destino = destinoDeCategoria.get(it.productos?.categoria) ?? 'cocina';
        if (!porDestino.has(destino)) porDestino.set(destino, []);
        porDestino.get(destino).push(it);
      }
      for (const [destino, itemsDestino] of porDestino) {
        tickets.push({
          key: `${pedido.id}-${ronda}-${destino}`,
          destino,
          mesaLabel: pedido.mesas?.label ?? String(pedido.mesa_id ?? '?'),
          enviadoAt: itemsDestino[0]?.enviado_cocina_at ?? null,
          items: itemsDestino.map((it) => ({
            cantidad: it.cantidad,
            nombre: it.productos?.nombre ?? `Producto #${it.id}`,
            nota: it.nota,
          })),
        });
      }
    }
  }
  return tickets;
}

async function revisar() {
  const [pedidos, destinoDeCategoria] = await Promise.all([traerPedidosActivos(), traerDestinoCategorias()]);
  const tickets = agruparPorRonda(pedidos, destinoDeCategoria);
  const nuevos = tickets.filter((t) => !impresos.has(t.key));

  for (const t of nuevos) {
    impresos.add(t.key);
    const fecha = new Date(t.enviadoAt ?? Date.now());
    const ok = await imprimir({
      destino: t.destino,
      mesaLabel: t.mesaLabel,
      fecha: fecha.toLocaleDateString('es-AR'),
      hora: fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      items: t.items,
    });
    console.log(ok ? `✓ Impreso (${t.destino}): mesa ${t.mesaLabel} (${t.key})` : `✗ Falló (${t.destino}): mesa ${t.mesaLabel} (${t.key})`);
  }
}

async function inicializar() {
  console.log('ComandaCafé — bridge de impresión');
  console.log(MODO_RED ? `Impresora de red: ${config.PRINTER_IP}:${config.PRINTER_PORT || 9100}` : `Recurso compartido configurado: \\\\localhost\\${config.PRINTER_SHARE_NAME}`);

  const { error: loginError } = await supabase.auth.signInWithPassword({
    email: config.LOGIN_EMAIL,
    password: config.LOGIN_PASSWORD,
  });
  if (loginError) {
    console.error(`⚠ No se pudo iniciar sesión (${loginError.message}). Revisá LOGIN_EMAIL/LOGIN_PASSWORD en config.js.`);
    process.exit(1);
  }
  console.log(`Sesión iniciada como ${config.LOGIN_EMAIL}.`);

  const [pedidos, destinoDeCategoria] = await Promise.all([traerPedidosActivos(), traerDestinoCategorias()]);
  const tickets = agruparPorRonda(pedidos, destinoDeCategoria);
  // Todo lo que ya estaba pendiente al arrancar se marca como "visto" sin
  // imprimirlo -- si se reinicia este programa a mitad del día, no
  // reimprime de golpe todo lo que ya está en curso.
  for (const t of tickets) impresos.add(t.key);
  console.log(`Listo. ${tickets.length} comanda(s) ya en curso marcadas como vistas.`);
  console.log(`Revisando comandas nuevas cada ${config.INTERVALO_MS / 1000}s... (Ctrl+C para cerrar)`);
}

(async () => {
  await inicializar();
  setInterval(() => {
    revisar().catch((err) => console.error('⚠ Error inesperado:', err.message));
  }, config.INTERVALO_MS);
})();
