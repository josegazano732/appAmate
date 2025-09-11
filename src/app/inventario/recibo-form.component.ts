import { Component } from '@angular/core';
import { InventarioService } from './inventario.service';

@Component({
  selector: 'app-recibo-form',
  templateUrl: './recibo-form.component.html'
})
export class ReciboFormComponent {
  ventas: any[] = [];
  ventasQ = '';
  selected: { VentaID:number, ImporteAplicado:number }[] = [];
  selectedMap: Record<number, { ImporteAplicado:number, error?:string }> = {};
  pagos: any[] = [];
  clienteId: any = null;
  fecha: string | null = null;
  observaciones = '';
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(private svc: InventarioService) {
    this.loadVentas();
  }

  async loadVentas() {
    try {
      const params: any = { limit: 200 };
      if (this.ventasQ) params.q = this.ventasQ;
      const resp: any = await this.svc.listVentas(params).toPromise();
      this.ventas = resp.items || [];
      // update selectedMap entries with latest Saldo
      for (const s of this.selected) {
        const v = this.ventas.find(x => x.VentaID === s.VentaID);
        this.selectedMap[s.VentaID] = { ImporteAplicado: s.ImporteAplicado, error: undefined };
        if (v) {
          // clamp if exceeds new saldo
          if (this.selectedMap[s.VentaID].ImporteAplicado > (v.Saldo || v.Total || 0)) {
            this.selectedMap[s.VentaID].error = 'Importe supera saldo actual';
          }
        }
      }
    } catch (e) {
      console.error('No se pudo cargar ventas', e);
    }
  }

  toggleSelect(v: any, checked: boolean) {
    const idx = this.selected.findIndex(s => s.VentaID === v.VentaID);
    if (checked) {
      if (idx === -1) {
        const defaultImp = Number(v.Saldo || v.Total || 0) || 0;
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
    const saldo = venta ? Number(venta.Saldo || venta.Total || 0) : 0;
    if (num > saldo) {
      // clamp and set error
      if (idx !== -1) this.selected[idx].ImporteAplicado = saldo;
      this.selectedMap[vId] = { ImporteAplicado: saldo, error: 'Se ajustó al saldo disponible' };
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

  addPago() { this.pagos.push({ TipoPago: 'Efectivo', Monto: 0, Datos: null }); }
  removePago(i:number) { this.pagos.splice(i,1); }

  // Helpers para totales y validación
  getTotalAplicado() {
    return this.selected.reduce((s, i) => s + Number(i.ImporteAplicado || 0), 0);
  }
  getTotalPagos() { return this.pagos.reduce((s, p) => s + Number(p.Monto || 0), 0); }
  getDiferencia() { return this.getTotalPagos() - this.getTotalAplicado(); }
  get canSubmit() { return this.selected.length>0 && this.getTotalPagos() >= this.getTotalAplicado(); }

  toggleSelectAll(checked:boolean) {
    if (checked) {
      for (const v of this.ventas) {
        if (!this.selected.some(s=>s.VentaID===v.VentaID)) {
          const imp = Number(v.Saldo || v.Total || 0) || 0;
          this.selected.push({ VentaID: v.VentaID, ImporteAplicado: imp });
          this.selectedMap[v.VentaID] = { ImporteAplicado: imp };
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
    const payload = {
      Fecha: this.fecha || undefined,
      ClienteID: this.clienteId || undefined,
      ventas: this.selected.map(s => ({ VentaID: s.VentaID, ImporteAplicado: Number(s.ImporteAplicado || 0) })),
      pagos: this.pagos.map(p => ({ TipoPago: p.TipoPago, Monto: Number(p.Monto || 0), Datos: p.Datos })),
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
}
