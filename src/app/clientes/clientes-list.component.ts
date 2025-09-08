import { Component } from '@angular/core';
import { ClientesService } from './clientes.service';
import { Cliente } from './cliente.model';

@Component({
  selector: 'app-clientes-list',
  templateUrl: './clientes-list.component.html',
})
export class ClientesListComponent {
  clientes: Cliente[] = [];
  selectedCliente?: Cliente;
  mostrarFormNuevo: boolean = false;
  clienteEditando: Cliente | null = null;
  nuevoCliente: Cliente = { ClienteID: 0, TIPO: '', Numero: '', NombreRazonSocial: '' };

  constructor(private clientesService: ClientesService) {}

  ngOnInit() {
    this.loadClientes();
  }

  loadClientes() {
    this.clientesService.getAll().subscribe(data => {
      this.clientes = data;
    });
    this.mostrarFormNuevo = false;
    this.clienteEditando = null;
  }

  mostrarFormularioNuevo() {
    this.mostrarFormNuevo = true;
    this.clienteEditando = null;
  }

  editarCliente(cliente: Cliente) {
    this.clienteEditando = { ...cliente };
    this.mostrarFormNuevo = false;
  }

  selectCliente(cliente: Cliente) {
    this.selectedCliente = cliente;
  }

  deleteCliente(id: number) {
    this.clientesService.delete(id).subscribe(() => {
      this.loadClientes();
      this.selectedCliente = undefined;
    });
  }

  onGuardado() {
    this.loadClientes();
  }
}
