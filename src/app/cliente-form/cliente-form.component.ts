import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { ClientesService } from '../clientes/clientes.service';
import { Cliente } from '../clientes/cliente.model';

@Component({
  selector: 'app-cliente-form',
  templateUrl: './cliente-form.component.html',
})
export class ClienteFormComponent implements OnInit {
  @Input() cliente: Cliente = { ClienteID: 0, TIPO: '', Numero: '', NombreRazonSocial: '' };
  isEdit: boolean = false;
  @Output() guardado = new EventEmitter<void>();
  @Output() cancelado = new EventEmitter<void>();
  mensaje: string = '';

  constructor(private clientesService: ClientesService) {}

  ngOnInit() {
    this.isEdit = !!this.cliente && this.cliente.ClienteID !== 0;
  }

  save(): void {
    if (this.isEdit) {
      this.clientesService.update(this.cliente).subscribe(() => {
        this.mensaje = 'Cliente actualizado correctamente.';
        this.guardado.emit();
      });
    } else {
      this.clientesService.add(this.cliente).subscribe(() => {
        this.mensaje = 'Cliente guardado correctamente.';
        this.cliente = { ClienteID: 0, TIPO: '', Numero: '', NombreRazonSocial: '' };
        this.guardado.emit();
      });
    }
  }

  cancelar(): void {
    this.cancelado.emit();
  }
}
