import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ToastService } from '../shared/toast.service';
import { ParametrosService, PaymentMethod } from './parametros.service';

@Component({
  selector: 'app-payment-methods',
  templateUrl: './payment-methods.component.html',
  styleUrls: ['./payment-methods.component.css']
})
export class PaymentMethodsComponent implements OnInit {
  loading = false;
  items: PaymentMethod[] = [];
  showInactive = false;
  form = { Nombre: '', Codigo: '', RequiereBanco: false, RequiereDatos: false };
  error: string | null = null; // Solo para mostrar validaciones inline si hiciera falta
  editingId: number | null = null;
  editForm = { Nombre: '', Codigo: '', RequiereBanco: false, RequiereDatos: false };
  @ViewChild('editNombreInput') editNombreInput!: ElementRef<HTMLInputElement>;

  constructor(private paramsSvc: ParametrosService, private toast: ToastService) {}

  ngOnInit(){ this.load(); }

  async load(){
    if(this.editingId!==null){ return; } // no recargar si se está editando
    this.loading = true; this.error=null;
    this.paramsSvc.listPaymentMethods(this.showInactive).subscribe({
      next: (rows: PaymentMethod[]) => { this.items = rows; this.loading=false; },
      error: (err: any) => { this.error = 'Error cargando métodos'; this.loading=false; console.error(err); }
    });
  }

  submit(){
  this.error=null;
  if(!this.form.Nombre.trim()){ this.error='Nombre requerido'; return; }
    const payload = {
      Nombre: this.form.Nombre.trim(),
      Codigo: this.form.Codigo?.trim() || undefined,
      RequiereBanco: this.form.RequiereBanco ? 1:0,
      RequiereDatos: this.form.RequiereDatos ? 1:0
    };
    this.paramsSvc.createPaymentMethod(payload).subscribe({
      next: r => { this.paramsSvc.invalidatePaymentMethods(); this.toast.success('Método creado'); this.form = { Nombre:'', Codigo:'', RequiereBanco:false, RequiereDatos:false }; this.load(); },
      error: err => { this.toast.error('Error creando método'); console.error(err); }
    });
  }

  toggleActivo(m: PaymentMethod){
    const nuevo = m.Activo ? 0 : 1;
    this.paramsSvc.patchPaymentMethod(m.PaymentMethodID, { Activo: nuevo }).subscribe({
      next: () => { m.Activo = nuevo; this.paramsSvc.invalidatePaymentMethods(); this.toast.info(`Método ${nuevo? 'activado':'desactivado'}`); },
      error: (err:any) => { console.error(err); this.toast.error('Error actualizando estado'); }
    });
  }

  startEdit(m: PaymentMethod){
    this.editingId = m.PaymentMethodID;
    this.editForm = {
      Nombre: m.Nombre,
      Codigo: m.Codigo || '',
      RequiereBanco: !!(m as any).RequiereBanco,
      RequiereDatos: !!(m as any).RequiereDatos
    };
    // microtask para asegurar render y luego focus
    setTimeout(()=>{ try { this.editNombreInput?.nativeElement.focus(); this.editNombreInput?.nativeElement.select(); } catch(_){} },0);
  }
  cancelEdit(){ this.editingId = null; }
  saveEdit(m: PaymentMethod){
  if(!this.editForm.Nombre.trim()){ this.error='Nombre requerido'; return; }
    const payload:any = {
      Nombre: this.editForm.Nombre.trim(),
      Codigo: this.editForm.Codigo.trim() || null,
      RequiereBanco: this.editForm.RequiereBanco?1:0,
      RequiereDatos: this.editForm.RequiereDatos?1:0
    };
    this.paramsSvc.patchPaymentMethod(m.PaymentMethodID, payload).subscribe({
      next: () => {
        m.Nombre = payload.Nombre;
        (m as any).Codigo = payload.Codigo;
        (m as any).RequiereBanco = payload.RequiereBanco;
        (m as any).RequiereDatos = payload.RequiereDatos;
        this.paramsSvc.invalidatePaymentMethods();
        this.editingId = null;
        this.toast.success('Método actualizado');
      },
      error: (err:any) => { console.error(err); this.toast.error('Error guardando cambios'); }
    });
  }

  onEditKey(event: KeyboardEvent, m: PaymentMethod){
    if(event.key==='Enter'){ event.preventDefault(); this.saveEdit(m); }
    else if(event.key==='Escape'){ event.preventDefault(); this.cancelEdit(); }
  }

  trackById(_i:number, m:PaymentMethod){ return m.PaymentMethodID; }
}
