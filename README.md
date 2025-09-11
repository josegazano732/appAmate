# AppSis

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 15.2.11.

## Desarrollo

Arrancar backend esperado en `http://localhost:3000/api` y luego ejecutar `ng serve`.

## Vista Recibo de Cobranza

Se incorporó una vista profesional de detalle de recibos:

- Listado: Navegar a `Inventario > Recibos`.
- Crear: Botón "Nuevo Recibo" abre el formulario existente (`ReciboFormComponent`).
- Detalle: Al hacer clic en "Ver" ahora se muestra `ReciboDetailComponent` con:
  - Resumen de totales (Pagos, Aplicado, Diferencia).
  - Tabla de Pagos con tipo, monto y datos.
  - Tabla de facturas aplicadas con saldos antes/después y monto aplicado para trazabilidad.
  - Observaciones y sección de auditoría (fechas y usuario si backend provee campos `CreatedAt`, `CreatedBy`, `UpdatedAt`).
  - Acciones: Imprimir (usa `window.print`) y Exportar JSON.

### Modelo
Definido en `src/app/inventario/recibo.model.ts` con interfaces `Recibo`, `ReciboPago`, `ReciboVentaAplicada`.

### Estilos
`recibo-detail.component.css` aplica layout responsive (grid y tarjetas). En impresión se ocultan controles.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Tests

Run `ng test` to execute unit tests.

## Further help

Use `ng help` or Angular CLI docs.
