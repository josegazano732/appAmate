import { Component, OnInit } from '@angular/core';
import { ToastService } from './toast.service';
import { Toast } from './toast.model';

@Component({
  selector: 'app-toast-container',
  template: `
    <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index:1050">
      <div *ngFor="let t of toasts" class="toast show mb-2" [ngClass]="{'bg-success text-white': t.type==='success', 'bg-danger text-white': t.type==='error', 'bg-info text-dark': t.type==='info'}">
        <div class="toast-body">{{ t.message }}</div>
      </div>
    </div>
  `
})
export class ToastContainerComponent implements OnInit {
  toasts: Toast[] = [];
  constructor(private ts: ToastService) {}
  ngOnInit(): void {
    this.ts.changes$.subscribe(list => this.toasts = list);
  }
}
