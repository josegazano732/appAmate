import { Component, OnInit, Renderer2, HostListener, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { InventarioService } from './inventario/inventario.service';
import { debounce } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'AppSis';
  menuOpen = false;
  darkMode = false;
  subOpen: any = { inv: false, ventas: false, param: false, caja: false };

  toggleSub(key: 'inv'|'ventas'|'param'|'caja') {
    this.subOpen[key] = !this.subOpen[key];
  }
  closeMenu(){ this.menuOpen = false; }
  // Búsqueda global
  searchTerm = '';
  searchOpen = false;
  results: any = null;
  private searchTimer: any = null;

  constructor(private renderer: Renderer2, private router: Router, private inv: InventarioService, private el: ElementRef) {}

  ngOnInit(): void {
    const saved = localStorage.getItem('appTheme');
    if (saved === 'dark') {
      this.setDark(true, false);
    } else if (saved === 'light') {
      this.setDark(false, false);
    } else {
      const prefers = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setDark(prefers, false);
    }
  }

  toggleTheme(){ this.setDark(!this.darkMode, true); }

  private setDark(val: boolean, persist: boolean){
    this.darkMode = val;
    if (val) this.renderer.addClass(document.documentElement,'dark-theme');
    else this.renderer.removeClass(document.documentElement,'dark-theme');
    if (persist) localStorage.setItem('appTheme', val ? 'dark':'light');
  }

  // ---- Global Search ----
  onSearchInput(isMobile:boolean=false){
    if (!this.searchTerm.trim()) { this.results = null; return; }
    this.openSearch();
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(()=> this.execSearch(), 320);
  }
  openSearch(){ this.searchOpen = true; }
  clearSearch(){ this.searchTerm=''; this.results=null; this.searchOpen=false; }
  hasAnyResults(){ return !!(this.results && (this.results.clientes?.length || this.results.ventas?.length || this.results.productos?.length || this.results.recibos?.length)); }
  private execSearch(){
    const q = this.searchTerm.trim();
    if (!q){ this.results=null; return; }
    this.inv.globalSearch(q).subscribe({
      next: r => { this.results = r; },
      error: () => { this.results = { clientes:[], ventas:[], productos:[], recibos:[] }; }
    });
  }
  goToCliente(c:any){ this.router.navigate(['/'], { queryParams: { cliente: c.ClienteID }}); this.clearSearch(); }
  goToVenta(v:any){ this.router.navigate(['/inventario/ventas', v.VentaID]); this.clearSearch(); }
  goToProducto(p:any){ this.router.navigate(['/inventario/productos', p.ProductoID]); this.clearSearch(); }
  goToRecibo(r:any){ this.router.navigate(['/inventario/recibos', r.ReciboID]); this.clearSearch(); }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent){
    if (!this.searchOpen) return;
    const target = ev.target as HTMLElement;
    const container = this.el.nativeElement.querySelector('.global-search');
    if (container && !container.contains(target)) {
      this.searchOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEsc(){ if(this.searchOpen) this.searchOpen = false; }
}
