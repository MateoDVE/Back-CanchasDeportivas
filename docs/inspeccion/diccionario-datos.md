# Diccionario físico y restricciones — generado del motor PostgreSQL

Fuente: `database/schema.sql`, reproducida por `npm run db:schema`. No describe la base remota hasta aplicar la migración.

## cash_shifts

| Columna | Tipo | Nulo | Valor predeterminado |
|---|---|---|---|
| id | integer | NO | nextval('cash_shifts_id_seq'::regclass) |
| secretary_id | uuid | NO | — |
| shift_date | date | NO | — |
| total_system | numeric(10,2) | NO | — |
| total_declared_cash | numeric(10,2) | NO | — |
| closed_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| total_system_cash | numeric | NO | 0 |
| total_system_qr | numeric | NO | 0 |
| difference | numeric | NO | 0 |
| notes | text | YES | — |
| is_closed | boolean | NO | true |
| created_at | timestamp with time zone | NO | now() |

| Restricción | Definición | Validada en datos existentes |
|---|---|---|
| cash_declared_valid | CHECK (((total_declared_cash >= (0)::numeric) AND (total_declared_cash < 'Infinity'::numeric))) | Sí |
| cash_shifts_created_at_not_null | NOT NULL created_at | Sí |
| cash_shifts_difference_not_null | NOT NULL difference | Sí |
| cash_shifts_id_not_null | NOT NULL id | Sí |
| cash_shifts_is_closed_not_null | NOT NULL is_closed | Sí |
| cash_shifts_pkey | PRIMARY KEY (id) | Sí |
| cash_shifts_secretary_id_fkey | FOREIGN KEY (secretary_id) REFERENCES users(id) | Sí |
| cash_shifts_secretary_id_not_null | NOT NULL secretary_id | Sí |
| cash_shifts_shift_date_not_null | NOT NULL shift_date | Sí |
| cash_shifts_total_declared_not_null | NOT NULL total_declared_cash | Sí |
| cash_shifts_total_system_cash_not_null | NOT NULL total_system_cash | Sí |
| cash_shifts_total_system_not_null | NOT NULL total_system | Sí |
| cash_shifts_total_system_qr_not_null | NOT NULL total_system_qr | Sí |

## complexes

| Columna | Tipo | Nulo | Valor predeterminado |
|---|---|---|---|
| id | integer | NO | nextval('complexes_id_seq'::regclass) |
| name | character varying(100) | NO | — |
| location | character varying(255) | NO | — |
| contact_info | text | YES | — |
| payment_qr_url | character varying(255) | YES | — |
| is_active | boolean | YES | true |

| Restricción | Definición | Validada en datos existentes |
|---|---|---|
| complexes_id_not_null | NOT NULL id | Sí |
| complexes_location_not_null | NOT NULL location | Sí |
| complexes_name_not_null | NOT NULL name | Sí |
| complexes_pkey | PRIMARY KEY (id) | Sí |

## court_incidents

| Columna | Tipo | Nulo | Valor predeterminado |
|---|---|---|---|
| id | integer | NO | nextval('court_incidents_id_seq'::regclass) |
| court_id | integer | NO | — |
| start_datetime | timestamp with time zone | NO | — |
| end_datetime | timestamp with time zone | NO | — |
| reason | text | NO | — |

| Restricción | Definición | Validada en datos existentes |
|---|---|---|
| court_incidents_court_id_fkey | FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE | Sí |
| court_incidents_court_id_not_null | NOT NULL court_id | Sí |
| court_incidents_end_datetime_not_null | NOT NULL end_datetime | Sí |
| court_incidents_id_not_null | NOT NULL id | Sí |
| court_incidents_pkey | PRIMARY KEY (id) | Sí |
| court_incidents_reason_not_null | NOT NULL reason | Sí |
| court_incidents_start_datetime_not_null | NOT NULL start_datetime | Sí |
| incidents_ordered | CHECK ((start_datetime < end_datetime)) | Sí |
| incidents_reason_required | CHECK ((length(TRIM(BOTH FROM reason)) > 0)) | Sí |

## court_schedules

| Columna | Tipo | Nulo | Valor predeterminado |
|---|---|---|---|
| id | integer | NO | nextval('court_schedules_id_seq'::regclass) |
| court_id | integer | NO | — |
| day_of_week | integer | YES | — |
| specific_date | date | YES | — |
| open_time | time without time zone | NO | — |
| close_time | time without time zone | NO | — |

