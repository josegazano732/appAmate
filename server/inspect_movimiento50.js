import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const dbPath = path.resolve('d:/appAmate/server/appsis.db');
(async ()=>{
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  const movimiento = await db.get('SELECT * FROM movimientos WHERE MovimientoID = ?', 50);
  console.log('Movimiento 50:', movimiento);
  const dep = movimiento && movimiento.OrigenDepositoID ? await db.get('SELECT * FROM depositos WHERE DepositoID = ?', movimiento.OrigenDepositoID) : null;
  const sec = movimiento && movimiento.OrigenSectorID ? await db.get('SELECT * FROM sectores WHERE SectorID = ?', movimiento.OrigenSectorID) : null;
  console.log('Origen deposito row:', dep);
  console.log('Origen sector row:', sec);

  const rem = movimiento ? String(movimiento.RemitoNumero || '').trim() : '';
  console.log('RemitoNumero:', rem);
  if (rem) {
    const byOrden = await db.all('SELECT NotaPedidoID, OrdenCompra FROM notas_pedido WHERE OrdenCompra = ? LIMIT 10', rem);
    const byLike = await db.all('SELECT NotaPedidoID, OrdenCompra FROM notas_pedido WHERE OrdenCompra LIKE ? LIMIT 10', `%${rem}%`);
    const digits = (rem.match(/\d+/g) || []).join('');
    const byId = (digits && !isNaN(parseInt(digits,10))) ? await db.all('SELECT NotaPedidoID, OrdenCompra FROM notas_pedido WHERE NotaPedidoID = ? LIMIT 10', parseInt(digits,10)) : [];
    console.log('Notas exactas por OrdenCompra:', byOrden);
    console.log('Notas por LIKE:', byLike);
    console.log('Notas por ID extraido:', byId);
  }

  // mostrar algunos depositos y sectores
  const deps = await db.all('SELECT DepositoID, Nombre FROM depositos ORDER BY DepositoID ASC LIMIT 50');
  const secs = await db.all('SELECT SectorID, Nombre, DepositoID FROM sectores ORDER BY SectorID ASC LIMIT 200');
  console.log('Depositos (primeros):', deps);
  console.log('Sectores (primeros):', secs.slice(0,50));

  await db.close();
})();
