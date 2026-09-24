# Preinspección formal del diseño de base de datos — SportReserva

Fecha: 24 de septiembre de 2026.

Resultado propuesto: **Requiere corrección y nueva revisión**.

Revisión estática de documentación, DDL, migración de caja y código local. No se consultó el esquema desplegado en Supabase ni se ejecutaron pruebas dinámicas. La puntuación es orientativa y no reemplaza la calificación del docente. Un «Sí» se refiere a la evidencia local inspeccionada, no certifica producción.

## Evaluación de los 21 criterios

La numeración sigue las secciones 2, 3 y 4 del formulario. «Parcial» indica cobertura incompleta o evidencia insuficiente; no significa ausencia total de implementación.

| Ref. | Criterio | Evaluación | Evidencia y observación | Puntos |
|---|---|---|---|---|
| A1 | Entidades principales | Sí | Ocho tablas cubren usuarios, complejos, canchas, horarios, incidentes, reservas, pagos y caja. | 8/8 |
| A2 | Relaciones y cardinalidades de negocio | Parcial | Hay FK; el ERD presenta como obligatorios el responsable del pago y la reserva padre, aunque el DDL permite NULL. | 4/8 |
| A3 | Atributos necesarios | Parcial | Faltan origen persistido y datos estructurados de autor/fecha de algunas operaciones. | 3/6 |
| A4 | Soporte a historias de usuario | Parcial | Soporta los flujos principales; devoluciones y auditoría usan campos de texto ajenos a su significado original. La imputación de pagos en reprogramaciones no queda resuelta por la mera FK al padre. | 4/8 |
| A5 | Restricciones de negocio | Parcial | Existen validaciones de dominio, pero no se evidencia protección atómica contra solapamientos; faltan restricciones de integridad en el DDL. | 2,5/5 |
| A6 | Trazabilidad HU → modelo | Parcial | La matriz mapea HU a casos de uso y menciona algunos campos; falta una correspondencia completa y verificable con tablas, atributos y restricciones. | 2,5/5 |
| B1 | Tablas sin redundancias injustificadas | Sí | Las ocho entidades tienen responsabilidades diferenciadas. | 4/4 |
| B2 | Claves primarias | Sí | Todas las tablas del DDL tienen PK. | 4/4 |
| B3 | Claves foráneas | Sí | Las referencias documentadas apuntan a PK y usan tipos compatibles. | 5/5 |
| B4 | Cardinalidad y opcionalidad | Parcial | ERD y NULL de las FK difieren; horarios admiten combinaciones ambiguas de día semanal y fecha específica. | 2,5/5 |
| B5 | Ubicación conceptual de atributos | Parcial | `rejection_reason` almacena autorizaciones de devolución; `cancellation_reason` acumula otras operaciones. | 2/4 |
| B6 | Relaciones N:M | Sí | `reservations` materializa las contrataciones entre clientes y canchas, con fecha y horario propios; no se identificó otra N:M esencial sin resolver. | 4/4 |
| B7 | 3FN o excepciones justificadas | Parcial | Hay separación razonable de entidades, pero falta explicitar dependencias funcionales y justificar la redundancia de importes/estados. No se afirma una violación automática de 3FN por tener importes calculados. | 2,5/5 |
| B8 | Atributos calculados persistidos | Parcial | El precio histórico está justificado por RN-05; falta documentar consistencia de totales, anticipo y `difference` de caja. | 1/2 |
| B9 | Convenciones de nombres | Sí | Convención SQL en inglés y snake_case consistente. El desfase de versiones se registra aparte. | 2/2 |
| C1 | Crecimiento de registros | Sí | El modelo admite nuevos registros sin añadir columnas y documenta índices. No equivale a una prueba de rendimiento. | 5/5 |
| C2 | Nuevos tipos, categorías y estados | Parcial | Los VARCHAR permiten nuevos valores, pero los tipos de aplicación y reglas están codificados; falta una estrategia de evolución controlada. | 2,5/5 |
| C3 | Ausencia de valores múltiples mal modelados | Parcial | No hay columnas repetitivas; sí se concatenan eventos de devolución dentro de `cancellation_reason`. | 2/4 |
| C4 | Catálogos y parametrización | Parcial | Estados, tipos y métodos se documentan, pero no cuentan con catálogos o dominios SQL controlados ni justificación de su tratamiento. | 2/4 |
| C5 | Bajo acoplamiento a supuestos rígidos | Parcial | Anticipo 25% y bloqueo de 5 minutos están codificados. La migración limita a un cierre por secretaria y fecha; es válido para RN-13, pero requiere decisión explícita si se prevén varios turnos. | 2/4 |
| C6 | Justificación de decisiones | Parcial | Se explica precio histórico, expiración e índices; falta fundamentar normalización, catálogos, redundancias y límites de evolución. | 1,5/3 |

| Área | Estimación |
|---|---:|
| A. Requerimientos y negocio | 24/40 |
| B. Calidad técnica | 27/35 |
| C. Evolución | 15/25 |
| **Total orientativo** | **66/100** |

