import { Component, OnInit } from '@angular/core';
import { InventarioService } from './inventario.service';
import { ToastService } from '../shared/toast.service';

@Component({
  selector: 'app-deposito-sector-form',
  template: `
    <div class="card mb-3"><div class="card-body">
      <h5>Depósitos</h5>
      <div *ngIf="successMessage" class="alert alert-success">{{ successMessage }}</div>
      <div *ngIf="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>
      <div class="d-flex gap-2">
        <input class="form-control" placeholder="Nombre deposito" [(ngModel)]="deposito.Nombre" name="dep" />
        <button class="btn btn-primary" (click)="guardarDeposito()">Guardar</button>
      </div>
      <h5 class="mt-3">Sectores</h5>
      <div class="d-flex gap-2">
        <input class="form-control" placeholder="Nombre sector" [(ngModel)]="sector.Nombre" name="sec" />
        <button class="btn btn-primary" (click)="guardarSector()">Guardar</button>
      </div>
    </div></div>
  `
})
export class DepositoSectorFormComponent implements OnInit {
  deposito: any = {};
  sector: any = {};
  successMessage: string | null = null;
  errorMessage: string | null = null;
  constructor(private inv: InventarioService, private toast: ToastService) {}
  ngOnInit(): void {}
  guardarDeposito() { this.inv.createDeposito(this.deposito).subscribe(() => { this.deposito = {}; this.toast.success('Depósito creado'); }, (err:any)=> { this.toast.error(err?.error?.error || 'Error al crear depósito'); }); }
  guardarSector() { this.inv.createSector(this.sector).subscribe(() => { this.sector = {}; this.toast.success('Sector creado'); }, (err:any)=> { this.toast.error(err?.error?.error || 'Error al crear sector'); }); }
}
