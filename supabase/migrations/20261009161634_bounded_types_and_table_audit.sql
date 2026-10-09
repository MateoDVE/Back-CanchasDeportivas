BEGIN;

-- No truncar cadenas ni redondear dinero histórico al estrechar tipos.
DO $$ DECLARE r record; invalid boolean; BEGIN
 FOR r IN SELECT * FROM (VALUES
 ('complexes','contact_info',255), ('court_types','description',255),
 ('court_incidents','reason',500), ('reservations','cancellation_reason',500),
 ('payments','rejection_reason',500), ('payments','refund_reason',500),
 ('cash_shifts','notes',1000), ('reservation_events','reason',500),
 ('reservations','status',20), ('reservation_events','from_status',20),
 ('reservation_events','to_status',20), ('users','role',10),
 ('payments','payment_method',8), ('payments','payment_type',12),
 ('reservations','origin',8), ('users','password_hash',100)
 ) AS limits(tab,col,maxlen) LOOP
   EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE length(%I)>%s)',r.tab,r.col,r.maxlen) INTO invalid;
   IF invalid THEN RAISE EXCEPTION 'Preflight: %.% supera % caracteres; corregir antes de migrar',r.tab,r.col,r.maxlen; END IF;
   EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE varchar(%s)',r.tab,r.col,r.maxlen);
 END LOOP;
 FOR r IN SELECT * FROM (VALUES ('total_system_cash'),('total_system_qr'),('difference')) AS money(col) LOOP
   EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.cash_shifts WHERE %1$I IS NOT NULL AND (%1$I<>round(%1$I,2) OR abs(%1$I)>99999999.99))',r.col) INTO invalid;
   IF invalid THEN RAISE EXCEPTION 'Preflight: cash_shifts.% requiere revisar precisión/rango',r.col; END IF;
   EXECUTE format('ALTER TABLE public.cash_shifts ALTER COLUMN %I TYPE numeric(10,2)',r.col);
 END LOOP;
END $$;

ALTER TABLE public.court_schedules ALTER COLUMN day_of_week TYPE smallint;
-- Portadas existentes: el contrato admite una imagen base64 de hasta 2,8 M caracteres.
-- Se conserva TEXT para ese contenido, con el mismo límite que la API.
ALTER TABLE public.courts ADD CONSTRAINT court_cover_length CHECK (length(cover_image_url)<=2800000);
-- TIME conserva su precisión: reducirla redondearía segundos en datos históricos.
-- UUID es nativo de 128 bits (16 bytes); no sustituirlo por varchar(36).

-- No solicitar CI. Preservar el dato histórico sin usarlo para nuevas altas.
ALTER TABLE public.users ALTER COLUMN ci DROP NOT NULL;
COMMENT ON COLUMN public.users.ci IS 'Dato histórico opcional; no se solicita ni expone en altas o consultas de la aplicación';
UPDATE public.users SET ci=NULL WHERE id='00000000-0000-4000-8000-000000000001' AND ci='PRESENCIAL' AND status='INACTIVE';

-- Los tres parámetros: quién, cuándo y acción. NULL significa historia desconocida
-- o proceso automático; no atribuir operaciones antiguas a una persona inventada.
CREATE TABLE public.audit_log (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 table_name varchar(63) NOT NULL,
 record_id varchar(36) NOT NULL,
 audit_actor_id uuid REFERENCES public.users(id),
 audit_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 audit_action varchar(6) NOT NULL CHECK (audit_action IN ('INSERT','UPDATE','DELETE')),
 changed_columns varchar(63)[] NOT NULL DEFAULT '{}'
);
CREATE INDEX audit_log_table_time_idx ON public.audit_log(table_name,audit_at DESC);
CREATE INDEX audit_log_actor_time_idx ON public.audit_log(audit_actor_id,audit_at DESC);
CREATE FUNCTION public.current_audit_actor() RETURNS uuid LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT coalesce(nullif(current_setting('app.booking_actor',true),''),
 nullif(nullif(current_setting('request.headers',true),'')::jsonb->>'x-audit-actor',''))::uuid
$$;
CREATE FUNCTION public.stamp_table_audit() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 NEW.audit_actor_id := public.current_audit_actor();
 NEW.audit_at := clock_timestamp();
 NEW.audit_action := TG_OP;
 RETURN NEW;
END $$;
CREATE FUNCTION public.append_table_audit() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE row_data jsonb; changed varchar(63)[]; BEGIN
 row_data := CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 IF TG_OP='UPDATE' THEN
   SELECT coalesce(array_agg(key::varchar(63) ORDER BY key),'{}') INTO changed
   FROM jsonb_each(to_jsonb(NEW)) WHERE value IS DISTINCT FROM to_jsonb(OLD)->key
   AND key NOT IN ('audit_actor_id','audit_at','audit_action');
 ELSE
   SELECT array_agg(key::varchar(63) ORDER BY key) INTO changed FROM jsonb_object_keys(row_data) AS key
   WHERE key NOT IN ('audit_actor_id','audit_at','audit_action');
 END IF;
 -- No guardar valores ni hashes, correos, CI, tokens o comprobantes en el historial.
 INSERT INTO public.audit_log(table_name,record_id,audit_actor_id,audit_action,changed_columns)
 VALUES(TG_TABLE_NAME,coalesce(row_data->>'id',row_data->>'code'),public.current_audit_actor(),TG_OP,changed);
 RETURN NULL;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['users','complexes','courts','court_types','court_schedules','court_incidents','reservations','payments','cash_shifts','reservation_events'] LOOP
   EXECUTE format('ALTER TABLE public.%I ADD COLUMN audit_actor_id uuid REFERENCES public.users(id), ADD COLUMN audit_at timestamptz, ADD COLUMN audit_action varchar(6) CHECK(audit_action IN (''INSERT'',''UPDATE'',''DELETE''))',t);
   EXECUTE format('CREATE TRIGGER zz_stamp_audit BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.stamp_table_audit()',t);
   EXECUTE format('CREATE TRIGGER zz_append_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.append_table_audit()',t);
   EXECUTE format('REVOKE TRUNCATE ON public.%I FROM service_role',t);
   EXECUTE format('COMMENT ON COLUMN public.%I.audit_actor_id IS ''Usuario responsable; NULL en procesos automáticos o datos anteriores a esta migración''',t);
   EXECUTE format('COMMENT ON COLUMN public.%I.audit_at IS ''Instante de la última escritura; NULL en datos históricos sin evidencia''',t);
 END LOOP;
END $$;
CREATE TRIGGER audit_log_immutable BEFORE UPDATE OR DELETE ON public.audit_log FOR EACH ROW EXECUTE FUNCTION public.protect_audit_record();
CREATE TRIGGER audit_log_no_truncate BEFORE TRUNCATE ON public.audit_log EXECUTE FUNCTION public.protect_audit_record();
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY backend_only ON public.audit_log FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
REVOKE ALL ON public.audit_log FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT ON public.audit_log TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.audit_log_id_seq TO service_role;
REVOKE ALL ON FUNCTION public.current_audit_actor(),public.stamp_table_audit(),public.append_table_audit() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.current_audit_actor(),public.stamp_table_audit(),public.append_table_audit() TO service_role;
COMMIT;
