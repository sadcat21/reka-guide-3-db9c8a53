CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
ALTER FUNCTION public.rifqa_assistant_can(uuid, text) SET SCHEMA private;
REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.rifqa_assistant_can(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.rifqa_assistant_can(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.rifqa_guard_registration_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('new', 'contacted', 'confirmed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  IF auth.uid() IS NOT NULL AND NOT private.has_role(auth.uid(), 'admin')
     AND (to_jsonb(NEW) - 'status' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'updated_at') THEN
    RAISE EXCEPTION 'Assistants may only change the status';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.rifqa_guard_registration_update() FROM PUBLIC, anon, authenticated;