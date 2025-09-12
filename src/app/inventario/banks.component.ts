import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ToastService } from '../shared/toast.service';
import { ParametrosService, Bank } from './parametros.service';

@Component({
  selector: 'app-banks',
  templateUrl: './banks.component.html',
  styleUrls: ['./banks.component.css']
})
export class BanksComponent implements OnInit {
  loading=false;
  items: Bank[] = [];
  showInactive = false;
  form = { Nombre:'', Codigo:'' };
  error:string|null=null; // Validaciones inline básicas
  // Edición inline
  editingId: number|null = null;
  editForm: { Nombre:string; Codigo:string } = { Nombre:'', Codigo:'' };
  @ViewChild('editBankNombreInput') editBankNombreInput!: ElementRef<HTMLInputElement>;
  constructor(private paramsSvc: ParametrosService, private toast: ToastService) {}
  ngOnInit(){ this.load(); }
  load(){
    // Evitar recargar mientras se está editando para no perder foco/estado
    if(this.editingId!==null){ return; }
    this.loading=true; this.paramsSvc.listBanks(this.showInactive).subscribe({
      next: (rows: Bank[]) => { this.items=rows; this.loading=false; },
      error: (err:any) => { console.error(err); this.error='Error cargando bancos'; this.loading=false; }
    });
  }
  submit(){
  this.error=null;
  if(!this.form.Nombre.trim()){ this.error='Nombre requerido'; return; }
    const payload = { Nombre: this.form.Nombre.trim(), Codigo: this.form.Codigo?.trim() || undefined };
    this.paramsSvc.createBank(payload).subscribe({
      next: r => { this.paramsSvc.invalidateBanks(); this.toast.success('Banco creado'); this.form={Nombre:'', Codigo:''}; this.load(); },
      error: err => { console.error(err); this.toast.error('Error creando banco'); }
    });
  }

  toggleActivo(b: Bank){
    const nuevo = b.Activo ? 0 : 1;
    this.paramsSvc.patchBank(b.BankID, { Activo: nuevo }).subscribe({
      next: () => { b.Activo = nuevo; this.paramsSvc.invalidateBanks(); this.toast.info(`Banco ${nuevo? 'activado':'desactivado'}`); },
      error: (err:any) => { console.error(err); this.toast.error('Error actualizando estado'); }
    });
  }

  // --- Edición inline ---
  startEdit(b: Bank){
  this.error=null;
    this.editingId = b.BankID;
    this.editForm = { Nombre: b.Nombre, Codigo: b.Codigo || '' };
    setTimeout(()=>{ try { this.editBankNombreInput?.nativeElement.focus(); this.editBankNombreInput?.nativeElement.select(); } catch(_){} },0);
  }
  cancelEdit(){
    this.editingId = null;
  }
  saveEdit(b: Bank){
    if(!this.editForm.Nombre.trim()){ this.error='Nombre requerido'; return; }
    const payload: any = { Nombre: this.editForm.Nombre.trim() };
    if(this.editForm.Codigo?.trim()) payload.Codigo = this.editForm.Codigo.trim(); else payload.Codigo = null;
    this.paramsSvc.patchBank(b.BankID, payload).subscribe({
      next: () => {
        b.Nombre = payload.Nombre;
        b.Codigo = payload.Codigo || null;
        this.paramsSvc.invalidateBanks();
        this.editingId=null; this.toast.success('Banco actualizado');
      },
      error: (err:any) => { console.error(err); this.toast.error('Error guardando'); }
    });
  }

  onEditKey(event: KeyboardEvent, b: Bank){
    if(event.key==='Enter'){ event.preventDefault(); this.saveEdit(b); }
    else if(event.key==='Escape'){ event.preventDefault(); this.cancelEdit(); }
  }

  trackById(_i:number, b:Bank){ return b.BankID; }
}
