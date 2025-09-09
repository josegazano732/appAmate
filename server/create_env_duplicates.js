(async () => {
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  const base = 'http://localhost:3000';
  // Codes to duplicate: we'll fetch all products that start with 779844163 and create duplicates with E suffix
  try {
    const r = await fetch(base + '/api/productos');
    const all = await r.json();
    const targets = all.filter(p => String(p.Codigo || '').startsWith('779844163'));
    console.log('Found products to duplicate:', targets.length);
    for (const p of targets) {
      const newCodigo = String(p.Codigo) + 'E';
      const newDesc = (p.ProductoDescripcion || '').replace(/^YM\s*/, 'ENV ');
      const payload = { Codigo: newCodigo, ProductoDescripcion: newDesc, TipoUnidad: p.TipoUnidad || 'Unidad', Unidad: p.Unidad || 'Unidad', Pack: p.Pack || 1, Pallets: p.Pallets || 0 };
      console.log('Creating duplicate', newCodigo, payload.ProductoDescripcion);
      const res = await fetch(base + '/api/productos', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(payload) });
      const j = await res.json();
      console.log(' ->', res.status, j);
    }
    // list created ones
    const r2 = await fetch(base + '/api/productos');
    const all2 = await r2.json();
    const created = all2.filter(pr => String(pr.Codigo).endsWith('E'));
    console.log('Created duplicates:', created.map(c => ({ ProductoID: c.ProductoID, Codigo: c.Codigo, ProductoDescripcion: c.ProductoDescripcion })));
  } catch (err) {
    console.error('Error duplicating', err && (err.stack||err.message||err));
  }
})();
