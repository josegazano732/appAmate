import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'appsis.db');

async function run() {
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  try {
    const cols = await db.all("PRAGMA table_info('ventas')");
    const names = (cols || []).map(c => c.name);
    if (!names.includes('Saldo')) {
      console.log('Adding column Saldo to ventas...');
      await db.exec("ALTER TABLE ventas ADD COLUMN Saldo REAL DEFAULT 0;");
      await db.exec(`UPDATE ventas SET Saldo = Total - IFNULL((SELECT SUM(ImporteAplicado) FROM recibo_ventas WHERE recibo_ventas.VentaID = ventas.VentaID), 0)`);
      console.log('Saldo column added and backfilled');
    } else {
      console.log('Column Saldo already exists');
    }
  } catch (e) {
    console.error('Error in add_saldo_column', e && e.message);
  } finally { try { await db.close(); } catch(e){} }
}

run();
