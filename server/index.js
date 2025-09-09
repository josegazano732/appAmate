// ...existing code...

// ...existing code...
import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolver __dirname en ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
import fs from 'fs';
const logFile = path.join(__dirname, 'requests.log');

let db;

(async () => {
  const dbPath = path.join(__dirname, 'appsis.db');
  db = await open({
    filename: dbPath,
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
  EstadoAprobacion TEXT,
  EstadoRemito TEXT,
  EstadoFacturacion TEXT,
  OrdenCompra TEXT,
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

  // Inventario: productos, depositos, sectores, stock y movimientos
  await db.exec(`CREATE TABLE IF NOT EXISTS productos (
    ProductoID INTEGER PRIMARY KEY AUTOINCREMENT,
    Codigo TEXT UNIQUE,
    ProductoDescripcion TEXT,
    TipoUnidad TEXT,
    Unidad TEXT,
    Pack INTEGER,
    Pallets REAL
  );`);
  // Añadir columnas de equivalencia si no existen
  try {
    const prodCols = await db.all("PRAGMA table_info('productos')");
    const prodExisting = new Set(prodCols.map(c => c.name));
    const prodToAdd = [];
    if (!prodExisting.has('UnitsPerPack')) prodToAdd.push("ALTER TABLE productos ADD COLUMN UnitsPerPack INTEGER DEFAULT 1;");
    if (!prodExisting.has('PacksPerPallet')) prodToAdd.push("ALTER TABLE productos ADD COLUMN PacksPerPallet INTEGER DEFAULT 1;");
  if (!prodExisting.has('DefaultMeasure')) prodToAdd.push("ALTER TABLE productos ADD COLUMN DefaultMeasure TEXT DEFAULT 'unidad';");
    for (const sql of prodToAdd) {
      try {
        await db.exec(sql);
        console.log('DB migration: ejecutado ->', sql.trim());
      } catch (err) {
        console.warn('DB migration productos: no se pudo ejecutar:', sql.trim(), err.message || err);
      }
    }
  } catch (err) {
    console.warn('DB migration productos: error al verificar columnas', err.message || err);
  }

  await db.exec(`CREATE TABLE IF NOT EXISTS depositos (
    DepositoID INTEGER PRIMARY KEY AUTOINCREMENT,
    Nombre TEXT
  );`);

  await db.exec(`CREATE TABLE IF NOT EXISTS sectores (
    SectorID INTEGER PRIMARY KEY AUTOINCREMENT,
    Nombre TEXT
  );`);

  await db.exec(`CREATE TABLE IF NOT EXISTS stock (
    StockID INTEGER PRIMARY KEY AUTOINCREMENT,
    ProductoID INTEGER,
    DepositoID INTEGER,
    SectorID INTEGER,
    Unidad REAL DEFAULT 0,
    Pack INTEGER DEFAULT 0,
    Pallets REAL DEFAULT 0,
    FOREIGN KEY (ProductoID) REFERENCES productos(ProductoID),
    FOREIGN KEY (DepositoID) REFERENCES depositos(DepositoID),
    FOREIGN KEY (SectorID) REFERENCES sectores(SectorID)
  );`);

  await db.exec(`CREATE TABLE IF NOT EXISTS movimientos (
    MovimientoID INTEGER PRIMARY KEY AUTOINCREMENT,
    Tipo TEXT,
    Fecha TEXT,
    RemitoNumero TEXT,
    OrigenDepositoID INTEGER,
    OrigenSectorID INTEGER,
    DestinoDepositoID INTEGER,
    DestinoSectorID INTEGER,
    Observaciones TEXT
  );`);

  await db.exec(`CREATE TABLE IF NOT EXISTS movimiento_detalle (
    MovimientoDetalleID INTEGER PRIMARY KEY AUTOINCREMENT,
    MovimientoID INTEGER,
    ProductoID INTEGER,
    Unidad REAL DEFAULT 0,
    Pack INTEGER DEFAULT 0,
    Pallets REAL DEFAULT 0,
    FOREIGN KEY (MovimientoID) REFERENCES movimientos(MovimientoID),
    FOREIGN KEY (ProductoID) REFERENCES productos(ProductoID)
  );`);

  // Verificar columnas nuevas en notas_pedido y agregarlas si faltan (migra en caliente)
  try {
    const cols = await db.all("PRAGMA table_info('notas_pedido')");
    const existing = new Set(cols.map(c => c.name));
    const toAdd = [];
    if (!existing.has('EstadoAprobacion')) toAdd.push("ALTER TABLE notas_pedido ADD COLUMN EstadoAprobacion TEXT;");
    if (!existing.has('EstadoRemito')) toAdd.push("ALTER TABLE notas_pedido ADD COLUMN EstadoRemito TEXT;");
    if (!existing.has('EstadoFacturacion')) toAdd.push("ALTER TABLE notas_pedido ADD COLUMN EstadoFacturacion TEXT;");
    if (!existing.has('OrdenCompra')) toAdd.push("ALTER TABLE notas_pedido ADD COLUMN OrdenCompra TEXT;");
    for (const sql of toAdd) {
      try {
        await db.exec(sql);
        console.log('DB migration: ejecutado ->', sql.trim());
      } catch (err) {
        console.warn('DB migration: no se pudo ejecutar:', sql.trim(), err.message || err);
      }
    }
  } catch (err) {
    console.warn('DB migration: error al verificar columnas de notas_pedido', err.message || err);
  }

  // Insertar datos de ejemplo si no existen notas
  const countNotas = await db.get('SELECT COUNT(*) as c FROM notas_pedido');
  if (countNotas.c === 0) {
    await db.run(`INSERT INTO notas_pedido (ClienteID, ListaPrecioID, Fecha, NombreFiscal, Sucursal, ImporteOperacion, Estado, EstadoAprobacion, EstadoRemito, EstadoFacturacion, OrdenCompra) VALUES
      (6,120,'2024-10-10','Supermercado ejemplo','Posadas',368370.22,'Rechazado','Rechazada','Remitido','Facturado','OC-1001'),
      (5,120,'2012-03-05','Chango Mas','Cordoba',0,'Aprobado','Aprobada','Sin Remito','Sin Facturar',''),
      (3,125,NULL,'Carlos López','Corrientes',0,'Pendiente','Pendiente','Sin Remito','Sin Facturar',''),
      (2,125,'2025-08-24','María Gómez','Posadas',0,'Pendiente','Pendiente','Sin Remito','Sin Facturar',''),
      (3,125,'2025-08-24','Carlos López','Posadas',0,'Pendiente','Pendiente','Sin Remito','Sin Facturar',''),
      (2,125,'2025-08-28','María Gómez','Corrientes',2000,'Pendiente','Pendiente','Sin Remito','Sin Facturar','OC-2002')
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
  // Log request
  try { fs.appendFileSync(logFile, `${new Date().toISOString()} GET /api/clientes params=${JSON.stringify(req.query)}\n`); } catch(e) {}
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
  const q = req.query.q ? `%${req.query.q}%` : null;

  let where = '';
  const params = [];
  if (q) {
    where = 'WHERE NombreFiscal LIKE ? OR OrdenCompra LIKE ? OR Fecha LIKE ?';
    params.push(q, q, q);
  }

  const totalRow = await db.get(`SELECT COUNT(*) as count FROM notas_pedido ${where}`, params);
  const total = totalRow ? totalRow.count : 0;

  let sql = `SELECT * FROM notas_pedido ${where} ORDER BY NotaPedidoID ASC`;
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
  const result = await db.run(`INSERT INTO notas_pedido (ClienteID, ListaPrecioID, Fecha, NombreFiscal, Sucursal, ImporteOperacion, Estado, EstadoAprobacion, EstadoRemito, EstadoFacturacion, OrdenCompra)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    nota.ClienteID,
    nota.ListaPrecioID,
    nota.Fecha,
    nota.NombreFiscal,
    nota.Sucursal,
    nota.ImporteOperacion || 0,
    nota.Estado || 'Pendiente',
    nota.EstadoAprobacion || 'Pendiente',
    nota.EstadoRemito || 'Sin Remito',
    nota.EstadoFacturacion || 'Sin Facturar',
    nota.OrdenCompra || ''
  );
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

// Inventario endpoints
// Productos
app.get('/api/productos', async (req, res) => {
  const prods = await db.all('SELECT * FROM productos ORDER BY ProductoID ASC');
  res.json(prods);
});

// Verificar existencia de producto por Codigo
app.get('/api/productos/exists', async (req, res) => {
  const codigo = req.query.codigo;
  if (!codigo) return res.json({ exists: false });
  const p = await db.get('SELECT ProductoID FROM productos WHERE Codigo = ?', codigo);
  res.json({ exists: !!p });
});

app.post('/api/productos', async (req, res) => {
  try {
  const { Codigo, ProductoDescripcion, TipoUnidad, Unidad, Pack, Pallets, DefaultMeasure } = req.body;
    // Verificar si ya existe un producto con el mismo Codigo
    if (Codigo) {
      const exists = await db.get('SELECT ProductoID FROM productos WHERE Codigo = ?', Codigo);
      if (exists) {
        return res.status(409).json({ ok: false, error: 'Codigo already exists', ProductoID: exists.ProductoID });
      }
    }

  const unitsPerPack = req.body.UnitsPerPack || 1;
  const packsPerPallet = req.body.PacksPerPallet || 1;
  const defaultMeasure = DefaultMeasure || 'unidad';
  const result = await db.run('INSERT INTO productos (Codigo, ProductoDescripcion, TipoUnidad, Unidad, Pack, Pallets, UnitsPerPack, PacksPerPallet, DefaultMeasure) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', Codigo, ProductoDescripcion, TipoUnidad, Unidad, Pack, Pallets, unitsPerPack, packsPerPallet, defaultMeasure);
    const productoId = result.lastID;
    // Crear fila de stock inicial con 0 en primer deposito/sector disponible para que aparezca en inventario
    try {
      const dep = await db.get('SELECT DepositoID FROM depositos LIMIT 1');
      const sec = await db.get('SELECT SectorID FROM sectores LIMIT 1');
      if (dep && sec) {
        await db.run('INSERT INTO stock (ProductoID, DepositoID, SectorID, Unidad, Pack, Pallets) VALUES (?, ?, ?, ?, ?, ?)', productoId, dep.DepositoID, sec.SectorID, 0, 0, 0);
      }
    } catch (e) {
      console.warn('No se pudo crear stock inicial para producto', e.message || e);
    }

    res.json({ ok: true, ProductoID: productoId });
  } catch (err) {
    console.error('Error POST /api/productos', err.message || err);
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Obtener producto por id
app.get('/api/productos/:id', async (req, res) => {
  try {
    const p = await db.get('SELECT * FROM productos WHERE ProductoID = ?', req.params.id);
    res.json(p || null);
  } catch (err) {
    console.error('Error GET /api/productos/:id', err.message || err);
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Actualizar producto
app.put('/api/productos/:id', async (req, res) => {
  try {
    const id = req.params.id;
  const { Codigo, ProductoDescripcion, TipoUnidad, Unidad, Pack, Pallets, DefaultMeasure } = req.body;
    // Verificar código único (si se cambió)
    if (Codigo) {
      const ex = await db.get('SELECT ProductoID FROM productos WHERE Codigo = ? AND ProductoID != ?', Codigo, id);
      if (ex) return res.status(409).json({ ok: false, error: 'Codigo already exists', ProductoID: ex.ProductoID });
    }
  const unitsPerPack = req.body.UnitsPerPack || 1;
  const packsPerPallet = req.body.PacksPerPallet || 1;
  const defaultMeasure = DefaultMeasure || 'unidad';
  await db.run('UPDATE productos SET Codigo = ?, ProductoDescripcion = ?, TipoUnidad = ?, Unidad = ?, Pack = ?, Pallets = ?, UnitsPerPack = ?, PacksPerPallet = ?, DefaultMeasure = ? WHERE ProductoID = ?', Codigo, ProductoDescripcion, TipoUnidad, Unidad, Pack, Pallets, unitsPerPack, packsPerPallet, defaultMeasure, id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error PUT /api/productos/:id', err.message || err);
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Borrar producto (y stock asociado)
app.delete('/api/productos/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await db.run('DELETE FROM stock WHERE ProductoID = ?', id);
    await db.run('DELETE FROM productos WHERE ProductoID = ?', id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error DELETE /api/productos/:id', err.message || err);
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Depositos y Sectores
app.get('/api/depositos', async (req, res) => {
  const d = await db.all('SELECT * FROM depositos');
  res.json(d);
});
app.post('/api/depositos', async (req, res) => {
  const { Nombre } = req.body;
  const r = await db.run('INSERT INTO depositos (Nombre) VALUES (?)', Nombre);
  res.json({ ok: true, DepositoID: r.lastID });
});

app.get('/api/sectores', async (req, res) => {
  const s = await db.all('SELECT * FROM sectores');
  res.json(s);
});
app.post('/api/sectores', async (req, res) => {
  const { Nombre } = req.body;
  const r = await db.run('INSERT INTO sectores (Nombre) VALUES (?)', Nombre);
  res.json({ ok: true, SectorID: r.lastID });
});

// Stock list
app.get('/api/stock', async (req, res) => {
  const sql = `SELECT st.StockID, p.Codigo, p.ProductoDescripcion, p.TipoUnidad, d.Nombre as Deposito, se.Nombre as Sector, st.Unidad, st.Pack, st.Pallets
    FROM stock st
    LEFT JOIN productos p ON p.ProductoID = st.ProductoID
    LEFT JOIN depositos d ON d.DepositoID = st.DepositoID
    LEFT JOIN sectores se ON se.SectorID = st.SectorID`;
  const rows = await db.all(sql);
  res.json(rows);
});

// Crear o actualizar stock (upsert)
app.post('/api/stock', async (req, res) => {
  try {
    const { ProductoID, DepositoID, SectorID } = req.body;
    // Aceptar dos formas de entrada:
    // 1) { Unidad, Pack, Pallets } (comportamiento legacy)
    // 2) { Cantidad, Medida } donde Medida es 'unidad'|'pack'|'pallet' -> normalizamos a unidades base
    let unidad = 0;
    let pack = 0;
    let pallets = 0;

    // Priorizar formato nuevo si viene Cantidad + Medida
    if (req.body.Cantidad !== undefined && req.body.Medida) {
      const cantidad = parseFloat(req.body.Cantidad || 0) || 0;
      const medida = String(req.body.Medida || '').toLowerCase();

      // Obtener equivalencias del producto (definir por producto, default 1)
      const prod = await db.get('SELECT UnitsPerPack, PacksPerPallet FROM productos WHERE ProductoID = ?', ProductoID);
      const unitsPerPack = prod ? (Number(prod.UnitsPerPack) || 1) : 1;
      const packsPerPallet = prod ? (Number(prod.PacksPerPallet) || 1) : 1;

      if (medida === 'unidad' || medida === 'u') {
        unidad = cantidad;
      } else if (medida === 'pack') {
        unidad = cantidad * unitsPerPack;
        pack = 0;
      } else if (medida === 'pallet' || medida === 'pallets') {
        unidad = cantidad * packsPerPallet * unitsPerPack;
        pallets = 0;
      } else {
        return res.status(400).json({ ok: false, error: 'Medida desconocida. Use unidad|pack|pallet' });
      }
    } else {
      unidad = parseFloat(req.body.Unidad || 0) || 0;
      pack = parseInt(req.body.Pack || 0) || 0;
      pallets = parseFloat(req.body.Pallets || 0) || 0;
    }

    // Verificar existencia de fila de stock
    const existing = await db.get('SELECT * FROM stock WHERE ProductoID = ? AND DepositoID = ? AND SectorID = ?', ProductoID, DepositoID, SectorID);

    // Si existe, validar que la operación no deje valores negativos
    if (existing) {
      const newUnidad = (parseFloat(existing.Unidad) || 0) + unidad;
      const newPack = (parseInt(existing.Pack) || 0) + pack;
      const newPallets = (parseFloat(existing.Pallets) || 0) + pallets;
      if (newUnidad < 0 || newPack < 0 || newPallets < 0) {
        return res.status(400).json({ ok: false, error: 'Operación produciría stock negativo', disponible: { Unidad: existing.Unidad, Pack: existing.Pack, Pallets: existing.Pallets }, delta: { Unidad: unidad, Pack: pack, Pallets: pallets } });
      }
      await db.run('UPDATE stock SET Unidad = Unidad + ?, Pack = Pack + ?, Pallets = Pallets + ? WHERE StockID = ?', unidad, pack, pallets, existing.StockID);
      return res.json({ ok: true, StockID: existing.StockID });
    }

    // Si no existe y la operación intenta insertar cantidades negativas, rechazar
    if (unidad < 0 || pack < 0 || pallets < 0) {
      return res.status(400).json({ ok: false, error: 'No se puede insertar stock con cantidades negativas' });
    }

    const result = await db.run('INSERT INTO stock (ProductoID, DepositoID, SectorID, Unidad, Pack, Pallets) VALUES (?, ?, ?, ?, ?, ?)', ProductoID, DepositoID, SectorID, unidad, pack, pallets);
    res.json({ ok: true, StockID: result.lastID });
  } catch (err) {
    console.error('Error POST /api/stock', err.message || err);
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Endpoint rápido para crear stock por query (útil para UI/testing)
app.get('/api/stock/seed', async (req, res) => {
  try {
    const ProductoID = parseInt(req.query.producto);
    const DepositoID = parseInt(req.query.deposito) || null;
    const SectorID = parseInt(req.query.sector) || null;
    const Unidad = parseFloat(req.query.unidad || 0) || 0;

    if (!ProductoID) return res.status(400).json({ ok: false, error: 'producto query required' });

    // Si no se pasó depósito/sector, usar primero disponible
    let dep = DepositoID;
    let sec = SectorID;
    if (!dep) {
      const d = await db.get('SELECT DepositoID FROM depositos LIMIT 1');
      dep = d ? d.DepositoID : null;
    }
    if (!sec) {
      const s = await db.get('SELECT SectorID FROM sectores LIMIT 1');
      sec = s ? s.SectorID : null;
    }
    if (!dep || !sec) return res.status(400).json({ ok: false, error: 'No depositos/sectores disponibles' });

    const existing = await db.get('SELECT StockID FROM stock WHERE ProductoID = ? AND DepositoID = ? AND SectorID = ?', ProductoID, dep, sec);
    if (existing) {
      await db.run('UPDATE stock SET Unidad = Unidad + ? WHERE StockID = ?', Unidad, existing.StockID);
      return res.json({ ok: true, StockID: existing.StockID });
    }
    const r = await db.run('INSERT INTO stock (ProductoID, DepositoID, SectorID, Unidad, Pack, Pallets) VALUES (?, ?, ?, ?, ?, ?)', ProductoID, dep, sec, Unidad, 0, 0);
    res.json({ ok: true, StockID: r.lastID });
  } catch (err) {
    console.error('Error GET /api/stock/seed', err.message || err);
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Endpoint de seed para inventario: inserta depositos, sectores, productos y stock de ejemplo
app.post('/api/seed-inventario', async (req, res) => {
  const force = req.query.force === 'true';
  try {
    if (force) {
      await db.exec('BEGIN TRANSACTION');
      await db.run('DELETE FROM movimiento_detalle');
      await db.run('DELETE FROM movimientos');
      await db.run('DELETE FROM stock');
      await db.run('DELETE FROM productos');
      await db.run('DELETE FROM depositos');
      await db.run('DELETE FROM sectores');
      await db.exec('COMMIT');
    }

    // Insertar depositos y sectores si no existen
    const depCount = await db.get('SELECT COUNT(*) as c FROM depositos');
    if (depCount.c === 0) {
      await db.run("INSERT INTO depositos (Nombre) VALUES ('Deposito Central')");
      await db.run("INSERT INTO depositos (Nombre) VALUES ('Deposito Secundario')");
    }
    const secCount = await db.get('SELECT COUNT(*) as c FROM sectores');
    if (secCount.c === 0) {
      await db.run("INSERT INTO sectores (Nombre) VALUES ('Sector A')");
      await db.run("INSERT INTO sectores (Nombre) VALUES ('Sector B')");
    }

    // Insertar productos de ejemplo
    const prodCount = await db.get('SELECT COUNT(*) as c FROM productos');
    if (prodCount.c === 0) {
      const sample = [
        { Codigo: 'P001', ProductoDescripcion: 'Producto 1', TipoUnidad: 'Unidad', Unidad: 'U', Pack: 6, Pallets: 0 },
        { Codigo: 'P002', ProductoDescripcion: 'Producto 2', TipoUnidad: 'Kg', Unidad: 'Kg', Pack: 1, Pallets: 0 },
        { Codigo: 'P003', ProductoDescripcion: 'Producto 3', TipoUnidad: 'Unidad', Unidad: 'U', Pack: 12, Pallets: 0 }
      ];
      const stmt = await db.prepare('INSERT INTO productos (Codigo, ProductoDescripcion, TipoUnidad, Unidad, Pack, Pallets, UnitsPerPack, PacksPerPallet) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      try {
        for (const p of sample) await stmt.run(p.Codigo, p.ProductoDescripcion, p.TipoUnidad, p.Unidad, p.Pack, p.Pallets, p.UnitsPerPack || 1, p.PacksPerPallet || 1);
      } finally { await stmt.finalize(); }
    }

    // Insertar stock ejemplo si no existe
    const stockCount = await db.get('SELECT COUNT(*) as c FROM stock');
    if (stockCount.c === 0) {
      const productos = await db.all('SELECT ProductoID FROM productos');
      const depositos = await db.all('SELECT DepositoID FROM depositos');
      const sectores = await db.all('SELECT SectorID FROM sectores');
      if (productos.length && depositos.length && sectores.length) {
        const stmt = await db.prepare('INSERT INTO stock (ProductoID, DepositoID, SectorID, Unidad, Pack, Pallets) VALUES (?, ?, ?, ?, ?, ?)');
        try {
          for (let i = 0; i < productos.length; i++) {
            const pid = productos[i].ProductoID;
            const dep = depositos[i % depositos.length].DepositoID;
            const sec = sectores[i % sectores.length].SectorID;
            await stmt.run(pid, dep, sec, 100, 10, 0);
          }
        } finally { await stmt.finalize(); }
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error seed-inventario:', err.message || err);
    try { await db.exec('ROLLBACK'); } catch(e){}
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Crear movimiento (remito o transferencia)
app.post('/api/movimientos', async (req, res) => {
  const { Tipo, Fecha, RemitoNumero, OrigenDepositoID, OrigenSectorID, DestinoDepositoID, DestinoSectorID, Observaciones, detalles } = req.body;
  // Transacción para asegurar consistencia de stock
  try {
    await db.exec('BEGIN TRANSACTION');

    const result = await db.run(`INSERT INTO movimientos (Tipo, Fecha, RemitoNumero, OrigenDepositoID, OrigenSectorID, DestinoDepositoID, DestinoSectorID, Observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, Tipo, Fecha, RemitoNumero, OrigenDepositoID, OrigenSectorID, DestinoDepositoID, DestinoSectorID, Observaciones);
    const movimientoId = result.lastID;

    if (Array.isArray(detalles)) {
      const stmt = await db.prepare('INSERT INTO movimiento_detalle (MovimientoID, ProductoID, Unidad, Pack, Pallets) VALUES (?, ?, ?, ?, ?)');
      try {
        for (const d of detalles) {
          const unidad = parseFloat(d.Unidad || 0) || 0;
          const pack = parseInt(d.Pack || 0) || 0;
          const pallets = parseFloat(d.Pallets || 0) || 0;

          // Si hay origen, validar existencia y cantidad suficiente
          if (OrigenDepositoID) {
            const origenRow = await db.get('SELECT * FROM stock WHERE ProductoID = ? AND DepositoID = ? AND SectorID = ?', d.ProductoID, OrigenDepositoID, OrigenSectorID);
            const origenUnidad = origenRow ? (parseFloat(origenRow.Unidad) || 0) : 0;
            const origenPack = origenRow ? (parseInt(origenRow.Pack) || 0) : 0;
            const origenPallets = origenRow ? (parseFloat(origenRow.Pallets) || 0) : 0;

            if (origenUnidad < unidad || origenPack < pack || origenPallets < pallets) {
              // cantidad insuficiente -> rollback y responder error
              await db.exec('ROLLBACK');
              return res.status(400).json({ ok: false, error: 'Stock insuficiente en origen', detalle: { ProductoID: d.ProductoID, solicitado: { Unidad: unidad, Pack: pack, Pallets: pallets }, disponible: { Unidad: origenUnidad, Pack: origenPack, Pallets: origenPallets } } });
            }
          }

          // Insertar detalle
          await stmt.run(movimientoId, d.ProductoID, unidad, pack, pallets);

          // Actualizar stock origen
          if (OrigenDepositoID) {
            await db.run(`UPDATE stock SET Unidad = Unidad - ?, Pack = Pack - ?, Pallets = Pallets - ? WHERE ProductoID = ? AND DepositoID = ? AND SectorID = ?`, unidad, pack, pallets, d.ProductoID, OrigenDepositoID, OrigenSectorID);
          }

          // Actualizar stock destino (sumar o insertar)
          if (DestinoDepositoID) {
            const existing = await db.get('SELECT StockID FROM stock WHERE ProductoID = ? AND DepositoID = ? AND SectorID = ?', d.ProductoID, DestinoDepositoID, DestinoSectorID);
            if (existing) {
              await db.run(`UPDATE stock SET Unidad = Unidad + ?, Pack = Pack + ?, Pallets = Pallets + ? WHERE StockID = ?`, unidad, pack, pallets, existing.StockID);
            } else {
              await db.run('INSERT INTO stock (ProductoID, DepositoID, SectorID, Unidad, Pack, Pallets) VALUES (?, ?, ?, ?, ?, ?)', d.ProductoID, DestinoDepositoID, DestinoSectorID, unidad, pack, pallets);
            }
          }
        }
      } finally {
        await stmt.finalize();
      }
    }

    await db.exec('COMMIT');
    res.json({ ok: true, MovimientoID: movimientoId });
  } catch (err) {
    try { await db.exec('ROLLBACK'); } catch (e) { /* ignore */ }
    console.error('Error al procesar movimiento:', err.message || err);
    res.status(500).json({ ok: false, error: 'Error interno al procesar movimiento', detail: err.message || err });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor API escuchando en puerto ${PORT}`);
});
