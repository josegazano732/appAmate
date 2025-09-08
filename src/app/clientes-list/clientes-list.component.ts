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
  // Paginación
  pageSize: number = 10;
  currentPage: number = 1;
  totalPages: number = 1;
  clientesEnPagina: Cliente[] = [];
  startIndex: number = 0;
  endIndex: number = 0;
  selectedCliente?: Cliente;
  mostrarFormNuevo: boolean = false;
  clienteEditando: Cliente | null = null;
  nuevoCliente: Cliente = { ClienteID: 0, TIPO: '', Numero: '', NombreRazonSocial: '' };

  constructor(private clientesService: ClientesService) {}

  ngOnInit() {
    this.loadClientes();
  }

  loadClientes() {
    // Intentamos paginación server-side; si falla, fallback a getAll
    this.loadClientesPaged(this.currentPage);
    this.mostrarFormNuevo = false;
    this.clienteEditando = null;
  }

  private loadClientesPaged(page: number) {
    const offset = (page - 1) * this.pageSize;
    this.clientesService.getPaged(this.pageSize, offset, this.filtro || undefined).subscribe({
      next: res => {
        // API server-side devuelve { items, total }
        if ((res as any).items && typeof (res as any).total === 'number') {
          const paged = res as any;
          this.clientes = paged.items;
          // Para compatibilidad con la UI existente mantenemos clientesFiltrados como el total en memoria reducida
          this.clientesFiltrados = paged.items;
          this.totalPages = Math.max(1, Math.ceil(paged.total / this.pageSize));
          this.startIndex = paged.total === 0 ? 0 : offset + 1;
          this.endIndex = Math.min(offset + this.pageSize, paged.total);
          this.clientesEnPagina = paged.items;
        } else {
          // Si la API no devolvió el formato esperado, fallback a client-side
          this.clientesService.getAll().subscribe(data => {
            this.clientes = data;
            this.clientesFiltrados = data;
            this.updatePagination();
          });
        }
      },
      error: () => {
        // Fallback si la petición paginada falla
        this.clientesService.getAll().subscribe(data => {
          this.clientes = data;
          this.clientesFiltrados = data;
          this.updatePagination();
        });
      }
    });
  }

  cargarClientes() {
    this.loadClientes();
  }

  aplicarFiltro() {
    const term = this.filtro.trim().toLowerCase();
    if (!term) {
      this.clienteEditando = null;
      this.currentPage = 1;
      this.loadClientesPaged(this.currentPage);
      return;
    }
    // Para búsquedas, solicitamos al servidor (si está disponible) la página 1 con el término
    this.currentPage = 1;
    this.loadClientesPaged(this.currentPage);
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

  private updatePagination() {
    const totalItems = this.clientesFiltrados.length;
    this.totalPages = Math.max(1, Math.ceil(totalItems / this.pageSize));
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.clientesEnPagina = this.clientesFiltrados.slice(start, end);
  this.startIndex = totalItems === 0 ? 0 : start + 1;
  this.endIndex = Math.min(end, totalItems);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
  this.currentPage = page;
  this.loadClientesPaged(this.currentPage);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
  this.currentPage++;
  this.loadClientesPaged(this.currentPage);
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
  this.currentPage--;
  this.loadClientesPaged(this.currentPage);
    }
  }

  get pageArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }
}
