import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArsCurrencyPipe } from '../pipes/ars-currency.pipe';
import { ToastContainerComponent } from './toast-container.component';

@NgModule({
  declarations: [ArsCurrencyPipe, ToastContainerComponent],
  imports: [CommonModule],
  exports: [ArsCurrencyPipe, ToastContainerComponent]
})
export class SharedModule {}