No se aplica umbral de aprobación numérico porque el formulario no especifica uno. El resultado propuesto responde a la relevancia de los defectos, especialmente RN-03.

## Registro de defectos

Todos quedan abiertos. Responsables sugeridos por rol; el equipo debe asignar nombres.

| ID | Severidad | Defecto y evidencia local | Corrección propuesta | Responsable |
|---|---|---|---|---|
| D1 | Crítico | RN-03: `create-temporal-reservation.use-case.ts:96` consulta conflictos y en la línea 122 guarda por separado. El DDL no contiene una exclusión de solapamientos. Dos solicitudes concurrentes podrían superar ambas la consulta. Riesgo estático, no reproducido en producción. | Diseñar una operación atómica y una garantía de exclusión coherente con los estados y la expiración temporal. | Backend / BD |
| D2 | Importante | `docs/02-database-supabase.md:13,23` exige visualmente un responsable y un padre; las FK en líneas 190 y 206 son opcionales. | Corregir la opcionalidad en el diagrama y explicar cuándo debe existir cada referencia. | Autor del modelo |
| D3 | Importante | RN-11 y HU-SEC-09 requieren autor/fecha. `mark-no-show-and-release.use-case.ts:35` guarda el autor solo si hay motivo, dentro del texto; no registra la fecha del evento. `payments` solo tiene fecha de creación, no de validación. | Modelar eventos o campos específicos de actor, fecha y motivo. | Backend / BD |
| D4 | Importante | HU-SEC-06: la entidad acepta origen WHATSAPP y el repositorio lo lee, pero `SupabaseReservationRepository.save` no lo escribe y el DDL no lo define. Caja también difiere entre DDL y migración de septiembre. | Consolidar esquema, ERD y diccionario; persistir origen y verificar la migración aplicada. | Backend / documentación |
| D5 | Importante | HU-SEC-21: `register-refund-exception.use-case.ts:50-68` usa texto para autorizar devoluciones, guarda la nota en `rejection_reason` y concatena historial en `cancellation_reason`. | Modelar la autorización con identidad referenciada, fecha, motivo y relación con el movimiento correspondiente. | Backend / BD |
| D6 | Importante | `court_schedules` permite día y fecha ambos nulos o ambos presentes. El DDL tampoco restringe orden temporal de incidentes ni importes positivos. Hay validaciones de aplicación, pero no cubren escrituras directas. | Definir exclusión entre día/fecha, rangos temporales, dominios e importes válidos; documentar qué reglas se controlan en cada capa. | BD |
| D7 | Importante | RN-10: `reschedule-reservation.use-case.ts` copia `advanceRequired`, pero no transfiere ni imputa los pagos. Una reserva padre no representa por sí misma el dinero aplicado a la hija. | Definir y verificar cómo se aplica el anticipo real, conservando trazabilidad y consistencia ante fallos intermedios. | Backend / BD |
| D8 | Menor | No hay justificación completa de 3FN y derivados. El diagrama de estados en reglas usa REJECTED para reservas, mientras RN-06 y el diccionario indican CANCELLED. | Unificar estados y documentar dependencias funcionales y decisiones de diseño. | Autor del modelo |

## Qué preparar para la inspección formal

1. Corregir D1 y resolver los defectos importantes; verificar el esquema real antes de afirmar que carece de restricciones adicionales.
2. Entregar un ERD y DDL consolidados con la migración de caja y el diccionario actualizado.
3. Completar una matriz HU/RN → tabla → campos/FK/restricción → evidencia. La documentación existente sirve como base.
4. Justificar precio histórico, totales de cierre y demás campos derivados; describir su mecanismo de consistencia. No eliminar el precio congelado: RN-05 lo exige.
5. Completar proyecto, equipo, autores, fecha real de inspección, moderador, secretario y referente. Mantener el revisor indicado por el formulario. Registrar revisión individual, análisis de anomalías, responsables y resultados reales; no inventar actas.

Conclusión propuesta: El modelo representa adecuadamente las entidades principales y cuenta con PK, FK y documentación de negocio. Aún presenta inconsistencias entre diagrama, DDL y código, debilidades de auditoría y una garantía insuficientemente evidenciada contra reservas concurrentes. Se recomienda corregir y realizar una nueva revisión.

## Fuentes inspeccionadas

- `docs/02-database-supabase.md`: ERD, DDL, diccionario e índices.
- `docs/03-business-rules.md`: RN-01 a RN-13.
- `docs/04-user-stories-matrix.md`: historias de clientes, secretarias y administradores.
- `back-canchas-deportivas/migrations/20260908_cash_shift_schema.sql`.
- Entidades y repositorios Supabase de reservas y caja; entidad Payment.
- Casos de uso de reserva temporal, reprogramación, inasistencia, ingreso, devolución y horarios semanales.

Esta revisión no modificó la aplicación ni la base de datos.
