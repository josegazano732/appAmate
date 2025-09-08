import { Component } from '@angular/core';
import { ClientesService } from '../clientes/clientes.service';
import { Cliente } from '../clientes/cliente.model';

@Component({
  selector: 'app-clientes-list',
  templateUrl: './clientes-list.component.html',
})
export class ClientesListComponent {
  clientes: Cliente[] = [];
  clientesFiltrados: Cliente[] = [];
  filtro: string = '';
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
      this.clientesFiltrados = data;
    });
    this.mostrarFormNuevo = false;
    this.clienteEditando = null;
  }

  cargarClientes() {
    this.loadClientes();
  }

  aplicarFiltro() {
    const term = this.filtro.trim().toLowerCase();
    if (!term) {
      this.clientesFiltrados = [...this.clientes];
      return;
    }
    this.clientesFiltrados = this.clientes.filter(c =>
      (c.NombreRazonSocial || '').toLowerCase().includes(term) ||
      (c.Numero || '').toLowerCase().includes(term)
    );
  }

  limpiarFiltro() {
    this.filtro = '';
    this.aplicarFiltro();
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

  cerrarFormulario() {
    this.mostrarFormNuevo = false;
    this.clienteEditando = null;
  }

  manejarCancelado() {
    this.cerrarFormulario();
    this.selectedCliente = undefined;
  }

  deleteCliente(id: number) {
    if (!confirm('¿Confirma eliminar este cliente?')) {
      return;
    }
    this.clientesService.delete(id).subscribe(() => {
      this.loadClientes();
      this.selectedCliente = undefined;
    });
  }

  onGuardado() {
    this.loadClientes();
  }
}
