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