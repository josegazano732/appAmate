import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'appsis.db');

async function run() {
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  try {
    const now = new Date().toISOString().slice(0,19).replace('T',' ');
    const res = await db.run('INSERT INTO ventas (ClienteID, FechaComp, TipoComp, PuntoVenta, NumeroComp, Subtotal, Total, Saldo, CreatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      null, now, 'FA', 1, 'TEST123', 100, 100, 100, now);
    const id = res.lastID;
    console.log('Inserted VentaID=', id);
    fs.writeFileSync(path.join(__dirname, 'last_inserted_venta_id.txt'), String(id));
  } catch (e) {
    console.error('Error inserting test venta', e && e.message);
  } finally {
    try { await db.close(); } catch(e){}
  }
}

run();
