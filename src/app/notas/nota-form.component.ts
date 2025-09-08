import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { NotaPedido, NotaDetalle } from './nota.model';
import { NotasService } from './notas.service';

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
                <td><input class="form-control form-control-sm" [(ngModel)]="d.ProductoDescripcion" name="prod{{i}}" /></td>
                <td><input class="form-control form-control-sm" [(ngModel)]="d.Familia" name="fam{{i}}" /></td>
                <td>
                  <div class="input-group input-group-sm">
                    <input type="number" class="form-control form-control-sm" [(ngModel)]="d.Precio" name="precio{{i}}" (ngModelChange)="updateDetalle(i)" />
                    <span class="input-group-text">{{ d.Precio | arsCurrency }}</span>
                  </div>
                </td>
                <td><input type="number" class="form-control form-control-sm" [(ngModel)]="d.Cantidad" name="cant{{i}}" (ngModelChange)="updateDetalle(i)" /></td>
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

  constructor(private notasService: NotasService) {}

  ngOnInit() {
    // si es nota nueva, asegurar valores por defecto
    if (!this.nota.EstadoAprobacion) this.nota.EstadoAprobacion = 'Pendiente';
    if (!this.nota.EstadoRemito) this.nota.EstadoRemito = 'Sin Remito';
    if (!this.nota.EstadoFacturacion) this.nota.EstadoFacturacion = 'Sin Facturar';
  }

  addDetalle() {
    this.detalles.push({ Codigo: '', ProductoDescripcion: '', Familia: '', Precio: 0, Cantidad: 1, PrecioNeto: 0 });
    this.updateImporte();
  }

  removeDetalle(i: number) {
    this.detalles.splice(i, 1);
    this.updateImporte();
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
