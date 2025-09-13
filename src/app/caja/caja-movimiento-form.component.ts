import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { InventarioService } from '../inventario/inventario.service';

@Component({
  selector: 'app-caja-movimiento-form',
  templateUrl: './caja-movimiento-form.component.html',
  styleUrls: ['./caja-movimiento-form.component.css']
})
export class CajaMovimientoFormComponent {
  model:any={ Tipo:'EGRESO', Importe:0, Medio:'', Descripcion:'' };
  saving=false; error:string|undefined;

  constructor(private inv:InventarioService, private router:Router){}

  submit(){
    this.error=undefined;
    if(!this.model.Tipo || !this.model.Importe || this.model.Importe<=0){ this.error='Importe > 0 requerido'; return; }
    this.saving=true;
    this.inv.cajaCreateMovimiento({ ...this.model }).subscribe({
      next: _=>{ this.saving=false; this.router.navigate(['/caja/movimientos']); },
      error: _=>{ this.error='Error guardando'; this.saving=false; }
    });
  }
}
