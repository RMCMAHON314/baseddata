-- Fix function search_path security
ALTER FUNCTION public.increment_query_access_count(UUID) SET search_path = public;
ALTER FUNCTION public.generate_query_title() SET search_path = public;