// Bridge de impresión de ComandaCafé -- corre en la compu que tiene la
// impresora térmica conectada (por USB o por red, ver PRINTER_MODE en
// config.js). Revisa la base de datos cada tanto buscando comandas nuevas
// ("enviado a cocina"), cobros nuevos, y facturas electrónicas ya
// emitidas -- y las manda directo en ESC/POS -- el lenguaje nativo de la
// impresora -- salteando por completo el driver de Windows/Chrome que
// venía imprimiendo todo desordenado (y a veces en blanco, cuando el
// navegador elegía un tamaño de papel guardado de otro programa).
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

// Se van guardando acá las comandas ya impresas (pedido-ronda-destino)
// para no repetir -- vive solo en memoria, se reinicia si se reinicia el
// programa (mismo criterio que ya usa la Comandera de la página web). El
// cobro y la factura, en cambio, marcan "impreso" en la propia base
// (columna ticket_impreso_at) -- no se pierde ese estado si el programa
// se reinicia, a diferencia de las comandas. Si este mismo programa corre
// en dos compus a la vez apuntando a impresoras distintas, cada una
// imprime lo suyo sin coordinarse con la otra -- es esperable que las dos
// impriman si las dos tienen impresora de verdad.
const impresos = new Set();

const TITULO_DESTINO = { cocina: 'COCINA', barra: 'BARRA' };
const LABEL_TIPO_FACTURA = { factura_a: 'A', factura_b: 'B', factura_c: 'C' };
const CBTE_TIPO = { factura_a: 1, factura_b: 6, factura_c: 11 };
// La condición de IVA del comprador se infiere del tipo de comprobante
// elegido (no es un dato que se cargue por cliente hoy): Factura A es
// exclusiva para Responsable Inscripto, B/C cubren el resto. Mismo
// criterio que src/features/ventas/components/FacturaTicket.tsx.
const COND_IVA_COMPRADOR = { factura_a: 'Responsable Inscripto', factura_b: 'Consumidor Final', factura_c: 'Consumidor Final' };

function fmtMoney(n) {
  return '$' + Math.round(n).toLocaleString('es-AR');
}

function nuevaImpresora() {
  // En modo 'usb-compartida' la interface es un archivo temporal (se
  // escriben ahí los bytes ESC/POS, y después se copian en crudo al
  // recurso compartido -- ver enviarAImpresora); en modo 'red' es la
  // IP:puerto de la impresora, y node-thermal-printer manda los bytes
  // solo por un socket TCP, sin archivo de por medio.
  const tempPath = MODO_RED ? null : path.join(os.tmpdir(), `comandacafe-${Date.now()}-${Math.random().toString(36).slice(2)}.prn`);
  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: MODO_RED ? `tcp://${config.PRINTER_IP}:${config.PRINTER_PORT || 9100}` : tempPath,
    width: config.ANCHO_CARACTERES,
    removeSpecialCharacters: false,
    // Sin esto, cada instancia arranca sin código de página elegido -- la
    // librería igual se las arregla sola probando todas hasta encontrar
    // una que sepa imprimir el primer acento/símbolo que aparezca (por
    // eso los tickets salían bien), pero de paso tira un "Error: Encoding
    // not recognized" por consola cada vez (no rompe nada, solo asusta).
    // Fijando el código de página de entrada, ese paso de prueba y error
    // no hace falta -- WPC1252 cubre bien acentos y ñ en español.
    characterSet: 'WPC1252',
  });
  return { printer, tempPath };
}

