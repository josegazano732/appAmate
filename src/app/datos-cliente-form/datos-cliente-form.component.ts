import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { DatosClientesService } from '../datos-clientes/datos-clientes.service';
import { DatosCliente } from '../datos-clientes/datos-cliente.model';

@Component({
  selector: 'app-datos-cliente-form',
  templateUrl: './datos-cliente-form.component.html',
})
export class DatosClienteFormComponent implements OnInit {
  @Input() datosCliente: DatosCliente = { DatosID: 0, ClienteID: 0 };
  @Input() clienteId!: number;
  @Output() guardado = new EventEmitter<void>();
  @Output() cancelado = new EventEmitter<void>();
  mensaje: string = '';
  isEdit: boolean = false;

  constructor(private datosService: DatosClientesService) {}

  ngOnInit(): void {
    this.isEdit = !!this.datosCliente && this.datosCliente.DatosID !== 0;
    // Si el ClienteID no está definido, lo asignamos siempre
    if (!this.datosCliente.ClienteID || this.datosCliente.ClienteID === 0) {
      this.datosCliente.ClienteID = this.clienteId;
    }
  }

  cancelar(): void {
    this.cancelado.emit();
  }

  save(): void {
    if (this.isEdit) {
      this.datosService.update(this.datosCliente).subscribe(() => {
        this.mensaje = 'Datos actualizados correctamente.';
        this.guardado.emit();
      });
    } else {
      // Aseguramos que ClienteID esté correctamente asignado antes de guardar
      this.datosCliente.ClienteID = this.clienteId;
      this.datosService.add(this.datosCliente).subscribe(() => {
        this.mensaje = 'Datos guardados correctamente.';
        this.datosCliente = { DatosID: 0, ClienteID: this.clienteId };
        this.guardado.emit();
      });
    }
  }
}
