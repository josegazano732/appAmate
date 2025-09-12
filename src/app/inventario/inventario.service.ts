import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Recibo } from './recibo.model';
import { catchError, throwError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class InventarioService {
  api = 'http://localhost:3000/api';
  constructor(private http: HttpClient) {}

  // Productos
  listProductos(q?: string) { return this.http.get<any[]>(`${this.api}/productos`, { params: q ? { q } : {} as any }); }
  createProducto(p: any) { return this.http.post(`${this.api}/productos`, p); }
  getProducto(id: any) { return this.http.get<any>(`${this.api}/productos/${id}`); }
  updateProducto(id: any, p: any) { return this.http.put(`${this.api}/productos/${id}`, p); }
  deleteProducto(id: any) { return this.http.delete(`${this.api}/productos/${id}`); }
  // Verificar existencia por codigo (retorna true/false)
  existsCodigo(codigo: string) { return this.http.get<{exists:boolean}>(`${this.api}/productos/exists`, { params: { codigo } }); }

  // Depositos / Sectores
  listDepositos() { return this.http.get<any[]>(`${this.api}/depositos`); }
  createDeposito(d: any) { return this.http.post(`${this.api}/depositos`, d); }
  listSectores() { return this.http.get<any[]>(`${this.api}/sectores`); }
  listSectoresByDeposito(depositoId:any) { return this.http.get<any[]>(`${this.api}/sectores`, { params: { depositoId } }); }
  createSector(s: any) { return this.http.post(`${this.api}/sectores`, s); }

  // Stock
  // listStock acepta un objeto de filtros opcional que se envía como query params
  listStock(filters?: any) { return this.http.get<any[]>(`${this.api}/stock`, { params: filters || {} as any }); }
  createStock(s: any) { return this.http.post(`${this.api}/stock`, s); }

  // Movimientos
  createMovimiento(m: any) { return this.http.post(`${this.api}/movimientos`, m); }
  listMovimientos() { return this.http.get<any[]>(`${this.api}/movimientos`); }
  getMovimiento(id:any) { return this.http.get<any>(`${this.api}/movimientos/${id}`); }
  revertMovimiento(id:any, motivo?:string){ return this.http.post<any>(`${this.api}/movimientos/${id}/revert`, { motivo: motivo || '' }); }
  // Resolver NotaPedidoID a partir de RemitoNumero (fallback cuando NotaPedidoID es null)
  resolveNotaByRemito(remito: string) { return this.http.get<{NotaPedidoID:number|null}>(`${this.api}/resolve-nota-por-remito`, { params: { remito } }); }
  // Facturar un movimiento: body { TipoComp, PuntoVenta, NumeroComp, Descuento, lineIva }
  facturarMovimiento(movimientoId:any, body:any) { return this.http.post<any>(`${this.api}/movimientos/${movimientoId}/facturar`, body); }
  // Ventas / facturas
  getVenta(id:any) { return this.http.get<any>(`${this.api}/ventas/${id}`); }
  // Listado de ventas (paginado)
  listVentas(params?: any) { return this.http.get<any>(`${this.api}/ventas`, { params: params || {} as any }); }
  // Recibos
  createRecibo(payload: any) { return this.http.post<{ ok:boolean; ReciboID:number }>(`${this.api}/recibos`, payload); }
  getRecibo(id:any) { return this.http.get<Recibo>(`${this.api}/recibos/${id}`); }
  listRecibos(params?: any) {
    return this.http.get<{ items: Recibo[]; total:number }>(`${this.api}/recibos`, { params: params || {} as any })
      .pipe(
        catchError(err => {
          const msg = err?.error?.error || 'Fallo al cargar recibos';
          return throwError(() => ({ ...err, message: msg }));
        })
      );
  }
  // Variantes
  listVariantes(productoId:any){ return this.http.get<any[]>(`${this.api}/productos/${productoId}/variantes`); }
  createVariante(productoId:any, v:any){ return this.http.post(`${this.api}/productos/${productoId}/variantes`, v); }
  updateVariante(productoId:any, varianteId:any, v:any){ return this.http.put(`${this.api}/productos/${productoId}/variantes/${varianteId}`, v); }
  deleteVariante(productoId:any, varianteId:any){ return this.http.delete(`${this.api}/productos/${productoId}/variantes/${varianteId}`); }

  recalcSaldosVentas(){
    return this.http.post<{ok:boolean; updated:number}>(`${this.api}/ventas/recalc-saldos`, {});
  }
}
