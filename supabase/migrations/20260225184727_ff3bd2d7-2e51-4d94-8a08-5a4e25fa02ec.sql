-- Fix admin_audit_log RLS policy to use has_role() instead of user_profiles.is_admin
DROP POLICY IF EXISTS "Admins can view audit log" ON public.admin_audit_log;

CREATE POLICY "Admins can view audit log"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));