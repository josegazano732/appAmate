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
              <button class="btn btn-sm btn-outline-success ms-1" (click)="showFactModal(m)">Facturar</button>
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

      <!-- Factura modal -->
      <div class="modal" tabindex="-1" [ngClass]="{'show d-block': factTarget}" *ngIf="factTarget">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Facturar movimiento {{factTarget?.MovimientoID}}</h5>
              <button type="button" class="btn-close" (click)="hideFactModal()"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label>Tipo de Comprobante</label>
                <select class="form-select" [(ngModel)]="factForm.TipoComp">
                  <option value="FA">Factura A</option>
                  <option value="FB">Factura B</option>
                  <option value="NC">Nota de Crédito</option>
                </select>
              </div>
              <div class="mb-3">
                <label>Punto de Venta</label>
                <input type="number" class="form-control" [(ngModel)]="factForm.PuntoVenta" min="1">
              </div>
              <div class="mb-3">
                <label>Número de Comprobante</label>
                <input type="number" class="form-control" [(ngModel)]="factForm.NumeroComp" min="1">
              </div>
              <div class="mb-3">
                <label>Descuento</label>
                <input type="number" class="form-control" [(ngModel)]="factForm.Descuento" min="0" step="0.01">
              </div>

              <h6>Detalles</h6>
              <table class="table table-sm">
                <thead><tr><th>Producto</th><th>Unidad</th><th>Precio</th><th>Cantidad</th><th>IVA</th></tr></thead>
                <tbody>
                  <tr *ngFor="let d of factDetalles">
                    <td>{{ nombreProducto(d.ProductoID) }}</td>
                    <td>{{d.Unidad ?? 0}}</td>
                    <td>{{d.Precio ?? 0 | number:'1.2-2'}}</td>
                    <td>{{d.Cantidad ?? 0}}</td>
                    <td>{{d.Iva ?? 0 | number:'1.2-2'}}</td>
                  </tr>
                  <tr *ngIf="factDetalles.length === 0"><td colspan="5" class="text-center">No hay detalles</td></tr>
                </tbody>
              </table>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="hideFactModal()">Cancelar</button>
              <button class="btn btn-primary" (click)="confirmFacturar()">Facturar</button>
            </div>
          </div>
        </div>
      </div>

          <!-- Facturar modal -->
          <div class="modal" tabindex="-1" [ngClass]="{'show d-block': factTarget}" *ngIf="factTarget">
            <div class="modal-dialog modal-lg">
              <div class="modal-content">
                <div class="modal-header"><h5 class="modal-title">Facturar movimiento {{factTarget?.MovimientoID}}</h5></div>
                <div class="modal-body">
                  <div class="mb-2 row">
                    <div class="col-4"><label>Tipo Comp</label><input class="form-control" [(ngModel)]="factForm.TipoComp" /></div>
                    <div class="col-3"><label>Punto Venta</label><input type="number" class="form-control" [(ngModel)]="factForm.PuntoVenta" /></div>
                    <div class="col-5"><label>Número</label><input class="form-control" [(ngModel)]="factForm.NumeroComp" /></div>
                  </div>
                  <div class="mb-2"><label>Descuento</label><input type="number" class="form-control" [(ngModel)]="factForm.Descuento" /></div>

                  <h6>Seleccionar IVA por línea</h6>
                  <table class="table table-sm">
                    <thead><tr><th>Producto</th><th>Cantidad</th><th>Precio unit.</th><th>IVA %</th></tr></thead>
                    <tbody>
                      <tr *ngFor="let d of factDetalles">
                        <td>{{ nombreProducto(d.ProductoID) }}</td>
                        <td>{{ (d.Unidad||0) + (d.Pack||0) + (d.Pallets||0) }}</td>
                        <td>{{ (d.PrecioUnitario || 0) | number:'1.2-2' }}</td>
                        <td>
                          <select class="form-select form-select-sm" [(ngModel)]="factForm.lineIva[d.ProductoID]">
                            <option [value]="0">0%</option>
                            <option [value]="10">10%</option>
                            <option [value]="21">21%</option>
                          </select>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="modal-footer">
                  <button class="btn btn-secondary" (click)="hideFactModal()">Cancelar</button>
                  <button class="btn btn-primary" (click)="confirmFacturar()">Facturar</button>
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

  // Facturación
  factTarget: any = null;
  factForm: any = { TipoComp: 'FA', PuntoVenta: 10, NumeroComp: '', Descuento: 0, lineIva: {} };
  factDetalles: any[] = [];

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

  showFactModal(m:any){ this.factTarget = m; this.factForm = { TipoComp: 'FA', PuntoVenta: 10, NumeroComp: '', Descuento: 0, lineIva: {} }; this.factDetalles = []; 
    this.inv.getMovimiento(m.MovimientoID).subscribe((res:any)=>{ this.factDetalles = res?.detalles || []; });
  }
  hideFactModal(){ this.factTarget = null; this.factForm = { TipoComp: 'FA', PuntoVenta: 10, NumeroComp: '', Descuento: 0, lineIva: {} }; this.factDetalles = []; }
  confirmFacturar(){
    if (!this.factTarget) return;
    this.inv.facturarMovimiento(this.factTarget.MovimientoID, this.factForm).subscribe((r:any)=>{
      this.toast.success('Factura creada: ' + r.VentaID);
      this.hideFactModal(); this.load();
    }, (e:any)=>{ this.toast.error('Error al facturar'); });
  }

  nombreProducto(pid:any){ return this.productosMap[pid] || pid; }
  nombreDeposito(id:any){ return this.depositosMap[id] || id; }
  nombreSector(id:any){ return this.sectoresMap[id] || id; }
}
