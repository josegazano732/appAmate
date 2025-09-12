import { Component } from '@angular/core';
import { InventarioService } from './inventario.service';
import { ParametrosService, PaymentMethod, Bank } from './parametros.service';
import { ToastService } from '../shared/toast.service';

@Component({
  selector: 'app-recibo-form',
  templateUrl: './recibo-form.component.html',
  styleUrls: ['./recibo-form.component.css']
})
export class ReciboFormComponent {
  ventas: any[] = [];
  ventasQ = '';
  filtersCollapsed = false;
  sortField: string = 'FechaComp';
  sortDir: 'asc' | 'desc' = 'desc';
  minTotal: number | null = null;
  maxTotal: number | null = null;
  page = 1;
  pageSize = 25;
  get totalFiltered(){ return this.ventasFiltered.length; }

  selected: { VentaID:number, ImporteAplicado:number }[] = [];
  selectedMap: Record<number, { ImporteAplicado:number, error?:string }> = {};
  pagos: any[] = [];
  paymentMethods: PaymentMethod[] = [];
  banks: Bank[] = [];
  pmLoading = false;
  banksLoading = false;
  clienteId: any = null;
  fecha: string | null = null;
  observaciones = '';
  errorMessage: string | null = null;
  successMessage: string | null = null;
  showSaldadas = false; // modo auditoría
  saldadasCount = 0;

  constructor(private svc: InventarioService, private params: ParametrosService, private toast: ToastService) { this.loadVentas(); this.loadParams(); }

  loadParams(){
    this.pmLoading = true;
    this.params.listPaymentMethods().subscribe({
      next: rows => { this.paymentMethods = rows; this.pmLoading=false; },
      error: err => { console.error('Error cargando métodos de pago', err); this.pmLoading=false; }
    });
    this.banksLoading = true;
    this.params.listBanks().subscribe({
      next: rows => { this.banks = rows; this.banksLoading=false; },
      error: err => { console.error('Error cargando bancos', err); this.banksLoading=false; }
    });
  }

  get ventasFiltered(){
    return this.ventas.filter(v=>{
      const total = Number(v.Total || 0);
      if(this.minTotal!=null && total < this.minTotal) return false;
      if(this.maxTotal!=null && total > this.maxTotal) return false;
      return true;
    });
  }

  get ventasSorted(){
    const arr = [...this.ventasFiltered];
    const f = this.sortField;
    arr.sort((a:any,b:any)=>{ const av=a[f]; const bv=b[f]; if(av==null && bv!=null) return -1; if(av!=null && bv==null) return 1; if(av==null && bv==null) return 0; if(av<bv) return this.sortDir==='asc'? -1:1; if(av>bv) return this.sortDir==='asc'?1:-1; return 0; });
    return arr;
  }

  get ventasPage(){
    const start = (this.page-1)*this.pageSize;
    return this.ventasSorted.slice(start, start + this.pageSize);
  }

  get totalPages(){ return Math.max(1, Math.ceil(this.totalFiltered / this.pageSize)); }

  setSort(field:string){
    if(this.sortField===field){ this.sortDir = this.sortDir==='asc'?'desc':'asc'; }
    else { this.sortField = field; this.sortDir='asc'; }
  }

  setPage(p:number){ if(p<1||p>this.totalPages) return; this.page = p; }
  nextPage(){ this.setPage(this.page+1); }
  prevPage(){ this.setPage(this.page-1); }
  onFiltersChange(){ this.page = 1; }

  async loadVentas() {
    try {
      const params: any = { limit: 200 };
      if (!this.showSaldadas) params.saldoOnly = '1';
      if (this.ventasQ) params.q = this.ventasQ;
      const resp: any = await this.svc.listVentas(params).toPromise();
      const raw = resp.items || [];
      let activas: any[] = [];
      let saldadas: any[] = [];
      for (const v of raw) {
        const saldo = (v.Saldo == null ? v.Total : v.Saldo);
        if (Number(saldo) > 0.009) activas.push(v); else saldadas.push({ ...v, _saldada:true });
      }
      this.saldadasCount = saldadas.length;
      this.ventas = this.showSaldadas ? [...activas, ...saldadas] : activas;
      // mantener selección sólo si sigue con saldo
      this.selected = this.selected.filter(sel => this.ventas.some(v=> v.VentaID===sel.VentaID && !v._saldada));
      const newMap: Record<number, {ImporteAplicado:number; error?:string}> = {};
      for (const s of this.selected) {
        const v = this.ventas.find(x => x.VentaID === s.VentaID);
        if (v) newMap[s.VentaID] = { ImporteAplicado: s.ImporteAplicado };
      }
      this.selectedMap = newMap;
    } catch (e) {
      console.error('No se pudo cargar ventas', e);
    }
  }

  toggleSelect(v: any, checked: boolean) {
    if (v._saldada) {
      if (checked) this.toast.info('Factura saldada: no se puede aplicar');
      return; // ignorar
    }
    const idx = this.selected.findIndex(s => s.VentaID === v.VentaID);
    const saldoReal = (v.Saldo == null ? v.Total : v.Saldo) || 0;
    if (checked) {
      if (idx === -1) {
        const defaultImp = Number(saldoReal) || 0;
        this.selected.push({ VentaID: v.VentaID, ImporteAplicado: defaultImp });
        this.selectedMap[v.VentaID] = { ImporteAplicado: defaultImp };
      }
    } else {
      if (idx !== -1) this.selected.splice(idx,1);
      delete this.selectedMap[v.VentaID];
    }
  }

