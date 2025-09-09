import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const dbPath = path.resolve('d:/appAmate/server/appsis.db');
(async () => {
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  const deposito = await db.get("SELECT * FROM depositos WHERE Nombre LIKE '%Molino%' OR Nombre = 'Molino' LIMIT 1");
  if (!deposito) { console.log('Deposito Molino no encontrado'); await db.close(); return; }
  const sectores = await db.all('SELECT * FROM sectores WHERE DepositoID = ? ORDER BY SectorID ASC', deposito.DepositoID);
  console.log('Deposito:', deposito);
  console.log('Sectores en ese deposito:');
  for (const s of sectores) console.log(s.SectorID, s.Nombre);
  await db.close();
})();
