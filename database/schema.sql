-- GENERADO por npm run db:schema. Solo para una base VACÍA con roles Supabase.
-- Para una base existente use únicamente la migración formal después de preflight.
-- DDL original conservado para reproducción y migración de la inspección.
-- Habilitar extensión pgcrypto para gen_random_uuid si no estuviera activa
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- Módulo 1: Usuarios y Autenticación
-- ==========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    ci VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,      -- 'CLIENTE', 'SECRETARIA', 'ADMIN'
    status VARCHAR(20) NOT NULL,    -- 'ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- Módulo 2: Infraestructura Deportiva
-- ==========================================
CREATE TABLE complexes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    contact_info TEXT,
    payment_qr_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE courts (
    id SERIAL PRIMARY KEY,
    complex_id INT NOT NULL REFERENCES complexes(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    court_type VARCHAR(50) NOT NULL, -- 'Futsal', 'Wally', 'Racket'
    price_per_hour NUMERIC(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE court_schedules (
    id SERIAL PRIMARY KEY,
    court_id INT NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    day_of_week INT CHECK (day_of_week BETWEEN 1 AND 7), -- 1 = Lunes, 7 = Domingo. NULL si specific_date tiene valor.
    specific_date DATE, -- Para excepciones y horarios especiales en días puntuales
    open_time TIME NOT NULL,
    close_time TIME NOT NULL
);

CREATE TABLE court_incidents (
    id SERIAL PRIMARY KEY,
    court_id INT NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP NOT NULL,
    reason TEXT NOT NULL
);

-- ==========================================
-- Módulo 3: Reservas
-- ==========================================
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES users(id),
    court_id INT NOT NULL REFERENCES courts(id),
    reservation_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    price_per_hour NUMERIC(10,2) NOT NULL, -- Precio congelado al momento de reservar
    total_price NUMERIC(10,2) NOT NULL,
    advance_required NUMERIC(10,2) NOT NULL, -- Exactamente 25% del total_price
    status VARCHAR(30) NOT NULL,    -- 'TEMPORAL', 'PENDING_VALIDATION', 'CONFIRMED', 'CANCELLED', 'REPROGRAMMED', 'EXPIRED', 'NO_SHOW', 'COMPLETED'
    expires_at TIMESTAMP,           -- Timestamp de expiración para el bloqueo temporal de 5 minutos
    created_by UUID NOT NULL REFERENCES users(id), -- Cliente o Secretaria
    parent_reservation_id UUID REFERENCES reservations(id), -- Trazabilidad de reprogramaciones
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- Módulo 4: Financiero y de Caja
-- ==========================================
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    payment_type VARCHAR(20) NOT NULL,   -- 'ANTICIPO', 'SALDO_FINAL'
    payment_method VARCHAR(20) NOT NULL, -- 'QR', 'EFECTIVO'
    receipt_image_url VARCHAR(255),
    status VARCHAR(20) NOT NULL,         -- 'PENDING', 'VALIDATED', 'REJECTED'
    handled_by UUID REFERENCES users(id),-- Secretaria que validó o cobró presencialmente
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cash_shifts (
    id SERIAL PRIMARY KEY,
    secretary_id UUID NOT NULL REFERENCES users(id),
    shift_date DATE NOT NULL,
    total_system NUMERIC(10,2) NOT NULL,   -- Suma de pagos en efectivo registrados en sistema
    total_declared NUMERIC(10,2) NOT NULL, -- Monto contado físicamente por la secretaria
    closed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Ejecutar en el SQL Editor del proyecto Supabase de la aplicación.
-- No crea cierres ni modifica cobros.
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cash_shifts' AND column_name='total_declared')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cash_shifts' AND column_name='total_declared_cash') THEN
    ALTER TABLE public.cash_shifts RENAME COLUMN total_declared TO total_declared_cash;
  END IF;
END $$;

ALTER TABLE public.cash_shifts
  ADD COLUMN IF NOT EXISTS total_system_cash numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_system_qr numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_declared_cash numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS difference numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS is_closed boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT now();

-- Solo configurar secuencia cuando el ID no dispone de default ni identidad.
DO $$
DECLARE max_id bigint;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cash_shifts' AND column_name='id'
      AND column_default IS NULL AND is_identity='NO'
  ) THEN
    CREATE SEQUENCE IF NOT EXISTS public.cash_shifts_id_seq;
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM public.cash_shifts;
    PERFORM setval('public.cash_shifts_id_seq', GREATEST(max_id, 1), max_id > 0);
    ALTER TABLE public.cash_shifts ALTER COLUMN id SET DEFAULT nextval('public.cash_shifts_id_seq');
    ALTER SEQUENCE public.cash_shifts_id_seq OWNED BY public.cash_shifts.id;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS cash_shifts_secretary_date_unique
  ON public.cash_shifts(secretary_id, shift_date);
NOTIFY pgrst, 'reload schema';
COMMIT;

-- Inspección formal. Ejecutar después del DDL base y 20260908_cash_shift_schema.sql.
-- Transaccional: si hay datos incompatibles, aborta sin borrarlos ni inventar auditoría.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Los adaptadores históricos escriben instantes con Date.toISOString() (UTC).
DO $$ DECLARE item record; BEGIN
 FOR item IN SELECT table_name,column_name FROM information_schema.columns
   WHERE table_schema='public' AND data_type='timestamp without time zone'
   AND ((table_name IN ('users','reservations','payments') AND column_name='created_at')
     OR (table_name='reservations' AND column_name='expires_at')
     OR (table_name='court_incidents' AND column_name IN ('start_datetime','end_datetime'))
     OR (table_name='cash_shifts' AND column_name='closed_at')) LOOP
   EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE timestamptz USING %I AT TIME ZONE ''UTC''',item.table_name,item.column_name,item.column_name);
 END LOOP;
END $$;

-- La UI admite una sola portada: reemplazar el envoltorio JSON por un atributo escalar.
ALTER TABLE public.courts ADD COLUMN IF NOT EXISTS images jsonb;
ALTER TABLE public.courts ADD COLUMN IF NOT EXISTS cover_image_url text;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.courts WHERE images IS NOT NULL AND jsonb_typeof(images) <> 'array') THEN
   RAISE EXCEPTION 'Revise las portadas: images no es un array';
 END IF;
 IF EXISTS(SELECT 1 FROM public.courts WHERE jsonb_array_length(images)>1) THEN
   RAISE EXCEPTION 'Existen galerías de varias imágenes: requieren migración relacional, no se descartan';
 END IF;
 IF EXISTS(SELECT 1 FROM public.courts WHERE jsonb_array_length(images)=1 AND jsonb_typeof(images->0)<>'string') THEN
   RAISE EXCEPTION 'La portada debe ser una URL de texto';
 END IF;
 IF EXISTS(SELECT 1 FROM public.courts WHERE cover_image_url IS NOT NULL AND jsonb_array_length(images)=1 AND cover_image_url IS DISTINCT FROM images->>0) THEN
   RAISE EXCEPTION 'Portadas diferentes: concilie cover_image_url e images antes de continuar';
 END IF;
END $$;
UPDATE public.courts SET cover_image_url=images->>0 WHERE cover_image_url IS NULL AND jsonb_array_length(images)=1;
-- Compatibilidad durante el cambio de backend: una única portada, nunca una galería.
CREATE FUNCTION public.sync_court_cover() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.images IS DISTINCT FROM OLD.images AND NEW.cover_image_url IS NOT DISTINCT FROM OLD.cover_image_url
   OR TG_OP='INSERT' AND NEW.cover_image_url IS NULL AND NEW.images IS NOT NULL THEN
   IF jsonb_typeof(NEW.images)<>'array' OR jsonb_array_length(NEW.images)>1 THEN RAISE EXCEPTION 'Solo se admite una portada'; END IF;
   IF jsonb_array_length(NEW.images)=1 AND jsonb_typeof(NEW.images->0)<>'string' THEN RAISE EXCEPTION 'Portada inválida'; END IF;
   NEW.cover_image_url := NEW.images->>0;
 END IF;
 NEW.images := CASE WHEN NEW.cover_image_url IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(NEW.cover_image_url) END;
 RETURN NEW;
END $$;
CREATE TRIGGER sync_court_cover BEFORE INSERT OR UPDATE ON public.courts FOR EACH ROW EXECUTE FUNCTION public.sync_court_cover();

CREATE TABLE public.court_types (
  code varchar(50) PRIMARY KEY,
  description text NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
INSERT INTO public.court_types(code, description) VALUES
 ('Futsal','Fútbol de salón'),('Wally','Voleibol en muro'),('Racket','Raquetbol'),('Padel','Pádel');
INSERT INTO public.court_types(code, description)
 SELECT DISTINCT court_type, court_type FROM public.courts ON CONFLICT DO NOTHING;
ALTER TABLE public.courts ADD CONSTRAINT courts_type_fk FOREIGN KEY(court_type) REFERENCES public.court_types(code);
ALTER TABLE public.courts ADD CONSTRAINT courts_positive_price CHECK (price_per_hour > 0 AND price_per_hour < 'Infinity'::numeric);
ALTER TABLE public.users ADD CONSTRAINT users_role_valid CHECK (role IN ('CLIENTE','SECRETARIA','ADMIN'));
ALTER TABLE public.users ADD CONSTRAINT users_status_valid CHECK (status IN ('ACTIVE','INACTIVE','PENDING_VERIFICATION'));

ALTER TABLE public.court_schedules ADD CONSTRAINT schedules_calendar_xor CHECK ((day_of_week IS NULL) <> (specific_date IS NULL));
ALTER TABLE public.court_schedules ADD CONSTRAINT schedules_ordered CHECK (open_time < close_time);
CREATE UNIQUE INDEX schedules_weekly_unique ON public.court_schedules(court_id,day_of_week) WHERE specific_date IS NULL;
CREATE UNIQUE INDEX schedules_special_unique ON public.court_schedules(court_id,specific_date) WHERE specific_date IS NOT NULL;
ALTER TABLE public.court_incidents ADD CONSTRAINT incidents_ordered CHECK (start_datetime < end_datetime);
ALTER TABLE public.court_incidents ADD CONSTRAINT incidents_reason_required CHECK (length(trim(reason)) > 0);

-- NULL en registros anteriores significa desconocido; no se supone WEB retroactivamente.
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS origin varchar(20);
ALTER TABLE public.reservations ADD CONSTRAINT reservations_origin_valid CHECK (origin IN ('WEB','MANUAL','WHATSAPP'));
ALTER TABLE public.reservations ADD CONSTRAINT reservations_status_valid CHECK (status IN ('TEMPORAL','PENDING_VALIDATION','CONFIRMED','CANCELLED','REPROGRAMMED','EXPIRED','NO_SHOW','COMPLETED'));
ALTER TABLE public.reservations ADD CONSTRAINT reservations_time_valid CHECK (
 end_time > start_time AND extract(epoch FROM (end_time-start_time)) >= 3600
 AND mod(extract(epoch FROM (end_time-start_time)),3600)=0
 AND extract(minute FROM start_time) IN (0,30) AND extract(second FROM start_time)=0);
ALTER TABLE public.reservations ADD CONSTRAINT reservations_amount_valid CHECK (
 price_per_hour > 0 AND price_per_hour < 'Infinity'::numeric
 AND total_price = round(price_per_hour * extract(epoch FROM (end_time-start_time))/3600,2)
 AND advance_required = round(total_price * 0.25,2));
ALTER TABLE public.reservations ADD CONSTRAINT reservations_expiry_required CHECK (status <> 'TEMPORAL' OR expires_at IS NOT NULL);
ALTER TABLE public.reservations ADD CONSTRAINT reservations_not_own_parent CHECK (parent_reservation_id <> id);
CREATE UNIQUE INDEX reservations_one_successor ON public.reservations(parent_reservation_id) WHERE parent_reservation_id IS NOT NULL;
-- NOW() no pertenece al predicado de una exclusión: el RPC expira filas antes de reservar.
ALTER TABLE public.reservations ADD CONSTRAINT reservations_no_overlap EXCLUDE USING gist
 (court_id WITH =, tsrange(reservation_date + start_time, reservation_date + end_time, '[)') WITH &&)
 WHERE (status IN ('TEMPORAL','PENDING_VALIDATION','CONFIRMED','COMPLETED'));

CREATE TABLE public.reservation_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 reservation_id uuid NOT NULL REFERENCES public.reservations(id),
 from_status varchar(30), to_status varchar(30) NOT NULL,
 actor_id uuid REFERENCES public.users(id),
 occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 reason text,
 related_reservation_id uuid REFERENCES public.reservations(id)
);
CREATE INDEX reservation_events_reservation_time ON public.reservation_events(reservation_id,occurred_at);
CREATE INDEX reservation_events_actor ON public.reservation_events(actor_id);
CREATE INDEX reservation_events_related ON public.reservation_events(related_reservation_id);

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS processed_at timestamptz;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS authorized_by uuid REFERENCES public.users(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS refund_reason text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS original_reservation_id uuid REFERENCES public.reservations(id);
UPDATE public.payments SET original_reservation_id=reservation_id WHERE original_reservation_id IS NULL;
ALTER TABLE public.payments ALTER COLUMN original_reservation_id SET NOT NULL;
-- La fecha de creación no demuestra cuándo se validó un pago antiguo: processed_at permanece NULL.
ALTER TABLE public.payments ADD CONSTRAINT payments_amount_valid CHECK (amount > 0 AND amount < 'Infinity'::numeric);
ALTER TABLE public.payments ADD CONSTRAINT payments_method_valid CHECK (payment_method IN ('QR','EFECTIVO'));
ALTER TABLE public.payments ADD CONSTRAINT payments_type_status_valid CHECK (
 (payment_type IN ('ANTICIPO','SALDO_FINAL') AND status IN ('PENDING','VALIDATED','REJECTED')) OR
 (payment_type='DEVOLUCION' AND status='REFUNDED'));
-- NOT VALID conserva devoluciones históricas; nuevas escrituras deben tener auditoría estructurada.
ALTER TABLE public.payments ADD CONSTRAINT payments_refund_audit CHECK (
 payment_type <> 'DEVOLUCION' OR (authorized_by IS NOT NULL AND length(trim(refund_reason)) > 0 AND refund_reason IS NOT NULL)) NOT VALID;
ALTER TABLE public.payments VALIDATE CONSTRAINT payments_refund_audit;
ALTER TABLE public.payments ADD CONSTRAINT payments_rejection_reason CHECK (
 status <> 'REJECTED' OR (rejection_reason IS NOT NULL AND length(trim(rejection_reason)) > 0));
CREATE UNIQUE INDEX payments_one_pending_advance ON public.payments(reservation_id) WHERE payment_type='ANTICIPO' AND status='PENDING';
CREATE INDEX payments_reservation ON public.payments(reservation_id);
CREATE INDEX payments_original_reservation ON public.payments(original_reservation_id);
CREATE INDEX payments_authorizer ON public.payments(authorized_by);
CREATE INDEX payments_handler_processed ON public.payments(handled_by,processed_at);
CREATE INDEX reservations_client ON public.reservations(client_id,reservation_date);
CREATE INDEX reservations_creator ON public.reservations(created_by);
CREATE INDEX reservations_expiry ON public.reservations(expires_at) WHERE status='TEMPORAL';
CREATE INDEX incidents_court_period ON public.court_incidents(court_id,start_datetime,end_datetime);
CREATE INDEX courts_complex ON public.courts(complex_id);
CREATE INDEX courts_type ON public.courts(court_type);

CREATE FUNCTION public.booking_net_paid(p_reservation uuid) RETURNS numeric
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
 SELECT coalesce(sum(CASE WHEN status='VALIDATED' THEN amount WHEN status='REFUNDED' THEN -amount ELSE 0 END),0)
 FROM public.payments WHERE reservation_id=p_reservation;
$$;

CREATE FUNCTION public.booking_audit() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE actor uuid := nullif(current_setting('app.booking_actor',true),'')::uuid;
BEGIN
 IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
   IF TG_OP='INSERT' THEN actor := NEW.created_by; END IF;
   IF actor IS NULL AND NEW.status <> 'EXPIRED' THEN RAISE EXCEPTION 'Se requiere autor de la operación'; END IF;
   INSERT INTO public.reservation_events(reservation_id,from_status,to_status,actor_id,reason,related_reservation_id)
   VALUES(NEW.id,CASE WHEN TG_OP='UPDATE' THEN OLD.status END,NEW.status,actor,
     nullif(current_setting('app.booking_reason',true),''),NEW.parent_reservation_id);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER booking_audit AFTER INSERT OR UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.booking_audit();

CREATE FUNCTION public.booking_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE schedule public.court_schedules; actor uuid := nullif(current_setting('app.booking_actor',true),'')::uuid;
BEGIN
 IF TG_OP='UPDATE' THEN
   IF (NEW.client_id,NEW.court_id,NEW.reservation_date,NEW.start_time,NEW.end_time,NEW.price_per_hour,NEW.total_price,NEW.advance_required,NEW.parent_reservation_id,NEW.created_by,NEW.created_at)
      IS DISTINCT FROM (OLD.client_id,OLD.court_id,OLD.reservation_date,OLD.start_time,OLD.end_time,OLD.price_per_hour,OLD.total_price,OLD.advance_required,OLD.parent_reservation_id,OLD.created_by,OLD.created_at)
   THEN RAISE EXCEPTION 'La reserva histórica es inmutable; utilice reprogramación'; END IF;
   IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
     (OLD.status='TEMPORAL' AND NEW.status IN ('PENDING_VALIDATION','EXPIRED','CANCELLED')) OR
     (OLD.status='PENDING_VALIDATION' AND NEW.status IN ('CONFIRMED','CANCELLED')) OR
     (OLD.status='CONFIRMED' AND NEW.status IN ('CANCELLED','REPROGRAMMED','NO_SHOW','COMPLETED')))
   THEN RAISE EXCEPTION 'Transición de reserva inválida'; END IF;
   IF OLD.status='TEMPORAL' AND NEW.status='PENDING_VALIDATION' AND OLD.expires_at <= clock_timestamp()
   THEN RAISE EXCEPTION 'La reserva temporal expiró'; END IF;
   IF NEW.status='COMPLETED' AND OLD.status <> 'COMPLETED' AND public.booking_net_paid(NEW.id) < NEW.total_price
   THEN RAISE EXCEPTION 'No se permite ingresar con saldo pendiente'; END IF;
 ELSE
   IF NEW.origin IS NULL THEN RAISE EXCEPTION 'Origen de reserva obligatorio'; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.courts c JOIN public.complexes x ON x.id=c.complex_id WHERE c.id=NEW.court_id AND c.is_active AND x.is_active)
   THEN RAISE EXCEPTION 'Cancha o complejo inactivo'; END IF;
   SELECT * INTO schedule FROM public.court_schedules WHERE court_id=NEW.court_id
     AND (specific_date=NEW.reservation_date OR (specific_date IS NULL AND day_of_week=extract(isodow FROM NEW.reservation_date)))
     ORDER BY specific_date NULLS LAST LIMIT 1;
   IF schedule.id IS NULL OR NEW.start_time < schedule.open_time OR NEW.end_time > schedule.close_time
   THEN RAISE EXCEPTION 'Fuera de horario de atención'; END IF;
   IF EXISTS(SELECT 1 FROM public.court_incidents WHERE court_id=NEW.court_id
     AND start_datetime < (NEW.reservation_date+NEW.end_time) AT TIME ZONE 'America/La_Paz'
     AND end_datetime > (NEW.reservation_date+NEW.start_time) AT TIME ZONE 'America/La_Paz')
   THEN RAISE EXCEPTION 'El horario coincide con un incidente'; END IF;
 END IF;
 IF NEW.status IN ('CONFIRMED','REPROGRAMMED','NO_SHOW','COMPLETED') AND (TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status)
   AND NOT EXISTS(SELECT 1 FROM public.users WHERE id=coalesce(actor,NEW.created_by) AND role IN ('ADMIN','SECRETARIA') AND status='ACTIVE')
 THEN RAISE EXCEPTION 'La operación requiere personal activo'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER booking_guard BEFORE INSERT OR UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.booking_guard();

CREATE FUNCTION public.persist_reservation(p_data jsonb, p_actor uuid, p_expected_status text DEFAULT NULL, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE r public.reservations := jsonb_populate_record(NULL::public.reservations,p_data); existing public.reservations;
BEGIN
 PERFORM set_config('app.booking_actor',coalesce(p_actor::text,''),true);
 PERFORM set_config('app.booking_reason',coalesce(p_reason,''),true);
 IF p_expected_status IS NULL THEN
   -- Vencimientos obsoletos salen del índice de exclusión dentro de la misma transacción.
   PERFORM set_config('app.booking_actor','',true);
   UPDATE public.reservations SET status='EXPIRED' WHERE court_id=r.court_id AND status='TEMPORAL' AND expires_at <= clock_timestamp();
   PERFORM set_config('app.booking_actor',coalesce(p_actor::text,''),true);
   INSERT INTO public.reservations(id,client_id,court_id,reservation_date,start_time,end_time,price_per_hour,total_price,advance_required,status,expires_at,created_by,parent_reservation_id,cancellation_reason,created_at,origin)
   VALUES(r.id,r.client_id,r.court_id,r.reservation_date,r.start_time,r.end_time,r.price_per_hour,r.total_price,r.advance_required,r.status,
     CASE WHEN r.status='TEMPORAL' THEN clock_timestamp()+interval '5 minutes' ELSE NULL END,
     r.created_by,r.parent_reservation_id,r.cancellation_reason,coalesce(r.created_at,clock_timestamp()),r.origin);
 ELSE
   SELECT * INTO existing FROM public.reservations WHERE id=r.id FOR UPDATE;
   IF existing.id IS NULL OR existing.status <> p_expected_status THEN RAISE EXCEPTION 'La reserva cambió; recargue antes de continuar' USING ERRCODE='40001'; END IF;
   UPDATE public.reservations SET status=r.status,origin=coalesce(r.origin,origin),cancellation_reason=r.cancellation_reason WHERE id=r.id;
 END IF;
END $$;

CREATE FUNCTION public.reschedule_reservation(p_data jsonb,p_actor uuid,p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE r public.reservations := jsonb_populate_record(NULL::public.reservations,p_data); previous public.reservations; paid numeric;
BEGIN
 PERFORM set_config('app.booking_actor',p_actor::text,true);
 PERFORM set_config('app.booking_reason',coalesce(p_reason,'Reprogramación autorizada'),true);
 SELECT * INTO previous FROM public.reservations WHERE id=r.parent_reservation_id FOR UPDATE;
 IF previous.id IS NULL OR previous.status <> 'CONFIRMED' OR previous.client_id <> r.client_id THEN RAISE EXCEPTION 'Reserva no reprogramable'; END IF;
 IF EXISTS(SELECT 1 FROM public.payments WHERE reservation_id=previous.id AND status='PENDING') THEN RAISE EXCEPTION 'Resuelva los pagos pendientes antes de reprogramar'; END IF;
 paid := public.booking_net_paid(previous.id);
 IF paid > r.total_price THEN RAISE EXCEPTION 'Autorice la devolución del excedente antes de reprogramar'; END IF;
 UPDATE public.reservations SET status='REPROGRAMMED' WHERE id=previous.id;
 PERFORM public.persist_reservation(p_data,p_actor,NULL,p_reason);
 UPDATE public.payments SET reservation_id=r.id WHERE reservation_id=previous.id AND status IN ('VALIDATED','REFUNDED');
END $$;

CREATE FUNCTION public.payment_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE booking public.reservations; paid numeric; day date;
BEGIN
 IF TG_OP='INSERT' THEN NEW.original_reservation_id := NEW.reservation_id; END IF;
 IF TG_OP='UPDATE' AND OLD.status IN ('VALIDATED','REFUNDED','REJECTED') THEN
   IF (to_jsonb(NEW)-'reservation_id') IS DISTINCT FROM (to_jsonb(OLD)-'reservation_id') THEN RAISE EXCEPTION 'Movimiento procesado inmutable'; END IF;
   IF NEW.reservation_id IS DISTINCT FROM OLD.reservation_id AND NOT EXISTS(
     SELECT 1 FROM public.reservations WHERE id=NEW.reservation_id AND parent_reservation_id=OLD.reservation_id)
   THEN RAISE EXCEPTION 'Transferencia sin reprogramación'; END IF;
   RETURN NEW;
 END IF;
 SELECT * INTO booking FROM public.reservations WHERE id=NEW.reservation_id FOR UPDATE;
 IF NEW.status IN ('VALIDATED','REJECTED','REFUNDED') THEN
   IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=NEW.handled_by AND role IN ('ADMIN','SECRETARIA') AND status='ACTIVE')
   THEN RAISE EXCEPTION 'Se requiere responsable activo'; END IF;
   -- Mismo orden de cierre/pagos para evitar un cobro posterior al corte.
   PERFORM 1 FROM public.users WHERE id=NEW.handled_by FOR UPDATE;
   NEW.processed_at := clock_timestamp();
   day := (NEW.processed_at AT TIME ZONE 'America/La_Paz')::date;
   IF EXISTS(SELECT 1 FROM public.cash_shifts WHERE secretary_id=NEW.handled_by AND shift_date=day AND is_closed)
   THEN RAISE EXCEPTION 'La caja de esta jornada ya está cerrada'; END IF;
 END IF;
 paid := public.booking_net_paid(NEW.reservation_id);
 IF NEW.status='VALIDATED' THEN
   IF booking.status NOT IN ('PENDING_VALIDATION','CONFIRMED') THEN RAISE EXCEPTION 'Estado no admite cobros'; END IF;
   IF NEW.payment_type='SALDO_FINAL' AND (booking.status <> 'CONFIRMED' OR NEW.amount <> booking.total_price-paid)
   THEN RAISE EXCEPTION 'El pago final debe cubrir exactamente el saldo real'; END IF;
   IF NEW.amount+paid > booking.total_price THEN RAISE EXCEPTION 'Cobro superior al total'; END IF;
 END IF;
 IF NEW.status='REFUNDED' THEN
   IF NEW.authorized_by IS DISTINCT FROM NEW.handled_by THEN RAISE EXCEPTION 'La autorización debe corresponder al usuario autenticado'; END IF;
   IF NEW.amount > paid THEN RAISE EXCEPTION 'Devolución superior al importe disponible'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER payment_guard BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.payment_guard();

CREATE FUNCTION public.process_advance(p_payment_id integer,p_actor uuid,p_approved boolean,p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE payment public.payments; booking public.reservations;
BEGIN
 SELECT * INTO payment FROM public.payments WHERE id=p_payment_id;
 SELECT * INTO booking FROM public.reservations WHERE id=payment.reservation_id FOR UPDATE;
 SELECT * INTO payment FROM public.payments WHERE id=p_payment_id FOR UPDATE;
 IF payment.id IS NULL OR payment.status <> 'PENDING' OR payment.payment_type <> 'ANTICIPO' OR booking.status <> 'PENDING_VALIDATION'
 THEN RAISE EXCEPTION 'El anticipo o la reserva ya cambiaron'; END IF;
 IF p_approved AND payment.amount < booking.advance_required THEN RAISE EXCEPTION 'El anticipo es insuficiente'; END IF;
 PERFORM set_config('app.booking_actor',p_actor::text,true);
 PERFORM set_config('app.booking_reason',coalesce(p_reason,'Anticipo validado'),true);
 UPDATE public.payments SET status=CASE WHEN p_approved THEN 'VALIDATED' ELSE 'REJECTED' END,
   handled_by=p_actor,rejection_reason=CASE WHEN NOT p_approved THEN p_reason END WHERE id=p_payment_id;
 UPDATE public.reservations SET status=CASE WHEN p_approved THEN 'CONFIRMED' ELSE 'CANCELLED' END,
   cancellation_reason=CASE WHEN NOT p_approved THEN p_reason ELSE cancellation_reason END WHERE id=booking.id;
END $$;

CREATE FUNCTION public.submit_advance_receipt(p_reservation uuid,p_actor uuid,p_url text)
RETURNS public.payments LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE booking public.reservations; payment public.payments;
BEGIN
 SELECT * INTO booking FROM public.reservations WHERE id=p_reservation FOR UPDATE;
 IF booking.id IS NULL OR booking.status NOT IN ('TEMPORAL','PENDING_VALIDATION') THEN RAISE EXCEPTION 'La reserva no admite comprobante'; END IF;
 IF booking.client_id <> p_actor AND NOT EXISTS(SELECT 1 FROM public.users WHERE id=p_actor AND role IN ('ADMIN','SECRETARIA') AND status='ACTIVE') THEN RAISE EXCEPTION 'Sin autorización para la reserva'; END IF;
 IF p_url IS NULL OR length(trim(p_url))=0 THEN RAISE EXCEPTION 'Comprobante obligatorio'; END IF;
 PERFORM set_config('app.booking_actor',p_actor::text,true);
 PERFORM set_config('app.booking_reason','Comprobante presentado',true);
 UPDATE public.reservations SET status='PENDING_VALIDATION' WHERE id=p_reservation;
 INSERT INTO public.payments(reservation_id,amount,payment_type,payment_method,receipt_image_url,status)
 VALUES(p_reservation,booking.advance_required,'ANTICIPO','QR',p_url,'PENDING')
 ON CONFLICT (reservation_id) WHERE payment_type='ANTICIPO' AND status='PENDING'
 DO UPDATE SET receipt_image_url=excluded.receipt_image_url RETURNING * INTO payment;
 RETURN payment;
END $$;

CREATE FUNCTION public.protect_audit_record() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'Registro de auditoría inmutable'; END $$;
CREATE TRIGGER events_immutable BEFORE UPDATE OR DELETE ON public.reservation_events FOR EACH ROW EXECUTE FUNCTION public.protect_audit_record();

CREATE FUNCTION public.cash_shift_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF TG_OP='DELETE' OR (TG_OP='UPDATE' AND OLD.is_closed) THEN RAISE EXCEPTION 'Cierre inmutable'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=NEW.secretary_id AND role IN ('ADMIN','SECRETARIA') AND status='ACTIVE') THEN RAISE EXCEPTION 'Responsable de caja inválido'; END IF;
 PERFORM 1 FROM public.users WHERE id=NEW.secretary_id FOR UPDATE;
 SELECT coalesce(sum(CASE WHEN payment_method='EFECTIVO' THEN CASE WHEN status='REFUNDED' THEN -amount ELSE amount END ELSE 0 END),0),
        coalesce(sum(CASE WHEN payment_method='QR' THEN CASE WHEN status='REFUNDED' THEN -amount ELSE amount END ELSE 0 END),0)
 INTO NEW.total_system_cash,NEW.total_system_qr FROM public.payments
 WHERE handled_by=NEW.secretary_id AND status IN ('VALIDATED','REFUNDED')
 AND (processed_at AT TIME ZONE 'America/La_Paz')::date=NEW.shift_date;
 NEW.total_system := NEW.total_system_cash+NEW.total_system_qr;
 NEW.difference := NEW.total_declared_cash-NEW.total_system_cash;
 NEW.is_closed := true; NEW.closed_at := clock_timestamp();
 RETURN NEW;
END $$;
ALTER TABLE public.cash_shifts ADD CONSTRAINT cash_declared_valid CHECK (total_declared_cash >= 0 AND total_declared_cash < 'Infinity'::numeric);
CREATE TRIGGER cash_shift_guard BEFORE INSERT OR UPDATE OR DELETE ON public.cash_shifts FOR EACH ROW EXECUTE FUNCTION public.cash_shift_guard();

-- Acceso backend: JWT propio de NestJS; los clientes no consultan tablas públicas directamente.
-- SECURITY INVOKER y EXECUTE solo a service_role; no se agregan funciones privilegiadas.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['users','complexes','courts','court_schedules','court_incidents','reservations','payments','cash_shifts','court_types','reservation_events'] LOOP
   EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
   EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',t);
   EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role',t);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.sync_court_cover(), public.submit_advance_receipt(uuid,uuid,text), public.process_advance(integer,uuid,boolean,text), public.persist_reservation(jsonb,uuid,text,text), public.reschedule_reservation(jsonb,uuid,text), public.booking_net_paid(uuid), public.booking_audit(), public.booking_guard(), public.payment_guard(), public.cash_shift_guard(), public.protect_audit_record() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_advance_receipt(uuid,uuid,text), public.process_advance(integer,uuid,boolean,text), public.persist_reservation(jsonb,uuid,text,text), public.reschedule_reservation(jsonb,uuid,text), public.booking_net_paid(uuid) TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.reservation_events_id_seq TO service_role;
DO $$ DECLARE sequence_name text; table_name text; maximum_id bigint; sequence_value bigint; BEGIN
 FOREACH table_name IN ARRAY ARRAY['complexes','courts','court_schedules','court_incidents','payments','cash_shifts'] LOOP
   sequence_name := pg_get_serial_sequence('public.'||table_name,'id');
   IF sequence_name IS NOT NULL THEN
     EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO service_role',sequence_name);
     EXECUTE format('SELECT coalesce(max(id),0) FROM public.%I',table_name) INTO maximum_id;
     EXECUTE format('SELECT last_value FROM %s',sequence_name) INTO sequence_value;
     PERFORM setval(sequence_name::regclass,greatest(maximum_id,sequence_value,1),true);
   END IF;
 END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;


BEGIN;
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION btree_gist SET SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO service_role;
DO $$ DECLARE table_name text; BEGIN
 FOREACH table_name IN ARRAY ARRAY['users','complexes','courts','court_schedules','court_incidents','reservations','payments','cash_shifts','court_types','reservation_events'] LOOP
   EXECUTE format('CREATE POLICY backend_only ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',table_name);
 END LOOP;
END $$;
COMMIT;
