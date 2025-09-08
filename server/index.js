// ...existing code...

// ...existing code...
import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

let db;

(async () => {
  db = await open({
    filename: './appsis.db',
    driver: sqlite3.Database
  });

  await db.exec(`CREATE TABLE IF NOT EXISTS clientes (
    ClienteID INTEGER PRIMARY KEY AUTOINCREMENT,
    TIPO TEXT,
    Numero TEXT,
    NombreRazonSocial TEXT
  );`);

  await db.exec(`CREATE TABLE IF NOT EXISTS datos_clientes (
    DatosID INTEGER PRIMARY KEY AUTOINCREMENT,
    ClienteID INTEGER,
    Telefono TEXT,
    Email TEXT,
    Direccion TEXT,
    Provincia TEXT,
    Ciudad TEXT,
    CodPostal TEXT,
    NroSucursal INTEGER,
    GLN TEXT,
    Observaciones TEXT,
    FOREIGN KEY (ClienteID) REFERENCES clientes(ClienteID)
  );`);
})();

// CRUD Clientes
app.get('/api/clientes', async (req, res) => {
  const clientes = await db.all('SELECT * FROM clientes');
  res.json(clientes);
});

app.get('/api/clientes/:id', async (req, res) => {
  const cliente = await db.get('SELECT * FROM clientes WHERE ClienteID = ?', req.params.id);
  res.json(cliente);
});

app.post('/api/clientes', async (req, res) => {
  const { TIPO, Numero, NombreRazonSocial } = req.body;
  await db.run('INSERT INTO clientes (TIPO, Numero, NombreRazonSocial) VALUES (?, ?, ?)',
    TIPO, Numero, NombreRazonSocial);
  res.json({ ok: true });
});

app.put('/api/clientes/:id', async (req, res) => {
  const { TIPO, Numero, NombreRazonSocial } = req.body;
  await db.run('UPDATE clientes SET TIPO = ?, Numero = ?, NombreRazonSocial = ? WHERE ClienteID = ?',
    TIPO, Numero, NombreRazonSocial, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/clientes/:id', async (req, res) => {
  await db.run('DELETE FROM clientes WHERE ClienteID = ?', req.params.id);
  res.json({ ok: true });
});

// CRUD DatosClientes
app.get('/api/datos-clientes', async (req, res) => {
  const datos = await db.all('SELECT * FROM datos_clientes');
  res.json(datos);
});

app.get('/api/datos-clientes/:id', async (req, res) => {
  const dato = await db.get('SELECT * FROM datos_clientes WHERE DatosID = ?', req.params.id);
  res.json(dato);
});

app.get('/api/datos-clientes/cliente/:clienteId', async (req, res) => {
  const datos = await db.all('SELECT * FROM datos_clientes WHERE ClienteID = ?', req.params.clienteId);
  res.json(datos);
});

app.post('/api/datos-clientes', async (req, res) => {
  const { ClienteID, Telefono, Email, Direccion, Provincia, Ciudad, CodPostal, NroSucursal, GLN, Observaciones } = req.body;
  const result = await db.run(`INSERT INTO datos_clientes (ClienteID, Telefono, Email, Direccion, Provincia, Ciudad, CodPostal, NroSucursal, GLN, Observaciones)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ClienteID, Telefono, Email, Direccion, Provincia, Ciudad, CodPostal, NroSucursal, GLN, Observaciones);
  res.json({ ok: true, DatosID: result.lastID });
});

app.put('/api/datos-clientes/:id', async (req, res) => {
  const { ClienteID, Telefono, Email, Direccion, Provincia, Ciudad, CodPostal, NroSucursal, GLN, Observaciones } = req.body;
  await db.run(`UPDATE datos_clientes SET ClienteID = ?, Telefono = ?, Email = ?, Direccion = ?, Provincia = ?, Ciudad = ?, CodPostal = ?, NroSucursal = ?, GLN = ?, Observaciones = ? WHERE DatosID = ?`,
    ClienteID, Telefono, Email, Direccion, Provincia, Ciudad, CodPostal, NroSucursal, GLN, Observaciones, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/datos-clientes/:id', async (req, res) => {
  await db.run('DELETE FROM datos_clientes WHERE DatosID = ?', req.params.id);
  res.json({ ok: true });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor API escuchando en puerto ${PORT}`);
});
