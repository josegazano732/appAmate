import { Component, OnInit } from '@angular/core';
import { InventarioService } from './inventario.service';

@Component({
  selector: 'app-recibos-list',
  templateUrl: './recibos-list.component.html'
})
export class RecibosListComponent implements OnInit {
  items: any[] = [];
  total = 0;
  limit = 50;
  offset = 0;
  q = '';
  fechaDesde: string | null = null;
  fechaHasta: string | null = null;

  constructor(private svc: InventarioService) {}

  ngOnInit(): void { this.load(); }

  async load() {
    try {
      const params: any = { limit: this.limit, offset: this.offset };
      if (this.q) params.q = this.q;
      if (this.fechaDesde) params.fechaDesde = this.fechaDesde;
      if (this.fechaHasta) params.fechaHasta = this.fechaHasta;
      const r: any = await this.svc.listRecibos(params).toPromise();
      this.items = r.items || [];
      this.total = r.total || 0;
    } catch (e) { console.error('No se pudo cargar recibos', e); }
  }

  onSearchChange() { this.offset = 0; this.load(); }
}
