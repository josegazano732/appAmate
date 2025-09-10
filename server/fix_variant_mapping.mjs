import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'appsis.db');

(async () => {
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  const codigo = '7798441630018';
  const prod = await db.get('SELECT ProductoID FROM productos WHERE Codigo = ?', codigo);
  if (!prod) {
    console.error('Producto con ese Codigo no encontrado en productos. Abortando.');
    await db.close();
    process.exit(2);
  }
  const targetProductoID = prod.ProductoID;
  console.log('Producto encontrado:', targetProductoID);
  const res = await db.run('UPDATE producto_variantes SET ProductoID = ? WHERE Codigo = ?', targetProductoID, codigo);
  console.log('Update resultado:', res.changes, 'filas afectadas');
  // Mostrar filas afectadas
  const rows = await db.all('SELECT VarianteID, ProductoID, Codigo FROM producto_variantes WHERE Codigo = ?', codigo);
  console.log('Variantes con ese codigo:', rows);
  await db.close();
})();
