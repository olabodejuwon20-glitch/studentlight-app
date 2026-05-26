
CREATE TABLE public.page_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path TEXT NOT NULL,
  referrer TEXT,
  session_id TEXT NOT NULL,
  user_id UUID,
  school_id UUID,
  device TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_page_views_created_at ON public.page_views(created_at DESC);
CREATE INDEX idx_page_views_path ON public.page_views(path);
CREATE INDEX idx_page_views_session ON public.page_views(session_id);

GRANT INSERT ON public.page_views TO anon, authenticated;
GRANT SELECT ON public.page_views TO authenticated;
GRANT ALL ON public.page_views TO service_role;

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone records page view" ON public.page_views FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "super reads page views" ON public.page_views FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE TABLE public.auth_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event TEXT NOT NULL, -- 'sign_in' | 'sign_up' | 'sign_out'
  user_id UUID,
  school_id UUID,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_auth_events_created_at ON public.auth_events(created_at DESC);
CREATE INDEX idx_auth_events_event ON public.auth_events(event);

GRANT INSERT ON public.auth_events TO anon, authenticated;
GRANT SELECT ON public.auth_events TO authenticated;
GRANT ALL ON public.auth_events TO service_role;

ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone records auth event" ON public.auth_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "super reads auth events" ON public.auth_events FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.page_views;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auth_events;
