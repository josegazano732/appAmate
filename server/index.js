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
  
  await db.exec(`CREATE TABLE IF NOT EXISTS notas_pedido (
    NotaPedidoID INTEGER PRIMARY KEY AUTOINCREMENT,
    ClienteID INTEGER,
    ListaPrecioID INTEGER,
    Fecha TEXT,
    NombreFiscal TEXT,
    Sucursal TEXT,
    ImporteOperacion REAL,
    Estado TEXT,
    FOREIGN KEY (ClienteID) REFERENCES clientes(ClienteID)
  );`);

  await db.exec(`CREATE TABLE IF NOT EXISTS nota_detalle (
    NotaDetalleID INTEGER PRIMARY KEY AUTOINCREMENT,
    NotaPedidoID INTEGER,
    Codigo TEXT,
    ProductoDescripcion TEXT,
    Familia TEXT,
    Precio REAL,
    Cantidad REAL,
    PrecioNeto REAL,
    FOREIGN KEY (NotaPedidoID) REFERENCES notas_pedido(NotaPedidoID)
  );`);

  // Insertar datos de ejemplo si no existen notas
  const countNotas = await db.get('SELECT COUNT(*) as c FROM notas_pedido');
  if (countNotas.c === 0) {
    await db.run(`INSERT INTO notas_pedido (ClienteID, ListaPrecioID, Fecha, NombreFiscal, Sucursal, ImporteOperacion, Estado) VALUES
      (6,120,'2024-10-10','Supermercado ejemplo','Posadas',368370.22,'Rechazado'),
      (5,120,'2012-03-05','Chango Mas','Cordoba',0,'Aprobado'),
      (3,125,NULL,'Carlos López','Corrientes',0,'Pendiente'),
      (2,125,'2025-08-24','María Gómez','Posadas',0,'Pendiente'),
      (3,125,'2025-08-24','Carlos López','Posadas',0,'Pendiente'),
      (2,125,'2025-08-28','María Gómez','Corrientes',2000,'Pendiente')
    `);

    // Insertar algunos detalles
    await db.run(`INSERT INTO nota_detalle (NotaPedidoID, Codigo, ProductoDescripcion, Familia, Precio, Cantidad, PrecioNeto) VALUES
      (1,'3333333333333','YM Pallet 10x500 Don Julian TRADICIONAL','YM Elaborada',12056,25,301400),
      (1,'3333333333333','YM Pallet 10x500 Don Julian TRADICIONAL','YM Elaborada',11010.22,1,11010.22),
      (1,'1111111111111','YM 500 Gs Don Julian TRADICIONAL','YM Elaborada',12320,3,36960),
      (1,'4444444444444','YM 500 Grs Caricias de Mate TRADICIONAL','YM Elaborada',9500,2,19000),
      (6,'4444444444444','YM 500 Grs Caricias de Mate TRADICIONAL','YM Elaborada',2000,1,2000)
    `);
  }
})();

// CRUD Clientes
// Soporte para paginación: ?limit=10&offset=0&q=texto
app.get('/api/clientes', async (req, res) => {
  const limit = parseInt(req.query.limit) || null;
  const offset = parseInt(req.query.offset) || 0;
  const q = req.query.q ? `%${req.query.q}%` : null;

  let where = '';
  const params = [];
  if (q) {
    where = 'WHERE NombreRazonSocial LIKE ? OR Numero LIKE ?';
    params.push(q, q);
  }

  // Obtener total
  const totalRow = await db.get(`SELECT COUNT(*) as count FROM clientes ${where}`, params);
  const total = totalRow ? totalRow.count : 0;

  let sql = `SELECT * FROM clientes ${where} ORDER BY ClienteID ASC`;
  if (limit) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
  }

  const clientes = await db.all(sql, params);
  res.json({ items: clientes, total });
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

// Notas de Pedido - endpoints básicos
// Soporta paginación: ?limit=10&offset=0
app.get('/api/notas-pedido', async (req, res) => {
  const limit = parseInt(req.query.limit) || null;
  const offset = parseInt(req.query.offset) || 0;

  const totalRow = await db.get('SELECT COUNT(*) as count FROM notas_pedido');
  const total = totalRow ? totalRow.count : 0;

  let sql = 'SELECT * FROM notas_pedido ORDER BY NotaPedidoID ASC';
  const params = [];
  if (limit) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
  }
  const items = await db.all(sql, params);
  res.json({ items, total });
});

app.get('/api/notas-pedido/:id', async (req, res) => {
  const nota = await db.get('SELECT * FROM notas_pedido WHERE NotaPedidoID = ?', req.params.id);
  const detalles = await db.all('SELECT * FROM nota_detalle WHERE NotaPedidoID = ?', req.params.id);
  res.json({ nota, detalles });
});

// Crear nota con detalles - espera { nota: {...}, detalles: [...] }
app.post('/api/notas-pedido', async (req, res) => {
  const { nota, detalles } = req.body;
  const result = await db.run(`INSERT INTO notas_pedido (ClienteID, ListaPrecioID, Fecha, NombreFiscal, Sucursal, ImporteOperacion, Estado)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    nota.ClienteID, nota.ListaPrecioID, nota.Fecha, nota.NombreFiscal, nota.Sucursal, nota.ImporteOperacion || 0, nota.Estado || 'Pendiente');
  const notaId = result.lastID;
  if (Array.isArray(detalles)) {
    const insertStmt = await db.prepare(`INSERT INTO nota_detalle (NotaPedidoID, Codigo, ProductoDescripcion, Familia, Precio, Cantidad, PrecioNeto) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    try {
      for (const d of detalles) {
        await insertStmt.run(notaId, d.Codigo, d.ProductoDescripcion, d.Familia, d.Precio, d.Cantidad, d.PrecioNeto);
      }
    } finally {
      await insertStmt.finalize();
    }
  }
  res.json({ ok: true, NotaPedidoID: notaId });
});

app.delete('/api/notas-pedido/:id', async (req, res) => {
  await db.run('DELETE FROM nota_detalle WHERE NotaPedidoID = ?', req.params.id);
  await db.run('DELETE FROM notas_pedido WHERE NotaPedidoID = ?', req.params.id);
  res.json({ ok: true });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor API escuchando en puerto ${PORT}`);
});
