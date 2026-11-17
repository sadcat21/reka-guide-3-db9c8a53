CREATE TABLE public.rifqa_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.murshid_rifqa_registrations(id) ON DELETE CASCADE,
  actor_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  persona text CHECK (persona IN ('enthusiastic', 'neutral', 'skeptic', 'indifferent')),
  outcome text NOT NULL CHECK (outcome IN ('confirmed', 'hot', 'hesitant', 'no_answer', 'declined')),
  notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
  follow_up_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rifqa_call_logs_reg_idx ON public.rifqa_call_logs (registration_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.rifqa_call_logs TO authenticated;
GRANT ALL ON public.rifqa_call_logs TO service_role;
ALTER TABLE public.rifqa_call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read call logs" ON public.rifqa_call_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.rifqa_assistant_can(auth.uid(), 'view'));
CREATE POLICY "Staff add own call logs" ON public.rifqa_call_logs FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() AND (public.has_role(auth.uid(), 'admin') OR public.rifqa_assistant_can(auth.uid(), 'view')));
CREATE POLICY "Admins delete call logs" ON public.rifqa_call_logs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.rifqa_registration_activity DROP CONSTRAINT IF EXISTS rifqa_registration_activity_action_check;
ALTER TABLE public.rifqa_registration_activity ADD CONSTRAINT rifqa_registration_activity_action_check
  CHECK (action IN ('status_change', 'deleted', 'call_logged'));

CREATE OR REPLACE FUNCTION public.rifqa_log_call_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.rifqa_registration_activity (registration_id, registration_reference, actor_id, action)
  SELECT NEW.registration_id, r.reference, NEW.actor_id, 'call_logged'
  FROM public.murshid_rifqa_registrations r WHERE r.id = NEW.registration_id;
  RETURN NEW;
END $$;
CREATE TRIGGER rifqa_call_logs_activity AFTER INSERT ON public.rifqa_call_logs FOR EACH ROW EXECUTE FUNCTION public.rifqa_log_call_activity();
REVOKE EXECUTE ON FUNCTION public.rifqa_log_call_activity() FROM PUBLIC, anon, authenticated;