import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'appsis.db');

(async () => {
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  try {
    const ventas = await db.all('SELECT * FROM ventas WHERE MovimientoID = ?', 50);
    console.log('ventas para MovimientoID=50 ->', ventas.length);
    console.log(JSON.stringify(ventas, null, 2));
    const detalles = await db.all('SELECT * FROM venta_detalle WHERE VentaID IN (SELECT VentaID FROM ventas WHERE MovimientoID = ?)', 50);
    console.log('venta_detalle rows ->', detalles.length);
    console.log(JSON.stringify(detalles, null, 2));
    const nota = await db.get('SELECT NotaPedidoID, EstadoFacturacion, Estado FROM notas_pedido WHERE NotaPedidoID = ?', 29);
    console.log('nota 29 ->', JSON.stringify(nota, null, 2));
  } catch (e) {
    console.error('error querying db', e);
  } finally {
    await db.close();
  }
})();
