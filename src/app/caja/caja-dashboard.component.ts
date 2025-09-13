import { Component, OnInit } from '@angular/core';
import { InventarioService } from '../inventario/inventario.service';

@Component({
  selector: 'app-caja-dashboard',
  templateUrl: './caja-dashboard.component.html',
  styleUrls: ['./caja-dashboard.component.css']
})
export class CajaDashboardComponent implements OnInit {
  loading = false;
  resumen: any = null;
  filtros = { desde: '', hasta: '' };
  cierres:any[] = [];
  cierreLoading=false; cierreObs=''; generarEnProgreso=false; mensajeCierre='';

  constructor(private inv: InventarioService) {}

  ngOnInit(){
    const hoy = new Date().toISOString().slice(0,10);
    this.filtros.desde = hoy;
    this.filtros.hasta = hoy;
    this.load();
  }

  load(){
    this.loading = true;
    this.inv.cajaSummary({ desde: this.filtros.desde, hasta: this.filtros.hasta }).subscribe({
      next: r => { this.resumen = r; this.loading = false; },
      error: _ => { this.loading = false; }
    });
    this.loadCierres();
  }

  exportCsv(){
    this.inv.cajaExportCsv({ desde: this.filtros.desde, hasta: this.filtros.hasta });
  }
  exportPdf(){
    this.inv.cajaExportPdf({ desde: this.filtros.desde, hasta: this.filtros.hasta });
  }

  loadCierres(){
    this.cierreLoading=true;
    this.inv.cajaListCierres().subscribe({
      next: r=>{ this.cierres = r?.items || []; this.cierreLoading=false; },
      error: _=>{ this.cierres=[]; this.cierreLoading=false; }
    });
  }

  generarCierre(){
    if (this.generarEnProgreso) return;
    this.generarEnProgreso=true; this.mensajeCierre='';
    const fecha = this.filtros.hasta || new Date().toISOString().slice(0,10);
    this.inv.cajaGenerarCierre(fecha, this.cierreObs || undefined).subscribe({
      next: r=>{ this.generarEnProgreso=false; this.mensajeCierre = r.reused? 'Ya existía un cierre para la fecha' : 'Cierre generado'; this.cierreObs=''; this.loadCierres(); },
      error: _=>{ this.generarEnProgreso=false; this.mensajeCierre='Error al generar cierre'; }
    });
  }
}
