CREATE OR REPLACE FUNCTION public.rifqa_assistant_can(_user_id uuid, _perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.rifqa_assistants a
    WHERE a.user_id = _user_id AND a.is_active AND CASE _perm
      WHEN 'view' THEN a.can_view_registrations
      WHEN 'update' THEN a.can_view_registrations AND a.can_update_status
      WHEN 'delete' THEN a.can_view_registrations AND a.can_delete_registrations
      ELSE false END
  )
$$;
REVOKE EXECUTE ON FUNCTION public.rifqa_assistant_can(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rifqa_assistant_can(uuid, text) TO authenticated;