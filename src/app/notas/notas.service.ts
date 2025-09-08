import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { NotaPedido, NotaDetalle } from './nota.model';

@Injectable({ providedIn: 'root' })
export class NotasService {
  private api = 'http://localhost:3000/api';
  constructor(private http: HttpClient) {}

  list(): Observable<NotaPedido[]> {
    return this.http.get<NotaPedido[]>(`${this.api}/notas-pedido`);
  }

  listPaged(limit: number, offset: number) {
    return this.http.get<{ items: NotaPedido[]; total: number }>(`${this.api}/notas-pedido`, { params: { limit: String(limit), offset: String(offset) } });
  }

  get(id: number) {
    return this.http.get<any>(`${this.api}/notas-pedido/${id}`);
  }

  create(nota: NotaPedido, detalles: NotaDetalle[]) {
    return this.http.post(`${this.api}/notas-pedido`, { nota, detalles });
  }

  delete(id: number) {
    return this.http.delete(`${this.api}/notas-pedido/${id}`);
  }
}
