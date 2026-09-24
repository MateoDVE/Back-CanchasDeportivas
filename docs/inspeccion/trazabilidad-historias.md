# Trazabilidad de historias de usuario al modelo

Fuente: `docs/04-user-stories-matrix.md` del workspace. Cobertura del diseño, no certificación de ejecución completa de cada pantalla.

| HU | Funcionalidad | Tablas/atributos | Regla/control verificable |
|---|---|---|---|
| HU-CLI-01 | Registro | users.id,email,ci,password_hash,status,role | PK, email/CI únicos; users_status_valid; validación de identidad en AuthModule |
| HU-CLI-02 | Validación de correo electrónico | users.id,email,ci,password_hash,status,role | PK, email/CI únicos; users_status_valid; validación de identidad en AuthModule |
| HU-CLI-03 | Inicio de sesión | users.id,email,ci,password_hash,status,role | PK, email/CI únicos; users_status_valid; validación de identidad en AuthModule |
| HU-CLI-04 | Consultar complejos deportivos | complexes.id,name,location,contact_info,is_active | PK y filtro de habilitación |
| HU-CLI-05 | Consultar canchas | courts.id,complex_id,name,cover_image_url,is_active | FK a complejo; portada única sincronizada |
| HU-CLI-06 | Consultar tipo de cancha | court_types.code,description; courts.court_type | courts_type_fk; consulta de catálogo |
| HU-CLI-07 | Consultar precio | courts.price_per_hour; reservations.price_per_hour | Precio positivo; contrato histórico inmutable |
| HU-CLI-08 | Consultar disponibilidad por fecha | reservations.court_id,reservation_date,start_time,end_time,status,expires_at; court_schedules; court_incidents | reservations_no_overlap, reservations_time_valid; booking_guard y persist_reservation |
| HU-CLI-09 | Consultar disponibilidad mediante calendario | reservations.court_id,reservation_date,start_time,end_time,status,expires_at; court_schedules; court_incidents | reservations_no_overlap, reservations_time_valid; booking_guard y persist_reservation |
| HU-CLI-10 | Seleccionar horario | reservations.court_id,reservation_date,start_time,end_time,status,expires_at; court_schedules; court_incidents | reservations_no_overlap, reservations_time_valid; booking_guard y persist_reservation |
| HU-CLI-11 | Solicitar reserva | reservations.court_id,reservation_date,start_time,end_time,status,expires_at; court_schedules; court_incidents | reservations_no_overlap, reservations_time_valid; booking_guard y persist_reservation |
| HU-CLI-12 | Bloqueo temporal del horario | reservations.court_id,reservation_date,start_time,end_time,status,expires_at; court_schedules; court_incidents | reservations_no_overlap, reservations_time_valid; booking_guard y persist_reservation |
| HU-CLI-13 | Consultar resumen de reserva | reservations.price_per_hour,total_price,advance_required | reservations_amount_valid; RN-04/RN-05 |
| HU-CLI-14 | Consultar anticipo requerido | reservations.price_per_hour,total_price,advance_required | reservations_amount_valid; RN-04/RN-05 |
| HU-CLI-15 | Realizar pago del anticipo | payments.reservation_id,amount,receipt_image_url,status; complexes.payment_qr_url | submit_advance_receipt; payments_one_pending_advance; FK de pago |
| HU-CLI-16 | Adjuntar comprobante | payments.reservation_id,amount,receipt_image_url,status; complexes.payment_qr_url | submit_advance_receipt; payments_one_pending_advance; FK de pago |
| HU-CLI-17 | Consultar estado del pago | payments.reservation_id,amount,receipt_image_url,status; complexes.payment_qr_url | submit_advance_receipt; payments_one_pending_advance; FK de pago |
| HU-CLI-18 | Consultar estado de reserva | reservations.client_id,status; payments.reservation_id; courts.complex_id | FK, índices de cliente y autorización por propiedad |
| HU-CLI-19 | Consultar mis reservas | reservations.client_id,status; payments.reservation_id; courts.complex_id | FK, índices de cliente y autorización por propiedad |
| HU-CLI-20 | Consultar detalle de reserva | reservations.client_id,status; payments.reservation_id; courts.complex_id | FK, índices de cliente y autorización por propiedad |
| HU-CLI-21 | Solicitar cancelación | reservations.status,cancellation_reason; reservation_events | persist_reservation con actor/estado esperado; RN-08 |
| HU-CLI-22 | Consultar política de cancelación | No requiere tabla adicional: política RN-08 presentada por aplicación | El texto de política no es un hecho transaccional; devoluciones solo explícitas |
| HU-CLI-23 | Consultar reprogramación | reservations.parent_reservation_id; payments.original_reservation_id | FK, sucesora única; reschedule_reservation |
| HU-CLI-24 | Consultar saldo pendiente | payments.amount,status,payment_type; reservations.total_price,status | booking_net_paid; control SQL de saldo/ingreso y RegisterFinalPaymentUseCase |
| HU-CLI-25 | Completar pago antes de ingresar | payments.amount,status,payment_type; reservations.total_price,status | booking_net_paid; control SQL de saldo/ingreso y RegisterFinalPaymentUseCase |
| HU-SEC-01 | Iniciar sesión | users.id,role,status,password_hash | AuthModule y users_role_valid |
| HU-SEC-02 | Consultar panel operativo | reservations.client_id,court_id,reservation_date,status; users.phone,ci; payments | FK e índices; consultas de panel/detalle |
| HU-SEC-03 | Consultar reservas | reservations.client_id,court_id,reservation_date,status; users.phone,ci; payments | FK e índices; consultas de panel/detalle |
| HU-SEC-04 | Consultar detalle de una reserva | reservations.client_id,court_id,reservation_date,status; users.phone,ci; payments | FK e índices; consultas de panel/detalle |
| HU-SEC-05 | Crear reserva manual | reservations.created_by,client_id,origin | persist_reservation; origen MANUAL/WHATSAPP, FK de creador |
| HU-SEC-06 | Registrar reserva proveniente de WhatsApp | reservations.created_by,client_id,origin | persist_reservation; origen MANUAL/WHATSAPP, FK de creador |
| HU-SEC-07 | Consultar solicitudes pendientes | payments.receipt_image_url,status,reservation_id | Pagos pendientes; archivo en Storage y metadatos del pago |
| HU-SEC-08 | Visualizar comprobante | payments.receipt_image_url,status,reservation_id | Pagos pendientes; archivo en Storage y metadatos del pago |
| HU-SEC-09 | Validar anticipo | payments.handled_by,processed_at,rejection_reason,status; reservation_events | process_advance: pago, reserva y evento atómicos |
| HU-SEC-10 | Rechazar comprobante | payments.handled_by,processed_at,rejection_reason,status; reservation_events | process_advance: pago, reserva y evento atómicos |
| HU-SEC-11 | Visualizar reservas temporales | reservations.status,expires_at; reservation_events | Expiración y liberación; índice parcial |
| HU-SEC-12 | Liberar horario por expiración | reservations.status,expires_at; reservation_events | Expiración y liberación; índice parcial |
| HU-SEC-13 | Verificar reserva al ingreso | users.ci,name; reservations.client_id,status | FK y búsqueda operativa |
| HU-SEC-14 | Consultar saldo pendiente | payments.amount,status,handled_by,processed_at; reservations.total_price,status | Suma neta, pago final exacto y booking_guard |
| HU-SEC-15 | Registrar pago restante | payments.amount,status,handled_by,processed_at; reservations.total_price,status | Suma neta, pago final exacto y booking_guard |
| HU-SEC-16 | Autorizar ingreso a la cancha | payments.amount,status,handled_by,processed_at; reservations.total_price,status | Suma neta, pago final exacto y booking_guard |
| HU-SEC-17 | Identificar cliente que no se presentó | reservations.status,cancellation_reason; reservation_events.actor_id,occurred_at,reason | Cambio de estado auditado; cliente no libera automáticamente por inasistencia |
| HU-SEC-18 | Liberar horario por inasistencia | reservations.status,cancellation_reason; reservation_events.actor_id,occurred_at,reason | Cambio de estado auditado; cliente no libera automáticamente por inasistencia |
| HU-SEC-19 | Gestionar cancelación de reserva | reservations.status,cancellation_reason; reservation_events.actor_id,occurred_at,reason | Cambio de estado auditado; cliente no libera automáticamente por inasistencia |
| HU-SEC-20 | Gestionar reprogramación | reservations.parent_reservation_id; payments.reservation_id,original_reservation_id | reschedule_reservation y rollback integral |
| HU-SEC-21 | Gestionar excepciones de devolución | payments.payment_type,authorized_by,refund_reason,processed_at,amount | payments_refund_audit y payment_guard; no sobredevolución |
| HU-SEC-22 | Consultar reservas afectadas por cancha inhabilitada | court_incidents.court_id,start_datetime,end_datetime; reservations; users.phone | FK e intersección temporal |
| HU-SEC-23 | Gestionar reprogramación por incidente | reservations.parent_reservation_id; payments.reservation_id,original_reservation_id | reschedule_reservation y rollback integral |
| HU-SEC-24 | Consultar información de contacto del cliente | users.name,phone,email | Acceso protegido por rol en backend |
| HU-SEC-25 | Consultar ingresos de la jornada | cash_shifts.secretary_id,shift_date,total_system_cash,total_system_qr,total_declared_cash,difference; payments.processed_at | Caja propia, unicidad diaria, cash_shift_guard e inmutabilidad |
| HU-SEC-26 | Realizar cierre de caja | cash_shifts.secretary_id,shift_date,total_system_cash,total_system_qr,total_declared_cash,difference; payments.processed_at | Caja propia, unicidad diaria, cash_shift_guard e inmutabilidad |
| HU-ADM-01 | Iniciar sesión | users.id,role,status | AuthModule, autorización y dominio de roles/estados |
| HU-ADM-02 | Gestionar acceso de usuarios internos | users.id,role,status | AuthModule, autorización y dominio de roles/estados |
| HU-ADM-03 | Crear complejo deportivo | complexes.name,location,contact_info,payment_qr_url,is_active | Datos propios del complejo; FK preserva relación con canchas |
| HU-ADM-04 | Editar complejo deportivo | complexes.name,location,contact_info,payment_qr_url,is_active | Datos propios del complejo; FK preserva relación con canchas |
| HU-ADM-05 | Habilitar o deshabilitar complejo | complexes.name,location,contact_info,payment_qr_url,is_active | Datos propios del complejo; FK preserva relación con canchas |
| HU-ADM-06 | Registrar cancha | courts.complex_id,name,court_type,price_per_hour,is_active,cover_image_url | FK catálogo/complejo, precio positivo; histórico de reserva intacto |
| HU-ADM-07 | Editar cancha | courts.complex_id,name,court_type,price_per_hour,is_active,cover_image_url | FK catálogo/complejo, precio positivo; histórico de reserva intacto |
| HU-ADM-08 | Configurar precio por hora | courts.complex_id,name,court_type,price_per_hour,is_active,cover_image_url | FK catálogo/complejo, precio positivo; histórico de reserva intacto |
| HU-ADM-09 | Habilitar o deshabilitar cancha | courts.complex_id,name,court_type,price_per_hour,is_active,cover_image_url | FK catálogo/complejo, precio positivo; histórico de reserva intacto |
| HU-ADM-10 | Programar mantenimiento | court_incidents.court_id,start_datetime,end_datetime,reason; reservations | Intervalos válidos, índices e intersección temporal |
| HU-ADM-11 | Inhabilitar cancha por incidente | court_incidents.court_id,start_datetime,end_datetime,reason; reservations | Intervalos válidos, índices e intersección temporal |
| HU-ADM-12 | Consultar reservas afectadas por mantenimiento | court_incidents.court_id,start_datetime,end_datetime,reason; reservations | Intervalos válidos, índices e intersección temporal |
| HU-ADM-13 | Configurar horarios de atención | court_schedules.court_id,day_of_week,specific_date,open_time,close_time | XOR, unicidades parciales y horario ordenado |
| HU-ADM-14 | Configurar disponibilidad especial | court_schedules.court_id,day_of_week,specific_date,open_time,close_time | XOR, unicidades parciales y horario ordenado |
| HU-ADM-15 | Consultar todas las reservas | reservations.court_id,client_id,reservation_date,status; courts.complex_id | Consultas sobre FK e índices sin nuevas tablas |
| HU-ADM-16 | Consultar calendario general | reservations.court_id,client_id,reservation_date,status; courts.complex_id | Consultas sobre FK e índices sin nuevas tablas |
| HU-ADM-17 | Consultar ingresos | payments.amount,status,payment_type,created_at; reservations.total_price | Reportes por fecha de registro; saldo calculado, no persistido |
| HU-ADM-18 | Consultar pagos pendientes | payments.amount,status,payment_type,created_at; reservations.total_price | Reportes por fecha de registro; saldo calculado, no persistido |
| HU-ADM-19 | Supervisar ingresos de secretaria | cash_shifts.secretary_id,shift_date,total_system_cash,total_declared_cash,difference | Cierre histórico inmutable y FK de responsable |
| HU-ADM-20 | Consultar ocupación de canchas | reservations.court_id,reservation_date,start_time,end_time,status; payments; courts | Indicadores agregados derivados; no tablas/columnas por cada KPI |
| HU-ADM-21 | Consultar horarios de mayor demanda | reservations.court_id,reservation_date,start_time,end_time,status; payments; courts | Indicadores agregados derivados; no tablas/columnas por cada KPI |
| HU-ADM-22 | Comparar rendimiento de canchas | reservations.court_id,reservation_date,start_time,end_time,status; payments; courts | Indicadores agregados derivados; no tablas/columnas por cada KPI |
| HU-ADM-23 | Consultar indicadores generales (Executive Dashboard) | reservations.court_id,reservation_date,start_time,end_time,status; payments; courts | Indicadores agregados derivados; no tablas/columnas por cada KPI |
| HU-ADM-24 | Configurar información del establecimiento | complexes.name,location,contact_info,payment_qr_url,is_active | Datos propios del complejo; FK preserva relación con canchas |
| HU-ADM-25 | Configurar código QR de pago | complexes.name,location,contact_info,payment_qr_url,is_active | Datos propios del complejo; FK preserva relación con canchas |

Total: 76 historias mapeadas. Evidencia técnica: database/schema.sql, diccionario-datos.md, test/database-integrity.mjs y src/modules/reservations/application/use-cases/formal-inspection.spec.ts.
