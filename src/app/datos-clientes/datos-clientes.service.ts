import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DatosCliente } from './datos-cliente.model';

@Injectable({ providedIn: 'root' })
export class DatosClientesService {
  eliminarTodos(): Observable<any> {
    return this.http.delete<any>(this.apiUrl);
  }
  private apiUrl = 'http://localhost:3000/api/datos-clientes';

  constructor(private http: HttpClient) {}

  getAll(): Observable<DatosCliente[]> {
    return this.http.get<DatosCliente[]>(this.apiUrl);
  }

  getById(id: number): Observable<DatosCliente> {
    return this.http.get<DatosCliente>(`${this.apiUrl}/${id}`);
  }

  getByClienteId(clienteId: number): Observable<DatosCliente[]> {
    return this.http.get<DatosCliente[]>(`${this.apiUrl}/cliente/${clienteId}`);
  }

  add(datos: DatosCliente): Observable<any> {
    return this.http.post(this.apiUrl, datos);
  }

  update(datos: DatosCliente): Observable<any> {
    return this.http.put(`${this.apiUrl}/${datos.DatosID}`, datos);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
