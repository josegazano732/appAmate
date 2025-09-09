(async ()=>{
  const api = 'http://localhost:3000/api';
  const fetch = global.fetch;
  const sleep = ms => new Promise(r=>setTimeout(r,ms));

  // wait for API
  for (let i=0;i<20;i++){
    try{ const r = await fetch(api + '/productos'); if (r.ok) break; }catch(e){}
    await sleep(500);
    if (i===19){ console.error('API no disponible'); process.exit(2);} }

  // helper to fetch and parse json, with debug on non-json
  async function fetchJson(url, opts) {
    const r = await fetch(url, opts);
    const txt = await r.text();
    try { return JSON.parse(txt); } catch(e) {
      console.error('Non-JSON response from', url, 'status', r.status);
      console.error('Body:\n', txt.slice(0,2000));
      throw new Error('Non-JSON response');
    }
  }

  // crear producto maestro (usar sufijo unico por run)
  const ts = Date.now();
  // attempt to create unique product code
  let p = await fetchJson(api + '/productos', { method: 'POST', body: JSON.stringify({ Codigo: `E2E-PM-${ts}`, ProductoDescripcion: 'Prod maestro E2E', DefaultMeasure: 'unidad' }), headers: {'Content-Type':'application/json'} });
  console.log('create producto', p);
  const prodId = p.ProductoID;

  // crear variante pack (codigo unico)
  let v = await fetchJson(api + `/productos/${prodId}/variantes`, { method: 'POST', body: JSON.stringify({ Codigo: `E2E-VAR-${ts}`, Medida: 'pack', UnitsPerPack: 6 }), headers: {'Content-Type':'application/json'} });
  console.log('create variante', v);
  const varId = v.VarianteID;

  // actualizar variante (cambiar codigo)
  const upd = await fetchJson(api + `/productos/${prodId}/variantes/${varId}`, { method: 'PUT', body: JSON.stringify({ Codigo: `E2E-VAR-${ts}-UPD`, Medida: 'pack', UnitsPerPack: 12 }), headers: {'Content-Type':'application/json'} });
  console.log('update variante', upd);

  // crear deposito
  let dep = await fetchJson(api + '/depositos', { method: 'POST', body: JSON.stringify({ Nombre: 'E2E-Dep' }), headers: {'Content-Type':'application/json'} });
  console.log('create deposito', dep);
  const depId = dep.DepositoID;

  // crear sector
  let sec = await fetchJson(api + '/sectores', { method: 'POST', body: JSON.stringify({ Nombre: 'E2E-Sec', DepositoID: depId }), headers: {'Content-Type':'application/json'} });
  console.log('create sector', sec);
  const secId = sec.SectorID;

  // crear movimiento ingreso usando VarianteID (Cantidad en packs)
  let mov = await fetchJson(api + '/movimientos', { method: 'POST', body: JSON.stringify({ Tipo: 'Ingreso', DestinoDepositoID: depId, DestinoSectorID: secId, detalles: [ { VarianteID: varId, Cantidad: 2, Medida: 'pack' } ] }), headers: {'Content-Type':'application/json'} });
  console.log('create movimiento', mov);

  // borrar variante
  const del = await fetchJson(api + `/productos/${prodId}/variantes/${varId}`, { method: 'DELETE' });
  console.log('delete variante', del);

})();
