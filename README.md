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