| Restricción | Definición | Validada en datos existentes |
|---|---|---|
| court_schedules_close_time_not_null | NOT NULL close_time | Sí |
| court_schedules_court_id_fkey | FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE | Sí |
| court_schedules_court_id_not_null | NOT NULL court_id | Sí |
| court_schedules_day_of_week_check | CHECK (((day_of_week >= 1) AND (day_of_week <= 7))) | Sí |
| court_schedules_id_not_null | NOT NULL id | Sí |
| court_schedules_open_time_not_null | NOT NULL open_time | Sí |
| court_schedules_pkey | PRIMARY KEY (id) | Sí |
| schedules_calendar_xor | CHECK (((day_of_week IS NULL) <> (specific_date IS NULL))) | Sí |
| schedules_ordered | CHECK ((open_time < close_time)) | Sí |

## court_types

| Columna | Tipo | Nulo | Valor predeterminado |
|---|---|---|---|
| code | character varying(50) | NO | — |
| description | text | NO | — |
| is_active | boolean | NO | true |

| Restricción | Definición | Validada en datos existentes |
|---|---|---|
| court_types_code_not_null | NOT NULL code | Sí |
| court_types_description_not_null | NOT NULL description | Sí |
| court_types_is_active_not_null | NOT NULL is_active | Sí |
| court_types_pkey | PRIMARY KEY (code) | Sí |

## courts

| Columna | Tipo | Nulo | Valor predeterminado |
|---|---|---|---|
| id | integer | NO | nextval('courts_id_seq'::regclass) |
| complex_id | integer | NO | — |
| name | character varying(50) | NO | — |
| court_type | character varying(50) | NO | — |
| price_per_hour | numeric(10,2) | NO | — |
| is_active | boolean | YES | true |
| images | jsonb | YES | — |
| cover_image_url | text | YES | — |

| Restricción | Definición | Validada en datos existentes |
|---|---|---|
| courts_complex_id_fkey | FOREIGN KEY (complex_id) REFERENCES complexes(id) ON DELETE CASCADE | Sí |
| courts_complex_id_not_null | NOT NULL complex_id | Sí |
| courts_court_type_not_null | NOT NULL court_type | Sí |
| courts_id_not_null | NOT NULL id | Sí |
| courts_name_not_null | NOT NULL name | Sí |
| courts_pkey | PRIMARY KEY (id) | Sí |
| courts_positive_price | CHECK (((price_per_hour > (0)::numeric) AND (price_per_hour < 'Infinity'::numeric))) | Sí |
| courts_price_per_hour_not_null | NOT NULL price_per_hour | Sí |
| courts_type_fk | FOREIGN KEY (court_type) REFERENCES court_types(code) | Sí |

## payments

| Columna | Tipo | Nulo | Valor predeterminado |
|---|---|---|---|
| id | integer | NO | nextval('payments_id_seq'::regclass) |
| reservation_id | uuid | NO | — |
| amount | numeric(10,2) | NO | — |
| payment_type | character varying(20) | NO | — |
| payment_method | character varying(20) | NO | — |
| receipt_image_url | character varying(255) | YES | — |
| status | character varying(20) | NO | — |
| handled_by | uuid | YES | — |
| rejection_reason | text | YES | — |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| processed_at | timestamp with time zone | YES | — |
| authorized_by | uuid | YES | — |
| refund_reason | text | YES | — |
| original_reservation_id | uuid | NO | — |

