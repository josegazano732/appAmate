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
    // Crear tablas si no existen
    await db.exec(`CREATE TABLE IF NOT EXISTS recibos (
      ReciboID INTEGER PRIMARY KEY AUTOINCREMENT,
      Fecha TEXT,
      ClienteID INTEGER,
      Total REAL DEFAULT 0,
      Observaciones TEXT,
      CreatedAt TEXT
    );`);

    await db.exec(`CREATE TABLE IF NOT EXISTS recibo_pagos (
      ReciboPagoID INTEGER PRIMARY KEY AUTOINCREMENT,
      ReciboID INTEGER,
      TipoPago TEXT,
      Monto REAL DEFAULT 0,
      Datos TEXT,
      FOREIGN KEY (ReciboID) REFERENCES recibos(ReciboID)
    );`);

    await db.exec(`CREATE TABLE IF NOT EXISTS recibo_ventas (
      ReciboVentaID INTEGER PRIMARY KEY AUTOINCREMENT,
      ReciboID INTEGER,
      VentaID INTEGER,
      ImporteAplicado REAL DEFAULT 0,
      FOREIGN KEY (ReciboID) REFERENCES recibos(ReciboID),
      FOREIGN KEY (VentaID) REFERENCES ventas(VentaID)
    );`);

    // Agregar columna Saldo si falta
    const cols = await db.all("PRAGMA table_info('ventas')");
    const names = (cols || []).map(c => c.name);
    if (!names.includes('Saldo')) {
      console.log('Adding column Saldo to ventas...');
      await db.exec("ALTER TABLE ventas ADD COLUMN Saldo REAL DEFAULT 0;");
    }

    // Backfill Saldo
    await db.exec(`UPDATE ventas SET Saldo = Total - IFNULL((SELECT SUM(ImporteAplicado) FROM recibo_ventas WHERE recibo_ventas.VentaID = ventas.VentaID), 0)`);
    console.log('Recibos tables ensured and Saldo backfilled');
  } catch (e) {
    console.error('Error ensuring recibos tables', e && e.message);
  } finally { try { await db.close(); } catch(e){} }
}

run();
