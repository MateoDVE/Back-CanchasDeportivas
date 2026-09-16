# Refactorización y comparación — Canchas Deportivas

Fecha del trabajo: 16 de septiembre de 2026. Proyecto SonarQube: `Canchas-Deportivas`, nombre `Canchas Deportivas`, versión inicial `1.0.0`.

## Alcance y procedencia de la evidencia

Proyecto de reservas de canchas deportivas, con frontend Angular 20 y backend NestJS 11, escritos en TypeScript. Las versiones declaradas del compilador son ~5.9.2 en frontend y ^5.7.3 en backend; consultar los lockfiles para versiones instaladas exactas. Estas correcciones afectan únicamente al backend.

El análisis inicial fue ejecutado por un integrante del equipo. Sus métricas y cinco hallazgos fueron proporcionados por el usuario; no se ejecutó ni se consultó ese servidor de SonarQube durante esta refactorización. La captura inicial se conserva en [evidencias/analisis-1-overview.png](evidencias/analisis-1-overview.png).

La edición visible es Community. Faltan por registrar: versión exacta del servidor y scanner, comando usado, nombre del Quality Profile, nombre/condiciones del Quality Gate, definición de New Code, advertencias del scanner, identificador del análisis y revisión Git realmente analizada. No deben deducirse a partir de la captura.

Estado local previo: rama `sonarcube`, commit `dacd978`, árbol limpio. Ese commit identifica nuestra base de refactorización, **no demuestra que sea la revisión del análisis remoto**. Los cuatro archivos locales coinciden con los fragmentos de los cinco hallazgos enviados.

## Configuración del primer análisis proporcionada por el equipo

```properties
sonar.projectKey=Canchas-Deportivas
sonar.projectName=Canchas Deportivas
sonar.projectVersion=1.0.0
sonar.sources=frontend/Front-CanchasDeportivas/src,backend/Back-CanchasDeportivas/src
sonar.exclusions=**/node_modules/**,**/dist/**,**/.angular/**,**/coverage/**,**/*.spec.ts
sonar.tests=backend/Back-CanchasDeportivas/test,frontend/Front-CanchasDeportivas/src
sonar.test.inclusions=**/*.spec.ts,**/*.test.ts
sonar.sourceEncoding=UTF-8
sonar.typescript.tsconfigPath=backend/Back-CanchasDeportivas/tsconfig.json
```

Se transcribe como evidencia, sin afirmar que todos los parámetros hayan sido aceptados por la versión del scanner. Las carpetas locales se llaman `back-canchas-deportivas` y `FrontCanchasDeportivas`: las rutas de arriba pertenecen a la máquina del compañero. Para conservar la trazabilidad, aplicar los cambios dentro de la misma estructura de rutas del análisis inicial. Mantener el mismo Project Key **y el mismo servidor con su historial**.

Justificación de exclusiones: dependencias externas, resultados de compilación, caché Angular y reportes generados no son código fuente propio. Los `.spec.ts` deben clasificarse como tests, no eliminarse de toda consideración. La configuración recibida no incluye `backend/Back-CanchasDeportivas/src` en sonar.tests, aunque allí están las pruebas unitarias del backend. Registrar esta limitación; si se corrige el alcance o un parámetro de configuración, anotarlo en la comparación para separar su efecto del de la refactorización.

## Línea base y tabla de evolución

Activity recibido: 15/09/2026, 23:22, primer análisis, versión 1.0.0, 235 Issues. La zona horaria de esa pantalla no fue confirmada. Las cifras abreviadas de líneas no se convierten artificialmente en valores exactos.

