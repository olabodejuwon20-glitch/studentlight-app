
-- helper
CREATE OR REPLACE FUNCTION public.is_super_admin(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user AND role='super_admin');
$$;

-- Schools extensions
DO $$ BEGIN CREATE TYPE public.school_plan AS ENUM ('trial','basic','standard','premium','enterprise'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.school_status AS ENUM ('active','suspended','expired','trial'); EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS plan public.school_plan NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS status public.school_status NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS plan_started_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS platform_notice text,
  ADD COLUMN IF NOT EXISTS suspended_reason text;

CREATE POLICY "super reads schools" ON public.schools FOR SELECT USING (public.is_super_admin(auth.uid()));
CREATE POLICY "super updates schools" ON public.schools FOR UPDATE USING (public.is_super_admin(auth.uid()));
CREATE POLICY "super reads memberships" ON public.memberships FOR SELECT USING (public.is_super_admin(auth.uid()));

-- Module registry
CREATE TABLE public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'academics',
  version text NOT NULL DEFAULT '1.0.0',
  icon text,
  status text NOT NULL DEFAULT 'active',
  global_default boolean NOT NULL DEFAULT false,
  pricing_model text NOT NULL DEFAULT 'included',
  monthly_price_cents int NOT NULL DEFAULT 0,
  default_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  config_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads modules" ON public.modules FOR SELECT USING (true);
CREATE POLICY "super manages modules" ON public.modules FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- Per-school module licensing / config
CREATE TABLE public.school_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  beta boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  UNIQUE (school_id, module_id)
);
ALTER TABLE public.school_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read own school modules" ON public.school_modules FOR SELECT USING (public.is_member(school_id, auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "super manages school modules" ON public.school_modules FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- Subscriptions & invoices
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  plan public.school_plan NOT NULL,
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz,
  monthly_amount_cents int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin/super read subscriptions" ON public.subscriptions FOR SELECT USING (public.is_school_admin(school_id, auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "super manages subscriptions" ON public.subscriptions FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  number text NOT NULL,
  amount_cents int NOT NULL,
  status text NOT NULL DEFAULT 'open',
  issued_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin/super read invoices" ON public.invoices FOR SELECT USING (public.is_school_admin(school_id, auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "super manages invoices" ON public.invoices FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- Platform announcements
CREATE TABLE public.platform_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  audience text NOT NULL DEFAULT 'all',
  target jsonb NOT NULL DEFAULT '{}'::jsonb,
  scheduled_for timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone authed reads platform announcements" ON public.platform_announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "super manages platform announcements" ON public.platform_announcements FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- Support tickets
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  opened_by uuid NOT NULL,
  subject text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  assignee uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "opener or super read tickets" ON public.support_tickets FOR SELECT USING (opened_by = auth.uid() OR public.is_super_admin(auth.uid()) OR (school_id IS NOT NULL AND public.is_school_admin(school_id, auth.uid())));
CREATE POLICY "any auth opens tickets" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (opened_by = auth.uid());
CREATE POLICY "super manages tickets" ON public.support_tickets FOR UPDATE USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author uuid NOT NULL,
  body text NOT NULL,
  internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ticket parties read messages" ON public.support_messages FOR SELECT USING (
  public.is_super_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.opened_by = auth.uid() OR (t.school_id IS NOT NULL AND public.is_school_admin(t.school_id, auth.uid())))
  )
);
CREATE POLICY "ticket parties write messages" ON public.support_messages FOR INSERT TO authenticated WITH CHECK (
  author = auth.uid() AND (public.is_super_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.opened_by = auth.uid() OR (t.school_id IS NOT NULL AND public.is_school_admin(t.school_id, auth.uid())))
  ))
);

-- Module requests
CREATE TABLE public.module_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.module_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "school or super read module requests" ON public.module_requests FOR SELECT USING (public.is_member(school_id, auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "school admins create module requests" ON public.module_requests FOR INSERT TO authenticated WITH CHECK (requested_by = auth.uid() AND public.is_school_admin(school_id, auth.uid()));
CREATE POLICY "super updates module requests" ON public.module_requests FOR UPDATE USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- Audit log
CREATE TABLE public.platform_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor uuid NOT NULL,
  school_id uuid,
  action text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super reads audit" ON public.platform_audit FOR SELECT USING (public.is_super_admin(auth.uid()));
CREATE POLICY "super writes audit" ON public.platform_audit FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()) AND actor = auth.uid());

