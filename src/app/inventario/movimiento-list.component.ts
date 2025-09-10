import { Component, OnInit } from '@angular/core';
import { InventarioService } from './inventario.service';
import { ToastService } from '../shared/toast.service';

@Component({
  selector: 'app-movimiento-list',
  template: `
    <div class="card mb-3"><div class="card-body">
      <h5>Movimientos</h5>
      <div class="mb-2 text-end"><a class="btn btn-sm btn-primary" routerLink="/inventario/movimientos/new">Nuevo Movimiento</a></div>
      <table class="table table-sm">
        <thead><tr><th>ID</th><th>Tipo</th><th>Fecha</th><th>Remito</th><th>Origen</th><th>Destino</th><th></th></tr></thead>
        <tbody>
            <tr *ngFor="let m of movimientos">
            <td>{{m.MovimientoID}}</td>
            <td>{{m.Tipo}}</td>
            <td>{{m.Fecha}}</td>
            <td>{{m.RemitoNumero || '-'}}</td>
            <td>{{m.OrigenDepositoID || '-'}} / {{m.OrigenSectorID || '-'}}</td>
            <td>{{m.DestinoDepositoID || '-'}} / {{m.DestinoSectorID || '-'}}</td>
            <td>
              <button class="btn btn-sm btn-outline-secondary me-1" (click)="showDetalle(m)">Ver</button>
              <button class="btn btn-sm btn-outline-danger" (click)="showRevertModal(m)">Revertir</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="selected" class="mt-3">
        <h6>Detalle movimiento {{selected.MovimientoID}}</h6>
        <table class="table table-sm"><thead><tr><th>Producto</th><th>Unidad</th><th>Pack</th><th>Pallets</th></tr></thead>
          <tbody>
            <tr *ngFor="let d of detalles"><td>{{d.ProductoID}}</td><td>{{d.Unidad}}</td><td>{{d.Pack}}</td><td>{{d.Pallets}}</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Revert modal -->
      <div class="modal" tabindex="-1" [ngClass]="{'show d-block': revertTarget}" *ngIf="revertTarget">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header"><h5 class="modal-title">Confirmar reversión</h5></div>
            <div class="modal-body">
              <div>¿Confirma revertir el movimiento {{revertTarget?.MovimientoID}}?</div>
              <div class="mt-2"><label>Motivo (opcional)</label><textarea class="form-control" [(ngModel)]="revertMotivo"></textarea></div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="hideRevertModal()">Cancelar</button>
              <button class="btn btn-danger" (click)="confirmRevert()">Revertir</button>
            </div>
          </div>
        </div>
      </div>

    </div></div>
  `
})
export class MovimientoListComponent implements OnInit {
  movimientos: any[] = [];
  selected: any = null;
  detalles: any[] = [];
  productosMap: Record<number,string> = {};
  depositosMap: Record<number,string> = {};
  sectoresMap: Record<number,string> = {};
  constructor(private inv: InventarioService, private toast: ToastService) {}
  ngOnInit(): void { this.load(); }
  load() { this.inv.listMovimientos().subscribe(r => this.movimientos = r || []); }
  showDetalle(m:any){ this.selected = m; this.inv.getMovimiento(m.MovimientoID).subscribe((res:any) => {
      this.detalles = res?.detalles || [];
      // cargar referencias si hace falta
      this.inv.listProductos().subscribe(ps => { (ps||[]).forEach((p:any)=> this.productosMap[p.ProductoID]=`${p.Codigo} - ${p.ProductoDescripcion}`); });
      this.inv.listDepositos().subscribe(ds => { (ds||[]).forEach((d:any)=> this.depositosMap[d.DepositoID]=d.Nombre); });
      this.inv.listSectores().subscribe(ss => { (ss||[]).forEach((s:any)=> this.sectoresMap[s.SectorID]=s.Nombre); });
    }, ()=> this.detalles = []);
  }
  // Modal-driven revert
  revertTarget: any = null;
  revertMotivo: string = '';
  showRevertModal(m:any){ this.revertTarget = m; this.revertMotivo = ''; }
  hideRevertModal(){ this.revertTarget = null; this.revertMotivo = ''; }
  confirmRevert(){
    const m = this.revertTarget; if (!m) return; const motivo = this.revertMotivo || 'Reversión automática'; this.hideRevertModal();
    this.inv.revertMovimiento(m.MovimientoID, motivo).subscribe((r:any)=>{ this.toast.success('Reversión creada: ' + r.MovimientoID); this.load(); }, (e:any)=>{ this.toast.error('Error al revertir'); });
  }
  nombreProducto(pid:any){ return this.productosMap[pid] || pid; }
  nombreDeposito(id:any){ return this.depositosMap[id] || id; }
  nombreSector(id:any){ return this.sectoresMap[id] || id; }
}
