import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const dbPath = path.resolve('d:/appAmate/server/appsis.db');
(async ()=>{
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  // 1) Crear nota de pedido placeholder con OrdenCompra 'R-1002' si no existe
  const rem = 'R-1002';
  let nota = await db.get('SELECT NotaPedidoID FROM notas_pedido WHERE OrdenCompra = ? LIMIT 1', rem);
  if (nota) {
    console.log('Nota existente para', rem, nota);
  } else {
    const now = new Date().toISOString().slice(0,19).replace('T',' ');
    const res = await db.run(`INSERT INTO notas_pedido (ClienteID, ListaPrecioID, Fecha, NombreFiscal, Sucursal, ImporteOperacion, Estado, EstadoAprobacion, EstadoRemito, EstadoFacturacion, OrdenCompra) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      1, 120, now, 'Nota auto', 'Sucursal', 0, 'Pendiente', 'Pendiente', 'Sin Remito', 'Sin Facturar', rem
    );
    console.log('Nota creada con NotaPedidoID=', res.lastID);
    nota = { NotaPedidoID: res.lastID };
  }

  // 2) Actualizar movimiento 50 para usar DepositoID 16 y SectorID 19 (Molino / Ubicacion_1)
  const targetDeposito = 16; const targetSector = 19;
  await db.run('UPDATE movimientos SET OrigenDepositoID = ?, OrigenSectorID = ? WHERE MovimientoID = ?', targetDeposito, targetSector, 50);
  console.log('Movimiento 50 actualizado: OrigenDepositoID=', targetDeposito, 'OrigenSectorID=', targetSector);

  // 3) Releer movimiento y notas afectadas
  const movimiento = await db.get('SELECT * FROM movimientos WHERE MovimientoID = ?', 50);
  const nota2 = await db.get('SELECT NotaPedidoID, OrdenCompra FROM notas_pedido WHERE OrdenCompra = ? LIMIT 1', rem);
  console.log('Movimiento 50 ahora:', movimiento);
  console.log('Nota encontrada:', nota2);

  await db.close();
})();