-- Security events
CREATE TABLE public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid,
  user_id uuid,
  type text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super reads security events" ON public.security_events FOR SELECT USING (public.is_super_admin(auth.uid()));
CREATE POLICY "super writes security events" ON public.security_events FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));

-- Platform settings
CREATE TABLE public.platform_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  brand jsonb NOT NULL DEFAULT '{}'::jsonb,
  smtp jsonb NOT NULL DEFAULT '{}'::jsonb,
  integrations jsonb NOT NULL DEFAULT '{}'::jsonb,
  maintenance_mode boolean NOT NULL DEFAULT false,
  maintenance_message text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads platform settings" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "super manages platform settings" ON public.platform_settings FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
INSERT INTO public.platform_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Seed modules
INSERT INTO public.modules (slug,name,description,category,icon,global_default,pricing_model,monthly_price_cents,default_config,config_schema) VALUES
('cbt_sim','CBT Simulation','NECO/WAEC-style computer-based testing with proctoring','academics','MonitorPlay',true,'included',0,
 '{"webcam":true,"ai_proctor":true,"negative_marking":false,"duration_min":60,"auto_submit":true,"retry_limit":1}',
 '[{"key":"webcam","label":"Webcam Monitoring","type":"toggle"},{"key":"ai_proctor","label":"AI Proctoring","type":"toggle"},{"key":"negative_marking","label":"Negative Marking","type":"toggle"},{"key":"duration_min","label":"Default Duration (min)","type":"slider","min":15,"max":180,"step":5},{"key":"auto_submit","label":"Auto Submit","type":"toggle"},{"key":"retry_limit","label":"Retry Limit","type":"slider","min":0,"max":5,"step":1}]'),
('ai_tutor','AI Tutor','24/7 AI tutor powered by Lovable AI','ai','Bot',true,'included',0,
 '{"model":"google/gemini-2.5-flash","daily_message_limit":50}',
 '[{"key":"model","label":"AI Model","type":"select","options":["google/gemini-2.5-flash","google/gemini-2.5-pro","openai/gpt-5-mini"]},{"key":"daily_message_limit","label":"Daily Messages / Student","type":"slider","min":5,"max":500,"step":5}]'),
('virtual_lab','Virtual Science Lab','Interactive simulations for chemistry, physics, biology','academics','FlaskConical',false,'addon',1500000,
 '{"subjects":["chemistry","physics"]}','[]'),
('hostel','Hostel Management','Rooms, allocations, wardens','operations','BedDouble',true,'included',0,'{}','[]'),
('waec_practice','WAEC Practice','Past-questions practice bank for WAEC','academics','GraduationCap',false,'addon',800000,'{"years":5}','[{"key":"years","label":"Past Years Included","type":"slider","min":1,"max":15,"step":1}]'),
('e_library','E-Library','Digital library with PDFs, ebooks, videos','academics','Library',true,'included',0,'{"storage_gb":10}','[{"key":"storage_gb","label":"Storage (GB)","type":"slider","min":1,"max":500,"step":1}]'),
('transport','Transport Management','Routes, vehicles, driver assignments','operations','Bus',true,'included',0,'{}','[]'),
('attendance_pro','Attendance Pro','Biometric + QR attendance with parent alerts','operations','UserCheck',false,'addon',500000,'{"sms_alerts":true}','[{"key":"sms_alerts","label":"SMS Alerts to Parents","type":"toggle"}]'),
('ai_grading','AI Grading','Auto-grade essays and short answers with AI','ai','PenTool',false,'addon',1200000,'{"model":"openai/gpt-5-mini"}','[{"key":"model","label":"AI Model","type":"select","options":["openai/gpt-5-mini","google/gemini-2.5-pro"]}]'),
('video_learning','Video Learning','Recorded lessons + live classes','academics','Video',false,'addon',900000,'{"max_quality":"1080p"}','[{"key":"max_quality","label":"Max Quality","type":"select","options":["720p","1080p","4k"]}]');

-- Backfill defaults
INSERT INTO public.school_modules (school_id, module_id, enabled)
SELECT s.id, m.id, true FROM public.schools s CROSS JOIN public.modules m WHERE m.global_default = true
ON CONFLICT DO NOTHING;

-- Triggers
CREATE TRIGGER trg_modules_updated BEFORE UPDATE ON public.modules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_support_tickets_updated BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_platform_settings_updated BEFORE UPDATE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