| Restricción | Definición | Validada en datos existentes |
|---|---|---|
| payments_amount_not_null | NOT NULL amount | Sí |
| payments_amount_valid | CHECK (((amount > (0)::numeric) AND (amount < 'Infinity'::numeric))) | Sí |
| payments_authorized_by_fkey | FOREIGN KEY (authorized_by) REFERENCES users(id) | Sí |
| payments_handled_by_fkey | FOREIGN KEY (handled_by) REFERENCES users(id) | Sí |
| payments_id_not_null | NOT NULL id | Sí |
| payments_method_valid | CHECK (((payment_method)::text = ANY ((ARRAY['QR'::character varying, 'EFECTIVO'::character varying])::text[]))) | Sí |
| payments_original_reservation_id_fkey | FOREIGN KEY (original_reservation_id) REFERENCES reservations(id) | Sí |
| payments_original_reservation_id_not_null | NOT NULL original_reservation_id | Sí |
| payments_payment_method_not_null | NOT NULL payment_method | Sí |
| payments_payment_type_not_null | NOT NULL payment_type | Sí |
| payments_pkey | PRIMARY KEY (id) | Sí |
| payments_refund_audit | CHECK ((((payment_type)::text <> 'DEVOLUCION'::text) OR ((authorized_by IS NOT NULL) AND (length(TRIM(BOTH FROM refund_reason)) > 0) AND (refund_reason IS NOT NULL)))) | Sí |
| payments_rejection_reason | CHECK ((((status)::text <> 'REJECTED'::text) OR ((rejection_reason IS NOT NULL) AND (length(TRIM(BOTH FROM rejection_reason)) > 0)))) | Sí |
| payments_reservation_id_fkey | FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE | Sí |
| payments_reservation_id_not_null | NOT NULL reservation_id | Sí |
| payments_status_not_null | NOT NULL status | Sí |
| payments_type_status_valid | CHECK (((((payment_type)::text = ANY ((ARRAY['ANTICIPO'::character varying, 'SALDO_FINAL'::character varying])::text[])) AND ((status)::text = ANY ((ARRAY['PENDING'::character varying, 'VALIDATED'::character varying, 'REJECTED'::character varying])::text[]))) OR (((payment_type)::text = 'DEVOLUCION'::text) AND ((status)::text = 'REFUNDED'::text)))) | Sí |

## reservation_events

| Columna | Tipo | Nulo | Valor predeterminado |
|---|---|---|---|
| id | bigint | NO | — |
| reservation_id | uuid | NO | — |
| from_status | character varying(30) | YES | — |
| to_status | character varying(30) | NO | — |
| actor_id | uuid | YES | — |
| occurred_at | timestamp with time zone | NO | clock_timestamp() |
| reason | text | YES | — |
| related_reservation_id | uuid | YES | — |

| Restricción | Definición | Validada en datos existentes |
|---|---|---|
| reservation_events_actor_id_fkey | FOREIGN KEY (actor_id) REFERENCES users(id) | Sí |
| reservation_events_id_not_null | NOT NULL id | Sí |
| reservation_events_occurred_at_not_null | NOT NULL occurred_at | Sí |
| reservation_events_pkey | PRIMARY KEY (id) | Sí |
| reservation_events_related_reservation_id_fkey | FOREIGN KEY (related_reservation_id) REFERENCES reservations(id) | Sí |
| reservation_events_reservation_id_fkey | FOREIGN KEY (reservation_id) REFERENCES reservations(id) | Sí |
| reservation_events_reservation_id_not_null | NOT NULL reservation_id | Sí |
| reservation_events_to_status_not_null | NOT NULL to_status | Sí |

## reservations

| Columna | Tipo | Nulo | Valor predeterminado |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| client_id | uuid | NO | — |
| court_id | integer | NO | — |
| reservation_date | date | NO | — |
| start_time | time without time zone | NO | — |
| end_time | time without time zone | NO | — |
| price_per_hour | numeric(10,2) | NO | — |
| total_price | numeric(10,2) | NO | — |
| advance_required | numeric(10,2) | NO | — |
| status | character varying(30) | NO | — |
| expires_at | timestamp with time zone | YES | — |
| created_by | uuid | NO | — |
| parent_reservation_id | uuid | YES | — |
| cancellation_reason | text | YES | — |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| origin | character varying(20) | YES | — |

