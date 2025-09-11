import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { InventarioService } from './inventario.service';
import { Recibo } from './recibo.model';

@Component({
  selector: 'app-recibo-detail',
  templateUrl: './recibo-detail.component.html',
  styleUrls: ['./recibo-detail.component.css']
})
export class ReciboDetailComponent implements OnInit {
  recibo: Recibo | null = null;
  loading = false;
  error: string | null = null;

  constructor(private route: ActivatedRoute, private svc: InventarioService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.fetch(+id);
    }
  }

  async fetch(id: number) {
    this.loading = true; this.error = null;
    try {
      const r: any = await this.svc.getRecibo(id).toPromise();
      this.recibo = r as Recibo;
    } catch (e:any) {
      console.error('Error cargando recibo', e);
      this.error = e?.message || 'No se pudo cargar el recibo';
    } finally { this.loading = false; }
  }

  print() { window.print(); }

  exportJSON() {
    if (!this.recibo) return;
    const blob = new Blob([JSON.stringify(this.recibo, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `recibo-${this.recibo.ReciboID}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  get recClienteDisplay(): string {
    const r = this.recibo;
    if(!r) return '';
    return (
      r.NombreRazonSocial ||
      r.NombreFiscal ||
      r.ClienteNombre ||
      (r.ClienteID != null ? ('ID ' + r.ClienteID) : 'N/D')
    );
  }
}
