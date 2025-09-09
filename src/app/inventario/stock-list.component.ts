import { Component, OnInit, OnDestroy } from '@angular/core';
import { InventarioService } from './inventario.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-stock-list',
  template: `
    <div class="card">
      <div class="card-body">
        <h4>Stock</h4>
        <table class="table table-sm">
          <thead>
            <tr>
              <th>
                Codigo
                <input class="form-control form-control-sm mt-1" [(ngModel)]="filters.Codigo" (ngModelChange)="onFilterChange()" placeholder="Filtrar" />
              </th>
              <th>
                Producto
                <input class="form-control form-control-sm mt-1" [(ngModel)]="filters.ProductoDescripcion" (ngModelChange)="onFilterChange()" placeholder="Filtrar" />
              </th>
              <th>
                Tipo
                <input class="form-control form-control-sm mt-1" [(ngModel)]="filters.TipoUnidad" (ngModelChange)="onFilterChange()" placeholder="Filtrar" />
              </th>
              <th>
                Deposito
                <input class="form-control form-control-sm mt-1" [(ngModel)]="filters.Deposito" (ngModelChange)="onFilterChange()" placeholder="Filtrar" />
              </th>
              <th>
                Sector
                <input class="form-control form-control-sm mt-1" [(ngModel)]="filters.Sector" (ngModelChange)="onFilterChange()" placeholder="Filtrar" />
              </th>
              <th>Unidad</th>
              <th>Pack</th>
              <th>Pallets</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let s of stock">
              <td>{{s.Codigo}}</td>
              <td>{{s.ProductoDescripcion}}</td>
              <td>{{s.TipoUnidad}}</td>
              <td>{{s.Deposito}}</td>
              <td>{{s.Sector}}</td>
              <td>{{s.Unidad}}</td>
              <td>{{s.Pack}}</td>
              <td>{{s.Pallets}}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class StockListComponent implements OnInit {
  stock: any[] = [];
  filters: any = { Codigo: '', ProductoDescripcion: '', TipoUnidad: '', Deposito: '', Sector: '' };
  private filter$ = new Subject<any>();
  private filterSub?: Subscription;
  constructor(private inv: InventarioService) {}
  ngOnInit() {
    this.filterSub = this.filter$.pipe(debounceTime(250), distinctUntilChanged((a,b) => JSON.stringify(a) === JSON.stringify(b))).subscribe(f => this.load(f));
    this.load(this.filters);
  }
  ngOnDestroy() { this.filterSub?.unsubscribe(); }

  load(filters?: any) { this.inv.listStock(filters || {}).subscribe(r => this.stock = r || []); }

  onFilterChange() {
    // Empujar copia de filtros para evitar referencia compartida
    this.filter$.next({ ...this.filters });
  }
}