| Restricción | Definición | Validada en datos existentes |
|---|---|---|
| reservations_advance_required_not_null | NOT NULL advance_required | Sí |
| reservations_amount_valid | CHECK (((price_per_hour > (0)::numeric) AND (price_per_hour < 'Infinity'::numeric) AND (total_price = round(((price_per_hour * EXTRACT(epoch FROM (end_time - start_time))) / (3600)::numeric), 2)) AND (advance_required = round((total_price * 0.25), 2)))) | Sí |
| reservations_client_id_fkey | FOREIGN KEY (client_id) REFERENCES users(id) | Sí |
| reservations_client_id_not_null | NOT NULL client_id | Sí |
| reservations_court_id_fkey | FOREIGN KEY (court_id) REFERENCES courts(id) | Sí |
| reservations_court_id_not_null | NOT NULL court_id | Sí |
| reservations_created_by_fkey | FOREIGN KEY (created_by) REFERENCES users(id) | Sí |
| reservations_created_by_not_null | NOT NULL created_by | Sí |
| reservations_end_time_not_null | NOT NULL end_time | Sí |
| reservations_expiry_required | CHECK ((((status)::text <> 'TEMPORAL'::text) OR (expires_at IS NOT NULL))) | Sí |
| reservations_id_not_null | NOT NULL id | Sí |
| reservations_no_overlap | EXCLUDE USING gist (court_id WITH =, tsrange((reservation_date + start_time), (reservation_date + end_time), '[)'::text) WITH &&) WHERE (((status)::text = ANY ((ARRAY['TEMPORAL'::character varying, 'PENDING_VALIDATION'::character varying, 'CONFIRMED'::character varying, 'COMPLETED'::character varying])::text[]))) | Sí |
| reservations_not_own_parent | CHECK ((parent_reservation_id <> id)) | Sí |
| reservations_origin_valid | CHECK (((origin)::text = ANY ((ARRAY['WEB'::character varying, 'MANUAL'::character varying, 'WHATSAPP'::character varying])::text[]))) | Sí |
| reservations_parent_reservation_id_fkey | FOREIGN KEY (parent_reservation_id) REFERENCES reservations(id) | Sí |
| reservations_pkey | PRIMARY KEY (id) | Sí |
| reservations_price_per_hour_not_null | NOT NULL price_per_hour | Sí |
| reservations_reservation_date_not_null | NOT NULL reservation_date | Sí |
| reservations_start_time_not_null | NOT NULL start_time | Sí |
| reservations_status_not_null | NOT NULL status | Sí |
| reservations_status_valid | CHECK (((status)::text = ANY ((ARRAY['TEMPORAL'::character varying, 'PENDING_VALIDATION'::character varying, 'CONFIRMED'::character varying, 'CANCELLED'::character varying, 'REPROGRAMMED'::character varying, 'EXPIRED'::character varying, 'NO_SHOW'::character varying, 'COMPLETED'::character varying])::text[]))) | Sí |
| reservations_time_valid | CHECK (((end_time > start_time) AND (EXTRACT(epoch FROM (end_time - start_time)) >= (3600)::numeric) AND (mod(EXTRACT(epoch FROM (end_time - start_time)), (3600)::numeric) = (0)::numeric) AND (EXTRACT(minute FROM start_time) = ANY (ARRAY[(0)::numeric, (30)::numeric])) AND (EXTRACT(second FROM start_time) = (0)::numeric))) | Sí |
| reservations_total_price_not_null | NOT NULL total_price | Sí |

## users

| Columna | Tipo | Nulo | Valor predeterminado |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| name | character varying(100) | NO | — |
| email | character varying(100) | NO | — |
| phone | character varying(20) | NO | — |
| ci | character varying(20) | NO | — |
| password_hash | character varying(255) | NO | — |
| role | character varying(20) | NO | — |
| status | character varying(20) | NO | — |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

| Restricción | Definición | Validada en datos existentes |
|---|---|---|
| users_ci_key | UNIQUE (ci) | Sí |
| users_ci_not_null | NOT NULL ci | Sí |
| users_email_key | UNIQUE (email) | Sí |
| users_email_not_null | NOT NULL email | Sí |
| users_id_not_null | NOT NULL id | Sí |
| users_name_not_null | NOT NULL name | Sí |
| users_password_hash_not_null | NOT NULL password_hash | Sí |
| users_phone_not_null | NOT NULL phone | Sí |
| users_pkey | PRIMARY KEY (id) | Sí |
| users_role_not_null | NOT NULL role | Sí |
| users_role_valid | CHECK (((role)::text = ANY ((ARRAY['CLIENTE'::character varying, 'SECRETARIA'::character varying, 'ADMIN'::character varying])::text[]))) | Sí |
| users_status_not_null | NOT NULL status | Sí |
| users_status_valid | CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'INACTIVE'::character varying, 'PENDING_VERIFICATION'::character varying])::text[]))) | Sí |

