import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NotaPedido } from './nota.model';

@Component({
  selector: 'app-nota-page',
  template: `
    <div class="container">
      <h3>Crear Nota de Pedido</h3>
      <app-nota-form [nota]="nota" (guardado)="onGuardado($event)" (cancel)="onCancel()"></app-nota-form>
    </div>
  `
})
export class NotaPageComponent {
  nota: NotaPedido = { ClienteID: 0 } as any;

  constructor(private route: ActivatedRoute, private router: Router) {
    const id = Number(this.route.snapshot.paramMap.get('clienteId'));
    if (id) this.nota.ClienteID = id;
    this.nota.Fecha = new Date().toISOString().slice(0,10);
  }

  onGuardado(res: any) {
    // navegar a la lista de clientes o a la vista de nota
    this.router.navigate(['/']);
  }

  onCancel() {
    this.router.navigate(['/']);
  }
}
