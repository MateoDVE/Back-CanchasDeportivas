# Cobertura del backend: parte 2

La meta de 70% de cobertura global de líneas se alcanzó con pruebas de caja y horarios. No se modificó código de producción ni se excluyeron fuentes de la medición.

| Métrica | Parte 1 | Parte 2 |
| --- | ---: | ---: |
| Líneas | 68,33% (2221/3250) | 71,69% (2330/3250) |
| Sentencias | 68,24% | 71,35% |
| Ramas | 35,28% | 41,53% |
| Funciones | 47,45% | 53,44% |
| Pruebas aprobadas | 149 | 171 |
| Suites aprobadas | 26 | 28 |

Se añadieron 22 pruebas, que cubren 109 líneas adicionales. ESLint pasó para ambos archivos nuevos.

## Alcance comprobado

- Caja: cobros y devoluciones por efectivo/QR, exclusión de pagos pendientes o rechazados, diferencia del efectivo declarado, fecha de Bolivia cerca del cambio de día UTC, cierre vacío, actualización de turno abierto, rechazo de segundo cierre, montos negativos/NaN y fallo de consulta de pagos.
- Auditoría: intervalo inclusivo de fechas, filtro por secretaria, orden por fecha de creación y contacto alternativo cuando no existe el usuario.
- Horarios: creación, consulta, reemplazo y vaciado semanal; preservación de otras canchas y excepciones por fecha; actualización de una fecha concreta; rechazo de canchas inexistentes, días fuera de rango, lista ausente, formato de fecha inválido y cierre anterior o igual a apertura.

Los tres casos de uso de caja, su entidad y su repositorio en memoria alcanzan 100% de líneas. También alcanzan 100% de líneas los tres casos de uso de horarios, su entidad y su repositorio en memoria.

## Reproducir

Desde la carpeta del backend:

```powershell
node node_modules/jest/bin/jest.js --coverage --runInBand --coverageReporters=json-summary --coverageReporters=lcov --coverageReporters=text-summary
```

- Informe navegable: `coverage/lcov-report/index.html`.
- Resumen: `coverage/coverage-summary.json`.
- LCOV: `coverage/lcov.info`.
- Registro de esta ejecución: `coverage-part2-final.log`.

## Actualizar CoverageReportBackend

El HTML de `CoverageReportBackend` es una exportación independiente: ejecutar Jest actualiza `coverage/lcov.info`, pero no regenera automáticamente esa carpeta. El informe anterior tenía fecha del 8 de octubre de 2026 y mostraba 503/3023 líneas (16,6%). El 14 de octubre se regeneró con el LCOV actual: 2330/3250 líneas y 611/1471 ramas. ReportGenerator muestra estos valores como 71,6% y 41,5%; Jest muestra 71,69% y 41,53%.

Después de ejecutar la suite completa con el comando anterior, regenerar desde la carpeta del backend:

```powershell
.\.tools\reportgenerator\reportgenerator.exe '-reports:coverage/lcov.info' '-targetdir:CoverageReportBackend' '-reporttypes:Html' '-sourcedirs:.'
```

Abrir `CoverageReportBackend/index.html` y recargar el navegador si conserva la página anterior. La herramienta quedó instalada localmente en `.tools`, excluida de Git. Para instalarla en otra máquina:

```powershell
dotnet tool install dotnet-reportgenerator-globaltool --tool-path ./.tools/reportgenerator --version 5.5.11
```

La suite completa incluye la prueba HTTP local y pasó con 171 pruebas. Permanece la advertencia previa de ts-jest sobre NodeNext e isolatedModules.

## Pendientes

El 71,69% cumple la meta global de líneas; no significa que todo el código esté cubierto ni que esté libre de errores. Quedan 920 líneas sin cubrir y la cobertura de ramas es 41,53%. Entre los bloques pendientes están pagos, reservas, personal y repositorios Supabase. Estos resultados son locales de Jest; no se ejecutó un nuevo análisis remoto de SonarQube.
