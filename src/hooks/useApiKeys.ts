import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
  requests_today: number;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface ApiUsageStats {
  today: {
    requests: number;
    limit: number;
  };
  rate_limit_per_minute: number;
  recent_requests: Array<{
    endpoint: string;
    method: string;
    status_code: number;
    response_time_ms: number;
    created_at: string;
  }>;
}

export function useApiKeys() {
  const { session } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchKeys = async () => {
    if (!session?.access_token) return;
    
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('developer-api', {
        body: null,
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        method: 'GET'
      });

      // Use fetch directly since invoke doesn't support path routing
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/developer-api/keys`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const createKey = async (name: string, scopes: string[] = ['read', 'write']) => {
    if (!session?.access_token) {
      toast.error('Please sign in to create API keys');
      return null;
    }

    setCreating(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/developer-api/keys`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name, scopes })
        }
      );

      if (res.ok) {
        const data = await res.json();
        toast.success('API key created! Save it now - it won\'t be shown again.');
        await fetchKeys();
        return data.api_key;
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to create API key');
        return null;
      }
    } catch (error) {
      console.error('Failed to create API key:', error);
      toast.error('Failed to create API key');
      return null;
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (keyId: string) => {
    if (!session?.access_token) return;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/developer-api/keys/${keyId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (res.ok) {
        toast.success('API key revoked');
        await fetchKeys();
      } else {
        toast.error('Failed to revoke API key');
      }
    } catch (error) {
      console.error('Failed to revoke API key:', error);
      toast.error('Failed to revoke API key');
    }
  };

  useEffect(() => {
    if (session) {
      fetchKeys();
    }
  }, [session]);

  return {
    keys,
    loading,
    creating,
    createKey,
    revokeKey,
    refresh: fetchKeys
  };
}