| Indicador | Análisis 1 (equipo) | Análisis 2 | Análisis 3 | Interpretación / pendiente |
|---|---|---|---|---|
| Issues totales | 235 | Pendiente | Pendiente | Usar total único de Issues; no sumar categorías |
| Issues por severidad/impacto | Distribución global no aportada | Pendiente | Pendiente | Selección: 1 alto y 4 medios |
| Security | 2; rating C | Pendiente | Pendiente | No se modificaron los dos hallazgos de seguridad |
| Reliability | 94; rating C | Pendiente | Pendiente | Issue 2 aborda el retroceso de una regex |
| Maintainability | 171; rating A | Pendiente | Pendiente | Issues 1, 3, 4 y 5 mejoran estructura/intención |
| Cognitive Complexity / Complexity global | No aportada | Pendiente | Pendiente | No confundir métrica global con una función |
| Complejidad cognitiva de uploadFile | 23; umbral 15 | Pendiente | Pendiente | Helpers extraídos; valor final requiere analizador |
| Duplicated Lines (%) | 1,0 % | Pendiente | Pendiente | No se puede prometer una reducción por estos cambios |
| Lines of Code | 17k (aproximado) | Pendiente | Pendiente | Overview |
| Líneas totales | 21k (aproximado) | Pendiente | Pendiente | Denominador mostrado en duplicación |
| Coverage | 0,0 %; 2,7k líneas a cubrir | Pendiente | Pendiente | Investigar importación LCOV |
| Security Hotspots | 0; review A | Pendiente | Pendiente | No equivale a ausencia de vulnerabilidades |
| Technical Debt / Effort global | No aportado | Pendiente | Pendiente | Obtener valor global desde Measures |
| Quality Gate | Passed | Pendiente | Pendiente | Registrar condiciones y alcance del Gate |
| Issues aceptadas | 0 | Pendiente | Pendiente | No se aceptaron Issues para ocultarlas |

Los conteos por calidad suman 267, mientras Activity indica 235. No se reemplaza el total de Activity por esa suma: las categorías no deben asumirse disjuntas. Confirmar filtros, fecha y posibles impactos múltiples con la lista/exportación original.

El esfuerzo estimado de las cinco Issues suma **39 minutos** (13 + 20 + 2 + 2 + 2). No representa deuda global, tiempo real invertido ni reducción medida posterior.

## Issues, decisiones y commits

| Issue | Regla | Antes → después | Evidencia / commit |
|---|---|---|---|
| 1 | S3776 | Decodificación y detección anidadas en uploadFile → helpers cohesivos y tabla de firmas | [Ficha 1](issue-01.md), `306874d` |
| 2 | S8786 | Regex con posibles reintentos → recorrido lineal desde extremos | [Ficha 2](issue-02.md), `48ec2eb` |
| 3 | S2933 | Reflector reasignable → referencia readonly | [Ficha 3](issue-03.md), `59cd1ca` |
| 4 | S2933 | Mapa shifts reasignable → referencia readonly | [Ficha 4](issue-04.md), `e7aa96b` |
| 5 | S2933 | Mapa courts reasignable → referencia readonly | [Ficha 5](issue-05.md), `3253543` |

Cada commit incorpora su corrección y su ficha en español. Para mostrar evidencia exacta antes/después:

```powershell
git show 306874d -- src/common/supabase/supabase-storage.service.ts
git show 48ec2eb -- src/common/supabase/supabase-storage.service.ts
git show 59cd1ca -- src/common/guards/roles.guard.ts
git show e7aa96b -- src/modules/cash-shifts/infrastructure/repositories/in-memory-cash-shift.repository.ts
git show 3253543 -- src/modules/courts/infrastructure/repositories/in-memory-court.repository.ts
```

Los números Issue 1–5 son etiquetas del equipo; no se proporcionaron claves únicas de SonarQube. En la siguiente corrida identificar por regla, archivo y función/propiedad: las líneas pueden desplazarse.

## Verificación y conservación del comportamiento

Antes de editar código de producción se ejecutó la suite existente: **32 pruebas aprobadas y 1 fallida**, en 8 suites (7 aprobadas y 1 fallida). Después se añadieron 18 pruebas del contrato de Storage: pasaron tanto con la implementación original como después de Issue 1. Issue 2 añadió 7 casos más, total 25 aprobados.

Verificación final:

| Comprobación | Resultado |
|---|---|
| npm run build | Correcto |
| Comprobación TypeScript tras cada readonly | Correcta |
| Pruebas de Storage | 25/25 aprobadas |
| Casos de uso de canchas | 3/3 aprobadas |
| Suite completa final | 57 aprobadas, 1 fallida; 8 suites aprobadas, 1 fallida |

La prueba fallida, presente antes y después, es `src/modules/reservations/domain/reservation-domain.spec.ts:62`: espera pendingBalance = 150 y recibe 0. No se corrigió porque pertenece a otra regla de negocio y requiere diagnóstico independiente. Por tanto, **la suite global no está completamente aprobada**. También aparece la advertencia previa TS151002 de ts-jest sobre módulos híbridos e isolatedModules.

Evidencias reproducibles: [salida de pruebas](evidencias/pruebas-finales.txt), [reporte JSON de Jest](evidencias/pruebas-finales.json), [compilación](evidencias/compilacion-final.txt). Ejecutar desde la raíz del backend:

