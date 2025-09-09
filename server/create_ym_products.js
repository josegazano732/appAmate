(async () => {
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  const base = 'http://localhost:3000';
  const products = [
    { Codigo: '7798441630018', ProductoDescripcion: 'YM 500 Gs Don Julian TRADICIONAL', TipoUnidad: 'Unidad', Unidad: 'Unidad', Pack: 1, Pallets: 0 },
    { Codigo: '7798441630049', ProductoDescripcion: 'YM 500 Grs Caricias de Mate TRADICIONAL', TipoUnidad: 'Unidad', Unidad: 'Unidad', Pack: 1, Pallets: 0 },
    { Codigo: '7798441630032', ProductoDescripcion: 'YM 500 Grs. Caricias de Mate SUAVE', TipoUnidad: 'Unidad', Unidad: 'Unidad', Pack: 1, Pallets: 0 },
    { Codigo: '7798441630063', ProductoDescripcion: 'YM 500 Grs Mate y Playa Terere', TipoUnidad: 'Unidad', Unidad: 'Unidad', Pack: 1, Pallets: 0 },
    { Codigo: '7798441630056', ProductoDescripcion: 'YM 500 Grs Mate y Playa TRADICIONAL', TipoUnidad: 'Unidad', Unidad: 'Unidad', Pack: 1, Pallets: 0 },
    { Codigo: '7798441630025', ProductoDescripcion: 'YM 500 grs Mateite (YM compuesta c/ te verde)', TipoUnidad: 'Unidad', Unidad: 'Unidad', Pack: 1, Pallets: 0 }
  ];
  try {
    for (const p of products) {
      console.log('Creating', p.Codigo, p.ProductoDescripcion);
      const r = await fetch(base + '/api/productos', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(p) });
      const res = await r.json();
      console.log(' ->', r.status, res);
    }
    // List products by these codes to show created IDs
    const q = products.map(x=>x.Codigo).join('|');
    const r2 = await fetch(base + '/api/productos');
    const all = await r2.json();
    const found = all.filter(pr => products.some(p => p.Codigo === pr.Codigo));
    console.log('Found created:', found.map(f => ({ ProductoID: f.ProductoID, Codigo: f.Codigo, ProductoDescripcion: f.ProductoDescripcion })));
  } catch (err) {
    console.error('Error creating products', err && (err.stack||err.message||err));
  }
})();
