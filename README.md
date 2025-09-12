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

### Rediseño Listado de Recibos
El listado fue modernizado para aportar trazabilidad y lectura rápida:

- Sub‑toolbar de métricas: Totales de Pagos, Aplicado y Diferencia (con badge de color según signo).
- Barra visual de diferencia (diff bar) proporcional al monto aplicado vs pagos.
- Badges de estado (saldo / diferencia) y resaltado condicional con clases semánticas.
- Modo compacto (toggle) que reduce paddings y densidad para alta volumetría de registros.
- Acordeón de filtros avanzados (rango de fechas, diferencia, montos) con contador de filtros activos.
- Presets de rango de fechas (Hoy, Últimos 7 días, Mes actual, Mes anterior, Año actual) para acelerar consultas frecuentes.
- Filtros adicionales por Método de Pago y Banco (si corresponde) usando subconsultas EXISTS.
- Accesibilidad: uso de `aria-label`, `aria-pressed`, foco visible consistente, tipografía tabular para importes.
- Exportaciones directas: CSV / PDF / JSON con inclusión de campos fiscales.

### Formulario de Recibos (Refactor UX/CSS)
El formulario de creación/edición fue alineado a los tokens globales:

- Se reemplazaron estructuras `.section-card` por `.card.soft` reutilizable.
- Normalización de tamaños tipográficos (`.7rem` / `.66rem`) y uso de números tabulares.
- Resumen (Pagos, Aplicado, Diferencia) en grilla responsiva (`.resumen-grid`).
- Paginación / filtros internos simplificados y con labels en mayúsculas para escaneabilidad.
- Coloreado semántico para montos positivos (`var(--c-pos)`) y negativos (`var(--c-neg)`).

### Design Tokens & Sistema de Estilos
Centralizados en `src/styles.css` (extensible). Principales categorías:

| Token | Descripción |
|-------|-------------|
| `--c-bg`, `--c-bg-soft` | Fondos base y suaves para paneles/cards |
| `--c-border`, `--c-border-strong` | Líneas de separación y énfasis |
| `--c-text`, `--c-text-sub` | Texto primario y secundario |
| `--c-accent`, `--c-primary` | Colores de acción y destaque |
| `--c-pos`, `--c-neg` | Estados monetarios / validación positivo/negativo |
| `--c-pos-bg`, `--c-neg-bg` | Fondos suaves de estados |
| `--space-xxs`..`--space-lg` | Escala de espaciados |
| `--radius-sm`..`--radius-lg` | Radios consistentes |
| `--shadow-sm`..`--shadow-lg` | Elevaciones unificadas |

Componentes base disponibles:

- Botones: `.btn` + variantes (`.primary`, `.accent`, `.subtle`, `.ghost`, `.danger`, tamaños `.sm`, `.xs`).
- Tarjetas: `.card.soft` para paneles con fondo suave y sombra leve.
- Pills / Badges: `.pill` y utilidades para estados (`.mono` para tipografía monoespaciada parcial en importes si se requiere).

### Accesibilidad
- Foco visible reforzado (outline contrastado) en botones y toggles.
- Elementos interactivos con roles implícitos y `aria-*` puntuales (ej. estado de acordeón y toggles de modo compacto / filtros avanzados).
- Uso de números tabulares para evitar saltos de layout al cambiar dígitos.

### Exportaciones
Las acciones de exportación unifican los campos visibles del listado, añadiendo: ID, Cliente (priorizando campos fiscales), Pagos, Aplicado, Diferencia y fecha. El PDF replica la densidad del modo compacto para economía de espacio.

### Buenas Prácticas Aplicadas
- Refactor incremental sin romper contratos de servicios.
- Separación presentación / lógica: cálculos de diferencia y agregados en el componente de listado; presentacional puro en detalle/formulario.
- Minimización de duplicación CSS trasladando patrones comunes a tokens/utilidades.
- Semántica cuidada (tablas con `thead` sticky, caption accesible visually hidden cuando aplica).

### Próximas Mejores (Opcional / Backlog)
- Persistencia local de filtros (LocalStorage) para recordar estado entre sesiones.
- Presets de rango de fechas rápidos (Hoy, 7 días, Mes actual) en el acordeón avanzado.
- Tests adicionales: cálculo `_diffPct`, activación/contador de filtros avanzados, exportaciones.
- Endpoint de exportación XLSX (si se justifica) combinando campos fiscales y métricas.

---

## Guía Rápida de Estilos Recibos

