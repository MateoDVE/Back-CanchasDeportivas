# Issue 5 — Referencia estable del mapa de canchas

- Regla: `typescript:S2933`; mantenibilidad, impacto medio; esfuerzo 2 min.
- Archivo: `src/modules/courts/infrastructure/repositories/in-memory-court.repository.ts`, propiedad courts (línea original 7; reporte asociado a línea 6).
- Antes: `private courts: Map<number, Court> = new Map();`.
- Después: `private readonly courts: Map<number, Court> = new Map();`.
- Problema: se permitía reemplazar la referencia aunque el repositorio conserva un mismo mapa durante toda su vida.
- Decisión: impedir reasignaciones accidentales sin impedir `Map.set`, la consulta de canchas o `court.updatePrice`. No se congelan las entidades ni se modifica nextId.
- Comparación: misma lógica de altas, precios, actualizaciones y filtros; la intención del campo queda explícita y el compilador protege esa invariancia.
- Verificación: `node node_modules/typescript/bin/tsc --noEmit --incremental false` y suite existente de casos de uso de canchas.
- Resultado SonarQube: pendiente de nuevo análisis.

Resultado local: TypeScript aprobado y suite de casos de uso de canchas aprobada.
