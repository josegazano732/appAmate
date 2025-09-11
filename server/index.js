// ...existing code...

// ...existing code...
import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import cors from 'cors';
import os from 'os';
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

  // helper para verificar existencia de columna en una tabla
  async function columnExists(table, column) {
    try {
      const cols = await db.all(`PRAGMA table_info(${table})`);
      return (cols || []).some(c => c.name && c.name.toLowerCase() === String(column).toLowerCase());
    } catch (e) { return false; }
  }

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
  Medida TEXT,
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

  // Nuevo: tabla de variantes de producto (producto maestro + variantes)
  await db.exec(`CREATE TABLE IF NOT EXISTS producto_variantes (
    VarianteID INTEGER PRIMARY KEY AUTOINCREMENT,
    ProductoID INTEGER,
    Codigo TEXT,
    Medida TEXT,
    UnitsPerPack INTEGER DEFAULT 1,
    PacksPerPallet INTEGER DEFAULT 1,
    DefaultFlag INTEGER DEFAULT 0,
    FOREIGN KEY (ProductoID) REFERENCES productos(ProductoID)
  );`);
  // Índice único por Codigo para identificar variantes por barcode
  try { await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_variante_codigo ON producto_variantes(Codigo);'); } catch(e) { }

  // Migrar datos existentes de productos a variantes si no existen variantes
  try {
    const countVar = await db.get('SELECT COUNT(*) as c FROM producto_variantes');
    if (countVar.c === 0) {
      const prods = await db.all('SELECT * FROM productos');
      const insertStmt = await db.prepare('INSERT INTO producto_variantes (ProductoID, Codigo, Medida, UnitsPerPack, PacksPerPallet, DefaultFlag) VALUES (?, ?, ?, ?, ?, ?)');
      try {
        for (const p of prods) {
          const medida = p.DefaultMeasure || 'unidad';
          const units = (p.UnitsPerPack !== undefined && p.UnitsPerPack !== null) ? p.UnitsPerPack : 1;
          const packs = (p.PacksPerPallet !== undefined && p.PacksPerPallet !== null) ? p.PacksPerPallet : 1;
          await insertStmt.run(p.ProductoID, p.Codigo, medida, units, packs, 1);
        }
      } finally { await insertStmt.finalize(); }
      console.log('DB migration: migradas filas de productos a producto_variantes');
    }
  } catch (err) {
    console.warn('DB migration variantes: error', err.message || err);
  }
  // Sincronizar variantes existentes con la tabla productos: si existe un producto con el mismo Codigo,
  // asegurar que la variante apunte al ProductoID correcto para evitar inconsistencias al agregar disponibilidad
  try {
    const prods = await db.all('SELECT ProductoID, Codigo FROM productos WHERE Codigo IS NOT NULL');
    for (const p of prods) {
      if (!p.Codigo) continue;
      try {
        const res = await db.run('UPDATE producto_variantes SET ProductoID = ? WHERE Codigo = ?', p.ProductoID, p.Codigo);
        if (res && res.changes && res.changes > 0) {
          console.log(`DB sync: actualizadas ${res.changes} variante(s) para Codigo ${p.Codigo} -> ProductoID ${p.ProductoID}`);
        }
      } catch (e) {
        console.warn('DB sync variantes error for codigo', p.Codigo, e.message || e);
      }
    }
  } catch (e) {
    console.warn('DB sync variantes failed', e.message || e);
  }

  await db.exec(`CREATE TABLE IF NOT EXISTS depositos (
    DepositoID INTEGER PRIMARY KEY AUTOINCREMENT,
    Nombre TEXT
  );`);

  await db.exec(`CREATE TABLE IF NOT EXISTS sectores (
    SectorID INTEGER PRIMARY KEY AUTOINCREMENT,
    Nombre TEXT
  );`);
  // Añadir columna DepositoID a sectores si no existe (relacionar sector con deposito)
  try {
    const secCols = await db.all("PRAGMA table_info('sectores')");
    const secExisting = new Set(secCols.map(c => c.name));
    if (!secExisting.has('DepositoID')) {
      try {
        await db.exec("ALTER TABLE sectores ADD COLUMN DepositoID INTEGER;");
        console.log('DB migration: ejecutado -> ALTER TABLE sectores ADD COLUMN DepositoID INTEGER;');
      } catch (err) {
        console.warn('DB migration sectores: no se pudo ejecutar ALTER TABLE DepositoID', err.message || err);
      }
    }
  } catch (err) {
    console.warn('DB migration sectores: error al verificar columnas', err.message || err);
  }

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

  // Asegurar columna NotaPedidoID en movimientos para enlazar remitos creados desde notas
  try {
    const movCols = await db.all("PRAGMA table_info('movimientos')");
    const movExisting = new Set(movCols.map(c => c.name));
    if (!movExisting.has('NotaPedidoID')) {
      try {
        await db.exec("ALTER TABLE movimientos ADD COLUMN NotaPedidoID INTEGER;");
        console.log('DB migration: añadida columna NotaPedidoID a movimientos');
      } catch (err) {
        console.warn('DB migration movimientos: no se pudo añadir NotaPedidoID', err.message || err);
      }
    }
  } catch (err) {
    console.warn('DB migration movimientos: error al verificar columnas', err.message || err);
  }

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

  // Ventas / facturación
  await db.exec(`CREATE TABLE IF NOT EXISTS ventas (
    VentaID INTEGER PRIMARY KEY AUTOINCREMENT,
    ClienteID INTEGER,
    NotaPedidoID INTEGER,
    MovimientoID INTEGER,
    FechaComp TEXT,
    TipoComp TEXT,
    PuntoVenta INTEGER,
    NumeroComp TEXT,
    Descuento REAL DEFAULT 0,
    Subtotal REAL DEFAULT 0,
    SubtotalNeto REAL DEFAULT 0,
    SubtotalNoGravado REAL DEFAULT 0,
    IvaPercent REAL DEFAULT 0,
    TotalIva REAL DEFAULT 0,
    Total REAL DEFAULT 0,
    CreatedAt TEXT,
    FOREIGN KEY (NotaPedidoID) REFERENCES notas_pedido(NotaPedidoID)
  );`);

  await db.exec(`CREATE TABLE IF NOT EXISTS venta_detalle (
    VentaDetalleID INTEGER PRIMARY KEY AUTOINCREMENT,
    VentaID INTEGER,
    ProductoID INTEGER,
    Descripcion TEXT,
    Cantidad REAL,
    PrecioUnitario REAL,
    PrecioNeto REAL,
    NoGravado REAL DEFAULT 0,
    IvaPercent REAL DEFAULT 0,
    IvaAmount REAL DEFAULT 0,
    TotalLinea REAL DEFAULT 0,
    FOREIGN KEY (VentaID) REFERENCES ventas(VentaID)
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

  // Verificar columna Medida en nota_detalle
  try {
    const ndCols = await db.all("PRAGMA table_info('nota_detalle')");
    const ndExisting = new Set(ndCols.map(c => c.name));
    if (!ndExisting.has('Medida')) {
      try {
        await db.exec("ALTER TABLE nota_detalle ADD COLUMN Medida TEXT DEFAULT 'unidad';");
        console.log('DB migration: ejecutado -> ALTER TABLE nota_detalle ADD COLUMN Medida TEXT DEFAULT \'unidad\';');
      } catch (err) {
        console.warn('DB migration nota_detalle: no se pudo ejecutar ALTER TABLE Medida', err.message || err);
      }
    }
  } catch (err) {
    console.warn('DB migration nota_detalle: error al verificar columnas', err.message || err);
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
    await db.run(`INSERT INTO nota_detalle (NotaPedidoID, Codigo, ProductoDescripcion, Familia, Precio, Cantidad, PrecioNeto, Medida) VALUES
      (1,'3333333333333','YM Pallet 10x500 Don Julian TRADICIONAL','YM Elaborada',12056,25,301400,'unidad'),
      (1,'3333333333333','YM Pallet 10x500 Don Julian TRADICIONAL','YM Elaborada',11010.22,1,11010.22,'unidad'),
      (1,'1111111111111','YM 500 Gs Don Julian TRADICIONAL','YM Elaborada',12320,3,36960,'unidad'),
      (1,'4444444444444','YM 500 Grs Caricias de Mate TRADICIONAL','YM Elaborada',9500,2,19000,'unidad'),
      (6,'4444444444444','YM 500 Grs Caricias de Mate TRADICIONAL','YM Elaborada',2000,1,2000,'unidad')
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

  // Seleccionar clientes y traer Provincia/Ciudad del primer registro en datos_clientes si existe
  let sql = `SELECT c.*, (
    SELECT Provincia FROM datos_clientes dc WHERE dc.ClienteID = c.ClienteID LIMIT 1
  ) as Provincia, (
    SELECT Ciudad FROM datos_clientes dc WHERE dc.ClienteID = c.ClienteID LIMIT 1
  ) as Ciudad
  FROM clientes c ${where} ORDER BY c.ClienteID ASC`;
  if (limit) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
  }

  const clientes = await db.all(sql, params);
  // Adjuntar todas las direcciones (datos_clientes) por cliente para permitir mostrar múltiples domicilios
  for (const c of clientes) {
    try {
      const direcciones = await db.all('SELECT DatosID, Direccion, Provincia, Ciudad, CodPostal, NroSucursal, Telefono, Email FROM datos_clientes WHERE ClienteID = ? ORDER BY DatosID ASC', c.ClienteID);
      c.Direcciones = direcciones || [];
    } catch (e) {
      c.Direcciones = [];
    }
  }

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

// Preparar remito: devuelve detalle mapeado (ProductoID/VarianteID y medida sugerida) para mostrar en UI
app.get('/api/notas-pedido/:id/remito', async (req, res) => {
  try {
    const notaId = req.params.id;
  const depositoId = req.query.depositoId ? parseInt(req.query.depositoId) : null;
    const nota = await db.get('SELECT * FROM notas_pedido WHERE NotaPedidoID = ?', notaId);
    if (!nota) return res.status(404).json({ ok: false, error: 'Nota no encontrada' });
    const detalles = await db.all('SELECT * FROM nota_detalle WHERE NotaPedidoID = ?', notaId);
    const mapped = [];
    for (const d of detalles) {
      const codigo = d.Codigo;
      // if detalle stores Medida, prefer it
      const detalleMedida = d.Medida || null;
      // buscar variante por codigo
      const variante = await db.get('SELECT * FROM producto_variantes WHERE Codigo = ?', codigo);
      if (variante) {
        mapped.push({ Codigo: codigo, VarianteID: variante.VarianteID, ProductoID: variante.ProductoID, Cantidad: d.Cantidad || 0, Medida: detalleMedida || variante.Medida || 'unidad' });
        continue;
      }
      // fallback: buscar producto por codigo
      const producto = await db.get('SELECT * FROM productos WHERE Codigo = ?', codigo);
      if (producto) {
        mapped.push({ Codigo: codigo, ProductoID: producto.ProductoID, Cantidad: d.Cantidad || 0, Medida: detalleMedida || producto.DefaultMeasure || 'unidad' });
        continue;
      }
      // sin mapping
      mapped.push({ Codigo: codigo, Cantidad: d.Cantidad || 0, Medida: detalleMedida || 'unidad' });
    }
    // If caller requested availability for a specific deposito, compute available per line
    if (depositoId) {
      const withAvail = [];
      for (const m of mapped) {
        // determine productID and unitsPerPack/packsPerPallet
        let variante = null;
        if (m.VarianteID) variante = await db.get('SELECT * FROM producto_variantes WHERE VarianteID = ?', m.VarianteID);
        const producto = m.ProductoID ? await db.get('SELECT * FROM productos WHERE ProductoID = ?', m.ProductoID) : null;
        const unitsPerPack = variante ? (Number(variante.UnitsPerPack) || 1) : (producto ? (Number(producto.UnitsPerPack) || 1) : 1);
        const packsPerPallet = variante ? (Number(variante.PacksPerPallet) || 1) : (producto ? (Number(producto.PacksPerPallet) || 1) : 1);
        // normalize requested to units
        const med = String(m.Medida || 'unidad').toLowerCase();
        const reqCantidad = Number(m.Cantidad) || 0;
        let reqUnits = 0;
        if (med === 'unidad' || med === 'u') reqUnits = reqCantidad;
        else if (med === 'pack') reqUnits = reqCantidad * unitsPerPack;
        else if (med === 'pallet' || med === 'pallets') reqUnits = reqCantidad * packsPerPallet * unitsPerPack;
        else reqUnits = reqCantidad;
        // sum available units for this product in deposito across sectors
        let availableUnits = 0;
        if (m.ProductoID) {
          const rows = await db.all('SELECT Unidad, Pack, Pallets FROM stock WHERE ProductoID = ? AND DepositoID = ?', m.ProductoID, depositoId);
          for (const r of rows) {
            const u = (Number(r.Unidad) || 0) + (Number(r.Pack) || 0) * unitsPerPack + (Number(r.Pallets) || 0) * unitsPerPack * packsPerPallet;
            availableUnits += u;
          }
        }
        withAvail.push(Object.assign({}, m, { requestedUnits: reqUnits, availableUnits }));
      }
      return res.json({ nota, detalles: withAvail });
    }

    res.json({ nota, detalles: mapped });
  } catch (err) {
    console.error('Error GET /api/notas-pedido/:id/remito', err.message || err);
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Devuelve lista de depositos con disponibilidad para los códigos de la nota (agregado por deposito)
app.get('/api/notas-pedido/:id/depositos-disponibles', async (req, res) => {
  try {
    const notaId = req.params.id;
    const nota = await db.get('SELECT * FROM notas_pedido WHERE NotaPedidoID = ?', notaId);
    if (!nota) return res.status(404).json({ ok: false, error: 'Nota no encontrada' });
    const detalles = await db.all('SELECT * FROM nota_detalle WHERE NotaPedidoID = ?', notaId);
    const depositos = await db.all('SELECT * FROM depositos ORDER BY DepositoID ASC');
    const out = [];
    for (const d of depositos) {
      let anyAvailable = false;
      const details = [];
      for (const det of detalles) {
        const codigo = det.Codigo;
        const variante = await db.get('SELECT * FROM producto_variantes WHERE Codigo = ?', codigo);
        const producto = variante ? await db.get('SELECT * FROM productos WHERE ProductoID = ?', variante.ProductoID) : await db.get('SELECT * FROM productos WHERE Codigo = ?', codigo);
        const prodId = variante ? variante.ProductoID : (producto ? producto.ProductoID : null);
        if (!prodId) { details.push({ Codigo: codigo, availableUnits: 0, available: { Unidad: 0, Pack: 0, Pallets: 0 } }); continue; }
        const rows = await db.all('SELECT Unidad, Pack, Pallets FROM stock WHERE ProductoID = ? AND DepositoID = ?', prodId, d.DepositoID);
        let availableUnits = 0;
        let availUnidad = 0, availPack = 0, availPallets = 0;
        for (const r of rows) {
          const u = (Number(r.Unidad) || 0);
          const p = (Number(r.Pack) || 0);
          const pl = (Number(r.Pallets) || 0);
          availUnidad += u;
          availPack += p;
          availPallets += pl;
        }
        // Compute availableUnits using product/variant equivalences to keep backward compatibility
        const unitsPerPack = variante ? (Number(variante.UnitsPerPack) || 1) : (producto ? (Number(producto.UnitsPerPack) || 1) : 1);
        const packsPerPallet = variante ? (Number(variante.PacksPerPallet) || 1) : (producto ? (Number(producto.PacksPerPallet) || 1) : 1);
        availableUnits = availUnidad + availPack * unitsPerPack + availPallets * unitsPerPack * packsPerPallet;
        if (availableUnits > 0 || availUnidad > 0 || availPack > 0 || availPallets > 0) anyAvailable = true;
        details.push({ Codigo: codigo, availableUnits, available: { Unidad: availUnidad, Pack: availPack, Pallets: availPallets } });
      }
      out.push({ DepositoID: d.DepositoID, Nombre: d.Nombre, anyAvailable, details });
    }
    res.json(out);
  } catch (err) {
    console.error('Error GET /api/notas-pedido/:id/depositos-disponibles', err.message || err);
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Crear remito desde una nota de pedido: genera movimiento de salida y marca nota como remitida
app.post('/api/notas-pedido/:id/remito', async (req, res) => {
  const notaId = req.params.id;
  const { RemitoNumero, OrigenDepositoID, OrigenSectorID, Observaciones, Forzar } = req.body;
  const forzar = !!Forzar;
  try {
    const nota = await db.get('SELECT * FROM notas_pedido WHERE NotaPedidoID = ?', notaId);
    if (!nota) return res.status(404).json({ ok: false, error: 'Nota no encontrada' });
    // No permitir generar remito si la nota ya fue remitida completamente
    if (String(nota.EstadoRemito || '').toLowerCase() === 'remitido') {
      return res.status(400).json({ ok: false, error: 'La nota ya fue remitida completamente' });
    }

  const detallesNota = await db.all('SELECT * FROM nota_detalle WHERE NotaPedidoID = ?', notaId);

    await db.exec('BEGIN TRANSACTION');

    const result = await db.run(`INSERT INTO movimientos (Tipo, Fecha, RemitoNumero, OrigenDepositoID, OrigenSectorID, DestinoDepositoID, DestinoSectorID, Observaciones, NotaPedidoID)
      VALUES (?, datetime('now'), ?, ?, ?, NULL, NULL, ?, ?)`,
      'Salida', RemitoNumero || null, OrigenDepositoID || null, OrigenSectorID || null, Observaciones || null, notaId);
    const movimientoId = result.lastID;

    const stmt = await db.prepare('INSERT INTO movimiento_detalle (MovimientoID, ProductoID, Unidad, Pack, Pallets) VALUES (?, ?, ?, ?, ?)');
    // Guardaremos cuánto se envió por cada detalle para actualizar la nota_detalle después
    const shippedPerDetalle = [];
    try {
      for (const d of detallesNota) {
        const codigo = d.Codigo;
        const cantidad = parseFloat(d.Cantidad || 0) || 0;

        // mapear a variante o producto
        let variante = await db.get('SELECT * FROM producto_variantes WHERE Codigo = ?', codigo);
        let producto = null;
        // preferir la medida guardada en el detalle si existe
        let medida = (d.Medida || '').toString() || null;
        if (variante) {
          producto = await db.get('SELECT * FROM productos WHERE ProductoID = ?', variante.ProductoID);
          medida = medida || variante.Medida || producto?.DefaultMeasure || 'unidad';
        } else {
          producto = await db.get('SELECT * FROM productos WHERE Codigo = ?', codigo);
          medida = medida || (producto ? (producto.DefaultMeasure || 'unidad') : 'unidad');
        }

        // Interpretar la cantidad según la medida: descontar en la columna correspondiente
        let unidad = 0, pack = 0, pallets = 0;
        const med = String(medida || 'unidad').toLowerCase();
        if (med === 'unidad' || med === 'u') {
          unidad = cantidad;
        } else if (med === 'pack') {
          pack = cantidad;
        } else if (med === 'pallet' || med === 'pallets') {
          pallets = cantidad;
        } else {
          await db.exec('ROLLBACK');
          return res.status(400).json({ ok: false, error: 'Medida desconocida en detalle' });
        }

        // Determinar ProductoID para stock
        const stockProductoId = variante ? variante.ProductoID : (producto ? producto.ProductoID : null);
        if (!stockProductoId) { await db.exec('ROLLBACK'); return res.status(400).json({ ok: false, error: 'Producto/Variante no encontrada para codigo ' + codigo }); }

        // Validar stock en origen por columna (Unidad/Pack/Pallets)
        let shippedUnidad = unidad, shippedPack = pack, shippedPallets = pallets;
        if (OrigenDepositoID) {
          // Si se especificó sector, usamos esa fila; si no, sumamos todas las filas del depósito
          let origenUnidad = 0, origenPack = 0, origenPallets = 0;
          if (OrigenSectorID !== undefined && OrigenSectorID !== null) {
            const origenRow = await db.get('SELECT * FROM stock WHERE ProductoID = ? AND DepositoID = ? AND SectorID = ?', stockProductoId, OrigenDepositoID, OrigenSectorID);
            origenUnidad = origenRow ? (parseFloat(origenRow.Unidad) || 0) : 0;
            origenPack = origenRow ? (parseInt(origenRow.Pack) || 0) : 0;
            origenPallets = origenRow ? (parseFloat(origenRow.Pallets) || 0) : 0;
          } else {
            const sumRow = await db.get('SELECT SUM(Unidad) as Unidad, SUM(Pack) as Pack, SUM(Pallets) as Pallets FROM stock WHERE ProductoID = ? AND DepositoID = ?', stockProductoId, OrigenDepositoID);
            origenUnidad = sumRow ? (parseFloat(sumRow.Unidad) || 0) : 0;
            origenPack = sumRow ? (parseInt(sumRow.Pack) || 0) : 0;
            origenPallets = sumRow ? (parseFloat(sumRow.Pallets) || 0) : 0;
          }

          // Si no hay suficiente en la columna correspondiente
          if (origenUnidad < unidad || origenPack < pack || origenPallets < pallets) {
            if (!forzar) {
              await db.exec('ROLLBACK');
              return res.status(400).json({ ok: false, error: 'Stock insuficiente en origen', detalle: { Codigo: codigo, ProductoID: stockProductoId, solicitado: { Unidad: unidad, Pack: pack, Pallets: pallets }, disponible: { Unidad: origenUnidad, Pack: origenPack, Pallets: origenPallets } } });
            }
            // Forzar: enviar lo que haya disponible por columna
            shippedUnidad = Math.min(origenUnidad, unidad);
            shippedPack = Math.min(origenPack, pack);
            shippedPallets = Math.min(origenPallets, pallets);
          }
        }

        // Insertar detalle del movimiento usando las columnas correspondientes
        await stmt.run(movimientoId, stockProductoId, shippedUnidad, shippedPack, shippedPallets);

        // Descontar stock en origen en las columnas correspondientes
        if (OrigenDepositoID) {
          if (shippedUnidad) await db.run(`UPDATE stock SET Unidad = Unidad - ? WHERE ProductoID = ? AND DepositoID = ? AND SectorID = ?`, shippedUnidad, stockProductoId, OrigenDepositoID, OrigenSectorID);
          if (shippedPack) await db.run(`UPDATE stock SET Pack = Pack - ? WHERE ProductoID = ? AND DepositoID = ? AND SectorID = ?`, shippedPack, stockProductoId, OrigenDepositoID, OrigenSectorID);
          if (shippedPallets) await db.run(`UPDATE stock SET Pallets = Pallets - ? WHERE ProductoID = ? AND DepositoID = ? AND SectorID = ?`, shippedPallets, stockProductoId, OrigenDepositoID, OrigenSectorID);
        }

        // Registrar lo enviado para ajustar la nota_detalle en la misma medida
        let shippedInMedida = 0;
        if (med === 'unidad' || med === 'u') shippedInMedida = shippedUnidad;
        else if (med === 'pack') shippedInMedida = shippedPack;
        else if (med === 'pallet' || med === 'pallets') shippedInMedida = shippedPallets;
        shippedPerDetalle.push({ NotaDetalleID: d.NotaDetalleID, Codigo: codigo, Medida: med, Requested: cantidad, ShippedInMedida: shippedInMedida });
      }
    } finally {
      await stmt.finalize();
    }

    // Actualizar las cantidades pendientes en nota_detalle restando lo remitido (en la misma medida)
    for (const s of shippedPerDetalle) {
      if (!s.NotaDetalleID) continue;
      // Obtener cantidad actual (por si cambió)
      const current = await db.get('SELECT Cantidad FROM nota_detalle WHERE NotaDetalleID = ?', s.NotaDetalleID);
      if (!current) continue;
      const curCant = parseFloat(current.Cantidad || 0) || 0;
      const newCant = Math.max(0, curCant - (Number(s.ShippedInMedida) || 0));
      await db.run('UPDATE nota_detalle SET Cantidad = ? WHERE NotaDetalleID = ?', newCant, s.NotaDetalleID);
    }

    // Verificar si quedan cantidades pendientes en la nota
    const remainingRow = await db.get('SELECT SUM(Cantidad) as totalPending FROM nota_detalle WHERE NotaPedidoID = ?', notaId);
    const totalPending = remainingRow ? (parseFloat(remainingRow.totalPending) || 0) : 0;

    if (totalPending <= 0) {
      // Marcamos como remitido completo y no se podrá volver a generar remito
      await db.run("UPDATE notas_pedido SET EstadoRemito = ?, Estado = ? WHERE NotaPedidoID = ?", 'Remitido', 'Remitido', notaId);
    } else {
      // Parcial
      await db.run("UPDATE notas_pedido SET EstadoRemito = ?, Estado = ? WHERE NotaPedidoID = ?", 'Remitido Parcial', 'Remitido Parcial', notaId);
    }

    await db.exec('COMMIT');
    res.json({ ok: true, MovimientoID: movimientoId });
  } catch (err) {
    try { await db.exec('ROLLBACK'); } catch (e) { /* ignore */ }
    console.error('Error POST /api/notas-pedido/:id/remito', err.message || err);
    res.status(500).json({ ok: false, error: err.message || err });
  }
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
  const insertStmt = await db.prepare(`INSERT INTO nota_detalle (NotaPedidoID, Codigo, ProductoDescripcion, Familia, Precio, Cantidad, PrecioNeto, Medida) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    try {
      for (const d of detalles) {
    await insertStmt.run(notaId, d.Codigo, d.ProductoDescripcion, d.Familia, d.Precio, d.Cantidad, d.PrecioNeto, d.Medida || 'unidad');
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

// Listar movimientos relacionados con una nota: por RemitoNumero en movimientos o por coincidencia de productos en movimiento_detalle
app.get('/api/notas-pedido/:id/movimientos', async (req, res) => {
  try {
    const notaId = req.params.id;
    const nota = await db.get('SELECT * FROM notas_pedido WHERE NotaPedidoID = ?', notaId);
    if (!nota) return res.status(404).json({ ok: false, error: 'Nota no encontrada' });
    // Buscar movimientos por RemitoNumero igual a OrdenCompra o que contengan productos de la nota
    const detalles = await db.all('SELECT Codigo FROM nota_detalle WHERE NotaPedidoID = ?', notaId);
    const codigos = detalles.map(d => d.Codigo).filter(Boolean);

    // Movimientos con RemitoNumero igual a OrdenCompra o que contengan productos de la nota
    const movimientosByRemito = await db.all('SELECT * FROM movimientos WHERE RemitoNumero = ? ORDER BY MovimientoID DESC', nota.OrdenCompra || '');
    // Buscar movimientos que tengan alguno de los productos de la nota
    let movimientosByDetalle = [];
    if (codigos.length) {
      // map codigos -> producto ids
      const prodIds = [];
      for (const c of codigos) {
        const v = await db.get('SELECT ProductoID FROM producto_variantes WHERE Codigo = ?', c);
        if (v && v.ProductoID) prodIds.push(v.ProductoID);
        else {
          const p = await db.get('SELECT ProductoID FROM productos WHERE Codigo = ?', c);
          if (p && p.ProductoID) prodIds.push(p.ProductoID);
        }
      }
      if (prodIds.length) {
        const placeholders = prodIds.map(()=>'?').join(',');
        movimientosByDetalle = await db.all(`SELECT m.* FROM movimientos m JOIN movimiento_detalle md ON md.MovimientoID = m.MovimientoID WHERE md.ProductoID IN (${placeholders}) ORDER BY m.MovimientoID DESC`, ...prodIds);
      }
    }

    // Unir y deduplicar movimientos
    const all = [...movimientosByRemito, ...movimientosByDetalle];
    const seen = new Set();
    const out = [];
    for (const m of all) {
      if (seen.has(m.MovimientoID)) continue; seen.add(m.MovimientoID); out.push(m);
    }
    res.json(out);
  } catch (err) {
    console.error('Error GET /api/notas-pedido/:id/movimientos', err.message || err);
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Revertir un movimiento: crea un movimiento de tipo 'Entrada' con los mismos productos/columnas para devolver stock
app.post('/api/movimientos/:id/revert', async (req, res) => {
  const movimientoId = req.params.id;
  try {
    const mov = await db.get('SELECT * FROM movimientos WHERE MovimientoID = ?', movimientoId);
    if (!mov) return res.status(404).json({ ok: false, error: 'Movimiento no encontrado' });
    const detalles = await db.all('SELECT * FROM movimiento_detalle WHERE MovimientoID = ?', movimientoId);

    await db.exec('BEGIN TRANSACTION');
    const motivo = (req.body && req.body.motivo) ? String(req.body.motivo).slice(0,1000) : 'Reversión automática';
    const result = await db.run(`INSERT INTO movimientos (Tipo, Fecha, RemitoNumero, OrigenDepositoID, OrigenSectorID, DestinoDepositoID, DestinoSectorID, Observaciones, NotaPedidoID)
      VALUES (?, datetime('now'), ?, NULL, NULL, ?, ?, ?, ?)
    `, 'Entrada Reversion', mov.RemitoNumero || null, mov.OrigenDepositoID || null, mov.OrigenSectorID || null, motivo, mov.NotaPedidoID || null);
    const newMovId = result.lastID;

    const stmt = await db.prepare('INSERT INTO movimiento_detalle (MovimientoID, ProductoID, Unidad, Pack, Pallets) VALUES (?, ?, ?, ?, ?)');
    try {
      for (const d of detalles) {
        await stmt.run(newMovId, d.ProductoID, d.Unidad || 0, d.Pack || 0, d.Pallets || 0);
        // Sumar stock en la(s) ubicación(es) originales: si movimiento original tenía OrigenSectorID, sumar en esa fila; si no, sumar al primer sector del depósito
        const destinoDeposito = mov.OrigenDepositoID;
        const destinoSector = mov.OrigenSectorID;
        if (destinoDeposito) {
          if (destinoSector) {
            // intentar actualizar fila existente
            const row = await db.get('SELECT * FROM stock WHERE ProductoID = ? AND DepositoID = ? AND SectorID = ?', d.ProductoID, destinoDeposito, destinoSector);
            if (row) {
              await db.run('UPDATE stock SET Unidad = Unidad + ?, Pack = Pack + ?, Pallets = Pallets + ? WHERE StockID = ?', d.Unidad || 0, d.Pack || 0, d.Pallets || 0, row.StockID);
            } else {
              await db.run('INSERT INTO stock (ProductoID, DepositoID, SectorID, Unidad, Pack, Pallets) VALUES (?, ?, ?, ?, ?, ?)', d.ProductoID, destinoDeposito, destinoSector || null, d.Unidad || 0, d.Pack || 0, d.Pallets || 0);
            }
          } else {
            // no hay sector: buscar una fila existente para el deposito y sumar ahí, o crear una nueva con SectorID NULL
            const row = await db.get('SELECT * FROM stock WHERE ProductoID = ? AND DepositoID = ? LIMIT 1', d.ProductoID, destinoDeposito);
            if (row) {
              await db.run('UPDATE stock SET Unidad = Unidad + ?, Pack = Pack + ?, Pallets = Pallets + ? WHERE StockID = ?', d.Unidad || 0, d.Pack || 0, d.Pallets || 0, row.StockID);
            } else {
              await db.run('INSERT INTO stock (ProductoID, DepositoID, SectorID, Unidad, Pack, Pallets) VALUES (?, ?, NULL, ?, ?, ?)', d.ProductoID, destinoDeposito, d.Unidad || 0, d.Pack || 0, d.Pallets || 0);
            }
          }
        }
      }
    } finally { await stmt.finalize(); }

    await db.exec('COMMIT');
    res.json({ ok: true, MovimientoID: newMovId });
  } catch (err) {
    try { await db.exec('ROLLBACK'); } catch (e){}
    console.error('Error POST /api/movimientos/:id/revert', err.message || err);
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Inventario endpoints
// Productos
app.get('/api/productos', async (req, res) => {
  try {
    const q = req.query.q ? `%${req.query.q}%` : null;
    let sql = 'SELECT * FROM productos';
    const params = [];
    if (q) {
      sql += ' WHERE Codigo LIKE ? OR ProductoDescripcion LIKE ?';
      params.push(q, q);
    }
    sql += ' ORDER BY ProductoID ASC';
    const prods = await db.all(sql, params);
    res.json(prods);
  } catch (err) {
    console.error('Error GET /api/productos', err.message || err);
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Verificar existencia de producto por Codigo
app.get('/api/productos/exists', async (req, res) => {
  const codigo = req.query.codigo;
  const medida = req.query.medida || null;
  if (!codigo) return res.json({ exists: false });
  // Buscar en variantes (barcode) si existe una variante con ese codigo
  const v = await db.get('SELECT VarianteID FROM producto_variantes WHERE Codigo = ?', codigo);
  if (v) return res.json({ exists: true });
  // Fallback: buscar en productos (legacy)
  const p = await db.get('SELECT ProductoID FROM productos WHERE Codigo = ?', codigo);
  res.json({ exists: !!p });
});

// Variantes endpoints
app.get('/api/productos/:id/variantes', async (req, res) => {
  const pid = req.params.id;
  const rows = await db.all('SELECT * FROM producto_variantes WHERE ProductoID = ? ORDER BY VarianteID ASC', pid);
  res.json(rows);
});

app.post('/api/productos/:id/variantes', async (req, res) => {
  try {
    const pid = req.params.id;
    const { Codigo, Medida, UnitsPerPack, PacksPerPallet, DefaultFlag } = req.body;
    // Validaciones: Codigo no debe existir asignado a otro ProductoID
    if (Codigo) {
      const existing = await db.get('SELECT ProductoID, VarianteID FROM producto_variantes WHERE Codigo = ?', Codigo);
      if (existing && existing.ProductoID && Number(existing.ProductoID) !== Number(pid)) {
        return res.status(409).json({ ok: false, error: 'Codigo already exists for another product', ProductoID: existing.ProductoID, VarianteID: existing.VarianteID });
      }
    }
    // Asegurar que el ProductoID existe
    const prod = await db.get('SELECT ProductoID FROM productos WHERE ProductoID = ?', pid);
    if (!prod) return res.status(400).json({ ok: false, error: 'Producto not found' });

    const r = await db.run('INSERT INTO producto_variantes (ProductoID, Codigo, Medida, UnitsPerPack, PacksPerPallet, DefaultFlag) VALUES (?, ?, ?, ?, ?, ?)', pid, Codigo, Medida || 'unidad', UnitsPerPack || 1, PacksPerPallet || 1, DefaultFlag ? 1 : 0);
    res.json({ ok: true, VarianteID: r.lastID });
  } catch (err) {
    console.error('Error POST /api/productos/:id/variantes', err.message || err);
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Actualizar variante
app.put('/api/productos/:id/variantes/:varId', async (req, res) => {
  try {
    const pid = req.params.id;
    const varId = req.params.varId;
    const { Codigo, Medida, UnitsPerPack, PacksPerPallet, DefaultFlag } = req.body;
    // Validaciones: Codigo no debe existir asignado a otro ProductoID
    if (Codigo) {
      const existing = await db.get('SELECT ProductoID, VarianteID FROM producto_variantes WHERE Codigo = ?', Codigo);
      if (existing && existing.VarianteID && Number(existing.VarianteID) !== Number(varId) && Number(existing.ProductoID) !== Number(pid)) {
        return res.status(409).json({ ok: false, error: 'Codigo already exists for another product', ProductoID: existing.ProductoID, VarianteID: existing.VarianteID });
      }
    }
    // Asegurar que el ProductoID existe
    const prod = await db.get('SELECT ProductoID FROM productos WHERE ProductoID = ?', pid);
    if (!prod) return res.status(400).json({ ok: false, error: 'Producto not found' });

    try {
      await db.run('UPDATE producto_variantes SET Codigo = ?, Medida = ?, UnitsPerPack = ?, PacksPerPallet = ?, DefaultFlag = ? WHERE VarianteID = ? AND ProductoID = ?', Codigo, Medida || 'unidad', UnitsPerPack || 1, PacksPerPallet || 1, DefaultFlag ? 1 : 0, varId, pid);
      res.json({ ok: true });
    } catch (e) {
      if ((e.message || '').toLowerCase().includes('unique')) return res.status(409).json({ ok: false, error: 'Codigo already exists' });
      throw e;
    }
  } catch (err) {
    console.error('Error PUT /api/productos/:id/variantes/:varId', err.message || err);
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Borrar variante
app.delete('/api/productos/:id/variantes/:varId', async (req, res) => {
  try {
    const pid = req.params.id;
    const varId = req.params.varId;
    await db.run('DELETE FROM producto_variantes WHERE VarianteID = ? AND ProductoID = ?', varId, pid);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error DELETE /api/productos/:id/variantes/:varId', err.message || err);
    res.status(500).json({ ok: false, error: err.message || err });
  }
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
  try {
    const depositoId = req.query.depositoId ? parseInt(req.query.depositoId) : null;
    let rows;
    if (depositoId) rows = await db.all('SELECT * FROM sectores WHERE DepositoID = ? ORDER BY SectorID ASC', depositoId);
    else rows = await db.all('SELECT * FROM sectores ORDER BY SectorID ASC');
    res.json(rows);
  } catch (err) {
    console.error('Error GET /api/sectores', err.message || err);
    res.status(500).json({ ok: false, error: err.message || err });
  }
});
app.post('/api/sectores', async (req, res) => {
  try {
    const { Nombre, DepositoID } = req.body;
    const r = await db.run('INSERT INTO sectores (Nombre, DepositoID) VALUES (?, ?)', Nombre, DepositoID || null);
    res.json({ ok: true, SectorID: r.lastID });
  } catch (err) {
    console.error('Error POST /api/sectores', err.message || err);
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Stock list
app.get('/api/stock', async (req, res) => {
  try {
    const { Codigo, ProductoDescripcion, TipoUnidad, Deposito, Sector } = req.query;
    const whereParts = [];
    const params = [];
    if (Codigo) { whereParts.push('p.Codigo LIKE ?'); params.push(`%${Codigo}%`); }
    if (ProductoDescripcion) { whereParts.push('p.ProductoDescripcion LIKE ?'); params.push(`%${ProductoDescripcion}%`); }
    if (TipoUnidad) { whereParts.push('p.TipoUnidad LIKE ?'); params.push(`%${TipoUnidad}%`); }
    if (Deposito) { whereParts.push('d.Nombre LIKE ?'); params.push(`%${Deposito}%`); }
    if (Sector) { whereParts.push('se.Nombre LIKE ?'); params.push(`%${Sector}%`); }

    let sql = `SELECT st.StockID, p.Codigo, p.ProductoDescripcion, p.TipoUnidad, d.Nombre as Deposito, se.Nombre as Sector, st.Unidad, st.Pack, st.Pallets
      FROM stock st
      LEFT JOIN productos p ON p.ProductoID = st.ProductoID
      LEFT JOIN depositos d ON d.DepositoID = st.DepositoID
      LEFT JOIN sectores se ON se.SectorID = st.SectorID`;

    if (whereParts.length) sql += ' WHERE ' + whereParts.join(' AND ');

    sql += ' ORDER BY p.Codigo ASC';

    const rows = await db.all(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error GET /api/stock', err.message || err);
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Crear o actualizar stock (upsert)
app.post('/api/stock', async (req, res) => {
  try {
    const { ProductoID, VarianteID, DepositoID, SectorID } = req.body;
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

      // Obtener equivalencias desde la variante (si se pasa VarianteID) o default variant para el ProductoID
      let variant = null;
      if (VarianteID) variant = await db.get('SELECT * FROM producto_variantes WHERE VarianteID = ?', VarianteID);
      else if (ProductoID) variant = await db.get('SELECT * FROM producto_variantes WHERE ProductoID = ? AND DefaultFlag = 1 LIMIT 1', ProductoID);
      // fallback: buscar en productos
      if (!variant && ProductoID) {
        const prod = await db.get('SELECT UnitsPerPack, PacksPerPallet FROM productos WHERE ProductoID = ?', ProductoID);
        variant = { UnitsPerPack: prod ? (Number(prod.UnitsPerPack) || 1) : 1, PacksPerPallet: prod ? (Number(prod.PacksPerPallet) || 1) : 1 };
      }
      const unitsPerPack = variant ? (Number(variant.UnitsPerPack) || 1) : 1;
      const packsPerPallet = variant ? (Number(variant.PacksPerPallet) || 1) : 1;

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
    // Identificar fila de stock por VarianteID (si se usa) o ProductoID
    let existing = null;
    if (VarianteID) {
      // buscar stock por ProductoID de la variante
      const v = await db.get('SELECT ProductoID FROM producto_variantes WHERE VarianteID = ?', VarianteID);
      existing = await db.get('SELECT * FROM stock WHERE ProductoID = ? AND DepositoID = ? AND SectorID = ?', v ? v.ProductoID : null, DepositoID, SectorID);
    } else {
      existing = await db.get('SELECT * FROM stock WHERE ProductoID = ? AND DepositoID = ? AND SectorID = ?', ProductoID, DepositoID, SectorID);
    }

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

    const NotaPedidoID = req.body.NotaPedidoID || null;
    const result = await db.run(`INSERT INTO movimientos (Tipo, Fecha, RemitoNumero, OrigenDepositoID, OrigenSectorID, DestinoDepositoID, DestinoSectorID, Observaciones, NotaPedidoID)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, Tipo, Fecha, RemitoNumero, OrigenDepositoID, OrigenSectorID, DestinoDepositoID, DestinoSectorID, Observaciones, NotaPedidoID);
    const movimientoId = result.lastID;

    if (Array.isArray(detalles)) {
      const stmt = await db.prepare('INSERT INTO movimiento_detalle (MovimientoID, ProductoID, Unidad, Pack, Pallets) VALUES (?, ?, ?, ?, ?)');
      try {
        for (const d of detalles) {
          // detalle puede venir con VarianteID o ProductoID
          const varianteId = d.VarianteID || null;
          const productoId = d.ProductoID || null;

          // Normalizar cantidades a unidades base usando la variante si está disponible
          let unidad = parseFloat(d.Unidad || 0) || 0;
          let pack = parseInt(d.Pack || 0) || 0;
          let pallets = parseFloat(d.Pallets || 0) || 0;

          // Si el cliente envía Cantidad+Medida, normalizar aquí (mantener compat)
          if (d.Cantidad !== undefined && d.Medida) {
            const cantidad = parseFloat(d.Cantidad || 0) || 0;
            const medida = String(d.Medida || '').toLowerCase();
            let variant = null;
            if (varianteId) variant = await db.get('SELECT * FROM producto_variantes WHERE VarianteID = ?', varianteId);
            else if (productoId) variant = await db.get('SELECT * FROM producto_variantes WHERE ProductoID = ? AND DefaultFlag = 1 LIMIT 1', productoId);
            if (!variant && productoId) {
              const prod = await db.get('SELECT UnitsPerPack, PacksPerPallet FROM productos WHERE ProductoID = ?', productoId);
              variant = { UnitsPerPack: prod ? (Number(prod.UnitsPerPack) || 1) : 1, PacksPerPallet: prod ? (Number(prod.PacksPerPallet) || 1) : 1 };
            }
            const unitsPerPack = variant ? (Number(variant.UnitsPerPack) || 1) : 1;
            const packsPerPallet = variant ? (Number(variant.PacksPerPallet) || 1) : 1;
            if (medida === 'unidad' || medida === 'u') unidad = cantidad;
            else if (medida === 'pack') unidad = cantidad * unitsPerPack;
            else if (medida === 'pallet' || medida === 'pallets') unidad = cantidad * packsPerPallet * unitsPerPack;
            else { await db.exec('ROLLBACK'); return res.status(400).json({ ok: false, error: 'Medida desconocida en detalle' }); }
            pack = 0; pallets = 0;
          }

          // Determinar ProductoID real para la fila de stock (desde variante si se pasó)
          let stockProductoId = productoId;
          if (varianteId && !stockProductoId) {
            const v = await db.get('SELECT ProductoID FROM producto_variantes WHERE VarianteID = ?', varianteId);
            stockProductoId = v ? v.ProductoID : null;
          }

          // Si hay origen, validar existencia y cantidad suficiente
          if (OrigenDepositoID) {
            const origenRow = await db.get('SELECT * FROM stock WHERE ProductoID = ? AND DepositoID = ? AND SectorID = ?', stockProductoId, OrigenDepositoID, OrigenSectorID);
            const origenUnidad = origenRow ? (parseFloat(origenRow.Unidad) || 0) : 0;
            const origenPack = origenRow ? (parseInt(origenRow.Pack) || 0) : 0;
            const origenPallets = origenRow ? (parseFloat(origenRow.Pallets) || 0) : 0;

            if (origenUnidad < unidad || origenPack < pack || origenPallets < pallets) {
              await db.exec('ROLLBACK');
              return res.status(400).json({ ok: false, error: 'Stock insuficiente en origen', detalle: { ProductoID: stockProductoId, solicitado: { Unidad: unidad, Pack: pack, Pallets: pallets }, disponible: { Unidad: origenUnidad, Pack: origenPack, Pallets: origenPallets } } });
            }
          }

          // Insertar detalle (usar ProductoID para compatibilidad)
          await stmt.run(movimientoId, stockProductoId, unidad, pack, pallets);

          // Actualizar stock origen
          if (OrigenDepositoID) {
            await db.run(`UPDATE stock SET Unidad = Unidad - ?, Pack = Pack - ?, Pallets = Pallets - ? WHERE ProductoID = ? AND DepositoID = ? AND SectorID = ?`, unidad, pack, pallets, stockProductoId, OrigenDepositoID, OrigenSectorID);
          }

          // Actualizar stock destino (sumar o insertar)
          if (DestinoDepositoID) {
            const existing = await db.get('SELECT StockID FROM stock WHERE ProductoID = ? AND DepositoID = ? AND SectorID = ?', stockProductoId, DestinoDepositoID, DestinoSectorID);
            if (existing) {
              await db.run(`UPDATE stock SET Unidad = Unidad + ?, Pack = Pack + ?, Pallets = Pallets + ? WHERE StockID = ?`, unidad, pack, pallets, existing.StockID);
            } else {
              await db.run('INSERT INTO stock (ProductoID, DepositoID, SectorID, Unidad, Pack, Pallets) VALUES (?, ?, ?, ?, ?, ?)', stockProductoId, DestinoDepositoID, DestinoSectorID, unidad, pack, pallets);
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

// Listar movimientos
app.get('/api/movimientos', async (req, res) => {
  try {
    // Obtener movimientos
    const items = await db.all('SELECT * FROM movimientos ORDER BY MovimientoID DESC');
    const out = [];
    for (const m of items) {
      // Resolver nombres de depósito/sector
      const origenDeposito = m.OrigenDepositoID ? await db.get('SELECT Nombre FROM depositos WHERE DepositoID = ?', m.OrigenDepositoID) : null;
      const origenSector = m.OrigenSectorID ? await db.get('SELECT Nombre FROM sectores WHERE SectorID = ?', m.OrigenSectorID) : null;
      const destinoDeposito = m.DestinoDepositoID ? await db.get('SELECT Nombre FROM depositos WHERE DepositoID = ?', m.DestinoDepositoID) : null;
      const destinoSector = m.DestinoSectorID ? await db.get('SELECT Nombre FROM sectores WHERE SectorID = ?', m.DestinoSectorID) : null;

      // Preferir NotaPedidoID ya persistida en la fila (si está), sino intentar vincular por RemitoNumero -> OrdenCompra
      let nota = null;
      if (m.NotaPedidoID) {
        nota = { NotaPedidoID: m.NotaPedidoID };
      } else if (m.RemitoNumero) {
        const rem = String(m.RemitoNumero || '').trim();
        // 1) intento por OrdenCompra exacto
        nota = await db.get('SELECT NotaPedidoID FROM notas_pedido WHERE OrdenCompra = ? LIMIT 1', rem);
        // 2) si no, intento extraer dígitos y buscar por ID numérico
        if (!nota) {
          const digits = (rem.match(/\d+/g) || []).join('');
          if (digits) {
            const asId = parseInt(digits, 10);
            if (!isNaN(asId)) {
              nota = await db.get('SELECT NotaPedidoID FROM notas_pedido WHERE NotaPedidoID = ? LIMIT 1', asId);
            }
          }
        }
        // 3) si aún no, intento LIKE sobre OrdenCompra (por si el remito contiene prefijo/sufijo)
        if (!nota) {
          nota = await db.get('SELECT NotaPedidoID FROM notas_pedido WHERE OrdenCompra LIKE ? LIMIT 1', `%${rem}%`);
        }
      }

      out.push({
        ...m,
        OrigenDepositoNombre: origenDeposito ? origenDeposito.Nombre : null,
        OrigenSectorNombre: origenSector ? origenSector.Nombre : null,
        DestinoDepositoNombre: destinoDeposito ? destinoDeposito.Nombre : null,
        DestinoSectorNombre: destinoSector ? destinoSector.Nombre : null,
        NotaPedidoID: nota ? nota.NotaPedidoID : null
      });
    }
    res.json(out);
  } catch (err) {
    console.error('Error GET /api/movimientos', err.message || err);
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Obtener movimiento con detalles
app.get('/api/movimientos/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const movimiento = await db.get('SELECT * FROM movimientos WHERE MovimientoID = ?', id);
    if (!movimiento) return res.status(404).json({ ok: false, error: 'Movimiento no encontrado' });
    const detalles = await db.all('SELECT * FROM movimiento_detalle WHERE MovimientoID = ?', id);

    // Resolver nombres de depósito/sector para la cabecera
    const origenDeposito = movimiento.OrigenDepositoID ? await db.get('SELECT Nombre FROM depositos WHERE DepositoID = ?', movimiento.OrigenDepositoID) : null;
    const origenSector = movimiento.OrigenSectorID ? await db.get('SELECT Nombre FROM sectores WHERE SectorID = ?', movimiento.OrigenSectorID) : null;
    const destinoDeposito = movimiento.DestinoDepositoID ? await db.get('SELECT Nombre FROM depositos WHERE DepositoID = ?', movimiento.DestinoDepositoID) : null;
    const destinoSector = movimiento.DestinoSectorID ? await db.get('SELECT Nombre FROM sectores WHERE SectorID = ?', movimiento.DestinoSectorID) : null;

    // Preferir NotaPedidoID ya persistida en la fila (si existe), sino intentar resolver por RemitoNumero
    let nota = null;
    if (movimiento.NotaPedidoID) {
      nota = { NotaPedidoID: movimiento.NotaPedidoID };
    } else if (movimiento.RemitoNumero) {
      const rem = String(movimiento.RemitoNumero || '').trim();
      nota = await db.get('SELECT NotaPedidoID FROM notas_pedido WHERE OrdenCompra = ? LIMIT 1', rem);
      if (!nota) {
        const digits = (rem.match(/\d+/g) || []).join('');
        if (digits) {
          const asId = parseInt(digits, 10);
          if (!isNaN(asId)) {
            nota = await db.get('SELECT NotaPedidoID FROM notas_pedido WHERE NotaPedidoID = ? LIMIT 1', asId);
          }
        }
      }
      if (!nota) {
        nota = await db.get('SELECT NotaPedidoID FROM notas_pedido WHERE OrdenCompra LIKE ? LIMIT 1', `%${rem}%`);
      }
    }

    // Enriquecer cada detalle con PrecioUnitario calculado usando la nota (si existe) o el producto maestro,
    // y con una cantidad normalizada en unidades (Unidad + Pack*UnitsPerPack + Pallets*PacksPerPallet*UnitsPerPack)
    const enrichedDetalles = [];
    for (const d of detalles) {
      let unitsPerPack = 1, packsPerPallet = 1;
      try {
        const varRow = await db.get('SELECT UnitsPerPack, PacksPerPallet FROM producto_variantes WHERE ProductoID = ? AND DefaultFlag = 1 LIMIT 1', d.ProductoID);
        if (varRow) {
          unitsPerPack = Number(varRow.UnitsPerPack) || unitsPerPack;
          packsPerPallet = Number(varRow.PacksPerPallet) || packsPerPallet;
        } else {
          const prodRow = await db.get('SELECT UnitsPerPack, PacksPerPallet FROM productos WHERE ProductoID = ?', d.ProductoID);
          if (prodRow) {
            unitsPerPack = Number(prodRow.UnitsPerPack) || unitsPerPack;
            packsPerPallet = Number(prodRow.PacksPerPallet) || packsPerPallet;
          }
        }
      } catch (e) { /* ignore and use defaults */ }

      // calcular cantidad normalizada
      const cantidad = (Number(d.Unidad) || 0) + (Number(d.Pack) || 0) * (unitsPerPack || 1) + (Number(d.Pallets) || 0) * (packsPerPallet || 1) * (unitsPerPack || 1);

      // calcular precio unitario: intentar desde nota_detalle si existe nota, considerando Medida
      let precioUnit = 0;
      try {
        if (nota && nota.NotaPedidoID) {
          // intentar por Codigo de variante por defecto
          let codigoVar = null;
          const v = await db.get('SELECT Codigo FROM producto_variantes WHERE ProductoID = ? AND DefaultFlag = 1 LIMIT 1', d.ProductoID).catch(()=>null);
          if (v && v.Codigo) codigoVar = v.Codigo;
          let nd = null;

          // intentar leer desde nota_detalle usando las columnas disponibles
          const notaColsAll = await db.all("PRAGMA table_info('nota_detalle')");
          const hasPrecio = (notaColsAll || []).some(c => c.name && c.name.toLowerCase() === 'precio');
          const hasPrecioNeto = (notaColsAll || []).some(c => c.name && c.name.toLowerCase() === 'precioneto') || (notaColsAll || []).some(c => c.name && c.name.toLowerCase() === 'precioneto') || (notaColsAll || []).some(c => c.name && c.name.toLowerCase() === 'precioneto') || (notaColsAll || []).some(c => c.name && c.name.toLowerCase() === 'precioneto') || (notaColsAll || []).some(c => c.name && c.name.toLowerCase() === 'precioneto') || (notaColsAll || []).some(c => c.name && c.name.toLowerCase() === 'precioneto');
          // build select columns
          const baseCols = [];
          if (hasPrecio) baseCols.push('Precio');
          if (hasPrecioNeto) baseCols.push('PrecioNeto');
          baseCols.push('Medida');

          if (codigoVar) {
            try {
              const selectCols = baseCols.join(',');
              nd = await db.get(`SELECT ${selectCols} FROM nota_detalle WHERE NotaPedidoID = ? AND Codigo = ? LIMIT 1`, nota.NotaPedidoID, codigoVar).catch(()=>null);
            } catch (e) { nd = null; }
          }

          if (!nd) {
            try {
              const selectCols2 = baseCols.join(',');
              nd = await db.get(`SELECT ${selectCols2} FROM nota_detalle WHERE NotaPedidoID = ? AND Codigo = (SELECT Codigo FROM productos WHERE ProductoID = ? LIMIT 1) LIMIT 1`, nota.NotaPedidoID, d.ProductoID).catch(()=>null);
            } catch (e) { nd = null; }
          }

          if (nd) {
            const medidaPrecio = (nd.Medida || 'unidad').toString().toLowerCase();
            const rawPrecio = nd.Precio || nd.PrecioNeto || 0;
            if (rawPrecio) {
              if (medidaPrecio === 'pack') {
                precioUnit = Number(rawPrecio) / (unitsPerPack || 1);
              } else if (medidaPrecio === 'pallet' || medidaPrecio === 'pallets') {
                precioUnit = Number(rawPrecio) / ((packsPerPallet || 1) * (unitsPerPack || 1));
              } else {
                precioUnit = Number(rawPrecio);
              }
            }
          }
        }
      } catch (e) { /* ignore */ }

      // fallback a precio del producto maestro
      if (!precioUnit) {
        // seleccionar columnas disponibles en productos (inline)
        const prodCols = await db.all("PRAGMA table_info('productos')");
        const usePrecioP = (prodCols || []).some(c => c.name && c.name.toLowerCase() === 'precio');
        const usePrecioNetoP = (prodCols || []).some(c => c.name && c.name.toLowerCase() === 'precioneto' || c.name && c.name.toLowerCase() === 'precioneto');
        let p = null;
        if (usePrecioP || usePrecioNetoP) {
          const cols = [];
          if (usePrecioP) cols.push('Precio');
          if (usePrecioNetoP) cols.push('PrecioNeto');
          const selectP = cols.join(',') || 'Precio';
          p = await db.get(`SELECT ${selectP} FROM productos WHERE ProductoID = ?`, d.ProductoID).catch(()=>null);
        }
        if (p) precioUnit = p.Precio || p.PrecioNeto || 0;
      }

      enrichedDetalles.push({ ...d, PrecioUnitario: precioUnit, Cantidad: cantidad, NoGravado: 0 });
    }

    const movimientoEnriquecido = {
      ...movimiento,
      OrigenDepositoNombre: origenDeposito ? origenDeposito.Nombre : null,
      OrigenSectorNombre: origenSector ? origenSector.Nombre : null,
      DestinoDepositoNombre: destinoDeposito ? destinoDeposito.Nombre : null,
      DestinoSectorNombre: destinoSector ? destinoSector.Nombre : null,
      NotaPedidoID: nota ? nota.NotaPedidoID : null
    };

    res.json({ movimiento: movimientoEnriquecido, detalles: enrichedDetalles });
  } catch (err) {
    console.error('Error GET /api/movimientos/:id', err.message || err);
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Facturar un movimiento (crear venta a partir de movimiento_detalle)
app.post('/api/movimientos/:id/facturar', async (req, res) => {
  const movimientoId = req.params.id;
  const { TipoComp, PuntoVenta, NumeroComp, Descuento = 0, lineIva = {}, linePrices = {} } = req.body || {};
  // lineIva: { '<ProductoID>': ivaPercent }
  try {
    const movimiento = await db.get('SELECT * FROM movimientos WHERE MovimientoID = ?', movimientoId);
    if (!movimiento) return res.status(404).json({ ok: false, error: 'Movimiento no encontrado' });

    const detalles = await db.all('SELECT * FROM movimiento_detalle WHERE MovimientoID = ?', movimientoId);
    if (!detalles || detalles.length === 0) return res.status(400).json({ ok: false, error: 'Movimiento sin detalles' });

    // Determinar ClienteID y NotaPedidoID si están presentes
    let clienteId = null; let notaId = movimiento.NotaPedidoID || null;
    if (notaId) {
      const notaRow = await db.get('SELECT ClienteID FROM notas_pedido WHERE NotaPedidoID = ?', notaId);
      if (notaRow) clienteId = notaRow.ClienteID;
    }

    // Calcular líneas: necesitar precio unitario por producto (tomar desde nota_detalle si existe, o producto maestro)
    let subtotal = 0, subtotalNeto = 0, subtotalNoGravado = 0, totalIva = 0;
    const ventaLines = [];
    for (const d of detalles) {
      // Obtener equivalencias (UnitsPerPack, PacksPerPallet) desde la variante por defecto o producto
      let unitsPerPack = 1, packsPerPallet = 1;
      try {
        const varRow = await db.get('SELECT UnitsPerPack, PacksPerPallet FROM producto_variantes WHERE ProductoID = ? AND DefaultFlag = 1 LIMIT 1', d.ProductoID);
        if (varRow) {
          unitsPerPack = Number(varRow.UnitsPerPack) || unitsPerPack;
          packsPerPallet = Number(varRow.PacksPerPallet) || packsPerPallet;
        } else {
          const prodRow = await db.get('SELECT UnitsPerPack, PacksPerPallet FROM productos WHERE ProductoID = ?', d.ProductoID);
          if (prodRow) {
            unitsPerPack = Number(prodRow.UnitsPerPack) || unitsPerPack;
            packsPerPallet = Number(prodRow.PacksPerPallet) || packsPerPallet;
          }
        }
      } catch (e) {
        // ignore, use defaults
      }

      // Recuperar precio desde payload (linePrices) si fue provisto por el cliente
      let precioUnit = 0;
      if (linePrices && linePrices[String(d.ProductoID)] !== undefined && linePrices[String(d.ProductoID)] !== null) {
        precioUnit = Number(linePrices[String(d.ProductoID)]) || 0;
      }
      let nd = null;
      let medidaPrecio = 'unidad';
      if (notaId) {
        // 1) intentar por Codigo de la variante por defecto
        let codigoVar = null;
        try {
          const v = await db.get('SELECT Codigo FROM producto_variantes WHERE ProductoID = ? AND DefaultFlag = 1 LIMIT 1', d.ProductoID);
          if (v && v.Codigo) codigoVar = v.Codigo;
        } catch (e) { /* ignore */ }

        // construir columnas disponibles en nota_detalle
        const notaColsF = await db.all("PRAGMA table_info('nota_detalle')");
        const hasP = (notaColsF || []).some(c => c.name && c.name.toLowerCase() === 'precio');
        const hasPN = (notaColsF || []).some(c => c.name && c.name.toLowerCase() === 'precioneto') || (notaColsF || []).some(c => c.name && c.name.toLowerCase() === 'precioneto');
        const notaSelectCols = [];
        if (hasP) notaSelectCols.push('Precio');
        if (hasPN) notaSelectCols.push('PrecioNeto');
        notaSelectCols.push('Medida');
        const notaSelect = notaSelectCols.join(',');

        if (codigoVar) {
          nd = await db.get(`SELECT ${notaSelect} FROM nota_detalle WHERE NotaPedidoID = ? AND Codigo = ? LIMIT 1`, notaId, codigoVar).catch(()=>null);
        }
        // 2) si no, intentar por Codigo del producto maestro
        if (!nd) {
          nd = await db.get(`SELECT ${notaSelect} FROM nota_detalle WHERE NotaPedidoID = ? AND Codigo = (SELECT Codigo FROM productos WHERE ProductoID = ? LIMIT 1) LIMIT 1`, notaId, d.ProductoID).catch(()=>null);
        }

        if (nd) {
          medidaPrecio = (nd.Medida || 'unidad').toString().toLowerCase();
          const rawPrecio = nd.Precio || nd.PrecioNeto || 0;
          if (rawPrecio) {
            if (medidaPrecio === 'pack') {
              // precio en nota por pack -> convertir a precio por unidad
              precioUnit = Number(rawPrecio) / (unitsPerPack || 1);
            } else if (medidaPrecio === 'pallet' || medidaPrecio === 'pallets') {
              // precio por pallet -> convertir a precio por unidad
              precioUnit = Number(rawPrecio) / ((packsPerPallet || 1) * (unitsPerPack || 1));
            } else {
              // assume precio por unidad
              precioUnit = Number(rawPrecio);
            }
          }
        }
      }

      // Si no hay precio en la nota, intentar obtener Precio del producto maestro (se asume por unidad)
      if (!precioUnit) {
        const prodColsF = await db.all("PRAGMA table_info('productos')");
        const hasPP = (prodColsF || []).some(c => c.name && c.name.toLowerCase() === 'precio');
        const hasPPN = (prodColsF || []).some(c => c.name && c.name.toLowerCase() === 'precioneto');
        if (hasPP || hasPPN) {
          const colsP = [];
          if (hasPP) colsP.push('Precio');
          if (hasPPN) colsP.push('PrecioNeto');
          const selP = colsP.join(',');
          const p = await db.get(`SELECT ${selP} FROM productos WHERE ProductoID = ?`, d.ProductoID).catch(()=>null);
          if (p) precioUnit = p.Precio || p.PrecioNeto || 0;
        }
      }

      // Normalizar cantidad: unidades + packs*unitsPerPack + pallets*packsPerPallet*unitsPerPack
      const cantidad = (Number(d.Unidad) || 0) + (Number(d.Pack) || 0) * (unitsPerPack || 1) + (Number(d.Pallets) || 0) * (packsPerPallet || 1) * (unitsPerPack || 1);
      const lineaNeto = (Number(precioUnit) || 0) * cantidad;
      const ivaPercent = (lineIva && lineIva[String(d.ProductoID)]) ? Number(lineIva[String(d.ProductoID)]) : 0;
      const ivaAmount = lineaNeto * (ivaPercent / 100);
      const totalLinea = lineaNeto + ivaAmount;

      subtotal += lineaNeto;
      totalIva += ivaAmount;
      // Asumir todo como neto salvo que se identifique NoGravado (no implementado aún)
      subtotalNeto += lineaNeto;

      // Obtener descripción del producto si es posible
      let descripcion = '';
      try {
        const pdesc = await db.get('SELECT ProductoDescripcion FROM productos WHERE ProductoID = ?', d.ProductoID);
        if (pdesc) descripcion = pdesc.ProductoDescripcion || '';
      } catch (e) { /* ignore */ }

      ventaLines.push({ ProductoID: d.ProductoID, Descripcion: descripcion || '', Cantidad: cantidad, PrecioUnitario: precioUnit, PrecioNeto: lineaNeto, NoGravado: 0, IvaPercent: ivaPercent, IvaAmount: ivaAmount, TotalLinea: totalLinea });
    }

    // Aplicar descuento simple sobre subtotalNeto
    const descuento = Number(Descuento) || 0;
    const subtotalNetoAfterDesc = subtotalNeto - descuento;
    const total = subtotalNetoAfterDesc + totalIva;

    const now = new Date().toISOString().slice(0,19).replace('T',' ');
    const insertVenta = await db.run(`INSERT INTO ventas (ClienteID, NotaPedidoID, MovimientoID, FechaComp, TipoComp, PuntoVenta, NumeroComp, Descuento, Subtotal, SubtotalNeto, SubtotalNoGravado, IvaPercent, TotalIva, Total, CreatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      clienteId, notaId, movimientoId, now, TipoComp || 'FA', PuntoVenta || 0, NumeroComp || '', descuento, subtotal, subtotalNetoAfterDesc, subtotalNoGravado, 0, totalIva, total, now
    );

    const ventaId = insertVenta.lastID;
    const stmt = await db.prepare('INSERT INTO venta_detalle (VentaID, ProductoID, Descripcion, Cantidad, PrecioUnitario, PrecioNeto, NoGravado, IvaPercent, IvaAmount, TotalLinea) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    try {
      for (const vl of ventaLines) {
        await stmt.run(ventaId, vl.ProductoID, vl.Descripcion, vl.Cantidad, vl.PrecioUnitario, vl.PrecioNeto, vl.NoGravado, vl.IvaPercent, vl.IvaAmount, vl.TotalLinea);
      }
    } finally { await stmt.finalize(); }

    // Marcar nota como facturada si existe
    if (notaId) {
      await db.run("UPDATE notas_pedido SET EstadoFacturacion = ?, Estado = ? WHERE NotaPedidoID = ?", 'Facturado', 'Facturado', notaId);
    }

    res.json({ ok: true, VentaID: ventaId, totals: { Subtotal: subtotal, SubtotalNeto: subtotalNetoAfterDesc, TotalIva: totalIva, Total: total } });
  } catch (err) {
    console.error('Error POST /api/movimientos/:id/facturar', err.message || err);
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Endpoint ligero: resolver NotaPedidoID por RemitoNumero (exacto / like / dígitos)
app.get('/api/resolve-nota-por-remito', async (req, res) => {
  try {
    const rem = String(req.query.remito || '').trim();
    if (!rem) return res.status(400).json({ ok: false, error: 'Parámetro remito requerido' });
    let nota = null;
    // 1) exacto por OrdenCompra
    nota = await db.get('SELECT NotaPedidoID FROM notas_pedido WHERE OrdenCompra = ? LIMIT 1', rem);
    // 2) por dígitos -> id
    if (!nota) {
      const digits = (rem.match(/\d+/g) || []).join('');
      if (digits) {
        const asId = parseInt(digits, 10);
        if (!isNaN(asId)) nota = await db.get('SELECT NotaPedidoID FROM notas_pedido WHERE NotaPedidoID = ? LIMIT 1', asId);
      }
    }
    // 3) LIKE
    if (!nota) {
      nota = await db.get('SELECT NotaPedidoID FROM notas_pedido WHERE OrdenCompra LIKE ? LIMIT 1', `%${rem}%`);
    }
    res.json({ NotaPedidoID: nota ? nota.NotaPedidoID : null });
  } catch (err) {
    console.error('Error GET /api/resolve-nota-por-remito', err.message || err);
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// GET venta por id con su detalle
app.get('/api/ventas/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    // Primero intentar por VentaID
    let venta = await db.get('SELECT * FROM ventas WHERE VentaID = ?', id);
    // Si no existe, intentar buscar por NotaPedidoID (compatibilidad: frontend a veces pasa NotaPedidoID)
    if (!venta) {
      venta = await db.get('SELECT * FROM ventas WHERE NotaPedidoID = ? LIMIT 1', id);
      if (venta) console.log(`GET /api/ventas/:id - fallback: encontrado VentaID ${venta.VentaID} para NotaPedidoID ${id}`);
    }
    if (!venta) return res.status(404).json({ ok: false, error: 'Venta no encontrada' });
  const detalles = await db.all('SELECT * FROM venta_detalle WHERE VentaID = ? ORDER BY VentaDetalleID ASC', venta.VentaID);
    // devolver la venta incluyendo un array 'detalles' para compatibilidad con el frontend
    venta.detalles = detalles || [];
    res.json(venta);
  } catch (err) {
    console.error('Error GET /api/ventas/:id', err && (err.stack || err.message || err));
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Listado de ventas (paginado, búsqueda simple)
app.get('/api/ventas', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const q = req.query.q ? `%${req.query.q}%` : null;
    const fechaDesde = req.query.fechaDesde || null;
    const fechaHasta = req.query.fechaHasta || null;
    const tipo = req.query.tipo || null;
  const numero = req.query.numero ? `%${req.query.numero}%` : null;
  const punto = req.query.punto ? `%${req.query.punto}%` : null;
  const cliente = req.query.cliente ? `%${req.query.cliente}%` : null;
  const subtotalMin = (req.query.subtotalMin || req.query.subtotalmin) ? Number(req.query.subtotalMin || req.query.subtotalmin) : null;
  const totalMin = req.query.totalMin ? Number(req.query.totalMin) : null;
  const totalMax = req.query.totalMax ? Number(req.query.totalMax) : null;

    let whereClauses = [];
    const params = [];
    if (q) whereClauses.push('(v.NumeroComp LIKE ? OR c.NombreRazonSocial LIKE ?)') , params.push(q, q);
    if (fechaDesde) whereClauses.push('date(v.FechaComp) >= date(?)') , params.push(fechaDesde);
  // single date filter; fechaHasta removed
  if (tipo) whereClauses.push('v.TipoComp = ?') , params.push(tipo);
  if (numero) whereClauses.push('v.NumeroComp LIKE ?') , params.push(numero);
  if (punto) whereClauses.push('v.PuntoVenta LIKE ?') , params.push(punto);
    if (cliente) whereClauses.push('c.NombreRazonSocial LIKE ?') , params.push(cliente);
  if (subtotalMin !== null) whereClauses.push('v.Subtotal >= ?') , params.push(subtotalMin);
  // subtotalMax removed: single subtotalMin filter supported
  if (totalMin !== null) whereClauses.push('v.Total >= ?') , params.push(totalMin);
  if (totalMax !== null) whereClauses.push('v.Total <= ?') , params.push(totalMax);

    const where = whereClauses.length ? ('WHERE ' + whereClauses.join(' AND ')) : '';

    const totalRow = await db.get(`SELECT COUNT(*) as cnt FROM ventas v LEFT JOIN clientes c ON c.ClienteID = v.ClienteID ${where}`, params);
    const total = totalRow ? totalRow.cnt : 0;

  const sql = `SELECT v.VentaID, v.FechaComp, v.TipoComp, v.NumeroComp, v.PuntoVenta, v.Subtotal, (v.Total - v.Subtotal) as IVA, v.Total, v.NotaPedidoID, c.NombreRazonSocial as ClienteNombre
      FROM ventas v LEFT JOIN clientes c ON c.ClienteID = v.ClienteID
      ${where}
      ORDER BY v.VentaID DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const items = await db.all(sql, params);
    res.json({ items, total, limit, offset });
  } catch (err) {
    console.error('Error GET /api/ventas', err && (err.stack || err.message || err));
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

const PORT = 3000;
// Mejor logueo y binding explícito para evitar problemas de binding en Windows
process.on('uncaughtException', (err) => {
  console.error('UncaughtException:', err && (err.stack || err.message || err));
});
process.on('unhandledRejection', (reason) => {
  console.error('UnhandledRejection:', reason && (reason.stack || reason));
});

const HOST = '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
  console.log(`Servidor API escuchando en puerto ${PORT} bind=${HOST}`);
  try {
    const nets = os.networkInterfaces();
    console.log('Interfaces de red:', Object.keys(nets).map(k => ({ iface: k, addrs: nets[k].map(a => ({address: a.address, family: a.family, internal: a.internal})) })));
  } catch(e) { console.warn('No se pudieron listar interfaces:', e && e.message); }
});