| Caso | Clase / Patrón | Nota |
|------|----------------|------|
| Contenedor de bloque | `.card.soft` | Fondo suave y padding estándar |
| Botón acción primaria | `.btn.primary` | Uso para crear / confirmar |
| Botón acción secundaria | `.btn.accent` / `.btn.subtle` | Acciones neutrales |
| Botón minimal / toggle | `.btn.ghost` | Barra de herramientas / switches |
| Estado positivo | `var(--c-pos)` | Montos aplicados / saldos en verde |
| Estado negativo | `var(--c-neg)` | Diferencias negativas |
| Badge diferencia | `.pill` + color estado | Muestra delta visual |
| Texto numérico denso | font-variant-numeric: tabular-nums | Evita salto horizontal |

---

## Cómo Extender
1. Para un nuevo estado (ej. pendiente) añadir token `--c-pending` + `--c-pending-bg` y variante de badge.
2. Añadir utilidades específicas en `styles.css` (evitar estilos ad-hoc en componentes salvo layout fino).
3. Reutilizar patrones (cards, grid responsive) para mantener consistencia.

---

## Changelog Resumido (Recibos)
| Versión / Fase | Cambio Clave |
|----------------|--------------|
| Fase 1 | Vista detalle profesional + trazabilidad |
| Fase 2 | Campos fiscales y migración condicional backend |
| Fase 3 | Rediseño completo listado + métricas + diff bar |
| Fase 4 | Acordeón filtros avanzados + contador activo |
| Fase 5 | Tokens globales / sistema de botones / refactor detalle |
| Fase 6 | Refactor formulario a tokens + documentación |
| Fase 7 | Parametrización de Métodos de Pago y Bancos |

---

## Parametrización de Métodos de Pago y Bancos

Se incorporó un sistema flexible para administrar métodos de pago (`payment_methods`) y bancos (`banks`) que permite extender sin alterar el código del formulario.

### Backend
- Migraciones condicionales crean tablas:
  - `payment_methods (PaymentMethodID, Nombre, Codigo, Activo, RequiereBanco, RequiereDatos, CreatedAt)`
  - `banks (BankID, Nombre, Codigo, Activo, CreatedAt)`
- Alter incremental de `recibo_pagos` agrega columnas `PaymentMethodID` y `BankID` (no rompe datos previos).
- Seeds iniciales (ejemplo: Efectivo, Transferencia, Cheque, Echeq, Retencion) solo si la tabla está vacía.
- Endpoints REST:
  - `GET /api/payment-methods` (solo activos)
  - `POST /api/payment-methods` (creación básica)
  - `GET /api/banks`
  - `POST /api/banks`
- POST de recibos acepta ahora, por cada pago: `{ TipoPago, Monto, Datos, PaymentMethodID?, BankID? }`.
  - Si se envía `PaymentMethodID` y no `TipoPago`, el backend resuelve `TipoPago` textual (compatibilidad retro para reportes que aún lean ese campo).
  - El GET de recibo incluye `MethodNombre` y `BankNombre` vía `LEFT JOIN`.

### Frontend
- Nuevo servicio `ParametrosService` (`src/app/inventario/parametros.service.ts`).
  - `listPaymentMethods()` / `createPaymentMethod()`
  - `listBanks()` / `createBank()`
- Nuevos componentes de administración:
  - `PaymentMethodsComponent` en ruta `inventario/parametros/payment-methods`
  - `BanksComponent` en ruta `inventario/parametros/banks`
- Formulario de recibos:
  - Reemplaza combo estático de tipos por select dinámico de métodos.
  - Muestra select de banco únicamente si el método tiene `RequiereBanco=1`.
  - Muestra input de `Datos` solo si `RequiereDatos=1`.
  - Envía ambos campos ID al backend manteniendo `TipoPago` textual (para transiciones suaves).
  - Enlace contextual (icono ⚙) junto al select de Banco para abrir administración de Bancos.
  - Navbar principal incluye accesos directos a Bancos y Métodos de Pago.

### Ventajas
- Escalabilidad: agregar un nuevo método se limita a un POST.
- Validaciones condicionales (banco / datos) centralizadas por flags.
- Compatibilidad: vista y reportes que lean `TipoPago` no se rompen.

### Estado Actual Extendido
- Endpoints `PATCH /api/payment-methods/:id` y `PATCH /api/banks/:id` implementados para activar/desactivar y actualizar campos básicos.
- Listados admiten `?includeInactive=1` para administración completa.
- UI de administración incluye toggle de activación.
- Formulario valida dinámicamente banco y datos requeridos antes de permitir guardar.

