import { Component, OnInit } from '@angular/core';
import { InventarioService } from './inventario.service';
import { ToastService } from '../shared/toast.service';

@Component({
  selector: 'app-movimiento-form',
  template: `
    <div class="card mb-3"><div class="card-body">
      <h5>Nuevo Movimiento</h5>
      <div *ngIf="successMessage" class="alert alert-success">{{ successMessage }}</div>
      <div *ngIf="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>
      <div class="row">
        <div class="col-md-3">
          <label>Tipo</label>
          <select class="form-control" [(ngModel)]="m.Tipo" name="tipo">
            <option value="Remito">Remito (Salida)</option>
            <option value="Transfer">Transferencia</option>
          </select>
        </div>
        <div class="col-md-3">
          <label>Origen Deposito</label>
          <select class="form-control" [(ngModel)]="m.OrigenDepositoID" name="origenDep">
            <option *ngFor="let d of depositos" [value]="d.DepositoID">{{d.Nombre}}</option>
          </select>
        </div>
        <div class="col-md-3">
          <label>Origen Sector</label>
          <select class="form-control" [(ngModel)]="m.OrigenSectorID" name="origenSec">
            <option *ngFor="let s of sectores" [value]="s.SectorID">{{s.Nombre}}</option>
          </select>
        </div>
        <div class="col-md-3">
          <label>Destino Deposito</label>
          <select class="form-control" [(ngModel)]="m.DestinoDepositoID" name="destDep">
            <option *ngFor="let d of depositos" [value]="d.DepositoID">{{d.Nombre}}</option>
          </select>
        </div>
      </div>
      <div class="row mt-2">
        <div class="col-md-3"><label>Destino Sector</label>
          <select class="form-control" [(ngModel)]="m.DestinoSectorID" name="destSec"><option *ngFor="let s of sectores" [value]="s.SectorID">{{s.Nombre}}</option></select>
        </div>
        <div class="col-md-3"><label>Remito Nº</label><input class="form-control" [(ngModel)]="m.RemitoNumero" name="remito"/></div>
        <div class="col-md-6 text-end"><button class="btn btn-primary mt-4" (click)="guardar()">Guardar Movimiento</button></div>
      </div>

      <hr />
      <h6>Detalles</h6>
      <table class="table table-sm">
        <thead><tr><th>Producto</th><th>Unidad</th><th>Pack</th><th>Pallets</th><th></th></tr></thead>
        <tbody>
          <tr *ngFor="let d of detalles; let i = index">
            <td>
              <select class="form-control" [(ngModel)]="d.ProductoID" name="prod{{i}}"><option *ngFor="let p of productos" [value]="p.ProductoID">{{p.Codigo}} - {{p.ProductoDescripcion}}</option></select>
            </td>
            <td><input class="form-control" type="number" [(ngModel)]="d.Unidad" name="u{{i}}"/></td>
            <td><input class="form-control" type="number" [(ngModel)]="d.Pack" name="pa{{i}}"/></td>
            <td><input class="form-control" type="number" [(ngModel)]="d.Pallets" name="pal{{i}}" step="0.000001"/></td>
            <td><button class="btn btn-sm btn-danger" (click)="removeDetalle(i)">X</button></td>
          </tr>
        </tbody>
      </table>
      <button class="btn btn-sm btn-secondary" (click)="addDetalle()">Agregar detalle</button>

    </div></div>
  `
})
export class MovimientoFormComponent implements OnInit {
  depositos: any[] = [];
  sectores: any[] = [];
  productos: any[] = [];
  m: any = { Tipo: 'Remito', Fecha: new Date().toISOString().slice(0,10) };
  detalles: any[] = [];
  successMessage: string | null = null;
  errorMessage: string | null = null;
  constructor(private inv: InventarioService, private toast: ToastService) {}
  ngOnInit(): void { this.loadRefs(); }
  loadRefs() { this.inv.listDepositos().subscribe(r => this.depositos = r || []); this.inv.listSectores().subscribe(r => this.sectores = r || []); this.inv.listProductos().subscribe(r => this.productos = r || []); }
  addDetalle() { this.detalles.push({ ProductoID: null, Unidad:0, Pack:0, Pallets:0 }); }
  removeDetalle(i:number){ this.detalles.splice(i,1); }
  guardar(){
    this.m.detalles = this.detalles;
    this.inv.createMovimiento(this.m).subscribe(() => {
      this.toast.success('Movimiento registrado');
      this.detalles = [];
    }, (err:any) => {
      this.toast.error(err?.error?.error || 'Error al registrar movimiento');
    });
  }
}
