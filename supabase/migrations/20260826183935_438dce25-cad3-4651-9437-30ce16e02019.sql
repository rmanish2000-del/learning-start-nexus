-- Self-service signups must get their role at account-creation time, in the
-- database, not from client code that runs after email confirmation.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_signup_role text := NULLIF(NEW.raw_user_meta_data->>'signup_role', '');
BEGIN
  INSERT INTO public.profiles (id, org_id, full_name, phone)
  VALUES (
    NEW.id,
    (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone);

  IF v_signup_role IN ('parent', 'student', 'educator', 'reviewer') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_signup_role::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Backfill: self-service accounts that confirmed email while the pre-fix build
-- was live have a profile but no role row. Every such account came from the
-- parent signup form (the only self-service path in EduOS).
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'parent'::public.app_role
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id)
ON CONFLICT (user_id, role) DO NOTHING;