### Próximos Pasos Sugeridos
1. (COMPLETADO) Edición inline de nombre/código sin diálogo (implementado para Métodos de Pago y Bancos: inputs inline + botones Guardar/Cancelar con patch optimista).
2. (COMPLETADO) Cache in-memory en servicio (invalidación al crear / patch / toggle activo).
3. Migrar listados/reportes a `MethodNombre` y deprecar `TipoPago` textual a mediano plazo.
4. (COMPLETADO) Filtros avanzados por método de pago / banco en listado de recibos.
5. Pruebas unitarias para validación condicional de pagos.
6. Mensajes toast unificados y accesibles (pendiente) / confirmaciones al desactivar.

### Edición Inline (Administración)
En los componentes de administración (`PaymentMethodsComponent` y `BanksComponent`):

- Cada fila muestra botón "Editar" que activa modo inline sobre Nombre y Código.
- En modo edición se renderizan `<input>` ligados a `editForm` y acciones `Guardar` / `Cancelar`.
- Validación mínima: Nombre requerido (trim).
- Guardado realiza `PATCH` y actualiza la fila local para feedback inmediato (optimista), además de invalidar cache.
- Código puede establecerse a vacío (`null`) limpiando el valor.
- Persisten los toggles de activación/desactivación sin interferir con el modo edición.

Accesibilidad: Los botones mantienen etiquetas y el foco permanece en el flujo natural; puede añadirse manejo de tecla `Esc` como mejora futura para cancelar.

### Alta de Bancos (UI y API)
Para dar de alta (crear) un Banco:

1. Navegar a `Inventario > Parámetros > Banks` (o ruta equivalente configurada en el router si existe un submenú de parámetros).
2. Completar campo `Nombre` (obligatorio) y opcionalmente `Código`.
3. Presionar `Agregar`. Se mostrará un toast de confirmación "Banco creado".
4. El nuevo banco queda activo por defecto y disponible en selects cuando un Método de Pago requiera banco.

Validaciones:
- `Nombre` no puede ir vacío o solo espacios.
- `Código` es opcional; si se deja vacío se guarda `null`.

Edición / Activación:
- Usar botón `Editar` para cambiar Nombre o Código inline y luego `Guardar`.
- Botón `Desactivar` (o `Activar`) alterna el estado sin borrar el registro.

#### Alta vía API (cURL)
```bash
curl -X POST http://localhost:3000/api/banks \
  -H "Content-Type: application/json" \
  -d '{"Nombre":"Banco Ejemplo","Codigo":"BEJ","Activo":1}'
```
Respuesta esperada:
```json
{ "ok": true, "BankID": 7 }
```

#### Atajos de Teclado
- `Enter`: Guarda los cambios cuando el foco está en un campo editable.
- `Escape`: Cancela la edición y restaura la vista anterior.
- Auto‑focus: Al iniciar edición el campo Nombre recibe foco y selecciona el texto existente para reemplazo rápido.

### Sistema de Toasts Accesibles
Se agregó un sistema ligero de notificaciones:

- Servicio: `ToastService` (`success`, `error`, `info`, `warning`).
- Contenedor global: `<app-toast-container>` presente en `app.component.html`.
- Accesibilidad: `aria-live="polite"`, `role="status"` en cada toast, botón de cierre con `aria-label`.
- Auto‑dismiss configurable (timeout por defecto 3.5–5s según tipo); cierre manual disponible.
- Variantes estilizadas reutilizando tokens de color (`success`, `error`, `info`, `warning`).

Ejemplo de uso en un componente:
```ts
constructor(private toast: ToastService) {}
onSave(){ this.toast.success('Guardado correctamente'); }
onError(){ this.toast.error('Error al guardar'); }
```

### Ejemplo Payload Recibo con Parametrización
```json
{
  "Fecha": "2024-06-01T10:30:00",
  "ClienteID": 12,
  "ventas": [ { "VentaID": 101, "ImporteAplicado": 2000 } ],
  "pagos": [
    { "PaymentMethodID": 1, "TipoPago": "Efectivo", "Monto": 1500 },
    { "PaymentMethodID": 2, "TipoPago": "Transferencia", "BankID": 3, "Monto": 500, "Datos": "Ref 1234" }
  ],
  "Observaciones": "Pago mixto"
}
```

---

---

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
