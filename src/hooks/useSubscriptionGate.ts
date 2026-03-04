import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCallback } from 'react';

/**
 * Hook that gates features behind Pro subscription.
 * Returns { isPro, requirePro } where requirePro() shows upgrade toast and returns false if free tier.
 */
export function useSubscriptionGate() {
  const { tier, user } = useAuth();
  const navigate = useNavigate();
  const isPro = tier === 'pro' || tier === 'enterprise';

  const requirePro = useCallback((featureName?: string) => {
    if (isPro) return true;
    if (!user) {
      toast.info('Please sign in to access this feature', {
        action: { label: 'Sign In', onClick: () => navigate('/onboarding') },
      });
      return false;
    }
    toast.info(`${featureName || 'This feature'} requires a Pro subscription`, {
      action: { label: 'Upgrade', onClick: () => navigate('/pricing') },
    });
    return false;
  }, [isPro, user, navigate]);

  return { isPro, requirePro };
}
