# Issue 4 — Referencia estable del mapa de turnos de caja

- Regla: `typescript:S2933`; mantenibilidad, impacto medio; esfuerzo 2 min.
- Archivo: `src/modules/cash-shifts/infrastructure/repositories/in-memory-cash-shift.repository.ts`, propiedad shifts (línea original 7; reporte asociado a línea 6).
- Antes: `private shifts: Map<number, CashShift> = new Map();`.
- Después: `private readonly shifts: Map<number, CashShift> = new Map();`.
- Problema: el mapa se inicializa una vez y solo se consulta/actualiza, pero podía ser reemplazado accidentalmente, perdiendo los turnos almacenados.
- Decisión: proteger la referencia con readonly. `Map.set` y sus lecturas siguen disponibles; no se trata de un mapa inmutable. `nextId` permanece mutable porque aumenta en cada alta.
- Comparación funcional: métodos save/update y búsquedas no cambian; el diff contiene solo el modificador de la propiedad.
- Verificación: `node node_modules/typescript/bin/tsc --noEmit --incremental false`.
- Resultado SonarQube: pendiente de nueva corrida; no se alteran reglas ni exclusiones.

Resultado local: comprobación TypeScript aprobada (código de salida 0).
