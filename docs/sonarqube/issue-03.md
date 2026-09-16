# Issue 3 — Dependencia Reflector de solo lectura

- Regla: `typescript:S2933`; mantenibilidad, impacto medio; esfuerzo 2 min.
- Archivo: `src/common/guards/roles.guard.ts`, constructor (línea original 7; reporte asociado a línea 6).
- Antes: `constructor(private reflector: Reflector) {}`.
- Después: `constructor(private readonly reflector: Reflector) {}`.
- Problema: la dependencia se recibe al construir el guard y nunca se reasigna, pero el tipo permitía sustituirla accidentalmente.
- Decisión e impacto: expresar la invariancia de la referencia en TypeScript. No congela el objeto Reflector ni cambia la inyección de NestJS.
- Comportamiento preservado: consulta de roles y respuestas de autorización/rechazo idénticas; no se modifica `canActivate`.
- Verificación: compilación TypeScript con `node node_modules/typescript/bin/tsc --noEmit --incremental false`. No se añaden pruebas que solo reproduzcan el modificador readonly.
- Resultado SonarQube: pendiente de nuevo análisis; no se declara cerrada solo por editar el código.

Resultado local: comprobación TypeScript aprobada (código de salida 0).
