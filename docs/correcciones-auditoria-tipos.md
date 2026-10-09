# Correcciones de auditoría y tipos de datos

## Resultado

Se agregaron los tres atributos confirmados por el usuario a las diez tablas del negocio y a la nueva tabla histórica `audit_log`: usuario, fecha/hora y acción. Se retiró la solicitud del CI del registro de clientes y del alta de personal. El CI histórico se conserva como columna opcional; no se muestra ni se utiliza en las consultas de clientes de la aplicación.

| Atributo común | Tipo | Significado |
|---|---|---|
| `audit_actor_id` | `uuid`, FK a usuarios | Usuario responsable cuando existe identidad autenticada |
| `audit_at` | `timestamptz` | Instante de la última escritura, generado por PostgreSQL |
| `audit_action` | `varchar(6)` | `INSERT`, `UPDATE` o `DELETE` |

En las filas del negocio se conserva la última operación. `audit_log` conserva la secuencia completa, incluso al borrar una fila. Los eventos registran tabla, identificador y nombres de columnas modificadas; no duplican contraseñas, CI, comprobantes ni datos personales. No existe CRUD de este historial: se impiden edición, eliminación y truncado. No se duplican eventos recursivamente al escribir el propio historial.

El backend toma el autor del usuario validado por el guard JWT, lo aísla por solicitud con `AsyncLocalStorage` y lo comunica a PostgREST mediante un encabezado interno. Nunca reenvía el encabezado de autor enviado por el navegador. Los RPC conservan su autor transaccional. `NULL` identifica una operación sin principal autenticado (registro público, confirmación de correo, proceso automático o administración directa sin autor declarado); no significa que se haya autenticado un usuario. Las filas anteriores a la migración mantienen estos campos en `NULL`: no se inventa su historia. Los campos de negocio existentes, como `created_by`, `handled_by` y `occurred_at`, se conservan.

## Tipos y longitudes

El [diccionario físico](inspeccion/diccionario-datos.md) enumera todas las columnas y restricciones, generado ejecutando el esquema en PostgreSQL local.

| Grupo | Decisión |
|---|---|
| Usuarios | Nombre completo 161; nombres y apellidos 80 cada uno; correo 100; teléfono 20; rol 10; estado 20; hash 100. CI histórico opcional 20; nuevas altas guardan `NULL`. |
| Complejos | Nombre 100, ubicación 255, contacto 255, referencia QR 255. |
| Canchas y catálogo | Nombres/códigos 50; descripción del tipo 255; tarifas `numeric(10,2)`. |
| Horarios | Día `smallint` con restricción 1–7; fechas `date` y horas `time`. Se mantiene la restricción de día semanal o fecha especial. |
| Reservas | Estado 20, origen 8, motivo de cancelación 500; precios e importes `numeric(10,2)`. |
| Pagos | Tipo 12, método 8, motivos 500; monto `numeric(10,2)`. |
| Caja | Todos los importes, incluida diferencia, `numeric(10,2)`; notas 1000. |
| Eventos de reserva | Estados 20 y motivo 500; UUID y fecha/hora conservan sus tipos nativos. |

`numeric(10,2)` permite hasta 99.999.999,99: ocho cifras enteras y dos decimales. La API rechaza importes introducidos con fracciones de centavo, valores no finitos y exceso de rango; las pantallas monetarias modificadas muestran dos decimales. PostgreSQL redondea entradas directas al convertir a `numeric(p,2)`, por lo que la validación de entrada de la API también es necesaria. La migración rechaza importes históricos de caja que necesitarían redondearse o exceden el rango.

Los límites de texto son límites de negocio y validación; no son una reserva fija de ese espacio. PostgreSQL no mejora automáticamente el almacenamiento al cambiar `text` por `varchar(n)`. Se conserva `text` para la portada de cancha porque el contrato existente también admite imágenes base64; se agrega un límite de 2.800.000 caracteres, igual al de la API. `images` continúa como espejo JSON de esa portada. No se convierte una imagen existente en una URL ficticia.

El hash conserva un margen de 100 caracteres para compatibilidad con los valores internos existentes; las contraseñas de cuentas creadas usan bcrypt. `varchar(n)` no ocupa siempre `n` bytes. El día semanal sí reduce su tipo de entero de 4 bytes a `smallint` de 2 bytes, el entero nativo más pequeño de PostgreSQL. Los UUID se conservan: son 128 bits, equivalentes a 16 bytes; la prueba local también comprueba `pg_column_size(gen_random_uuid()) = 16`.

Referencias oficiales: [tipos de caracteres](https://www.postgresql.org/docs/current/datatype-character.html), [tipos numéricos](https://www.postgresql.org/docs/current/datatype-numeric.html), [UUID](https://www.postgresql.org/docs/current/datatype-uuid.html).

## Complejos

Se corrigió el contrato del formulario (`location`, `contactInfo`) y se agregó edición. La administración lista activos e inactivos; el catálogo público sigue listando activos. `DELETE /api/v1/admin/complexes/:id` hace una baja lógica e idempotente y conserva canchas, pagos y reservas. El administrador puede volver a habilitarlo. Los horarios se configuran por cancha; el formulario de complejos ya no ofrece campos que el backend no guardaba.

## Aplicación

1. Sobre una base existente que ya tiene las migraciones de inspección, aplicar en orden las migraciones `20261009161546_email_verification_and_half_hour_bookings.sql` y `20261009161634_bounded_types_and_table_audit.sql` mediante el flujo de migraciones de Supabase.
2. La segunda migración es transaccional y verifica longitudes antes de estrechar tipos. Si falla el preflight, revisar el campo señalado y volver a ejecutar; no recortar datos automáticamente.
3. Aplicar antes de desplegar esta versión del backend: las nuevas altas ya no envían CI, por lo que la columna remota debe admitir `NULL`.
4. Desplegar backend y frontend juntos. Configurar el correo según `correcciones-acceso-reservas.md`.

No ejecutar el esquema consolidado sobre una base con datos. Las dos migraciones se aplicaron el 9 de octubre de 2026 al proyecto Supabase Canchas Deportivas (hltbdpqbmdrzvzhcjmzx), mediante el conector solicitado por el usuario. No se desplegaron el backend ni el frontend.

## Validación local

- Backend: compilación y 107 pruebas en 21 suites.
- Frontend: compilación y 94 pruebas en Chrome Headless.
- PostgreSQL/PGlite: 29 verificaciones; incluyen los 11 juegos de atributos, escala de importes, UUID, día semanal, múltiples usuarios sin CI, historial inmutable, actor, permisos y rollback del preflight sin truncar datos.
- Las pruebas de contexto comprueban aislamiento de usuarios concurrentes y rechazo de encabezados de autor ajenos al JWT.

Quedan advertencias preexistentes de configuración de ts-jest y de `@import` Sass. La base remota también fue verificada: 11 tablas con 33 columnas de auditoría, ningún importe numeric sin escala 2, CI nullable y día semanal smallint. El asesor de seguridad devolvió cero hallazgos. Una escritura como service_role comprobó autor, fecha, acción e historial; se revirtió con ROLLBACK, sin registros de prueba persistidos. Se conservaron 8 usuarios, 26 reservas, 20 pagos, 8 canchas y 1 cierre. Los archivos de migración se renombraron a las versiones que registró el conector, evitando duplicados en futuros despliegues.
