import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const dbPath = path.resolve('d:/appAmate/server/appsis.db');
(async ()=>{
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  const venta = await db.get('SELECT * FROM ventas ORDER BY VentaID DESC LIMIT 1');
  if (!venta) { console.log('No hay ventas registradas'); await db.close(); return; }
  const detalles = await db.all('SELECT * FROM venta_detalle WHERE VentaID = ?', venta.VentaID);
  console.log('Venta encontrada:', venta);
  console.log('Detalles:', detalles);
  await db.close();
})();