async function enviarAImpresora(printer, tempPath) {
  if (MODO_RED) {
    try {
      await printer.execute();
      return true;
    } catch (err) {
      console.error('⚠ Error mandando a imprimir (red):', err.message);
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
    console.error('⚠ Error mandando a imprimir:', err.message);
    return false;
  } finally {
    if (tempPath) fs.unlink(tempPath, () => {});
  }
}

// Fila de items con cantidad/nombre a la izquierda y precio a la derecha,
// en columnas -- mismo criterio visual que TicketCobro/FacturaTicket en
// la web (ahí es flex space-between, acá es tableCustom).
function imprimirItemsTabla(printer, items) {
  for (const it of items) {
    printer.tableCustom([
      { text: `${it.cantidad}x ${it.nombre}`, align: 'LEFT', width: 0.7 },
      { text: fmtMoney(it.precioUnitario * it.cantidad), align: 'RIGHT', width: 0.3 },
    ]);
  }
}

async function imprimirComanda(ticket) {
  const { printer, tempPath } = nuevaImpresora();

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

  ticket.items.forEach((item, i) => {
    if (i > 0) printer.newLine();
    printer.setTextDoubleHeight();
    printer.bold(true);
    printer.println(`${item.cantidad}x ${item.nombre}`);
    printer.bold(false);
    printer.setTextNormal();
    if (item.nota) {
      printer.println(`  ↳ ${item.nota}`);
    }
  });

  printer.drawLine();
  printer.cut();
  return enviarAImpresora(printer, tempPath);
}

async function imprimirCobro(venta) {
  const { printer, tempPath } = nuevaImpresora();

  printer.alignCenter();
  printer.setTextDoubleHeight();
  printer.bold(true);
  printer.println(config.NOMBRE_LOCAL.toUpperCase());
  printer.bold(false);
  printer.setTextNormal();
  if (venta.cuit) printer.println(`CUIT ${venta.cuit}`);
  if (venta.direccion) printer.println(venta.direccion);
  printer.drawLine();
  printer.bold(true);
  printer.println(`COMPROBANTE N.° ${String(venta.pedidoId).padStart(8, '0')}`);
  printer.bold(false);

  printer.alignLeft();
  printer.println(`Mesa: ${venta.mesaLabel}`);
  if (venta.clienteNombre) printer.println(`Cliente: ${venta.clienteNombre}`);
  printer.drawLine();

  imprimirItemsTabla(printer, venta.items);
  printer.drawLine();

  if (venta.descuento > 0) {
    printer.tableCustom([
      { text: 'Subtotal', align: 'LEFT', width: 0.7 },
      { text: fmtMoney(venta.subtotal), align: 'RIGHT', width: 0.3 },
    ]);
    printer.tableCustom([
      { text: 'Descuento', align: 'LEFT', width: 0.7 },
      { text: `-${fmtMoney(venta.descuento)}`, align: 'RIGHT', width: 0.3 },
    ]);
  }
  printer.setTextDoubleHeight();
  printer.bold(true);
  printer.tableCustom([
    { text: 'Total', align: 'LEFT', width: 0.6 },
    { text: fmtMoney(venta.total), align: 'RIGHT', width: 0.4 },
  ]);
  printer.bold(false);
  printer.setTextNormal();
  printer.println(venta.metodoPago);
  printer.drawLine();

  printer.println(`${venta.fecha} ${venta.hora}${venta.atendidoPor ? ` · ${venta.atendidoPor}` : ''}`);
  printer.alignCenter();
  printer.println(config.PIE_TICKET);
  printer.cut();
  return enviarAImpresora(printer, tempPath);
}

async function imprimirFactura(f) {
  const { printer, tempPath } = nuevaImpresora();

  printer.alignCenter();
  printer.bold(true);
  printer.setTextDoubleHeight();
  printer.println(`FACTURA ${LABEL_TIPO_FACTURA[f.tipoComprobante] ?? '?'}`);
  printer.setTextNormal();
  printer.println(config.NOMBRE_LOCAL.toUpperCase());
  printer.bold(false);
  if (f.cuitEmisor) printer.println(`CUIT ${f.cuitEmisor}`);
  printer.drawLine();

  printer.alignLeft();
  printer.tableCustom([
    { text: `Punto de venta ${String(f.puntoVenta).padStart(4, '0')}`, align: 'LEFT', width: 0.5 },
    { text: `N.° ${String(f.numero).padStart(8, '0')}`, align: 'RIGHT', width: 0.5 },
  ]);
  printer.println(`${f.fecha} ${f.hora}`);
  printer.drawLine();

  if (f.clienteNombre) printer.println(`Cliente: ${f.clienteNombre}`);
  if (f.clienteCuitDni) printer.println(`CUIT/DNI: ${f.clienteCuitDni}`);
  printer.println(`Cond. IVA: ${COND_IVA_COMPRADOR[f.tipoComprobante] ?? 'Consumidor Final'}`);
  printer.println('Cond. venta: Contado');
  printer.drawLine();

  imprimirItemsTabla(printer, f.items);
  printer.drawLine();

  printer.setTextDoubleHeight();
  printer.bold(true);
  printer.tableCustom([
    { text: 'Total', align: 'LEFT', width: 0.6 },
    { text: fmtMoney(f.total), align: 'RIGHT', width: 0.4 },
  ]);
  printer.bold(false);
  printer.setTextNormal();
  printer.println(f.metodoPago);
  printer.drawLine();

  printer.println(`CAE: ${f.cae}`);
  printer.println(`Vto. CAE: ${f.caeVencimiento}`);
  printer.alignCenter();
  // QR nativo de la impresora (comando ESC/POS propio, no una imagen
  // renderizada) -- mismo contenido que el QR real que ya arma la web
  // (src/lib/facturaQr.ts), armado acá aparte porque print-bridge es un
  // programa Node.js aparte que no puede importar ese archivo TypeScript
  // directo.
  printer.printQR(f.qrUrl, { cellSize: 5 });
  printer.println(config.PIE_TICKET);
  printer.cut();
  return enviarAImpresora(printer, tempPath);
}

async function traerPedidosActivos() {
  const { data, error } = await supabase
    .from('pedidos')
    .select('id, mesa_id, mesas(label), pedido_items(id, cantidad, nota, ronda, enviado_cocina_at, productos(nombre, categoria, destino))')
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
        // El producto puede pisar el destino de su categoría (se elige
        // desde Recetas en la web) -- si no tiene nada elegido, se usa el
        // de la categoría como default.
        const destino = it.productos?.destino ?? destinoDeCategoria.get(it.productos?.categoria) ?? 'cocina';
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

async function traerItemsDePedido(pedidoId) {
  const { data, error } = await supabase.from('pedido_items').select('cantidad, precio_unitario, productos(nombre)').eq('pedido_id', pedidoId).order('id');
  if (error) {
    console.error('⚠ Error leyendo items del pedido:', error.message);
    return [];
  }
  return (data ?? []).map((it) => ({
    cantidad: Number(it.cantidad),
    nombre: it.productos?.nombre ?? 'Producto',
    precioUnitario: Number(it.precio_unitario),
  }));
}

async function traerVentasSinTicket() {
  const { data, error } = await supabase
    .from('ventas')
    .select('id, pedido_id, mesa_id, metodo_pago, subtotal, descuento, total, created_at, mesas(label), clientes(nombre, apellido), mozo:profiles(nombre)')
    .is('deleted_at', null)
    .is('ticket_impreso_at', null);
  if (error) {
    console.error('⚠ Error leyendo ventas:', error.message);
    return [];
  }
  return data ?? [];
}

async function marcarVentaImpresa(id) {
  const { error } = await supabase.from('ventas').update({ ticket_impreso_at: new Date().toISOString() }).eq('id', id);
  if (error) console.error('⚠ Error marcando venta impresa:', error.message);
}

function docCliente(clientes) {
  const cuit = (clientes?.cuit ?? '').replace(/\D/g, '');
  const dni = (clientes?.dni ?? '').replace(/\D/g, '');
  if (cuit) return { tipo: 80, nro: cuit };
  if (dni) return { tipo: 96, nro: dni };
  return { tipo: 99, nro: '0' };
}

// Armado según la especificación del QR obligatorio de ARCA (RG 4892),
// mismo criterio que src/lib/facturaQr.ts en la web -- duplicado acá
// porque print-bridge no puede importar ese archivo TypeScript directo.
function urlQrFactura(v) {
  const payload = {
    ver: 1,
    fecha: v.fecha,
    cuit: Number(v.cuit),
    ptoVta: v.ptoVta,
    tipoCmp: v.tipoCmp,
    nroCmp: v.nroCmp,
    importe: v.importe,
    moneda: 'PES',
    ctz: 1,
    tipoDocRec: v.tipoDocRec,
    nroDocRec: v.nroDocRec,
    tipoCodAut: 'E',
    codAut: Number(v.cae),
  };
  return `https://www.afip.gob.ar/fe/qr/?p=${Buffer.from(JSON.stringify(payload)).toString('base64')}`;
}

async function traerFacturasSinTicket() {
  const { data, error } = await supabase
    .from('facturas_electronicas')
    .select(
      'id, tipo_comprobante, cae, cae_vencimiento, numero, punto_venta, cuit_emisor, ventas(pedido_id, mesa_id, metodo_pago, total, created_at, mesas(label), clientes(nombre, apellido, dni, cuit))'
    )
    .eq('estado', 'emitida')
    .is('ticket_impreso_at', null);
  if (error) {
    console.error('⚠ Error leyendo facturas:', error.message);
    return [];
  }
  return data ?? [];
}

async function marcarFacturaImpresa(id) {
  const { error } = await supabase.from('facturas_electronicas').update({ ticket_impreso_at: new Date().toISOString() }).eq('id', id);
  if (error) console.error('⚠ Error marcando factura impresa:', error.message);
}

async function revisar() {
  const [pedidos, destinoDeCategoria, ventas, facturas] = await Promise.all([
    traerPedidosActivos(),
    traerDestinoCategorias(),
    traerVentasSinTicket(),
    traerFacturasSinTicket(),
  ]);

  const tickets = agruparPorRonda(pedidos, destinoDeCategoria);
  const nuevosTickets = tickets.filter((t) => !impresos.has(t.key));
  for (const t of nuevosTickets) {
    impresos.add(t.key);
    const fecha = new Date(t.enviadoAt ?? Date.now());
    const ok = await imprimirComanda({
      destino: t.destino,
      mesaLabel: t.mesaLabel,
      fecha: fecha.toLocaleDateString('es-AR'),
      hora: fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      items: t.items,
    });
    console.log(ok ? `✓ Impreso (${t.destino}): mesa ${t.mesaLabel} (${t.key})` : `✗ Falló (${t.destino}): mesa ${t.mesaLabel} (${t.key})`);
  }

  for (const v of ventas) {
    const items = await traerItemsDePedido(v.pedido_id);
    const fecha = new Date(v.created_at);
    const ok = await imprimirCobro({
      pedidoId: v.pedido_id,
      mesaLabel: v.mesas?.label ?? String(v.mesa_id ?? '?'),
      clienteNombre: v.clientes ? `${v.clientes.nombre} ${v.clientes.apellido}` : null,
      items,
      subtotal: Number(v.subtotal),
      descuento: Number(v.descuento),
      total: Number(v.total),
      metodoPago: v.metodo_pago,
      atendidoPor: v.mozo?.nombre ?? null,
      fecha: fecha.toLocaleDateString('es-AR'),
      hora: fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    });
    console.log(ok ? `✓ Cobro impreso: venta #${v.id}` : `✗ Falló cobro: venta #${v.id}`);
    if (ok) await marcarVentaImpresa(v.id);
  }

  for (const f of facturas) {
    const venta = f.ventas;
    if (!venta) continue;
    const items = await traerItemsDePedido(venta.pedido_id);
    const doc = docCliente(venta.clientes);
    const fecha = new Date(venta.created_at);
    const qrUrl = urlQrFactura({
      fecha: venta.created_at.slice(0, 10),
      cuit: f.cuit_emisor,
      ptoVta: f.punto_venta,
      tipoCmp: CBTE_TIPO[f.tipo_comprobante] ?? 6,
      nroCmp: f.numero,
      importe: Number(venta.total),
      tipoDocRec: doc.tipo,
      nroDocRec: Number(doc.nro),
      cae: f.cae,
    });
    const ok = await imprimirFactura({
      tipoComprobante: f.tipo_comprobante,
      puntoVenta: f.punto_venta,
      numero: f.numero,
      cae: f.cae,
      caeVencimiento: f.cae_vencimiento,
      cuitEmisor: f.cuit_emisor,
      clienteNombre: venta.clientes ? `${venta.clientes.nombre} ${venta.clientes.apellido}` : null,
      clienteCuitDni: venta.clientes?.cuit || venta.clientes?.dni || null,
      items,
      total: Number(venta.total),
      metodoPago: venta.metodo_pago,
      fecha: fecha.toLocaleDateString('es-AR'),
      hora: fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      qrUrl,
    });
    console.log(ok ? `✓ Factura impresa: #${f.id}` : `✗ Falló factura: #${f.id}`);
    if (ok) await marcarFacturaImpresa(f.id);
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
  // reimprime de golpe todo lo que ya está en curso. El cobro y la
  // factura no necesitan este paso: usan ticket_impreso_at en la base
  // (con backfill a las filas viejas en la migración), así que ya
  // arrancan sin backlog.
  for (const t of tickets) impresos.add(t.key);
  console.log(`Listo. ${tickets.length} comanda(s) ya en curso marcadas como vistas.`);
  console.log('Imprime comandas de cocina/barra, tickets de cobro, y facturas electrónicas ya emitidas.');
  console.log(`Revisando cada ${config.INTERVALO_MS / 1000}s... (Ctrl+C para cerrar)`);
}

(async () => {
  await inicializar();
  setInterval(() => {
    revisar().catch((err) => console.error('⚠ Error inesperado:', err.message));
  }, config.INTERVALO_MS);
})();
