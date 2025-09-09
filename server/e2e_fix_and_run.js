(async () => {
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  const base = 'http://localhost:3000';
  try {
    console.log('1) Ajustar UnitsPerPack para P001 a 6');
    let r = await fetch(base + '/api/productos?q=P001');
    const prods = await r.json();
    if (!prods || !prods[0]) throw new Error('Producto P001 no encontrado');
    const pid = prods[0].ProductoID;
    console.log('ProductoID', pid);
    // actualizar producto
    r = await fetch(`${base}/api/productos/${pid}`, { method:'PUT', headers:{'content-type':'application/json'}, body: JSON.stringify({ Codigo: prods[0].Codigo, ProductoDescripcion: prods[0].ProductoDescripcion, TipoUnidad: prods[0].TipoUnidad, Unidad: prods[0].Unidad, Pack: prods[0].Pack, Pallets: prods[0].Pallets, UnitsPerPack:6, PacksPerPallet:1, DefaultMeasure:'pack' }) });
    console.log('PUT product status', r.status);

    console.log('2) Asegurar stock en DepositoID=1/SectorID=1 para ProductoID', pid);
    r = await fetch(`${base}/api/stock/seed?producto=${pid}&deposito=1&sector=1&unidad=100`);
    console.log('stock seed status', r.status);

    console.log('3) Crear nota con 3 packs (debe convertirse a 18 unidades)');
    const body = { nota: { ClienteID:1, ListaPrecioID:10, Fecha: new Date().toISOString().slice(0,10), NombreFiscal:'Test Cliente', Sucursal:'Main', ImporteOperacion:300, Estado:'Pendiente', EstadoAprobacion:'Pendiente', EstadoRemito:'Sin Remito', EstadoFacturacion:'Sin Facturar', OrdenCompra:'OC-TEST' }, detalles: [ { Codigo:'P001', ProductoDescripcion:'Producto 1', Familia:'', Precio:100, Cantidad:3, PrecioNeto:300, Medida:'pack' } ] };
    r = await fetch(base + '/api/notas-pedido', { method:'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(body) });
    const created = await r.json();
    console.log('Created nota', created);
    const notaId = created.NotaPedidoID;

    console.log('4) Prepare remito (depositoId=1)');
    r = await fetch(`${base}/api/notas-pedido/${notaId}/remito?depositoId=1`);
    const prep = await r.json();
    console.log('Prepared remito', prep);

    console.log('5) Post remito (Forzar=false)');
    const remBody = { RemitoNumero:'R-1002', OrigenDepositoID:1, OrigenSectorID:1, Observaciones:'Prueba2', Forzar:false };
    r = await fetch(`${base}/api/notas-pedido/${notaId}/remito`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(remBody) });
    const remRes = await r.json();
    console.log('Remito response', remRes);

    if (remRes.MovimientoID) {
      r = await fetch(base + `/api/movimientos/${remRes.MovimientoID}`);
      const mov = await r.json();
      console.log('Movimiento', mov);
    }

    r = await fetch(base + '/api/productos?q=P001');
    const prods2 = await r.json();
    console.log('Productos P001', prods2);
    if (prods2 && prods2[0]) {
      const pid2 = prods2[0].ProductoID;
      r = await fetch(base + `/api/stock?ProductoID=${pid2}`);
      const stock = await r.json();
      console.log('Stock rows', stock);
    }

  } catch (err) {
    console.error('E2E fix error', err && (err.stack || err.message || err));
    process.exit(1);
  }
})();
