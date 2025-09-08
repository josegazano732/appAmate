import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'arsCurrency'
})
export class ArsCurrencyPipe implements PipeTransform {
  transform(value: number | string | null | undefined, showSymbol = true): string {
    if (value === null || value === undefined || value === '') return '';
    const num = typeof value === 'string' ? Number(value) : Number(value || 0);
    if (Number.isNaN(num)) return '';

    // Formateo: separador de miles punto, separador decimal coma, siempre 2 decimales
    const sign = num < 0 ? '-' : '';
    const abs = Math.abs(num);
    const whole = Math.trunc(abs);
    const decimals = Math.round((abs - whole) * 100);

    const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const decimalsStr = (decimals).toString().padStart(2, '0');

    return `${sign}${showSymbol ? '$ ' : ''}${wholeStr},${decimalsStr}`;
  }
}