  updateImporte(vId:number, val:any) {
    const num = Number(val) || 0;
    const idx = this.selected.findIndex(s => s.VentaID === vId);
    const venta = this.ventas.find(v=>v.VentaID===vId);
    const saldoReal = venta ? ((venta.Saldo == null ? venta.Total : venta.Saldo) || 0) : 0;
    if (num > saldoReal) {
      if (idx !== -1) this.selected[idx].ImporteAplicado = saldoReal;
      this.selectedMap[vId] = { ImporteAplicado: saldoReal, error: 'Se ajustó al saldo disponible' };
    } else {
      if (idx !== -1) this.selected[idx].ImporteAplicado = num;
      this.selectedMap[vId] = { ImporteAplicado: num, error: undefined };
    }
  }

  isSelected(ventaID:number) {
    return this.selected.some(s => s.VentaID === ventaID);
  }

  getSelectedImporte(ventaID:number) {
    const it = this.selected.find(s => s.VentaID === ventaID);
    return it ? it.ImporteAplicado : 0;
  }

  addPago() {
    // Default al primer método disponible si existe
    let defaultMethod: PaymentMethod | undefined = this.paymentMethods[0];
    this.pagos.push({
      TipoPago: defaultMethod ? defaultMethod.Nombre : 'Efectivo',
      PaymentMethodID: defaultMethod ? defaultMethod.PaymentMethodID : null,
      BankID: null,
      Monto: 0,
      Datos: null
    });
  }
  removePago(i:number) { this.pagos.splice(i,1); }

  getPaymentMethod(id:any){
    return this.paymentMethods.find(pm => pm.PaymentMethodID == id);
  }

  // Helpers para totales y validación
  getTotalAplicado() {
    return this.selected.reduce((s, i) => s + Number(i.ImporteAplicado || 0), 0);
  }
  getTotalPagos() { return this.pagos.reduce((s, p) => s + Number(p.Monto || 0), 0); }
  getDiferencia() { return this.getTotalPagos() - this.getTotalAplicado(); }
  get canSubmit() { return this.selected.length>0 && this.getTotalPagos() >= this.getTotalAplicado(); }
  get pagosValid(){
    let ok = true;
    for (const p of this.pagos){
      const pm = this.getPaymentMethod(p.PaymentMethodID);
      p._error = null;
      if(pm){
        if(pm.RequiereBanco && !p.BankID){ p._error = 'Banco requerido'; ok=false; }
        else if(pm.RequiereDatos && (!p.Datos || !String(p.Datos).trim())){ p._error = 'Datos requeridos'; ok=false; }
      }
    }
    return ok;
  }
  get canSubmitAll(){ return this.canSubmit && this.pagosValid; }

  toggleSelectAll(checked:boolean) {
    if (checked) {
      for (const v of this.ventas) {
        if (v._saldada) continue; // no incluir saldadas
        if (!this.selected.some(s=>s.VentaID===v.VentaID)) {
          const saldoReal = (v.Saldo == null ? v.Total : v.Saldo) || 0;
          const imp = Number(saldoReal) || 0;
          if (imp > 0) {
            this.selected.push({ VentaID: v.VentaID, ImporteAplicado: imp });
            this.selectedMap[v.VentaID] = { ImporteAplicado: imp };
          }
        }
      }
    } else {
      this.selected = [];
      this.selectedMap = {};
    }
  }

  async submit() {
    this.errorMessage = null;
    this.successMessage = null;
    if (!this.selected.length) { this.errorMessage = 'Seleccione al menos una factura'; return; }
  if (!this.canSubmit) { this.errorMessage = 'Los pagos no cubren el total aplicado'; return; }
  if (!this.pagosValid) { this.errorMessage = 'Complete los datos requeridos en los pagos'; return; }
    const payload = {
      Fecha: this.fecha || undefined,
      ClienteID: this.clienteId || undefined,
      ventas: this.selected.map(s => ({ VentaID: s.VentaID, ImporteAplicado: Number(s.ImporteAplicado || 0) })),
      pagos: this.pagos.map(p => ({
        TipoPago: p.TipoPago, // mantenemos textual para retrocompatibilidad
        Monto: Number(p.Monto || 0),
        Datos: p.Datos,
        PaymentMethodID: p.PaymentMethodID || null,
        BankID: p.BankID || null
      })),
      Observaciones: this.observaciones || ''
    };
    try {
      const r: any = await this.svc.createRecibo(payload).toPromise();
      if (r && r.ok) {
        this.successMessage = 'Recibo creado ID: ' + r.ReciboID;
        // recargar ventas para ver saldos
        this.loadVentas();
        this.selected = []; this.pagos = []; this.observaciones = '';
        // borrar mensaje de éxito después de unos segundos
        setTimeout(()=> this.successMessage = null, 5000);
      } else {
        this.errorMessage = 'Error creando recibo: ' + JSON.stringify(r);
      }
    } catch (e:any) {
      console.error('Error al crear recibo', e);
      // Intentar extraer mensaje amigable del backend
      if (e && e.status === 400 && e.error) {
        this.errorMessage = e.error.error || JSON.stringify(e.error);
      } else if (e && e.error && e.error.error) {
        this.errorMessage = e.error.error;
      } else {
        this.errorMessage = 'Error al crear recibo: ' + (e && (e.message || JSON.stringify(e)));
      }
    }
  }

  resetForm(){
    this.fecha = null; this.clienteId = null; this.selected = []; this.selectedMap = {}; this.pagos=[]; this.observaciones=''; this.errorMessage=null; this.successMessage=null; }
}
