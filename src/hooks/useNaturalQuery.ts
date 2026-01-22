import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface NLQueryResult {
  success: boolean;
  natural_query: string;
  generated_sql: string;
  explanation?: string;
  result_count: number;
  execution_time_ms: number;
  results: Record<string, unknown>[];
}

export function useNaturalQuery() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NLQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const executeQuery = async (query: string): Promise<NLQueryResult | null> => {
    if (!query.trim()) {
      toast.error('Please enter a query');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await supabase.functions.invoke('nl-query', {
        body: { query }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data as NLQueryResult;
      
      if (!data.success) {
        throw new Error(data.generated_sql || 'Query failed');
      }

      setResult(data);
      toast.success(`Found ${data.result_count} results in ${data.execution_time_ms}ms`);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Query failed';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return {
    loading,
    result,
    error,
    executeQuery,
    reset
  };
}
