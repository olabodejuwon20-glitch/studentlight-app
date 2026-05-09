
-- 1. Extend schools
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS motto text,
  ADD COLUMN IF NOT EXISTS current_session text,
  ADD COLUMN IF NOT EXISTS current_term text,
  ADD COLUMN IF NOT EXISTS grading_system text,
  ADD COLUMN IF NOT EXISTS resumption_date date;

-- 2. Storage bucket for school logos (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-logos', 'school-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "School logos public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'school-logos');

-- Admins can upload to their school folder (path = <school_id>/...)
CREATE POLICY "School admins upload logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'school-logos'
  AND public.is_school_admin(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "School admins update logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'school-logos'
  AND public.is_school_admin(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "School admins delete logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'school-logos'
  AND public.is_school_admin(((storage.foldername(name))[1])::uuid, auth.uid())
);

-- 3. Subjects
CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  class_id uuid,
  name text NOT NULL,
  code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view subjects" ON public.subjects FOR SELECT USING (public.is_member(school_id, auth.uid()));
CREATE POLICY "Admins manage subjects" ON public.subjects FOR ALL USING (public.is_school_admin(school_id, auth.uid())) WITH CHECK (public.is_school_admin(school_id, auth.uid()));

-- 4. Timetable
CREATE TABLE IF NOT EXISTS public.timetable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  class_id uuid NOT NULL,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time time NOT NULL,
  end_time time NOT NULL,
  subject text NOT NULL,
  teacher_id uuid,
  room text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view timetable" ON public.timetable FOR SELECT USING (public.is_member(school_id, auth.uid()));
CREATE POLICY "Admins manage timetable" ON public.timetable FOR ALL USING (public.is_school_admin(school_id, auth.uid())) WITH CHECK (public.is_school_admin(school_id, auth.uid()));

-- 5. Hostels
CREATE TABLE IF NOT EXISTS public.hostels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  name text NOT NULL,
  capacity int NOT NULL DEFAULT 0,
  occupied int NOT NULL DEFAULT 0,
  warden text,
  gender text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hostels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view hostels" ON public.hostels FOR SELECT USING (public.is_member(school_id, auth.uid()));
CREATE POLICY "Admins manage hostels" ON public.hostels FOR ALL USING (public.is_school_admin(school_id, auth.uid())) WITH CHECK (public.is_school_admin(school_id, auth.uid()));

-- 6. Transport
CREATE TABLE IF NOT EXISTS public.transport_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  name text NOT NULL,
  driver text,
  vehicle_no text,
  capacity int NOT NULL DEFAULT 0,
  fee numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view routes" ON public.transport_routes FOR SELECT USING (public.is_member(school_id, auth.uid()));
CREATE POLICY "Admins manage routes" ON public.transport_routes FOR ALL USING (public.is_school_admin(school_id, auth.uid())) WITH CHECK (public.is_school_admin(school_id, auth.uid()));
