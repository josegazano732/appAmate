import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const dbPath = path.resolve('d:/AppSis/AppSis/server/appsis.db');
// Cambiar a true si quieres crear notas placeholder cuando no se encuentre coincidencia
const CREATE_PLACEHOLDER_NOTAS = false;

(async ()=>{
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  try {
    const movimientos = await db.all("SELECT MovimientoID, RemitoNumero FROM movimientos WHERE NotaPedidoID IS NULL AND RemitoNumero IS NOT NULL AND TRIM(RemitoNumero) != ''");
    console.log('Movimientos candidatos encontrados:', movimientos.length);
    const updated = [];
    for (const m of movimientos) {
      const rem = String(m.RemitoNumero || '').trim();
      if (!rem) continue;
      // 1) buscar nota por OrdenCompra exacta
      let nota = await db.get('SELECT NotaPedidoID FROM notas_pedido WHERE OrdenCompra = ? LIMIT 1', rem);
      if (!nota) {
        // 2) buscar por LIKE
        nota = await db.get('SELECT NotaPedidoID FROM notas_pedido WHERE OrdenCompra LIKE ? LIMIT 1', `%${rem}%`);
      }
      if (!nota) {
        // 3) extraer dígitos y probar por ID
        const digits = (rem.match(/\d+/g) || []).join('');
        if (digits && !isNaN(parseInt(digits,10))) {
          const asId = parseInt(digits,10);
          nota = await db.get('SELECT NotaPedidoID FROM notas_pedido WHERE NotaPedidoID = ? LIMIT 1', asId);
        }
      }

      if (!nota && CREATE_PLACEHOLDER_NOTAS) {
        const now = new Date().toISOString().slice(0,19).replace('T',' ');
        const res = await db.run(`INSERT INTO notas_pedido (ClienteID, ListaPrecioID, Fecha, NombreFiscal, Sucursal, ImporteOperacion, Estado, EstadoAprobacion, EstadoRemito, EstadoFacturacion, OrdenCompra) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          1, 120, now, 'Nota placeholder', 'Sucursal', 0, 'Pendiente', 'Pendiente', 'Sin Remito', 'Sin Facturar', rem
        );
        nota = { NotaPedidoID: res.lastID };
        console.log('Nota placeholder creada para', rem, '=>', nota.NotaPedidoID);
      }

      if (nota && nota.NotaPedidoID) {
        await db.run('UPDATE movimientos SET NotaPedidoID = ? WHERE MovimientoID = ?', nota.NotaPedidoID, m.MovimientoID);
        updated.push({ MovimientoID: m.MovimientoID, NotaPedidoID: nota.NotaPedidoID });
        console.log('Asociado movimiento', m.MovimientoID, '=> NotaPedidoID', nota.NotaPedidoID);
      } else {
        console.log('No se encontró nota para movimiento', m.MovimientoID, 'RemitoNumero=', rem);
      }
    }

    console.log('Resumen: movimientos actualizados =', updated.length);
  } catch (err) {
    console.error('Error durante backfill:', err.message || err);
  } finally {
    await db.close();
  }
})();
