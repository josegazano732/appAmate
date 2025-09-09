(async () => {
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  const base = 'http://localhost:3000';
  try {
    console.log('Seeding inventory...');
    let r = await fetch(base + '/api/seed-inventario?force=true', { method: 'POST' });
    console.log('seed status', r.status);

    console.log('Creating nota...');
    const body = { nota: { ClienteID:1, ListaPrecioID:10, Fecha: new Date().toISOString().slice(0,10), NombreFiscal:'Test Cliente', Sucursal:'Main', ImporteOperacion:300, Estado:'Pendiente', EstadoAprobacion:'Pendiente', EstadoRemito:'Sin Remito', EstadoFacturacion:'Sin Facturar', OrdenCompra:'OC-TEST' }, detalles: [ { Codigo:'P001', ProductoDescripcion:'Producto 1', Familia:'', Precio:100, Cantidad:3, PrecioNeto:300, Medida:'pack' } ] };
    r = await fetch(base + '/api/notas-pedido', { method:'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(body) });
    const created = await r.json();
    console.log('Created nota', created);
    const notaId = created.NotaPedidoID;

    console.log('Prepare remito...');
    r = await fetch(`${base}/api/notas-pedido/${notaId}/remito?depositoId=1`);
    const prep = await r.json();
    console.log('Prepared remito', prep);

    console.log('Posting remito...');
    const remBody = { RemitoNumero:'R-1001', OrigenDepositoID:1, OrigenSectorID:1, Observaciones:'Prueba', Forzar:true };
    r = await fetch(`${base}/api/notas-pedido/${notaId}/remito`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(remBody) });
    const remRes = await r.json();
    console.log('Remito response', remRes);

    if (remRes.MovimientoID) {
      r = await fetch(base + `/api/movimientos/${remRes.MovimientoID}`);
      const mov = await r.json();
      console.log('Movimiento', mov);
    }

    r = await fetch(base + '/api/productos?q=P001');
    const prods = await r.json();
    console.log('Productos P001', prods);
    if (prods && prods[0]) {
      const pid = prods[0].ProductoID;
      r = await fetch(base + `/api/stock?ProductoID=${pid}`);
      const stock = await r.json();
      console.log('Stock rows', stock);
    }

  } catch (err) {
    console.error('E2E error', err && (err.stack || err.message || err));
    process.exit(1);
  }
})();
