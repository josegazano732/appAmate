import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

// Ruta absoluta al DB en Windows
const dbPath = path.resolve('d:/appAmate/server/appsis.db');
(async () => {
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  const codigos = [
    '7798441630117',
    '7798441630124',
    '7798441630025',
    '7798441630063'
  ];

  // Find deposito and sector ids
  const deposito = await db.get("SELECT * FROM depositos WHERE Nombre LIKE '%Molino%' OR Nombre = 'Molino' LIMIT 1");
  const sector = await db.get("SELECT * FROM sectores WHERE Nombre LIKE '%Ubicacion_1%' OR Nombre = 'Ubicacion_1' LIMIT 1");
  console.log('Deposito encontrado:', deposito);
  console.log('Sector encontrado:', sector);

  for (const codigo of codigos) {
    const variante = await db.get('SELECT * FROM producto_variantes WHERE Codigo = ?', codigo);
    let producto = null;
    if (variante) producto = await db.get('SELECT * FROM productos WHERE ProductoID = ?', variante.ProductoID);
    else producto = await db.get('SELECT * FROM productos WHERE Codigo = ?', codigo);
    const prodId = variante ? variante.ProductoID : (producto ? producto.ProductoID : null);
    const unitsPerPack = variante ? (Number(variante.UnitsPerPack) || 1) : (producto ? (Number(producto.UnitsPerPack) || 1) : 1);
    const packsPerPallet = variante ? (Number(variante.PacksPerPallet) || 1) : (producto ? (Number(producto.PacksPerPallet) || 1) : 1);

    let rows = [];
    if (prodId && deposito) rows = await db.all('SELECT Unidad, Pack, Pallets, SectorID FROM stock WHERE ProductoID = ? AND DepositoID = ?', prodId, deposito.DepositoID);
    let availableUnits = 0;
    for (const r of rows) availableUnits += (Number(r.Unidad) || 0) + (Number(r.Pack) || 0) * unitsPerPack + (Number(r.Pallets) || 0) * unitsPerPack * packsPerPallet;

    console.log('--------------------------------------------------');
    console.log('Codigo:', codigo);
    console.log('ProductoID:', prodId);
    console.log('UnitsPerPack:', unitsPerPack, 'PacksPerPallet:', packsPerPallet);
    console.log('Stock rows:', rows.length ? rows : 'no rows');
    console.log('AvailableUnits in deposito:', availableUnits);

    // Also check the specific sector if found
    if (prodId && deposito && sector) {
      const r2 = await db.get('SELECT Unidad, Pack, Pallets FROM stock WHERE ProductoID = ? AND DepositoID = ? AND SectorID = ?', prodId, deposito.DepositoID, sector.SectorID);
      const availSector = r2 ? (Number(r2.Unidad) || 0) + (Number(r2.Pack) || 0) * unitsPerPack + (Number(r2.Pallets) || 0) * unitsPerPack * packsPerPallet : 0;
      console.log('AvailableUnits in sector:', availSector);
    }
  }
  await db.close();
})();
