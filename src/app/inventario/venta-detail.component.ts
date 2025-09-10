import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { InventarioService } from './inventario.service';

@Component({
  selector: 'app-venta-detail',
  templateUrl: './venta-detail.component.html'
})
export class VentaDetailComponent implements OnInit {
  venta: any = null;
  detalles: any[] = [];
  constructor(private route: ActivatedRoute, private inv: InventarioService) {}
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(+id);
  }
  load(id: number) {
    this.inv.getVenta(id).subscribe((r:any) => {
      this.venta = r;
      this.detalles = r?.detalles || [];
    }, err => {
      console.error('Error cargando venta', err);
    });
  }
}
