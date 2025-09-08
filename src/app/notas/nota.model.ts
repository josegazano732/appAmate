export interface NotaPedido {
  NotaPedidoID?: number;
  ClienteID: number;
  ListaPrecioID?: number;
  Fecha?: string;
  NombreFiscal?: string;
  Sucursal?: string;
  ImporteOperacion?: number;
  Estado?: string;
  EstadoAprobacion?: 'Aprobada' | 'Rechazada' | 'Pendiente';
  EstadoRemito?: 'Remitido' | 'Remitido Parcial' | 'Sin Remito';
  EstadoFacturacion?: 'Facturado' | 'Facturado Parcial' | 'Sin Facturar';
  OrdenCompra?: string;
}

export interface NotaDetalle {
  NotaDetalleID?: number;
  NotaPedidoID?: number;
  Codigo?: string;
  ProductoDescripcion?: string;
  Familia?: string;
  Precio?: number;
  Cantidad?: number;
  PrecioNeto?: number;
}
