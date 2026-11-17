CREATE TABLE public.rifqa_assistants (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 2 AND 80),
  username text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9._-]{3,30}$'),
  is_active boolean NOT NULL DEFAULT true,
  can_view_registrations boolean NOT NULL DEFAULT true,
  can_update_status boolean NOT NULL DEFAULT false,
  can_export_csv boolean NOT NULL DEFAULT false,
  can_delete_registrations boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.rifqa_assistants TO authenticated;
GRANT ALL ON public.rifqa_assistants TO service_role;
ALTER TABLE public.rifqa_assistants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read assistants" ON public.rifqa_assistants FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Assistants read own row" ON public.rifqa_assistants FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins update assistants" ON public.rifqa_assistants FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER rifqa_assistants_touch BEFORE UPDATE ON public.rifqa_assistants FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.rifqa_assistant_can(_user_id uuid, _perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rifqa_assistants a
    WHERE a.user_id = _user_id AND a.is_active AND CASE _perm
      WHEN 'view' THEN a.can_view_registrations
      WHEN 'update' THEN a.can_view_registrations AND a.can_update_status
      WHEN 'delete' THEN a.can_view_registrations AND a.can_delete_registrations
      ELSE false END
  )
$$;

CREATE POLICY "Assistants read registrations" ON public.murshid_rifqa_registrations FOR SELECT TO authenticated USING (public.rifqa_assistant_can(auth.uid(), 'view'));
CREATE POLICY "Assistants update registration status" ON public.murshid_rifqa_registrations FOR UPDATE TO authenticated USING (public.rifqa_assistant_can(auth.uid(), 'update')) WITH CHECK (public.rifqa_assistant_can(auth.uid(), 'update'));
CREATE POLICY "Assistants delete registrations" ON public.murshid_rifqa_registrations FOR DELETE TO authenticated USING (public.rifqa_assistant_can(auth.uid(), 'delete'));

CREATE OR REPLACE FUNCTION public.rifqa_guard_registration_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('new', 'contacted', 'confirmed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin')
     AND (to_jsonb(NEW) - 'status' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'updated_at') THEN
    RAISE EXCEPTION 'Assistants may only change the status';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER murshid_rifqa_registrations_guard BEFORE UPDATE ON public.murshid_rifqa_registrations FOR EACH ROW EXECUTE FUNCTION public.rifqa_guard_registration_update();

CREATE TABLE public.rifqa_registration_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL,
  registration_reference text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('status_change', 'deleted')),
  from_status text,
  to_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rifqa_activity_actor_idx ON public.rifqa_registration_activity (actor_id, created_at DESC);
GRANT SELECT ON public.rifqa_registration_activity TO authenticated;
GRANT ALL ON public.rifqa_registration_activity TO service_role;
ALTER TABLE public.rifqa_registration_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read all activity" ON public.rifqa_registration_activity FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff read own activity" ON public.rifqa_registration_activity FOR SELECT TO authenticated USING (actor_id = auth.uid());

CREATE OR REPLACE FUNCTION public.rifqa_log_registration_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.rifqa_registration_activity (registration_id, registration_reference, actor_id, action, from_status)
    VALUES (OLD.id, OLD.reference, auth.uid(), 'deleted', OLD.status);
    RETURN OLD;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.rifqa_registration_activity (registration_id, registration_reference, actor_id, action, from_status, to_status)
    VALUES (NEW.id, NEW.reference, auth.uid(), 'status_change', OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER murshid_rifqa_registrations_log AFTER UPDATE OR DELETE ON public.murshid_rifqa_registrations FOR EACH ROW EXECUTE FUNCTION public.rifqa_log_registration_activity();

REVOKE EXECUTE ON FUNCTION public.rifqa_guard_registration_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rifqa_log_registration_activity() FROM PUBLIC, anon, authenticated;