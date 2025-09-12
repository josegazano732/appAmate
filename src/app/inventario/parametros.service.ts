import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PaymentMethod {
  PaymentMethodID: number;
  Nombre: string;
  Codigo?: string;
  Activo: number; // 1 activo, 0 inactivo
  RequiereBanco: number; // 1/0
  RequiereDatos: number; // 1/0 (datos adicionales como nro cheque, etc.)
}

export interface Bank {
  BankID: number;
  Nombre: string;
  Codigo?: string;
  Activo: number; // 1 activo, 0 inactivo
}

@Injectable({ providedIn: 'root' })
export class ParametrosService {
  private api = 'http://localhost:3000/api';
  constructor(private http: HttpClient) {}

  // Cache en memoria simple
  private _pmCache: PaymentMethod[] | null = null;
  private _banksCache: Bank[] | null = null;
  private _pmCacheTs = 0;
  private _banksCacheTs = 0;
  private cacheTTL = 60_000; // 60s

  // Payment Methods
  listPaymentMethods(includeInactive=false): Observable<PaymentMethod[]> {
    const now = Date.now();
    if(!includeInactive && this._pmCache && (now - this._pmCacheTs) < this.cacheTTL){
      return new Observable(obs=>{ obs.next(this._pmCache as PaymentMethod[]); obs.complete(); });
    }
    return new Observable(obs => {
      this.http.get<PaymentMethod[]>(`${this.api}/payment-methods`, { params: includeInactive? { includeInactive: '1'}: {} }).subscribe({
        next: rows => { if(!includeInactive){ this._pmCache = rows; this._pmCacheTs = Date.now(); } obs.next(rows); obs.complete(); },
        error: err => { obs.error(err); }
      });
    });
  }
  createPaymentMethod(body: Partial<PaymentMethod> & { Nombre: string }): Observable<any> { return this.http.post(`${this.api}/payment-methods`, body); }
  patchPaymentMethod(id:number, body: Partial<PaymentMethod>): Observable<any> { return this.http.patch(`${this.api}/payment-methods/${id}`, body); }

  // Banks
  listBanks(includeInactive=false): Observable<Bank[]> {
    const now = Date.now();
    if(!includeInactive && this._banksCache && (now - this._banksCacheTs) < this.cacheTTL){
      return new Observable(obs=>{ obs.next(this._banksCache as Bank[]); obs.complete(); });
    }
    return new Observable(obs => {
      this.http.get<Bank[]>(`${this.api}/banks`, { params: includeInactive? { includeInactive: '1'}: {} }).subscribe({
        next: rows => { if(!includeInactive){ this._banksCache = rows; this._banksCacheTs = Date.now(); } obs.next(rows); obs.complete(); },
        error: err => { obs.error(err); }
      });
    });
  }
  createBank(body: Partial<Bank> & { Nombre: string }): Observable<any> { return this.http.post(`${this.api}/banks`, body); }
  patchBank(id:number, body: Partial<Bank>): Observable<any> { return this.http.patch(`${this.api}/banks/${id}`, body); }

  // Invalidación manual (llamar después de create/patch)
  invalidatePaymentMethods(){ this._pmCache = null; }
  invalidateBanks(){ this._banksCache = null; }
}
