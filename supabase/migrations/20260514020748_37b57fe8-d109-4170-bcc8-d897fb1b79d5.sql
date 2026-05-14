
DO $$ BEGIN
  CREATE TYPE public.exam_mode AS ENUM ('neco_sim','school','practice');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS mode public.exam_mode NOT NULL DEFAULT 'school',
  ADD COLUMN IF NOT EXISTS counts_to_results boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_answers_after_each boolean NOT NULL DEFAULT false;

UPDATE public.exams SET mode='school' WHERE mode IS NULL;

CREATE INDEX IF NOT EXISTS idx_exams_school_mode_status ON public.exams(school_id, mode, status);
