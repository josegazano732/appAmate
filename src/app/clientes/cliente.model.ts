export interface Cliente {
  ClienteID: number;
  TIPO?: string;
  Numero?: string;
  NombreRazonSocial: string;
  Provincia?: string;
  Ciudad?: string;
  Direcciones?: Array<{
    DatosID: number;
    Direccion?: string;
    Provincia?: string;
    Ciudad?: string;
    CodPostal?: string;
    NroSucursal?: number;
    Telefono?: string;
    Email?: string;
  }>;
}
