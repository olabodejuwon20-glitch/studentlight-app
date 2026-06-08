CREATE OR REPLACE FUNCTION public.issue_invoices_for_audience(_payment_type_id uuid, _student_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_pt RECORD; v_count int := 0; v_uid uuid := auth.uid(); v_ids uuid[];
BEGIN
  SELECT * INTO v_pt FROM public.payment_types WHERE id = _payment_type_id;
  IF v_pt IS NULL THEN RAISE EXCEPTION 'payment type not found'; END IF;
  IF NOT public.is_school_admin(v_pt.school_id, v_uid) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _student_ids IS NOT NULL AND array_length(_student_ids, 1) > 0 THEN v_ids := _student_ids;
  ELSIF v_pt.audience = 'class' AND v_pt.class_id IS NOT NULL THEN
    SELECT array_agg(student_id) INTO v_ids FROM public.class_enrollments WHERE class_id = v_pt.class_id;
  ELSIF v_pt.audience = 'level' AND v_pt.level IS NOT NULL THEN
    SELECT array_agg(ce.student_id) INTO v_ids FROM public.class_enrollments ce JOIN public.classes c ON c.id = ce.class_id
    WHERE c.school_id = v_pt.school_id AND c.grade_level = v_pt.level;
  ELSE
    SELECT array_agg(user_id) INTO v_ids FROM public.memberships
    WHERE school_id = v_pt.school_id AND role = 'student' AND status = 'active';
  END IF;
  IF v_ids IS NULL THEN RETURN 0; END IF;
  INSERT INTO public.school_invoices (school_id, payment_type_id, student_id, amount_due_kobo, currency, status, due_date, term, session, issued_by)
  SELECT v_pt.school_id, v_pt.id, sid, v_pt.default_amount_kobo, v_pt.currency, 'pending', v_pt.due_date, v_pt.term, v_pt.session, v_uid
  FROM unnest(v_ids) AS sid
  ON CONFLICT (school_id, student_id, payment_type_id, COALESCE(term,''), COALESCE(session,''))
    WHERE payment_type_id IS NOT NULL
    DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $function$;
