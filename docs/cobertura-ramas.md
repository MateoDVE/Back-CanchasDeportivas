# Mejora de cobertura de ramas — 14 de octubre de 2026

Se añadieron 47 pruebas de pagos, personal y límites de horarios, sin modificar código de producción ni las exclusiones de cobertura.

| Métrica global | Antes | Después |
| --- | ---: | ---: |
| Ramas | 41,53% (611/1471) | 46,02% (677/1471) |
| Líneas | 71,69% (2330/3250) | 74,67% (2427/3250) |
| Pruebas aprobadas | 171 | 218 |
| Suites aprobadas | 28 | 31 |

Son 66 ramas y 97 líneas adicionales cubiertas. ESLint pasó en los tres archivos nuevos; la suite completa, incluida la prueba HTTP local, terminó sin fallos. Permanece la advertencia previa de ts-jest sobre NodeNext e isolatedModules.

## Escenarios agregados

- Pagos: montos no positivos o no finitos, validación sin responsable, rechazo sin motivo, pagos ya procesados, pago o reserva inexistentes, confirmación desde estados temporal y pendiente de validación, y rechazo de comprobantes.
- Saldo final: ingresos netos con devoluciones, exclusión de pendientes, monto exacto requerido, reserva no confirmada o ya pagada y métodos de pago compatibles.
- Repositorio de pagos en memoria: reemplazo de comprobante pendiente, nuevo comprobante después de rechazo, búsquedas sin resultados, orden de creación y filtros por responsable y fecha de Bolivia.
- Personal: normalización, duplicidad de correo, fallo de cifrado, exclusión de campos privados, listado de roles internos, activación/desactivación, estado inválido y usuario ausente.
- Clientes: búsqueda por nombre, teléfono y correo, excluyendo personal e inactivos.
- Intervalos: formato inválido, fin anterior o igual al inicio, duración incompatible, minutos desplazados y solapamiento frente a horarios contiguos.

## Informes

Se regeneró `CoverageReportBackend/index.html` desde `coverage/lcov.info`. El informe navegable de Jest está en `coverage/lcov-report/index.html`; los datos están en `coverage/coverage-summary.json` y el registro de ejecución en `branch-coverage-final.log`.

La mejora es local y no representa un nuevo análisis de SonarQube. Aún quedan 794 ramas sin cubrir; 46,02% no implica cobertura completa ni ausencia de defectos. Los cambios se dejan sin commits.
