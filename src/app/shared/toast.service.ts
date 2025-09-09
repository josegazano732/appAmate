import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Toast } from './toast.model';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toasts: Toast[] = [];
  private changes = new Subject<Toast[]>();
  public changes$ = this.changes.asObservable();

  show(message: string, type: Toast['type'] = 'info', timeout = 4000) {
    const t: Toast = { id: Math.random().toString(36).slice(2), type, message, timeout };
    this.toasts.push(t);
    this.changes.next(this.toasts.slice());
    if (timeout > 0) setTimeout(() => this.remove(t.id), timeout);
    return t.id;
  }

  success(message: string, timeout = 3500) { return this.show(message, 'success', timeout); }
  error(message: string, timeout = 5000) { return this.show(message, 'error', timeout); }
  info(message: string, timeout = 4000) { return this.show(message, 'info', timeout); }

  remove(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.changes.next(this.toasts.slice());
  }
}
