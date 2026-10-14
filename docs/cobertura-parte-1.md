# Cobertura del backend: parte 1

Fecha: 13 de octubre de 2026.

Alcance: los 21 archivos visibles en la captura, desde app.controller.ts hasta get-revenue-report.use-case.ts. Se agregaron cinco archivos de pruebas, sin cambiar código de producción ni excluir fuentes de la cobertura.

## Resultado verificado

| Métrica global | Antes (suite existente) | Después |
| --- | ---: | ---: |
| Líneas | 62,40% (2028/3250) | 68,33% (2221/3250) |
| Ramas | 26,85% (395/1471) | 35,28% (519/1471) |
| Pruebas | 107 aprobadas / 21 suites | 149 aprobadas / 26 suites |

Se añadieron 42 pruebas y se cubrieron 193 líneas adicionales. Los 21 archivos de la captura alcanzan el 100% de líneas. Faltan 54 líneas adicionales para alcanzar el 70% global, manteniendo las 3250 líneas actuales.

El 14,7% de la captura corresponde a 444/3019 líneas; no coincide con la medición de esta versión y su suite completa. No se ha determinado el comando ni la versión usados para aquella captura. Los porcentajes anteriores son mediciones locales de Jest; no representan un nuevo análisis remoto de SonarQube.

## Archivos de la captura

| Archivo bajo src | Líneas antes | Líneas después | Ramas después |
| --- | ---: | ---: | ---: |
| app.controller.ts | 100% | 100% | 100% |
| app.module.ts | 100% | 100% | 100% |
| app.service.ts | 100% | 100% | 100% |
| main.ts | 0% | 100% | 100% |
| common/decorators/current-user.decorator.ts | 100% | 100% | 100% |
| common/decorators/public.decorator.ts | 100% | 100% | 100% |
| common/decorators/roles.decorator.ts | 100% | 100% | 100% |
| common/domain/exceptions/domain.exception.ts | 100% | 100% | 100% |
| common/filters/domain-exception.filter.ts | 69.23% | 100% | 100% |
| common/guards/jwt-auth.guard.ts | 90.9% | 100% | 100% |
| common/guards/roles.guard.ts | 33.33% | 100% | 100% |
| common/supabase/supabase-storage.service.ts | 100% | 100% | 97.05% |
| common/supabase/supabase.module.ts | 100% | 100% | 100% |
| common/supabase/supabase.provider.ts | 40% | 100% | 100% |
| modules/analytics/analytics.module.ts | 100% | 100% | 100% |
| modules/analytics/application/use-cases/compare-courts-performance.use-case.ts | 27.27% | 100% | 100% |
| modules/analytics/application/use-cases/get-court-occupancy-ranking.use-case.ts | 20.68% | 100% | 100% |
| modules/analytics/application/use-cases/get-executive-kpi-summary.use-case.ts | 15.68% | 100% | 100% |
| modules/analytics/application/use-cases/get-peak-hours-analysis.use-case.ts | 17.39% | 100% | 100% |
| modules/analytics/application/use-cases/get-pending-receivables.use-case.ts | 35.29% | 100% | 100% |
| modules/analytics/application/use-cases/get-revenue-report.use-case.ts | 17.77% | 100% | 89.28% |

## Casos verificados

- Acceso público, autenticación delegada a Passport, roles permitidos y denegados, prioridad del método sobre la clase y extracción del usuario.
- Traducción de excepciones de dominio y HTTP, preservación de respuestas y ocultación de errores internos.
- Normalización de URL, prioridad de claves de prueba y configuración incompleta de Supabase; cliente simulado sin conexión remota.
- Arranque con puerto predeterminado y personalizado, CORS, instalación de middleware, filtro global y conversión de parámetros.
- Comparación de canchas, ranking de ocupación, horas pico, saldos pendientes, desglose de ingresos y resumen ejecutivo. Incluye filtros, estados excluidos, ausencia de datos, cliente ausente y fallo de persistencia.

ESLint pasó para los cinco archivos nuevos. La suite completa incluye la prueba HTTP local. Jest mantiene una advertencia previa de ts-jest sobre NodeNext e isolatedModules; no impidió las pruebas.

## Reproducir el informe

Desde la carpeta del backend:

```powershell
node node_modules/jest/bin/jest.js --coverage --runInBand --coverageReporters=json-summary --coverageReporters=lcov --coverageReporters=text-summary
```

- Informe navegable: coverage/lcov-report/index.html.
- Datos de cobertura: coverage/coverage-summary.json.
- LCOV: coverage/lcov.info.
- Medición inicial: coverage/before/coverage-summary.json.

La cobertura de líneas no equivale a cobertura de ramas ni garantiza ausencia de errores. Esta parte cumple el alcance de la captura; el 70% global queda pendiente para el siguiente bloque.
