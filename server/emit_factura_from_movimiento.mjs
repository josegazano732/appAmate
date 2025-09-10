import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

// Script que ejecuta localmente la lógica de POST /api/movimientos/:id/facturar
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'appsis.db');

async function run() {
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  try {
    const movimientoId = 50;
    const body = {
      TipoComp: 'A',
      PuntoVenta: 1,
      NumeroComp: '1001',
      Descuento: 0,
      lineIva: { '53': 21 }
    };

    const mov = await db.get('SELECT * FROM movimientos WHERE MovimientoID = ?', movimientoId);
    if (!mov) throw new Error('Movimiento no encontrado');
    const detalles = await db.all('SELECT * FROM movimiento_detalle WHERE MovimientoID = ?', movimientoId);

    // Obtener ClienteID desde la nota si existe
    let clienteId = null;
    if (mov.NotaPedidoID) {
      const nota = await db.get('SELECT * FROM notas_pedido WHERE NotaPedidoID = ?', mov.NotaPedidoID);
      if (nota) clienteId = nota.ClienteID;
    }

    // Calcular totales y crear venta
    let subtotal = 0;
    let subtotalNeto = 0;
    let totalIva = 0;
    let totalNoGravado = 0;

    const ventaRes = await db.run(`INSERT INTO ventas (ClienteID, NotaPedidoID, MovimientoID, FechaComp, TipoComp, PuntoVenta, NumeroComp, Descuento, Subtotal, SubtotalNeto, SubtotalNoGravado, IvaPercent, TotalIva, Total, CreatedAt) VALUES (?, ?, ?, datetime('now'), ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, datetime('now'))`,
      clienteId, mov.NotaPedidoID || null, movimientoId, body.TipoComp, body.PuntoVenta, body.NumeroComp, body.Descuento || 0);
    const ventaId = ventaRes.lastID;

    for (const d of detalles) {
      // resolver precio: intentar desde nota_detalle por codigo
      let precio = 0;
      let codigo = null;
      // buscamos codigo en nota_detalle
      if (mov.NotaPedidoID) {
        const nd = await db.get('SELECT Codigo, Precio, PrecioNeto, Medida FROM nota_detalle WHERE NotaPedidoID = ? AND ProductoDescripcion = (SELECT ProductoDescripcion FROM productos WHERE ProductoID = ?) LIMIT 1', mov.NotaPedidoID, d.ProductoID);
        if (nd) { precio = nd.Precio || nd.PrecioNeto || 0; codigo = nd.Codigo; }
      }
      // fallback buscar codigo en variante
      if (!precio) {
        const prod = await db.get('SELECT * FROM productos WHERE ProductoID = ?', d.ProductoID);
        precio = prod ? (prod.Precio || 0) : 0;
      }
      // Cantidad enviada en unidades normalizadas (muy simplificada)
      const units = (Number(d.Unidad) || 0) + (Number(d.Pack) || 0)*1 + (Number(d.Pallets) || 0)*1;
      const iva = body.lineIva && body.lineIva[String(d.ProductoID)] ? Number(body.lineIva[String(d.ProductoID)]) : 0;
      const lineTotalNeto = precio * units;
      const ivaAmount = (lineTotalNeto * iva) / 100;
      const lineTotal = lineTotalNeto + ivaAmount;

      subtotal += lineTotal;
      subtotalNeto += lineTotalNeto;
      totalIva += ivaAmount;

      await db.run(`INSERT INTO venta_detalle (VentaID, ProductoID, Descripcion, Cantidad, PrecioUnitario, PrecioNeto, NoGravado, IvaPercent, IvaAmount, TotalLinea) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ventaId, d.ProductoID, (codigo || ('Producto ' + d.ProductoID)), units, precio, lineTotalNeto, 0, iva, ivaAmount, lineTotal);
    }

    // Actualizar totales en ventas
    await db.run('UPDATE ventas SET Subtotal = ?, SubtotalNeto = ?, SubtotalNoGravado = ?, TotalIva = ?, Total = ? WHERE VentaID = ?', subtotal, subtotalNeto, totalNoGravado, totalIva, subtotal, ventaId);

    // Marcar nota facturada si existe
    if (mov.NotaPedidoID) {
      await db.run("UPDATE notas_pedido SET EstadoFacturacion = 'Facturado', Estado = 'Facturado' WHERE NotaPedidoID = ?", mov.NotaPedidoID);
    }

    console.log('Factura creada. VentaID=', ventaId);
  } catch (e) {
    console.error('Error local emit factura', e && e.message);
  } finally {
    // close handled by process exit in simple script, but do explicitly
    try { // open again to close? we used open earlier, so it's closed on finish
    } catch(e) {}
  }
}

run();
