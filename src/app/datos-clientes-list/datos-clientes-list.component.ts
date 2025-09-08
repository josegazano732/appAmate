import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { DatosClientesService } from '../datos-clientes/datos-clientes.service';
import { DatosCliente } from '../datos-clientes/datos-cliente.model';

@Component({
  selector: 'app-datos-clientes-list',
  templateUrl: './datos-clientes-list.component.html',
})
export class DatosClientesListComponent implements OnInit, OnChanges {
  eliminarTodosDatos(): void {
    this.datosService.eliminarTodos().subscribe(() => {
      this.loadDatos();
      this.selectedDatos = undefined;
    });
  }
  @Input() clienteId!: number;
  datos: DatosCliente[] = [];
  selectedDatos?: DatosCliente;

  constructor(private datosService: DatosClientesService) {}

  ngOnInit() {
    this.loadDatos();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['clienteId'] && !changes['clienteId'].firstChange) {
      this.loadDatos();
    }
  }

  loadDatos() {
    if (this.clienteId) {
      this.datosService.getByClienteId(this.clienteId).subscribe((data: DatosCliente[]) => {
        this.datos = data;
      });
    }
  }

  selectDatos(datos: DatosCliente): void {
    this.selectedDatos = datos;
  }

  cerrarFormularioDatos(): void {
    this.selectedDatos = undefined;
  }

  nuevoDatoCliente(): void {
    this.selectedDatos = { DatosID: 0, ClienteID: this.clienteId };
  }

  deleteDatos(id: number): void {
    this.datosService.delete(id).subscribe(() => {
      this.loadDatos();
      this.selectedDatos = undefined;
    });
  }
}
