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
  loading = false;
  // agregados UI
  aggregatePagos = 0;
  aggregateAplicado = 0;

  get page() { return Math.floor(this.offset / this.limit) + 1; }
  get totalPages() { return Math.max(1, Math.ceil(this.total / this.limit)); }
  get endIndex(){ return Math.min(this.offset + this.limit, this.total); }

  constructor(private svc: InventarioService) {}

  ngOnInit(): void { this.load(); }

  async load() {
    this.loading = true;
    try {
      const params: any = { limit: this.limit, offset: this.offset };
      if (this.q) params.q = this.q;
      if (this.fechaDesde) params.fechaDesde = this.fechaDesde;
      if (this.fechaHasta) params.fechaHasta = this.fechaHasta;
      const r: any = await this.svc.listRecibos(params).toPromise();
      this.items = (r.items || []).map((it:any)=> {
        // Formato fecha DD-MM-YYYY robusto (maneja ISO con T o con espacio)
        try {
          const raw = (it.Fecha||'').toString();
          const datePart = raw.replace('T',' ').split(' ')[0];
          const [yyyy,mm,dd] = datePart.split('-');
          if (yyyy && mm && dd) it.displayFecha = `${dd}-${mm}-${yyyy}`; else it.displayFecha = raw;
        } catch { it.displayFecha = it.Fecha; }
        it.ClienteDisplay = it.ClienteNombre || (it.ClienteID ? ('ID '+it.ClienteID) : 'Sin Cliente');
        it.Diferencia = +(Number(it.TotalPagos||0) - Number(it.TotalAplicado||0)).toFixed(2);
        return it;
      });
      this.total = r.total || 0;
      this.aggregatePagos = this.items.reduce((s,i)=> s + Number(i.TotalPagos||0), 0);
      this.aggregateAplicado = this.items.reduce((s,i)=> s + Number(i.TotalAplicado||0), 0);
    } catch (e) { console.error('No se pudo cargar recibos', e); }
    finally { this.loading = false; }
  }

  onSearchChange() { this.offset = 0; this.load(); }

  clearFilters(){
    this.q=''; this.fechaDesde=null; this.fechaHasta=null; this.offset=0; this.load();
  }

  pageNext(){ if(this.offset + this.limit < this.total){ this.offset += this.limit; this.load(); } }
  pagePrev(){ if(this.offset - this.limit >= 0){ this.offset -= this.limit; this.load(); } }
  changeLimit(n:number){ this.limit = n; this.offset=0; this.load(); }

  exportCsv(){
    const params:any = {};
    if (this.q) params.q = this.q;
    if (this.fechaDesde) params.fechaDesde = this.fechaDesde;
    if (this.fechaHasta) params.fechaHasta = this.fechaHasta;
    const query = Object.keys(params).map(k=> `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
    window.open(`http://localhost:3000/api/recibos/export${query?('?' + query):''}`, '_blank');
  }

  exportPdf(){
    const params:any = {};
    if (this.q) params.q = this.q;
    if (this.fechaDesde) params.fechaDesde = this.fechaDesde;
    if (this.fechaHasta) params.fechaHasta = this.fechaHasta;
    const query = Object.keys(params).map(k=> `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
    window.open(`http://localhost:3000/api/recibos/export/pdf${query?('?' + query):''}`, '_blank');
  }
}
