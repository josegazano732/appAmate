import { Component, OnInit } from '@angular/core';
import { ToastService } from './toast.service';
import { Toast } from './toast.model';

@Component({
  selector: 'app-toast-container',
  template: `
    <div class="app-toast-container" aria-live="polite" aria-atomic="false">
      <div *ngFor="let t of toasts" class="app-toast" [class.success]="t.type==='success'" [class.error]="t.type==='error'" [class.info]="t.type==='info'" [class.warning]="t.type==='warning'" role="status">
        <div class="msg">{{ t.message }}</div>
        <button type="button" class="close-btn" (click)="close(t.id)" aria-label="Cerrar">×</button>
      </div>
    </div>
  `,
  styles: [`
    .app-toast-container { position: fixed; top: .75rem; right: .75rem; display:flex; flex-direction:column; gap:.5rem; z-index: 9999; max-width: 340px; }
    .app-toast { position:relative; padding:.6rem .85rem; border-radius:4px; font-size:.75rem; line-height:1.2; box-shadow:0 2px 6px rgba(0,0,0,.18); background:#fff; border:1px solid var(--c-border,#ccc); display:flex; align-items:flex-start; gap:.75rem; }
    .app-toast.success{ background: var(--c-pos-bg,#e6f7ed); border-color: var(--c-pos,#2e7d32); color: var(--c-pos,#2e7d32);} 
    .app-toast.error{ background: #fdecea; border-color:#c62828; color:#c62828; }
    .app-toast.info{ background:#e8f1fe; border-color:#1565c0; color:#1565c0; }
    .app-toast.warning{ background:#fff4e5; border-color:#ef6c00; color:#ef6c00; }
    .app-toast .close-btn{ background:transparent; border:none; color:inherit; font-size:1rem; line-height:1; cursor:pointer; padding:.1rem .25rem; position:absolute; top:.2rem; right:.3rem; }
    .app-toast .close-btn:focus{ outline:2px solid currentColor; outline-offset:2px; }
  `]
})
export class ToastContainerComponent implements OnInit {
  toasts: Toast[] = [];
  constructor(private ts: ToastService) {}
  ngOnInit(): void {
    this.ts.changes$.subscribe(list => this.toasts = list);
  }
  close(id: string){ this.ts.remove(id); }
}
