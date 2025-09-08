
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { DatosClientesService } from './datos-clientes.service';
import { DatosCliente } from './datos-cliente.model';

@Component({
  selector: 'app-datos-cliente-form',
  templateUrl: './datos-cliente-form.component.html',
})
export class DatosClienteFormComponent implements OnInit {
  @Input() datosCliente: DatosCliente = { DatosID: 0, ClienteID: 0 };
  @Input() clienteId!: number;
  @Output() guardado = new EventEmitter<void>();
  mensaje: string = '';
  isEdit: boolean = false;

  constructor(private datosService: DatosClientesService) {}

  ngOnInit(): void {
    this.isEdit = !!this.datosCliente && this.datosCliente.DatosID !== 0;
    if (!this.datosCliente.ClienteID && this.clienteId) {
      this.datosCliente.ClienteID = this.clienteId;
    }
  }

  save(): void {
    if (this.isEdit) {
      this.datosService.update(this.datosCliente).subscribe(() => {
        this.mensaje = 'Datos actualizados correctamente.';
        this.guardado.emit();
      });
    } else {
      this.datosService.add(this.datosCliente).subscribe(() => {
        this.mensaje = 'Datos guardados correctamente.';
        this.datosCliente = { DatosID: 0, ClienteID: this.clienteId };
        this.guardado.emit();
      });
    }
  }
}
