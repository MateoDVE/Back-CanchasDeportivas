# Normalización y decisiones de diseño

Modelo corregido en Supabase y backend local. Estas decisiones deben ser examinadas por el equipo/revisor; no se atribuye una aprobación que aún no ocurrió.

## Dependencias funcionales

| Tabla | Claves candidatas | Dependencia / justificación |
|---|---|---|
| users | id; email; ci | Cada clave determina nombre, teléfono, credenciales, rol, estado y creación. Un rol operativo por cuenta. |
| complexes | id | Determina datos propios del establecimiento; no repite columnas por cancha. contact_info es una nota descriptiva. |
| court_types | code | Determina descripción/estado del deporte; no se repite descripción en courts. |
| courts | id | Determina complejo, nombre, tipo, tarifa, habilitación y portada. No copia nombre del complejo ni descripción del deporte. |
| court_schedules | id; (court_id,day_of_week) para semanal; (court_id,specific_date) para especial | La clave del horario determina apertura/cierre. XOR y unicidades parciales controlan la opcionalidad. |
| court_incidents | id | Determina cancha, intervalo y motivo. Una fila por incidente. |
| reservations | id; parent_reservation_id no nulo identifica como máximo una sucesora | Identidad determina cliente, cancha, contrato, horario y estado. Derivados justificados abajo. |
| payments | id | Determina importe, tipo, método, estado, procedencia, imputación y auditoría. Una fila por movimiento, no listas de pagos. |
| reservation_events | id | Determina reserva, actor, instante, estados, motivo y relación. No copia nombre del actor ni concatena eventos. |
| cash_shifts | id; (secretary_id,shift_date) | Determina corte, declarado y resultados de ese cierre diario. Derivados justificados abajo. |

Salvo las excepciones declaradas, se cumple 1FN (valores atómicos según uso), 2FN (sin dependencias parciales de claves compuestas) y 3FN (sin dependencias transitivas entre atributos no clave). La asociación N:M cliente–cancha a lo largo del tiempo está resuelta por reservations. Las relaciones 1:N no necesitan tablas puente adicionales.

## Desnormalizaciones controladas

| Dato | Por qué se conserva | Consistencia |
|---|---|---|
| reservations.price_per_hour | Precio pactado en la operación; es un hecho distinto de la tarifa actual. | Trigger impide cambiar el contrato original. |
| reservations.total_price | Lectura contractual y compatibilidad del API; redundancia duración × tarifa. | CHECK obliga a coincidir con la tarifa histórica y horas. |
| reservations.advance_required | Cantidad requerida, distinta del importe pagado. | CHECK 25% con redondeo. Reprogramación recalcula requerido y mueve dinero real por separado. |
| cash_shifts.total_system_cash/qr | Fotografía del cálculo al cierre para auditoría. | Trigger suma cobros/resta devoluciones propios de la jornada y bloquea modificaciones. |
| cash_shifts.total_system/difference | Compatibilidad de reportes; derivados expresamente reconocidos. | Trigger fija cash+qr y declarado−cash, sin confiar en importes calculados por el cliente. |

Saldo pendiente y pago completo se calculan. `processed_at` no se deriva de creación: un comprobante puede validarse otro día. El autor de una operación no se deriva del creador de la reserva: puede ser otra persona.

`original_reservation_id` y `reservation_id` representan procedencia e imputación vigente, no duplicación accidental. La primera es inmutable; la segunda pasa a una sucesora directa. Los eventos/cadena de reservas reconstruyen reprogramaciones intermedias sin duplicar dinero.

## Evolución y límites deliberados

1. **Deportes:** catálogo con FK, consultado por el API. Añadir Tenis requiere INSERT; no nueva columna ni cambio de estructura de reservas. La UI puede ampliar etiquetas/filtros.
2. **Estados, roles y métodos:** dominios técnicos cerrados con semántica de autorización, ocupación y dinero. Cambian mediante revisión de transiciones/CHECK/índice y despliegue. Aceptar cualquier texto no sería evolución segura.
3. **Anticipo:** RN-04 exige 25%; no se introduce una opción silenciosa para incumplirlo. Una futura política variable necesita versión, tasa y vigencia, conservando snapshots históricos.
4. **Cinco minutos:** RN-03 obliga a ese valor. Servidor asigna expiración; el reloj cliente no garantiza exclusión.
5. **Caja:** RN-13 define cierre diario por responsable. Varios turnos futuros requieren identidad de turno y relación de movimientos, no columnas turno1/turno2.
6. **Horarios:** un intervalo por día y una excepción por fecha. Horarios partidos futuros permiten múltiples intervalos con exclusión de solapamientos; no columnas repetidas. Cruce de medianoche fuera de alcance actual.
7. **Portada:** una URL. Galerías futuras se modelan como court_images(court_id,position,url); la migración aborta ante varias imágenes en vez de descartarlas.
8. **Legado:** no se inventan origen, autor ni fecha de procesamiento antiguos. La auditoría de devoluciones está validada globalmente: no había devoluciones históricas sin evidencia. Las fechas de validación de anticipos antiguos permanecen desconocidas; no se inventan.

## Índices y concurrencia

PK/UK identifican filas. Índices de FK cubren cliente, creador, cancha, responsable, procedencia y eventos. GiST impide solapamientos incluso si consultas previas vieron disponibilidad. RPC con transacciones cortas; Storage se procesa fuera de la transacción.

Las pruebas usan PostgreSQL embebido (PGlite): verifican exclusión y rollback reales, pero su conexión única no mide concurrencia entre varias sesiones ni rendimiento remoto.

Referencias: [restricciones PostgreSQL](https://www.postgresql.org/docs/current/ddl-constraints.html) y [funciones Supabase](https://supabase.com/docs/guides/database/functions). Respaldan mecanismos, no calificaciones.
