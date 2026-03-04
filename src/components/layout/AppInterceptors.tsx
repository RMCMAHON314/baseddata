// Centralised app-wide interceptors (session expiry, rate limits)
import { useSupabaseInterceptor } from '@/hooks/useSupabaseInterceptor';

export function AppInterceptors() {
  useSupabaseInterceptor();
  return null;
}
