export interface ReciboPago {
  TipoPago: string;
  Monto: number;
  Datos?: string | null;
  PaymentMethodID?: number | null;
  BankID?: number | null;
  MethodNombre?: string; // Nombre del método asociado (si backend lo devuelve)
  BankNombre?: string;   // Nombre del banco asociado
}

export interface ReciboVentaAplicada {
  VentaID: number;
  Numero?: string;
  FechaComp?: string;
  ImporteAplicado: number;
  TotalFactura?: number;
  SaldoAnterior?: number;
  SaldoPosterior?: number;
}

export interface Recibo {
  ReciboID: number;
  Fecha: string;
  ClienteID?: number;
  ClienteNombre?: string;
  NombreRazonSocial?: string; // Razón Social completa del cliente
  NombreFiscal?: string; // Nombre fiscal capturado manualmente en Nota de Pedido
  Observaciones?: string;
  Total?: number;
  TotalPagos?: number;
  TotalAplicado?: number;
  Diferencia?: number; // TotalPagos - TotalAplicado
  ventas?: ReciboVentaAplicada[]; // array enriquecido desde backend
  pagos?: ReciboPago[];
  CreatedAt?: string;
  CreatedBy?: string;
  UpdatedAt?: string;
}
