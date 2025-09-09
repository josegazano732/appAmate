(async () => {
  const api = 'http://localhost:3000/api';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const doReq = async (path, opts = {}) => {
    const url = api + path;
    opts.headers = Object.assign({'Content-Type':'application/json'}, opts.headers||{});
    if (opts.body && typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);
    const res = await fetch(url, opts);
    const text = await res.text();
    try { return { ok: res.ok, status: res.status, body: JSON.parse(text) } } catch(e) { return { ok: res.ok, status: res.status, body: text }; }
  };

  console.log('E2E: Esperando que la API esté disponible en', api);
  for (let i=0;i<30;i++){
    try { const r = await doReq('/productos'); if (r.ok) { console.log('API lista'); break; } }
    catch(e){}
    await sleep(1000);
    if (i===29) { console.error('API no respondió tras 30s'); process.exit(2); }
  }

  // obtener o crear producto
  let productos = await doReq('/productos');
  let productoId = null;
  if (productos.ok && Array.isArray(productos.body) && productos.body.length) {
    productoId = productos.body[0].ProductoID || productos.body[0].id || productos.body[0].ProductoId || productos.body[0].ID;
    console.log('Producto existente usado id=', productoId);
  } else {
    console.log('Creando producto de prueba');
    const p = await doReq('/productos', { method: 'POST', body: { Codigo: 'E2E-P-1', ProductoDescripcion: 'Producto E2E', DefaultMeasure: 'unidad' } });
    console.log('CreateProducto ->', p.status, p.body);
    productoId = p.body && (p.body.ProductoID || p.body.id || p.body.ProductoId || p.body.insertId);
    // fallback: listar y tomar último
    if (!productoId){ const all = await doReq('/productos'); productoId = (all.body && all.body.length && all.body[all.body.length-1].ProductoID) || null; }
    if (!productoId) { console.error('No pude obtener ProductoID'); process.exit(3); }
  }

  // crear deposito
  const depName = 'E2E_Dep_' + Date.now();
  const dep = await doReq('/depositos', { method: 'POST', body: { Nombre: depName } });
  console.log('CreateDeposito ->', dep.status, dep.body);
  let depositoId = dep.body && (dep.body.DepositoID || dep.body.id || dep.body.lastID || dep.body.insertId);
  if (!depositoId){ const all = await doReq('/depositos'); const found = all.body && all.body.find(x=>x.Nombre===depName); depositoId = found && (found.DepositoID || found.id); }
  if (!depositoId) { console.error('No pude obtener DepositoID'); process.exit(4); }

  // crear sector asociado
  const secName = 'E2E_Sec_' + Date.now();
  const sec = await doReq('/sectores', { method: 'POST', body: { Nombre: secName, DepositoID: depositoId } });
  console.log('CreateSector ->', sec.status, sec.body);
  let sectorId = sec.body && (sec.body.SectorID || sec.body.id || sec.body.lastID || sec.body.insertId);
  if (!sectorId){ const all = await doReq('/sectores?depositoId=' + depositoId); sectorId = all.body && all.body.length && (all.body[0].SectorID || all.body[0].id); }
  if (!sectorId){ console.error('No pude obtener SectorID'); process.exit(5); }

  // crear movimiento tipo Ingreso al deposito/sector creado
  const mov = {
    Tipo: 'Ingreso',
    DestinoDepositoID: depositoId,
    DestinoSectorID: sectorId,
    detalles: [ { ProductoID: productoId, Unidad: 10 } ]
  };
  const movr = await doReq('/movimientos', { method: 'POST', body: mov });
  console.log('CreateMovimiento ->', movr.status, movr.body);
  if (!movr.ok){ console.error('Movimiento fallo', movr.body); process.exit(6); }
  console.log('E2E: OK - movimiento creado con id', movr.body && (movr.body.MovimientoID || movr.body.id || movr.body.insertId));
  process.exit(0);
})();
