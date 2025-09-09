import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class InventarioService {
  api = 'http://localhost:3000/api';
  constructor(private http: HttpClient) {}

  // Productos
  listProductos() { return this.http.get<any[]>(`${this.api}/productos`); }
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
  listStock() { return this.http.get<any[]>(`${this.api}/stock`); }
  createStock(s: any) { return this.http.post(`${this.api}/stock`, s); }

  // Movimientos
  createMovimiento(m: any) { return this.http.post(`${this.api}/movimientos`, m); }
  listMovimientos() { return this.http.get<any[]>(`${this.api}/movimientos`); }
  getMovimiento(id:any) { return this.http.get<any>(`${this.api}/movimientos/${id}`); }
  // Variantes
  listVariantes(productoId:any){ return this.http.get<any[]>(`${this.api}/productos/${productoId}/variantes`); }
  createVariante(productoId:any, v:any){ return this.http.post(`${this.api}/productos/${productoId}/variantes`, v); }
  updateVariante(productoId:any, varianteId:any, v:any){ return this.http.put(`${this.api}/productos/${productoId}/variantes/${varianteId}`, v); }
  deleteVariante(productoId:any, varianteId:any){ return this.http.delete(`${this.api}/productos/${productoId}/variantes/${varianteId}`); }
}
