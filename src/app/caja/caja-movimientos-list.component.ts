import { Component, OnInit } from '@angular/core';
import { InventarioService } from '../inventario/inventario.service';

interface Movimiento {
  MovimientoID:number; FechaHora:string; Tipo:string; Origen:string; ReferenciaID?:number; Descripcion?:string; Importe:number; Medio?:string; SaldoPosterior:number;
}

@Component({
  selector: 'app-caja-movimientos-list',
  templateUrl: './caja-movimientos-list.component.html',
  styleUrls: ['./caja-movimientos-list.component.css']
})
export class CajaMovimientosListComponent implements OnInit {
  loading=false;
  movimientos:Movimiento[]=[];
  filtros:any={ q:'', tipo:'', medio:'', origen:'', desde:'', hasta:'' };
  totalIngresos=0; totalEgresos=0; totalAjustes=0; neto=0;
  page=1; limit=50; total=0; saldoActual=0;
  get totalPages(){ return this.limit ? Math.ceil(this.total / this.limit) : 1; }

  constructor(private inv:InventarioService){}

  ngOnInit(){
    const hoy = new Date().toISOString().slice(0,10);
    this.filtros.desde = hoy; this.filtros.hasta = hoy;
    this.load();
  }

  load(){
    this.loading=true;
    const params = { ...this.filtros, limit: this.limit, offset: (this.page-1)*this.limit };
    this.inv.cajaListMovimientos(params).subscribe({
      next: (resp:any)=>{
        this.movimientos = resp?.items || [];
        this.total = resp?.total || 0;
        const t = resp?.totals || {};
        this.totalIngresos = t.ingresos || 0;
        this.totalEgresos = t.egresos || 0;
        this.totalAjustes = t.ajustes || 0;
        this.neto = t.neto || 0;
        this.saldoActual = resp?.saldoActual || 0;
        this.loading=false;
      },
      error: _=>{ this.loading=false; }
    });
  }

  // Ya no recalculamos totales localmente (el backend los provee) pero dejamos placeholder si se requieren cálculos adicionales en el futuro
  calcTotals(){}

  borrar(m:Movimiento){
    if(m.Origen !== 'MANUAL') return;
    if(!confirm('Eliminar movimiento manual?')) return;
    this.inv.cajaDeleteMovimiento(m.MovimientoID).subscribe(()=> this.load());
  }

  exportCsv(){ this.inv.cajaExportCsv(this.filtros); }
  exportPdf(){ this.inv.cajaExportPdf(this.filtros); }

  setQuickRange(tipo:string){
    const hoy = new Date();
    const fmt = (d:Date)=> d.toISOString().slice(0,10);
    let desde=''; let hasta='';
    if (tipo==='hoy') { desde = fmt(hoy); hasta = fmt(hoy); }
    else if (tipo==='7d') { const d = new Date(hoy); d.setDate(d.getDate()-6); desde = fmt(d); hasta = fmt(hoy); }
    else if (tipo==='mes') { const d = new Date(hoy.getFullYear(), hoy.getMonth(),1); desde = fmt(d); hasta = fmt(hoy); }
    else if (tipo==='anio') { const d = new Date(hoy.getFullYear(),0,1); desde = fmt(d); hasta = fmt(hoy); }
    else if (tipo==='todo') { desde=''; hasta=''; }
    this.filtros.desde = desde; this.filtros.hasta = hasta; this.load();
  }
  clearFilters(){
    this.filtros = { q:'', tipo:'', medio:'', origen:'', desde:'', hasta:'' };
    this.page=1; this.load();
  }
  nextPage(){ if (this.page * this.limit < this.total){ this.page++; this.load(); } }
  prevPage(){ if (this.page>1){ this.page--; this.load(); } }
}
