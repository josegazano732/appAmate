import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NotasService } from './notas.service';
import { ToastService } from '../shared/toast.service';
import { InventarioService } from '../inventario/inventario.service';

@Component({
  selector: 'app-remito-form',
  template: `
    <div class="card">
      <div class="card-body">
        <h5>Generar Remito para Nota {{nota?.NotaPedidoID}}</h5>
        <div *ngIf="nota">
          <div class="mb-2">Estado remito: <span class="badge bg-info text-dark">{{nota.EstadoRemito || 'Sin Remito'}}</span></div>
          <div class="mb-2">Cliente: {{nota.NombreFiscal}}</div>
          <div class="mb-2">Fecha: {{nota.Fecha}}</div>
          <label>Remito Numero</label>
          <input class="form-control mb-2" [(ngModel)]="remitoNum" name="remNum" />

          <label>Origen Deposito</label>
          <select class="form-select mb-2" [(ngModel)]="origenDeposito" name="origDep" (ngModelChange)="onDepositoChange($event)">
            <option *ngFor="let d of depositos" [value]="d.DepositoID">{{d.Nombre}} (ID: {{d.DepositoID}}) <span *ngIf="d.anyAvailable"> - tiene stock</span></option>
          </select>

          <label>Origen Sector</label>
          <select class="form-select mb-2" [(ngModel)]="origenSector" name="origSec">
            <option *ngFor="let s of sectores" [value]="s.SectorID">{{s.Nombre}} (ID: {{s.SectorID}})</option>
          </select>

          <h6>Detalles</h6>
          <table class="table table-sm">
            <thead><tr><th>Codigo</th><th>Cantidad</th><th>Medida</th><th>Columna usada</th></tr></thead>
            <tbody>
              <tr *ngFor="let d of detalles">
                <td>{{d.Codigo}}</td>
                <td><input class="form-control form-control-sm" [(ngModel)]="d.Cantidad" /></td>
                <td>{{d.Medida}}</td>
                <td>{{columnFor(d)}}</td>
              </tr>
            </tbody>
          </table>

          <div *ngIf="disponibilidadPreview?.length">
            <h6>Disponibilidad en depósito seleccionado</h6>
            <table class="table table-sm">
              <thead><tr><th>Codigo</th><th>Disponible (Unidad / Pack / Pallet)</th><th>Solicitado (según medida)</th></tr></thead>
              <tbody>
                <tr *ngFor="let p of disponibilidadPreview">
                  <td>{{p.Codigo}}</td>
                  <td>
                    U: {{p.available?.Unidad || 0}} / P: {{p.available?.Pack || 0}} / PL: {{p.available?.Pallets || 0}}
                  </td>
                  <td>
                    {{requestedFor(p.Codigo)}} (col: {{columnForCodigo(p.Codigo)}})
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="form-check mb-2">
            <input class="form-check-input" type="checkbox" id="forzar" [(ngModel)]="forzar" name="forzar" />
            <label class="form-check-label" for="forzar">Forzar remito aunque falte stock</label>
          </div>

          <div class="mt-2 text-end">
            <button class="btn btn-primary" (click)="generar()" [disabled]="(nota.EstadoRemito||'').toString().toLowerCase() === 'remitido'">Generar Remito</button>
            <button class="btn btn-secondary ms-2" (click)="cancel()">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RemitoFormComponent implements OnInit {
  nota: any = null;
  detalles: any[] = [];
  remitoNum = '';
  origenDeposito: any = null;
  origenSector: any = null;
  depositos: any[] = [];
  sectores: any[] = [];
  disponibilidadPreview: any[] = [];
  forzar: boolean = false;
  notaId: any = null;
  constructor(private route: ActivatedRoute, private notas: NotasService, private toast: ToastService, private router: Router, private inv: InventarioService) {}
  ngOnInit(): void {
    this.notaId = this.route.snapshot.paramMap.get('id');
    if (!this.notaId) return;
    this.notas.prepareRemito(this.notaId).subscribe((r:any)=>{
      this.nota = r.nota;
      this.detalles = r.detalles || [];
    }, (err:any)=> this.toast.error(err?.error?.error || 'Error al preparar remito'));
    // cargar depositos y sectores
  // load depositos with availability for this nota
    this.notas.depositosDisponibles(this.notaId).subscribe((list:any[])=>{
      this.depositos = (list || []).filter(x => x.anyAvailable || true); // show all but prefer those with availability
      // prefer depositos with anyAvailable
      const pref = (this.depositos || []).find(d => d.anyAvailable) || (this.depositos.length ? this.depositos[0] : null);
  if (pref) { this.origenDeposito = pref.DepositoID; this.loadSectores(this.origenDeposito); this.disponibilidadPreview = pref.details || []; }
    }, ()=>{
      // fallback to simple list
      this.inv.listDepositos().subscribe((ds:any[])=>{ this.depositos = ds || []; if (this.depositos.length) { this.origenDeposito = this.depositos[0].DepositoID; this.loadSectores(this.origenDeposito);} }, ()=>{});
    });
  }
  columnFor(d:any){
    const med = (d?.Medida || '').toString().toLowerCase();
    if (med === 'unidad' || med === 'u') return 'Unidad';
    if (med === 'pack') return 'Pack';
    if (med === 'pallet' || med === 'pallets') return 'Pallets';
    return 'Unidad';
  }
  columnForCodigo(codigo:any){
    const det = (this.detalles || []).find(x => x.Codigo == codigo);
    return det ? this.columnFor(det) : '-';
  }
  requestedFor(codigo:any){
    const det = (this.detalles || []).find(x => x.Codigo == codigo);
    if (!det) return 0;
    const col = this.columnFor(det);
    if (col === 'Unidad') return det.Cantidad || 0;
    if (col === 'Pack') return det.Cantidad || 0;
    if (col === 'Pallets') return det.Cantidad || 0;
    return det.Cantidad || 0;
  }
  loadSectores(depId:any){
    this.sectores = [];
    if (!depId) return;
    this.inv.listSectoresByDeposito(depId).subscribe((s:any[])=>{ this.sectores = s || []; if (this.sectores.length) this.origenSector = this.sectores[0].SectorID; }, ()=>{});
  }
  onDepositoChange(depId:any){
    this.loadSectores(depId);
    // fetch availability preview for this deposito
    this.notas.prepareRemito(this.notaId, ).subscribe(()=>{} , ()=>{});
    // call depositosDisponibles to get details per codigo for selected deposito
    this.notas.depositosDisponibles(this.notaId).subscribe((list:any[])=>{
      const sel = (list || []).find(x => x.DepositoID == depId);
      this.disponibilidadPreview = sel ? (sel.details || []) : [];
    }, ()=>{ this.disponibilidadPreview = []; });
  }
  generar(){
    if (!this.origenDeposito) { this.toast.error('Seleccione un depósito de origen'); return; }
    if (!this.origenSector) { this.toast.error('Seleccione un sector de origen'); return; }
  const body = { RemitoNumero: this.remitoNum, OrigenDepositoID: Number(this.origenDeposito), OrigenSectorID: Number(this.origenSector), Observaciones: '', Forzar: !!this.forzar };
  this.notas.createRemito(this.notaId, body).subscribe((r:any)=>{ this.toast.success('Remito generado'); this.router.navigate(['/notas']); }, (err:any)=> this.toast.error(err?.error?.error || 'Error al generar remito'));
  }
  cancel(){ this.router.navigate(['/notas']); }
}
