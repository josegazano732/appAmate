import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

(async () => {
  try {
    const db = await open({ filename: './appsis.db', driver: sqlite3.Database });
    const notaId = 19;
    const codigo = '7798441630049';
    const cantidad = 1;
    const medida = 'pack';

    // Try to get producto description
    const prod = await db.get('SELECT ProductoDescripcion FROM productos WHERE Codigo = ?', codigo);
    const descripcion = prod ? prod.ProductoDescripcion : codigo;
    const familia = 'NM';

    const result = await db.run(`INSERT INTO nota_detalle (NotaPedidoID, Codigo, ProductoDescripcion, Familia, Precio, Cantidad, PrecioNeto, Medida) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      notaId, codigo, descripcion, familia, 0, cantidad, 0, medida);

    console.log('Inserted NotaDetalleID:', result.lastID);
    await db.close();
  } catch (err) {
    console.error('Error inserting nota detalle:', err);
    process.exit(1);
  }
})();
