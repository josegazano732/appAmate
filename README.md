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

### Campos Fiscales (Backend)
Los endpoints de recibos ahora devuelven además de `ClienteNombre` los campos:

- `NombreRazonSocial`
- `NombreFiscal`

La lógica de presentación en el detalle prioriza: `NombreRazonSocial || NombreFiscal || ClienteNombre || 'ID ' + ClienteID`.
En exports (CSV / PDF) se incluyen ambas columnas nuevas para facilitar conciliaciones externas.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Tests

Se usa el runner de Karma/Jasmine por defecto de Angular CLI.

### Ejecutar
`ng test` corre la suite en modo watch (según configuración). Para una sola corrida continua usar:

```
ng test --watch=false --code-coverage
```

### Cobertura
El flag `--code-coverage` genera carpeta `coverage/` con reporte HTML (abrir `index.html`).

### Pruebas agregadas (Recibos)
- `recibo-detail.component.spec.ts`: Verifica la prioridad de presentación de nombre de cliente en el getter `recClienteDisplay`:
  1. `NombreRazonSocial`
  2. `NombreFiscal`
  3. `ClienteNombre`
  4. `ID <ClienteID>`
  5. `N/D` final

### Próximas sugerencias
- Añadir pruebas de lógica de cálculo: Totales (Pagos, Aplicado, Diferencia) en el formulario.
- Testear filtros y paginación de `ReciboFormComponent` (mock de datos de ventas).
- Pruebas para endpoints backend con una capa e2e ligera (supertest o similar) fuera del scope actual.

## Further help

Use `ng help` or Angular CLI docs.
