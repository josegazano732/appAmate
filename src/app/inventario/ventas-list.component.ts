import { Component, OnInit } from '@angular/core';
import { InventarioService } from './inventario.service';

@Component({
  selector: 'app-ventas-list',
  templateUrl: './ventas-list.component.html',
  styleUrls: ['./ventas-list.component.css']
})
export class VentasListComponent implements OnInit {
  items: any[] = [];
  total = 0;
  limit = 50;
  offset = 0;
  q = '';
  // filtros
  fechaDesde: string | null = null;
  tipo: string = '';
  cliente: string = '';
  totalMin: number | null = null;
  totalMax: number | null = null;
  // filtros por columna adicionales
  punto: string | null = null;
  numero: string | null = null;
  subtotalMin: number | null = null;
  // subtotalMax removed: single filter per column
  loading = false;
  private _filterTimer: any = null;

  constructor(private svc: InventarioService) {}

  ngOnInit(): void { this.load(); }

  load() {
    this.loading = true;
    const params: any = { limit: this.limit, offset: this.offset };
    if (this.q) params.q = this.q;
    if (this.fechaDesde) params.fechaDesde = this.fechaDesde;
  // single fecha filter (exact date)
    if (this.tipo) params.tipo = this.tipo;
    if (this.cliente) params.cliente = this.cliente;
  if (this.punto) params.punto = this.punto;
  if (this.numero) params.numero = this.numero;
    if (this.totalMin != null) params.totalMin = this.totalMin;
  if (this.totalMax != null) params.totalMax = this.totalMax;
  if (this.subtotalMin != null) params.subtotalMin = this.subtotalMin;
    this.svc.listVentas(params).subscribe({
      next: (res:any) => {
        this.items = (res.items || []).map((it:any) => {
          // formatear FechaComp a DD-MM-YYYY (quitar hora) — extraer parte fecha YYYY-MM-DD
          try {
            const raw = (it.FechaComp || '').toString();
            const datePart = raw.split(' ')[0]; // '2025-09-11 02:04:25' -> '2025-09-11'
            const parts = datePart.split('-');
            if (parts.length >= 3) {
              const yyyy = parts[0];
              const mm = parts[1].padStart(2,'0');
              const dd = parts[2].padStart(2,'0');
              it.displayFecha = `${dd}-${mm}-${yyyy}`;
            } else {
              // fallback: intentar Date
              const d = new Date(raw);
              const dd = String(d.getDate()).padStart(2,'0');
              const mm = String(d.getMonth()+1).padStart(2,'0');
              const yyyy = d.getFullYear();
              it.displayFecha = `${dd}-${mm}-${yyyy}`;
            }
          } catch(e) { it.displayFecha = (it.FechaComp || '').toString(); }
          return it;
        });
        this.total = res.total || 0;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onFilterChange() {
    if (this._filterTimer) clearTimeout(this._filterTimer);
    this._filterTimer = setTimeout(() => {
      this.offset = 0; // reset paging when filters change
      this.load();
    }, 250);
  }

  clearFilters() {
    this.q = '';
    this.fechaDesde = null;
    this.tipo = '';
    this.cliente = '';
    this.totalMin = null;
    this.totalMax = null;
  // limpiar filtros por columna también
  this.punto = null;
  this.numero = null;
  this.subtotalMin = null;
  this.load();
  }

  pageNext() { if (this.offset + this.limit < this.total) { this.offset += this.limit; this.load(); } }
  pagePrev() { if (this.offset - this.limit >= 0) { this.offset -= this.limit; this.load(); } }

  get endIndex(): number { return Math.min(this.offset + this.limit, this.total); }
}
