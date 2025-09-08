import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArsCurrencyPipe } from '../pipes/ars-currency.pipe';

@NgModule({
  declarations: [ArsCurrencyPipe],
  imports: [CommonModule],
  exports: [ArsCurrencyPipe]
})
export class SharedModule {}
