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
    console.log('ventas columns:');
    for (const c of cols) console.log(c.name, c.type, c.dflt_value);
  } catch (e) { console.error('Error reading PRAGMA', e && e.message); }
  finally { try { await db.close(); } catch(e){} }
}

run();
