import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { NotasService } from './notas.service';

@Component({
  selector: 'app-notas-list',
  template: `
    <div class="card">
      <div class="card-body">
        <h4>Notas de Pedido</h4>
        <div class="mb-2 d-flex gap-2 align-items-center">
          <input class="form-control form-control-sm w-50" placeholder="Buscar por nombre, orden o fecha" [(ngModel)]="q" (ngModelChange)="onSearch($event)" />
          <button class="btn btn-sm btn-outline-secondary" (click)="clearSearch()">Limpiar</button>
        </div>
        <table class="table table-sm">
          <thead>
            <tr>
              <th>ID</th>
              <th>ClienteID</th>
              <th>Fecha</th>
              <th>Nombre Fiscal</th>
              <th>Orden Compra</th>
              <th>Aprobación</th>
              <th>Remito</th>
              <th>Facturación</th>
              <th>Importe</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let n of notas">
              <td>{{n.NotaPedidoID}}</td>
              <td>{{n.ClienteID}}</td>
              <td>{{n.Fecha}}</td>
              <td>{{n.NombreFiscal}}</td>
              <td>{{n.OrdenCompra}}</td>
              <td><span class="badge" [ngClass]="badgeClassAprobacion(n.EstadoAprobacion)">{{n.EstadoAprobacion}}</span></td>
              <td><span class="badge" [ngClass]="badgeClassRemito(n.EstadoRemito)">{{n.EstadoRemito}}</span></td>
              <td><span class="badge" [ngClass]="badgeClassFact(n.EstadoFacturacion)">{{n.EstadoFacturacion}}</span></td>
              <td>{{n.ImporteOperacion | arsCurrency}}</td>
            </tr>
          </tbody>
        </table>
        <nav *ngIf="totalPages > 1" class="mt-2 d-flex justify-content-between align-items-center">
          <div>Mostrando página {{currentPage}} de {{totalPages}} ({{total}} notas)</div>
          <ul class="pagination mb-0">
            <li class="page-item" [class.disabled]="currentPage === 1"><button class="page-link" (click)="prevPage()">Anterior</button></li>
            <li class="page-item" *ngFor="let p of pageArray()" [class.active]="currentPage === p"><button class="page-link" (click)="loadPage(p)">{{p}}</button></li>
            <li class="page-item" [class.disabled]="currentPage === totalPages"><button class="page-link" (click)="nextPage()">Siguiente</button></li>
          </ul>
        </nav>
      </div>
    </div>
  `
})
export class NotasListComponent implements OnInit, OnDestroy {
  notas: any[] = [];
  pageSize = 10;
  currentPage = 1;
  totalPages = 1;
  total = 0;
  q: string = '';
  private search$ = new Subject<string>();
  private searchSub?: Subscription;
  constructor(private notasService: NotasService) {}
  
  ngOnInit() {
    // inicializar suscripción para debounce en búsqueda
    this.searchSub = this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(val => {
      this.q = val;
      this.loadPage(1);
    });

    // carga inicial
    this.loadPage(1);
  }

  ngOnDestroy() {
    this.searchSub?.unsubscribe();
  }

  loadPage(page: number) {
    const offset = (page - 1) * this.pageSize;
    this.notasService.listPaged(this.pageSize, offset, this.q).subscribe((res: any) => {
      this.notas = res.items || [];
      this.total = res.total || 0;
      this.totalPages = Math.max(1, Math.ceil(this.total / this.pageSize));
      this.currentPage = page;
    });
  }

  onSearch(val?: string) {
    // push al subject para debounce; ngModelChange pasa el nuevo valor
    this.search$.next(val || '');
  }

  clearSearch() {
    this.q = '';
    this.loadPage(1);
  }

  badgeClassAprobacion(val: string) {
    if (!val) return 'bg-secondary';
    if (val === 'Aprobada') return 'bg-success';
    if (val === 'Rechazada') return 'bg-danger';
    return 'bg-warning';
  }

  badgeClassRemito(val: string) {
    if (!val) return 'bg-secondary';
    if (val === 'Remitido') return 'bg-success';
    if (val === 'Remitido Parcial') return 'bg-info';
    return 'bg-secondary';
  }

  badgeClassFact(val: string) {
    if (!val) return 'bg-secondary';
    if (val === 'Facturado') return 'bg-success';
    if (val === 'Facturado Parcial') return 'bg-info';
    return 'bg-secondary';
  }

  pageArray() {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  prevPage() {
    if (this.currentPage > 1) this.loadPage(this.currentPage - 1);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.loadPage(this.currentPage + 1);
  }
}
