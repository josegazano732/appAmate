import { Component, OnInit } from '@angular/core';
import { InventarioService } from './inventario.service';
import { Router } from '@angular/router';
import { ToastService } from '../shared/toast.service';

@Component({
  selector: 'app-productos-list',
  template: `
    <div class="card mb-3">
      <div class="card-body">
        <h5>Productos</h5>
        <div class="d-flex justify-content-between mb-2">
          <div *ngIf="!productos?.length" class="text-muted">No hay productos registrados.</div>
          <div><button class="btn btn-sm btn-primary" (click)="newProducto()">Nuevo Producto</button></div>
        </div>
        <table *ngIf="productos?.length" class="table table-sm">
          <thead>
            <tr>
              <th>Codigo</th>
              <th>Descripcion</th>
              <th>Medida</th>
              <th class="text-end"></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of productos">
              <td>{{p.Codigo}}</td>
              <td>{{p.ProductoDescripcion}}</td>
              <td>{{p.DefaultMeasure || p.TipoUnidad || '-'}}</td>
              <td class="text-end">
                <button class="btn btn-sm btn-outline-secondary me-1" (click)="edit(p)">Editar</button>
                <button class="btn btn-sm btn-outline-secondary me-1" (click)="irAVariantes(p)">Variantes</button>
                <button class="btn btn-sm btn-outline-danger" (click)="del(p)">Eliminar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class ProductosListComponent implements OnInit {
  productos: any[] = [];
  constructor(private inv: InventarioService, private router: Router, private toast: ToastService) {}
  ngOnInit(): void { this.load(); }
  load() {
  this.inv.listProductos().subscribe(r => { this.productos = r || []; });
  }
  edit(p:any){ this.router.navigate(['/inventario/productos/edit', p.ProductoID]); }
  newProducto(){ this.router.navigate(['/inventario/productos/new']); }
  del(p:any){ if (!confirm('Confirma eliminar producto?')) return; this.inv.deleteProducto(p.ProductoID).subscribe(()=>{ this.toast.success('Producto eliminado'); this.load(); }, (err:any)=> this.toast.error(err?.error?.error || 'Error al eliminar') ); }
  irAVariantes(p:any){ this.router.navigate(['/inventario/productos', p.ProductoID, 'variantes']); }
}
