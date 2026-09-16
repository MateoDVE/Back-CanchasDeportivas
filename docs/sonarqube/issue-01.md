# Issue 1 — Reducir la complejidad de uploadFile

- Regla: `typescript:S3776`; mantenibilidad, impacto alto; esfuerzo Sonar: 13 min.
- Evidencia inicial del equipo: complejidad cognitiva 23; umbral 15; línea original 18 de `src/common/supabase/supabase-storage.service.ts`.
- Problema: un mismo método valida entradas, interpreta Base64/MIME, detecta firmas y coordina Storage. La detección anidada dificulta revisar los caminos de ejecución.
- Decisión: extraer responsabilidades cohesivas, con retornos tempranos y una tabla de firmas; conservar el contrato público.

Antes, uploadFile contenía las ramas Data URL/Base64 y los if anidados de JPEG/PNG/RIFF. Después delega:

```ts
const { buffer, contentType, extension } = this.decodeFile(trimmedData);
```

`decodeFile` interpreta los datos; `extensionFromMime` calcula la extensión; `detectImageType` consulta firmas. El diff del commit contiene el antes/después completo. No se desactivan reglas ni se modifica el umbral.

Se conservan URLs HTTP/HTTPS, modo local sin cliente, formatos y valores predeterminados, nombre personalizado, upsert, mensajes de error y URL pública. La identificación histórica de RIFF como WebP se conserva: no constituye validación completa del archivo.

Verificación: 18 pruebas del contrato pasan antes de la refactorización. Cubren formatos, bytes cortos/desconocidos, errores y nombres. Se repiten después; usan un cliente simulado y no prueban permisos ni conectividad real de Supabase. Complejidad final y cierre del Issue: pendientes de SonarQube.

Comando: `npm test -- --runInBand src/common/supabase/supabase-storage.service.spec.ts`.

Referencia de la API conservada: [subidas de Storage](https://supabase.com/docs/guides/storage/uploads/standard-uploads).

Resultado posterior local: 18/18 pruebas aprobadas y npm run build correcto.
