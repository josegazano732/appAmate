import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Cliente } from './cliente.model';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private apiUrl = 'http://localhost:3000/api/clientes';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(this.apiUrl);
  }

  getById(id: number): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.apiUrl}/${id}`);
  }

  add(cliente: Cliente): Observable<any> {
    return this.http.post(this.apiUrl, cliente);
  }

  update(cliente: Cliente): Observable<any> {
    return this.http.put(`${this.apiUrl}/${cliente.ClienteID}`, cliente);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
