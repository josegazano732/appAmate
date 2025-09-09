import { Component } from '@angular/core';
import { InventarioService } from './inventario.service';
import { ToastService } from '../shared/toast.service';
import { ActivatedRoute, Router } from '@angular/router';

import { debounceTime, Subject } from 'rxjs';

@Component({
  selector: 'app-producto-form',
  template: `
    <div class="card mb-3">
      <div class="card-body">
  <h5>{{ p && p.ProductoID ? 'Editar Producto' : 'Nuevo Producto' }}</h5>
  <form (ngSubmit)="guardar()">
          <div class="row">
            <div class="col-md-4"><input class="form-control" placeholder="Codigo" [(ngModel)]="p.Codigo" name="codigo" (ngModelChange)="onCodigoChange($event)" required /></div>
            <div class="col-md-6"><input class="form-control" placeholder="Descripcion" [(ngModel)]="p.ProductoDescripcion" name="desc" required /></div>
            <div class="col-md-2">
              <select class="form-control" [(ngModel)]="p.DefaultMeasure" name="defaultMeasure">
                <option value="unidad">Unidad</option>
                <option value="bulto">Bulto</option>
                <option value="pallet">Pallet</option>
              </select>
            </div>
          </div>
          <div class="row mt-2">
            <div class="col-md-12 text-end">
              <div *ngIf="codigoExiste" class="text-danger small">El código ya existe</div>
              <button *ngIf="p && p.ProductoID" type="button" class="btn btn-secondary me-2" (click)="irAVariantes()" [disabled]="saving">Variantes</button>
              <button class="btn btn-primary" type="submit" [disabled]="codigoExiste || saving">Guardar</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `
})
export class ProductoFormComponent {
  p: any = {};
  codigoExiste = false;
  private codigo$ = new Subject<string>();
  saving = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  // keep only product fields for CRUD
  constructor(private inv: InventarioService, private toast: ToastService, private route: ActivatedRoute, private router: Router) {}
  ngOnInit(): void {
    this.codigo$.pipe(debounceTime(300)).subscribe(code => {
      if (!code) { this.codigoExiste = false; return; }
      this.inv.existsCodigo(code).subscribe(r => this.codigoExiste = !!r.exists, () => this.codigoExiste = false);
    });

  const id = this.route.snapshot.paramMap.get('id');
  if (id) this.inv.getProducto(id).subscribe(p => { if (p) this.p = p; });
  }
  ngAfterViewInit(): void {
    // asegurar medida por defecto para nuevo producto
  if (!this.p || !this.p.DefaultMeasure) this.p.DefaultMeasure = 'unidad';
  }
  onCodigoChange(v: string) { this.codigo$.next(v); }
  guardar() {
    this.saving = true;
    const payload: any = {
      Codigo: this.p.Codigo,
      ProductoDescripcion: this.p.ProductoDescripcion,
      DefaultMeasure: this.p.DefaultMeasure || 'unidad'
    };
    if (this.p && this.p.ProductoID) {
      this.inv.updateProducto(this.p.ProductoID, payload).subscribe(() => {
        this.saving = false;
        this.toast.success('Producto actualizado');
        this.router.navigate(['/inventario/productos']);
      }, (err:any) => { this.saving = false; this.toast.error(err?.error?.error || 'Error al actualizar producto'); });
      return;
    }

    this.inv.createProducto(payload).subscribe((res:any) => {
      this.saving = false;
      this.toast.success('Producto creado correctamente');
      const newId = res && res.ProductoID ? res.ProductoID : null;
      if (newId) {
        this.router.navigate(['/inventario/productos', newId, 'variantes']);
      } else {
        this.router.navigate(['/inventario/productos']);
      }
    }, (err:any) => {
      this.saving = false;
      this.toast.error(err?.error?.error || 'Error al crear producto');
    });
  }
  irAVariantes() {
    if (this.p && this.p.ProductoID) {
      this.router.navigate(['/inventario/productos', this.p.ProductoID, 'variantes']);
    }
  }
}
