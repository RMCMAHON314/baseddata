// Global 401 interceptor — detects expired sessions and redirects to login
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useSupabaseInterceptor() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Listen for auth state changes — specifically TOKEN_REFRESHED failures
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        // If signed out unexpectedly (session expired), redirect with return path
        const isProtectedRoute = ['/dashboard', '/saved-searches', '/admin', '/ocean', '/diagnostic', '/gap-fixer', '/onboarding'].some(
          r => location.pathname.startsWith(r)
        );
        if (isProtectedRoute) {
          toast.info('Session expired — please sign in again.');
          navigate('/', { state: { from: location.pathname, authRequired: true }, replace: true });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);
}