```powershell
npm test -- --runInBand
npm run build
```

Las pruebas de Storage simulan el cliente: validan bytes, MIME, rutas, nombres, retornos y errores. No se realizaron subidas reales ni cambios en Supabase, pagos, permisos, buckets o datos. No equivalen a una prueba de integración real ni a una demostración completa de la aplicación.

## Interpretación del 0 % de cobertura

SonarQube importa cobertura; no ejecuta automáticamente Jest. El archivo recibido no declara sonar.javascript.lcov.reportPaths, pero podría existir configuración adicional en el servidor o línea de comandos: hace falta revisar el log para confirmar la causa exacta del 0 %.

Para medirla, ejecutar `npm run test:cov -- --runInBand` en el backend, revisar fallos y comprobar que exista coverage/lcov.info. Luego configurar el scanner para ese reporte con `sonar.javascript.lcov.reportPaths`, usando rutas válidas desde su directorio base. Verificar también las rutas SF del LCOV. No interpretar un reporte del backend como cobertura exclusiva de todo el proyecto: el frontend también pertenece al alcance y requeriría su reporte.

En esta tarea no se generó ni importó cobertura al servidor. Si se incorpora LCOV por primera vez, registrar que parte de la variación respecto a 0 % se debe a visibilidad de medición, no solamente a código mejorado. Véase [documentación oficial de cobertura JS/TS](https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/test-coverage/javascript-typescript-test-coverage).

## Cómo completar los análisis 2 y 3

1. En la máquina que conserva el análisis 1, guardar configuración, revisión, logs y métricas originales. Aplicar los cambios en las carpetas originales, manteniendo el mismo servidor, Project Key y alcance.
2. Si aún no se ejecutó el análisis 2, usar el estado después de `48ec2eb`: contiene Issues 1 y 2. Las tres correcciones readonly quedan como segunda etapa de mejora. Usar una copia de trabajo separada o integración controlada de los commits para no sobrescribir cambios de otros integrantes.
3. Compilar y probar, ejecutar el mismo mecanismo de scanner que ya funcionó, esperar que termine el procesamiento del servidor y guardar fecha, revisión, estado del Gate, advertencias y métricas. Completar columna 2 con resultados reales.
4. Investigar las reglas y el Profile; configurar y justificar el Gate propio en SonarQube. Registrar nombre y condiciones. Estas configuraciones no se realizaron desde esta tarea.
5. Aplicar hasta `3253543` (Issues 3–5), repetir pruebas y ejecutar análisis 3 sobre el mismo proyecto. Completar columna 3, capturar Activity y verificar cada Issue seleccionada.
6. Si ya se analizó el estado con las cinco correcciones como análisis 2, no inventar una corrida intermedia: partir de esos resultados para tomar nuevas decisiones de mejora justificadas antes del análisis 3.

Con los resultados reales calcular `delta absoluto = posterior - inicial` y, cuando inicial sea distinto de cero, `reducción porcentual = (inicial - posterior) / inicial × 100`. Para porcentajes de cobertura/duplicación informar también diferencia en puntos porcentuales. No anticipar 230 Issues: el análisis podría detectar otros hallazgos o cambios de alcance.

## Apoyo para la defensa y conclusión provisional

Explicar que una Rule es un criterio de análisis y una Issue es un hallazgo concreto de esa regla; las cinco Issues seleccionadas corresponden a tres reglas distintas. El Quality Profile establece las reglas activas y sus parámetros; el Quality Gate evalúa condiciones sobre métricas. Registrar los realmente utilizados, no asumir perfiles o umbrales predeterminados.

En la defensa mostrar qué entiende el proyecto por Overall Code y por New Code según su configuración. El Gate Passed inicial no demuestra ausencia de deuda: hay Issues abiertas y se desconocen sus condiciones. Tampoco cero Hotspots demuestra seguridad completa; la pantalla muestra una advertencia de análisis de seguridad limitado.

Conclusión verificable: se simplificó la responsabilidad de uploadFile, se sustituyó un algoritmo de posible coste superlineal por uno lineal y se expresaron tres referencias estables mediante readonly. La compilación pasa y las pruebas agregadas preservan el contrato observado; persiste un fallo previo ajeno a los cambios. La reducción numérica de Issues, complejidad, esfuerzo y los resultados de los Gates **solo podrán concluirse después de registrar los análisis 2 y 3 reales**.
