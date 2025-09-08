import { Component, OnInit } from '@angular/core';
import { NotasService } from './notas.service';

@Component({
  selector: 'app-notas-list',
  template: `
    <div class="card">
      <div class="card-body">
        <h4>Notas de Pedido</h4>
        <table class="table table-sm">
          <thead>
            <tr>
              <th>ID</th>
              <th>ClienteID</th>
              <th>Fecha</th>
              <th>Nombre Fiscal</th>
              <th>Importe</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let n of notas">
              <td>{{n.NotaPedidoID}}</td>
              <td>{{n.ClienteID}}</td>
              <td>{{n.Fecha}}</td>
              <td>{{n.NombreFiscal}}</td>
              <td>{{n.ImporteOperacion | number:'1.2-2'}}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class NotasListComponent implements OnInit {
  notas: any[] = [];
  pageSize = 10;
  currentPage = 1;
  totalPages = 1;
  total = 0;
  constructor(private notasService: NotasService) {}
  ngOnInit() { this.loadPage(1); }

  loadPage(page: number) {
    const offset = (page - 1) * this.pageSize;
    this.notasService.listPaged(this.pageSize, offset).subscribe(res => {
      this.notas = res.items || [];
      this.total = res.total || 0;
      this.totalPages = Math.max(1, Math.ceil(this.total / this.pageSize));
      this.currentPage = page;
    });
  }
}
