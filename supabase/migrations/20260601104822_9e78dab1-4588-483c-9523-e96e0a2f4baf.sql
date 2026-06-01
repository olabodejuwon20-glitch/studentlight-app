
-- parent_alerts: AI-drafted risk alerts for parents, pending approval before send
CREATE TABLE public.parent_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  parent_id uuid,
  kind text NOT NULL,           -- 'attendance' | 'grade_drop' | 'fee_overdue'
  severity text NOT NULL DEFAULT 'medium',  -- low|medium|high
  signal jsonb NOT NULL DEFAULT '{}'::jsonb, -- raw metrics used to decide
  draft_message text,
  ai_job_id uuid,
  approval_id uuid,
  status text NOT NULL DEFAULT 'pending',  -- pending|approved|sent|dismissed
  dedupe_key text NOT NULL,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, dedupe_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_alerts TO authenticated;
GRANT ALL ON public.parent_alerts TO service_role;

ALTER TABLE public.parent_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "school admins view parent alerts"
  ON public.parent_alerts FOR SELECT TO authenticated
  USING (public.is_school_admin(school_id, auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "school admins update parent alerts"
  ON public.parent_alerts FOR UPDATE TO authenticated
  USING (public.is_school_admin(school_id, auth.uid()))
  WITH CHECK (public.is_school_admin(school_id, auth.uid()));

CREATE POLICY "school admins delete parent alerts"
  ON public.parent_alerts FOR DELETE TO authenticated
  USING (public.is_school_admin(school_id, auth.uid()));

-- Parents can view their own alerts (once sent)
CREATE POLICY "parents view own sent alerts"
  ON public.parent_alerts FOR SELECT TO authenticated
  USING (parent_id = auth.uid() AND status = 'sent');

CREATE INDEX idx_parent_alerts_school_status ON public.parent_alerts(school_id, status);
CREATE INDEX idx_parent_alerts_student ON public.parent_alerts(student_id);

CREATE TRIGGER trg_parent_alerts_updated
  BEFORE UPDATE ON public.parent_alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
