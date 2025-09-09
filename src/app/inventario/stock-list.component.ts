import { Component, OnInit } from '@angular/core';
import { InventarioService } from './inventario.service';

@Component({
  selector: 'app-stock-list',
  template: `
    <div class="card">
      <div class="card-body">
        <h4>Stock</h4>
        <table class="table table-sm">
          <thead><tr><th>Codigo</th><th>Producto</th><th>Tipo</th><th>Deposito</th><th>Sector</th><th>Unidad</th><th>Pack</th><th>Pallets</th></tr></thead>
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
  constructor(private inv: InventarioService) {}
  ngOnInit() { this.load(); }
  load() { this.inv.listStock().subscribe(r => this.stock = r || []); }
}
