CREATE OR REPLACE FUNCTION public.get_school_by_slug(_slug text)
RETURNS TABLE(id uuid, name text, slug text, logo_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.name, s.slug, s.logo_url
  FROM public.schools s
  WHERE s.slug = lower(_slug)
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_school_by_slug(text) TO anon, authenticated;