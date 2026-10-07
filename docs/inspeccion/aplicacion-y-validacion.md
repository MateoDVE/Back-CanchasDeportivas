# Cambios aplicados y validación

Las correcciones ya fueron aplicadas al proyecto Supabase `hltbdpqbmdrzvzhcjmzx` el 24/09/2026; no están pendientes de ejecutar como preparación para la revisión.

Migraciones registradas en Supabase y conservadas localmente con el mismo identificador:

- `20260924185608_formal_database_integrity.sql`.
- `20260924185757_inspection_access_hardening.sql`.

## Preservación comprobada

| Dato | Antes | Después |
|---|---:|---:|
| Reservas | 26 | 26 |
| Pagos | 20 | 20 |
| Cierres de caja | 1 | 1 |
| Canchas | 8 | 8 |
| Suma de importes de pagos | 860 | 860 |
| Suma de precios de reservas | 2590 | 2590 |

El hash de las portadas heredadas permaneció igual. No se borraron archivos ni se guardaron datos de prueba. Las nuevas columnas de información histórica desconocida no se completaron con valores inventados.

## Comprobaciones

- El esquema real tiene la exclusión de reservas y todas sus restricciones validadas (cero restricciones NOT VALID pendientes).
- Diez tablas con RLS, políticas explícitas de acceso solo mediante backend y funciones SECURITY INVOKER.
- Asesor de seguridad Supabase: cero hallazgos después del ajuste de la extensión.
- Adaptadores del backend ejecutados contra la base real: lectura de reservas con pagos, canchas con portada y catálogo, pagos y función de saldo correctas.
- Una reserva inválida fue rechazada por el trigger real sin insertarse.
- Acceso anónimo directo a usuarios rechazado.
- Pruebas SQL locales: 23 escenarios reales en PostgreSQL embebido, incluidos rollback de reprogramación y rechazo de pagos incorrectos.
- Pruebas del backend y compilación registradas en el resumen de inspección.

El asesor de rendimiento puede indicar índices recién creados aún sin uso: no es un defecto de integridad ni justifica retirar el índice de exclusión.

## Ejecución de la aplicación

El backend local está corregido y compilado. Un proceso que estuviera ejecutando la versión anterior debe reiniciarse para cargar el código actualizado. No se realizaron commits ni se desplegó una nueva versión del backend en un proveedor externo.

Los pagos antiguos no tenían fecha de validación. Esa fecha no puede reconstruirse con certeza a partir de la creación de un comprobante; permanece nula para legado. Los reportes históricos por fecha de registro conservan ese criterio y los nuevos cierres usan procesamiento real. Las identidades y fechas históricas desconocidas no afectan la existencia de las nuevas garantías para operaciones futuras.

## Reproducción del esquema para desarrollo

`npm run db:schema` genera el DDL y diccionario desde las migraciones. `database/schema.sql` sirve exclusivamente para una base vacía con roles Supabase; no debe ejecutarse sobre el proyecto ya migrado. `npm run test:database` usa una base efímera en memoria y no se conecta a Supabase.

No se rellenaron autores, moderador, secretario, equipo ni referente: el usuario indicó que la revisión se realizará presencialmente.
