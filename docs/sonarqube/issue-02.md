# Issue 2 — Normalización lineal de las carpetas

- Regla: `typescript:S8786`; fiabilidad, impacto medio; esfuerzo estimado 20 min.
- Archivo: `src/common/supabase/supabase-storage.service.ts`, línea original 87.
- Antes: `folder.replace(/^\/+|\/+$/g, '')`.
- Problema: la alternativa final puede intentar encontrar el sufijo de barras desde múltiples posiciones. Una secuencia extensa de barras seguida de otro carácter provoca intentos repetidos y crecimiento superlineal.
- Decisión: usar índices desde los extremos, sin expresión regular.

```ts
let start = 0;
let end = folder.length;
while (start < end && folder[start] === '/') start++;
while (end > start && folder[end - 1] === '/') end--;
return folder.slice(start, end);
```

Cada índice avanza en una sola dirección y se realiza un único slice: tiempo O(n) en el peor caso, sin backtracking. Se conservan barras interiores, espacios y comportamiento para carpeta vacía o compuesta solo de barras (ruta `/nombre`). No se pretende resolver aquí validación de rutas.

Verificación: suite de Storage ampliada con carpetas vacías, barras exteriores/interiores, espacios y 100.000 barras interiores entre letras. La prueba larga comprueba salida y terminación, no constituye un benchmark. Ejecutar `npm test -- --runInBand src/common/supabase/supabase-storage.service.spec.ts`.

Resultado en SonarQube: pendiente de la siguiente corrida sobre el mismo proyecto.

Resultado local: 25/25 pruebas aprobadas después de la corrección.
