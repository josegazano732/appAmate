import { Component, Input, OnInit } from '@angular/core';
import { DatosClientesService } from './datos-clientes.service';
import { DatosCliente } from './datos-cliente.model';

@Component({
  selector: 'app-datos-clientes-list',
  templateUrl: './datos-clientes-list.component.html',
})
export class DatosClientesListComponent implements OnInit {
  @Input() clienteId!: number;
  datos: DatosCliente[] = [];
  selectedDatos?: DatosCliente;

  constructor(private datosService: DatosClientesService) {}

  ngOnInit() {
    this.loadDatos();
  }

  ngOnChanges() {
    this.loadDatos();
  }

  loadDatos() {
    if (this.clienteId) {
      this.datosService.getByClienteId(this.clienteId).subscribe(data => {
        this.datos = data;
      });
    }
  }

  selectDatos(datos: DatosCliente): void {
    this.selectedDatos = datos;
  }

  deleteDatos(id: number): void {
    this.datosService.delete(id).subscribe(() => {
      this.loadDatos();
      this.selectedDatos = undefined;
    });
  }
}
