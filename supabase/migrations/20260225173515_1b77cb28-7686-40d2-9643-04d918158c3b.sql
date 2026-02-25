-- Fix: Add admin access policy to user_profiles table
CREATE POLICY "Admins can view all user profiles"
  ON public.user_profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update user profiles"
  ON public.user_profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));