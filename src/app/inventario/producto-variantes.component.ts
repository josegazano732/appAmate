import { Component, OnInit } from '@angular/core';
import { InventarioService } from './inventario.service';
import { ActivatedRoute } from '@angular/router';
import { ToastService } from '../shared/toast.service';

@Component({
  selector: 'app-producto-variantes',
  template: `
    <div class="card mb-3"><div class="card-body">
      <h5>Variantes del producto</h5>
      <div *ngIf="producto" class="mb-2"><strong>{{producto.ProductoDescripcion}}</strong> (ID: {{producto.ProductoID}})</div>
      <div class="row g-2 mb-2">
        <div class="col-md-3"><input class="form-control" placeholder="Codigo (barcode)" [(ngModel)]="v.Codigo" name="vcod" /></div>
        <div class="col-md-2"><select class="form-control" [(ngModel)]="v.Medida" name="vmed"><option value="unidad">Unidad</option><option value="pack">Pack</option><option value="pallet">Pallet</option></select></div>
        <div class="col-md-2"><input type="number" class="form-control" [(ngModel)]="v.UnitsPerPack" name="vunits" placeholder="Units/Pack"/></div>
        <div class="col-md-2"><input type="number" class="form-control" [(ngModel)]="v.PacksPerPallet" name="vpacks" placeholder="Packs/Pallet"/></div>
        <div class="col-md-1"><button class="btn btn-primary" (click)="guardar()">Agregar</button></div>
      </div>
      <table class="table table-sm" *ngIf="variantes?.length">
        <thead><tr><th>VarianteID</th><th>Codigo</th><th>Medida</th><th>Units/Pack</th><th>Packs/Pallet</th><th></th></tr></thead>
        <tbody>
          <tr *ngFor="let it of variantes">
            <td>{{it.VarianteID}}</td>
            <td>{{it.Codigo}}</td>
            <td>{{it.Medida}}</td>
            <td>{{it.UnitsPerPack}}</td>
            <td>{{it.PacksPerPallet}}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-secondary me-1" (click)="editar(it)">Editar</button>
              <button class="btn btn-sm btn-outline-danger" (click)="borrar(it)">Eliminar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div></div>
  `
})
export class ProductoVariantesComponent implements OnInit {
  producto: any = null;
  variantes: any[] = [];
  v: any = { Codigo: '', Medida: 'unidad', UnitsPerPack: 1, PacksPerPallet: 1 };
  productoId: any = null;
  editingVarianteId: any = null;
  constructor(private inv: InventarioService, private route: ActivatedRoute, private toast: ToastService) {}
  ngOnInit(): void {
    this.productoId = this.route.snapshot.paramMap.get('id');
    if (!this.productoId) return;
    this.inv.getProducto(this.productoId).subscribe(p => this.producto = p || {});
    this.load();
  }
  load(){ this.inv.listVariantes(this.productoId).subscribe(r => this.variantes = r || []); }
  guardar(){
    if (!this.v.Codigo) { this.toast.error('Ingrese codigo'); return; }
    if (this.editingVarianteId) {
      this.inv.updateVariante(this.productoId, this.editingVarianteId, this.v).subscribe(()=>{
        this.toast.success('Variante actualizada'); this.editingVarianteId = null; this.v = { Codigo:'', Medida:'unidad', UnitsPerPack:1, PacksPerPallet:1 }; this.load();
      }, (err:any)=> this.toast.error(err?.error?.error || 'Error al actualizar'));
      return;
    }
    this.inv.createVariante(this.productoId, this.v).subscribe(()=>{ this.toast.success('Variante creada'); this.v = { Codigo:'', Medida:'unidad', UnitsPerPack:1, PacksPerPallet:1 }; this.load(); }, (err:any)=> this.toast.error(err?.error?.error || 'Error') );
  }
  editar(item:any){ this.editingVarianteId = item.VarianteID; this.v = { Codigo: item.Codigo, Medida: item.Medida || 'unidad', UnitsPerPack: item.UnitsPerPack || 1, PacksPerPallet: item.PacksPerPallet || 1 }; }
  cancelar(){ this.editingVarianteId = null; this.v = { Codigo:'', Medida:'unidad', UnitsPerPack:1, PacksPerPallet:1 }; }
  borrar(item:any){ if (!confirm('Confirma eliminar variante?')) return; this.inv.deleteVariante(this.productoId, item.VarianteID).subscribe(()=>{ this.toast.success('Variante eliminada'); this.load(); }, (err:any)=> this.toast.error(err?.error?.error || 'Error al eliminar')); }
}
