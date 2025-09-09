import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { NotaPedido, NotaDetalle } from './nota.model';
import { NotasService } from './notas.service';
import { InventarioService } from '../inventario/inventario.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-nota-form',
  template: `
    <div class="card mt-3">
      <div class="card-body">
  <h4>Nota de Pedido - Cliente {{ nota.ClienteID }}</h4>
        <form (ngSubmit)="guardar()">
          <div class="row">
            <div class="col-md-3 mb-2">
              <label>Lista Precio ID</label>
              <input class="form-control" [(ngModel)]="nota.ListaPrecioID" name="lista" />
            </div>
            <div class="col-md-3 mb-2">
              <label>Fecha</label>
              <input type="date" class="form-control" [(ngModel)]="nota.Fecha" name="fecha" />
            </div>
            <div class="col-md-6 mb-2">
              <label>Nombre Fiscal</label>
              <input class="form-control" [(ngModel)]="nota.NombreFiscal" name="nombreFiscal" />
            </div>
          </div>

          <div class="row">
            <div class="col-md-4 mb-2">
              <label>Orden de Compra</label>
              <input class="form-control" [(ngModel)]="nota.OrdenCompra" name="ordenCompra" />
            </div>
          </div>

          <div class="row">
            <div class="col-md-4 mb-2">
              <label>Aprobación</label>
              <select class="form-select" [(ngModel)]="nota.EstadoAprobacion" name="estadoAprobacion">
                <option value="Aprobada">Aprobada</option>
                <option value="Rechazada">Rechazada</option>
                <option value="Pendiente">Pendiente</option>
              </select>
            </div>
            <div class="col-md-4 mb-2">
              <label>Remito</label>
              <select class="form-select" [(ngModel)]="nota.EstadoRemito" name="estadoRemito">
                <option value="Remitido">Remitido</option>
                <option value="Remitido Parcial">Remitido Parcial</option>
                <option value="Sin Remito">Sin Remito</option>
              </select>
            </div>
            <div class="col-md-4 mb-2">
              <label>Facturación</label>
              <select class="form-select" [(ngModel)]="nota.EstadoFacturacion" name="estadoFacturacion">
                <option value="Facturado">Facturado</option>
                <option value="Facturado Parcial">Facturado Parcial</option>
                <option value="Sin Facturar">Sin Facturar</option>
              </select>
            </div>
          </div>

          <div class="mb-2">
            <label>Sucursal</label>
            <input class="form-control" [(ngModel)]="nota.Sucursal" name="sucursal" />
          </div>

          <hr />

          <h5>Detalles</h5>
          <table class="table table-sm">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Producto</th>
                <th>Familia</th>
                <th>Precio</th>
                <th>Cantidad</th>
                <th>Precio Neto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let d of detalles; let i = index">
                <td><input class="form-control form-control-sm" [(ngModel)]="d.Codigo" name="codigo{{i}}" /></td>
                <td style="position:relative">
                  <input class="form-control form-control-sm" [(ngModel)]="d.ProductoDescripcion" name="prod{{i}}" (ngModelChange)="filterProductos($event, i)" autocomplete="off" />
                  <div *ngIf="suggestions[i] && suggestions[i].length" class="list-group position-absolute" style="z-index:50; max-height:200px; overflow:auto; width:100%">
                    <button type="button" class="list-group-item list-group-item-action" *ngFor="let s of suggestions[i]" (click)="selectProducto(s,i)">
                      <div><strong>{{s.Codigo}}</strong> — {{s.ProductoDescripcion}}</div>
                    </button>
                  </div>
                </td>
                <td><input class="form-control form-control-sm" [(ngModel)]="d.Familia" name="fam{{i}}" /></td>
                <td>
                  <div class="input-group input-group-sm">
                    <input type="number" class="form-control form-control-sm" [(ngModel)]="d.Precio" name="precio{{i}}" (ngModelChange)="updateDetalle(i)" />
                    <span class="input-group-text">{{ d.Precio | arsCurrency }}</span>
                  </div>
                </td>
                <td>
                  <div class="d-flex gap-2">
                    <input type="number" class="form-control form-control-sm" [(ngModel)]="d.Cantidad" name="cant{{i}}" (ngModelChange)="updateDetalle(i)" />
                    <select class="form-select form-select-sm w-auto" [(ngModel)]="d.Medida" name="medida{{i}}" (ngModelChange)="updateDetalle(i)">
                      <option value="unidad">U</option>
                      <option value="pack">Pack</option>
                      <option value="pallet">Pallet</option>
                    </select>
                  </div>
                </td>
                <td>
                  <input type="text" class="form-control form-control-sm" [value]="d.PrecioNeto | arsCurrency" name="pn{{i}}" readonly />
                </td>
                <td><button class="btn btn-sm btn-danger" type="button" (click)="removeDetalle(i)">X</button></td>
              </tr>
            </tbody>
          </table>
          <button class="btn btn-sm btn-secondary" type="button" (click)="addDetalle()">Agregar detalle</button>

          <div class="mt-3">
            <div class="mb-2">Importe operación: <strong>{{ nota.ImporteOperacion | arsCurrency }}</strong></div>
            <button class="btn btn-primary" type="submit">Guardar Nota</button>
            <button class="btn btn-secondary ms-2" type="button" (click)="cancelar()">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class NotaFormComponent {
  @Input() nota: NotaPedido = { ClienteID: 0 } as any;
  @Output() guardado = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  detalles: NotaDetalle[] = [];

  productos: any[] = [];
  suggestions: any[][] = []; // suggestions por fila
  // Subjects para búsqueda por fila
  searchSubjects: Subject<string>[] = [];
  searchSubs: Subscription[] = [];
  conversionText: string[] = []; // texto de conversión por fila

  constructor(private notasService: NotasService, private inv: InventarioService) {}

  ngOnInit() {
    // si es nota nueva, asegurar valores por defecto
    if (!this.nota.EstadoAprobacion) this.nota.EstadoAprobacion = 'Pendiente';
    if (!this.nota.EstadoRemito) this.nota.EstadoRemito = 'Sin Remito';
    if (!this.nota.EstadoFacturacion) this.nota.EstadoFacturacion = 'Sin Facturar';
  }

  ngAfterViewInit() {
    // inicialmente no cargamos todo el catálogo; usamos búsqueda por servidor
  }

  addDetalle() {
  this.detalles.push({ Codigo: '', ProductoDescripcion: '', Familia: '', Precio: 0, Cantidad: 1, PrecioNeto: 0, Medida: 'unidad' });
  this.suggestions.push([]);
    this.conversionText.push('');
    const subj = new Subject<string>();
    this.searchSubjects.push(subj);
    const sub = subj.pipe(debounceTime(300), distinctUntilChanged(), switchMap(q => this.inv.listProductos(q || ''))).subscribe((res:any[]) => {
      const idx = this.searchSubjects.indexOf(subj);
      if (idx >= 0) this.suggestions[idx] = res || [];
    });
    this.searchSubs.push(sub);
    this.updateImporte();
  }

  removeDetalle(i: number) {
    this.detalles.splice(i, 1);
    this.suggestions.splice(i, 1);
    const s = this.searchSubjects.splice(i,1)[0];
    if (s) {
      const sub = this.searchSubs.splice(i,1)[0];
      sub?.unsubscribe();
    }
    this.conversionText.splice(i,1);
    this.updateImporte();
  }

  // Autocomplete: filtrar productos por texto y mostrar sugerencias
  filterProductos(text: string, row: number) {
    // usar búsqueda server-side via el subject correspondiente
    const subj = this.searchSubjects[row];
    if (subj) subj.next(text || '');
  }

  selectProducto(p: any, row: number) {
    const d = this.detalles[row];
    if (!d) return;
    d.Codigo = p.Codigo;
    d.ProductoDescripcion = p.ProductoDescripcion;
    // usar medida por defecto si existe
    d.Medida = p.DefaultMeasure || 'unidad';
    // actualizar importe
    this.updateDetalle(row);
    // limpiar sugerencias
    this.suggestions[row] = [];
    // calcular conversión para mostrar (ej. "3 packs = 18 unidades")
    this.calcConversionForRow(row);
  }

  // calcula texto de conversión basado en la medida seleccionada y la cantidad de la fila
  async calcConversionForRow(row: number) {
    const d = this.detalles[row];
    if (!d) return;
    const codigo = d.Codigo;
    if (!codigo) { this.conversionText[row] = ''; return; }
    // Usar endpoint de productos para obtener UnitsPerPack/PacksPerPallet
    this.inv.listProductos(d.Codigo || '').subscribe((prods:any[]) => {
      const prod = (prods && prods.length) ? prods.find((x:any)=>x.Codigo === d.Codigo) : null;
      let unitsPerPack = 1, packsPerPallet = 1;
      if (prod) {
        unitsPerPack = Number(prod.UnitsPerPack) || 1;
        packsPerPallet = Number(prod.PacksPerPallet) || 1;
      }
      const med = String(d.Medida || 'unidad').toLowerCase();
      const qty = Number(d.Cantidad || 0) || 0;
      let units = 0;
      if (med === 'unidad' || med === 'u') units = qty;
      else if (med === 'pack') units = qty * unitsPerPack;
      else if (med === 'pallet' || med === 'pallets') units = qty * packsPerPallet * unitsPerPack;
      this.conversionText[row] = `${qty} ${med}${qty!==1?'s':''} = ${units} unidades`;
    });
  }

  ngOnDestroy() {
    this.searchSubs.forEach(s => s.unsubscribe());
  }

  // Actualiza el PrecioNeto de una línea y recalcula el importe total
  updateDetalle(i: number) {
    const d = this.detalles[i];
    d.PrecioNeto = (Number(d.Precio) || 0) * (Number(d.Cantidad) || 0);
    this.updateImporte();
  }

  updateImporte() {
    const total = this.detalles.reduce((s, d) => s + (Number(d.PrecioNeto) || 0), 0);
    this.nota.ImporteOperacion = total;
  }

  guardar() {
    // Asegurar que todos los precios netos estén calculados
    this.detalles.forEach((_, i) => this.updateDetalle(i));
    // Actualizar ImporteOperacion
    this.updateImporte();
    this.notasService.create(this.nota, this.detalles).subscribe(res => {
      this.guardado.emit(res);
    });
  }

  cancelar() {
    this.cancel.emit();
  }
}
