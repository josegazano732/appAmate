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
      <div class="row mb-2">
        <div class="col-md-4"><select class="form-control" [(ngModel)]="filterDeposito" name="filterDep" (ngModelChange)="loadSectores()"><option [ngValue]="null">--Filtrar por depósito--</option><option *ngFor="let d of depositos" [ngValue]="d.DepositoID">{{d.Nombre}}</option></select></div>
      </div>
      <div class="d-flex gap-2">
        <select class="form-control" [(ngModel)]="sector.DepositoID" name="sectorDep"><option *ngFor="let d of depositos" [ngValue]="d.DepositoID">{{d.Nombre}}</option></select>
        <input class="form-control" placeholder="Nombre sector" [(ngModel)]="sector.Nombre" name="sec" />
        <button class="btn btn-primary" (click)="guardarSector()">Guardar</button>
      </div>
      <div class="mt-2">
        <ul class="list-group">
          <li class="list-group-item" *ngFor="let s of sectores">{{s.Nombre}} <small class="text-muted">(Dep: {{getDepositoName(s.DepositoID)}})</small></li>
        </ul>
      </div>
    </div></div>
  `
})
export class DepositoSectorFormComponent implements OnInit {
  deposito: any = {};
  sector: any = {};
  successMessage: string | null = null;
  errorMessage: string | null = null;
  depositos: any[] = [];
  sectores: any[] = [];
  filterDeposito: any = null;
  constructor(private inv: InventarioService, private toast: ToastService) {}
  ngOnInit(): void { this.loadDepositos(); this.loadSectores(); }
  loadDepositos(){ this.inv.listDepositos().subscribe(r => this.depositos = r || []); }
  loadSectores(){ if (this.filterDeposito) this.inv.listSectoresByDeposito(this.filterDeposito).subscribe(r=> this.sectores = r || []); else this.inv.listSectores().subscribe(r=> this.sectores = r || []); }
  guardarDeposito() { this.inv.createDeposito(this.deposito).subscribe(() => { this.deposito = {}; this.toast.success('Depósito creado'); this.loadDepositos(); }, (err:any)=> { this.toast.error(err?.error?.error || 'Error al crear depósito'); }); }
  guardarSector() { this.inv.createSector(this.sector).subscribe(() => { this.sector = {}; this.filterDeposito = null; this.toast.success('Sector creado'); this.loadSectores(); }, (err:any)=> { this.toast.error(err?.error?.error || 'Error al crear sector'); }); }
  getDepositoName(id:any){ const d = (this.depositos||[]).find(x=>x.DepositoID==id); return d? d.Nombre : id; }
}
