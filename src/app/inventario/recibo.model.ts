export interface ReciboPago {
  TipoPago: string;
  Monto: number;
  Datos?: string | null;
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
