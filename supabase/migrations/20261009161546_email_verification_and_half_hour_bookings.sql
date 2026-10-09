-- Mantiene los nombres históricos intactos: no adivina cómo separar apellidos.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.users ADD COLUMN first_name varchar(80);
ALTER TABLE public.users ADD COLUMN last_name varchar(80);
ALTER TABLE public.users ALTER COLUMN name TYPE varchar(161);
ALTER TABLE public.users ADD CONSTRAINT users_split_names_valid CHECK (
  (first_name IS NULL AND last_name IS NULL) OR
  (first_name IS NOT NULL AND last_name IS NOT NULL AND length(trim(first_name)) > 0 AND length(trim(last_name)) > 0)
);
ALTER TABLE public.reservations DROP CONSTRAINT reservations_time_valid;
ALTER TABLE public.reservations ADD CONSTRAINT reservations_time_valid CHECK (
  end_time > start_time AND extract(epoch FROM (end_time-start_time)) >= 1800
  AND mod(extract(epoch FROM (end_time-start_time)),1800)=0
  AND extract(minute FROM start_time) IN (0,30) AND extract(second FROM start_time)=0
  AND extract(minute FROM end_time) IN (0,30) AND extract(second FROM end_time)=0
);
NOTIFY pgrst, 'reload schema';
COMMIT;
