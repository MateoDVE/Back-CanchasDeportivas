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
