import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

(async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const dbPath = path.join(__dirname, 'appsis.db');
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  try {
    const rows = await db.all('SELECT StockID, ProductoID, DepositoID, SectorID, Unidad, Pack, Pallets FROM stock WHERE DepositoID IS NULL');
    console.log('Found rows with DepositoID NULL:', rows.length);
    for (const r of rows) {
      console.log('Deleting StockID', r.StockID);
      await db.run('DELETE FROM stock WHERE StockID = ?', r.StockID);
    }
    console.log('Done');
  } catch (err) {
    console.error('Error cleaning stock', err && (err.stack || err.message || err));
    process.exit(1);
  } finally {
    await db.close();
  }
})();
