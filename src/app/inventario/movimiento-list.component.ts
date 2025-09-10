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
        <thead>
          <tr>
            <th>ID</th>
            <th>Tipo</th>
            <th>Fecha</th>
            <th>Remito</th>
            <th>Nota</th>
            <th>Origen</th>
            <th>Destino</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let m of movimientos">
            <td>{{m.MovimientoID}}</td>
            <td>{{m.Tipo}}</td>
            <td>{{m.Fecha | date:'short'}}</td>
            <td>{{m.RemitoNumero || '-'}}</td>

            <!-- Nota vinculada -->
            <td>
              <ng-container *ngIf="m.NotaPedidoID; else noNota">
                <a [routerLink]="['/notas', m.NotaPedidoID]">#{{ m.NotaPedidoID }}</a>
              </ng-container>
              <ng-template #noNota>-</ng-template>
            </td>

            <!-- Mostrar nombres (si el backend los provee) o fallback a mapas precargados -->
            <td>
              {{ m.OrigenDepositoNombre || nombreDeposito(m.OrigenDepositoID) || '-' }}
              &nbsp;/&nbsp;
              {{ m.OrigenSectorNombre || nombreSector(m.OrigenSectorID) || '-' }}
            </td>
            <td>
              {{ m.DestinoDepositoNombre || nombreDeposito(m.DestinoDepositoID) || '-' }}
              &nbsp;/&nbsp;
              {{ m.DestinoSectorNombre || nombreSector(m.DestinoSectorID) || '-' }}
            </td>

            <td>
              <button class="btn btn-sm btn-outline-secondary me-1" (click)="showDetalle(m)">Ver</button>
              <button class="btn btn-sm btn-outline-danger" (click)="showRevertModal(m)">Revertir</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="selected" class="mt-3">
        <h6>Detalle movimiento {{selected.MovimientoID}}</h6>
        <table class="table table-sm">
          <thead><tr><th>Producto</th><th>Unidad</th><th>Pack</th><th>Pallets</th></tr></thead>
          <tbody>
            <tr *ngFor="let d of detalles">
              <td>{{ nombreProducto(d.ProductoID) }}</td>
              <td>{{d.Unidad ?? 0}}</td>
              <td>{{d.Pack ?? 0}}</td>
              <td>{{d.Pallets ?? d.Pallet ?? 0}}</td>
            </tr>
            <tr *ngIf="detalles.length === 0"><td colspan="4" class="text-center">No hay detalles</td></tr>
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

  revertTarget: any = null;
  revertMotivo: string = '';

  constructor(private inv: InventarioService, private toast: ToastService) {}

  ngOnInit(): void {
    // precargar mapas para fallback si el backend no devuelve nombres
    this.inv.listDepositos().subscribe(ds => { (ds||[]).forEach((d:any)=> this.depositosMap[d.DepositoID]=d.Nombre); });
    this.inv.listSectores().subscribe(ss => { (ss||[]).forEach((s:any)=> this.sectoresMap[s.SectorID]=s.Nombre); });
    this.inv.listProductos().subscribe(ps => { (ps||[]).forEach((p:any)=> this.productosMap[p.ProductoID]=`${p.Codigo} - ${p.ProductoDescripcion}`); });

    this.load();
  }

  load() {
    this.inv.listMovimientos().subscribe(r => {
      console.log('DEBUG listMovimientos raw response:', r); // temporal para debug
      this.movimientos = (r || []).map(m => ({
        ...m,
        OrigenDepositoNombre: m.OrigenDepositoNombre ?? this.depositosMap[m.OrigenDepositoID],
        OrigenSectorNombre: m.OrigenSectorNombre ?? this.sectoresMap[m.OrigenSectorID],
        DestinoDepositoNombre: m.DestinoDepositoNombre ?? this.depositosMap[m.DestinoDepositoID],
        DestinoSectorNombre: m.DestinoSectorNombre ?? this.sectoresMap[m.DestinoSectorID],
      }));
    }, err => {
      console.error('Error listMovimientos', err);
    });
  }

  showDetalle(m:any){
    this.selected = m;
    this.inv.getMovimiento(m.MovimientoID).subscribe((res:any) => {
      this.detalles = res?.detalles || [];
      // asegurar que tenemos nombres/descripcion de productos si faltan
      this.detalles.forEach((d:any) => {
        if (d.ProductoID && !this.productosMap[d.ProductoID]) {
          this.inv.getProducto(d.ProductoID).subscribe((p:any)=> { if(p) this.productosMap[p.ProductoID]=`${p.Codigo} - ${p.ProductoDescripcion}`; });
        }
      });
    }, ()=> this.detalles = []);
  }

  showRevertModal(m:any){ this.revertTarget = m; this.revertMotivo = ''; }
  hideRevertModal(){ this.revertTarget = null; this.revertMotivo = ''; }

  confirmRevert(){
    const m = this.revertTarget; if (!m) return;
    const motivo = this.revertMotivo || 'Reversión automática'; this.hideRevertModal();
    this.inv.revertMovimiento(m.MovimientoID, motivo).subscribe((r:any)=>{
      this.toast.success('Reversión creada: ' + r.MovimientoID);
      this.load();
    }, (e:any)=>{
      this.toast.error('Error al revertir');
    });
  }

  nombreProducto(pid:any){ return this.productosMap[pid] || pid; }
  nombreDeposito(id:any){ return this.depositosMap[id] || id; }
  nombreSector(id:any){ return this.sectoresMap[id] || id; }
}
