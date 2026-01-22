import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ScheduledPipeline {
  id: string;
  name: string;
  prompt: string;
  cron_expression: string;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  run_count: number;
  success_count: number;
  failure_count: number;
  config: Record<string, unknown>;
  created_at: string;
}

export interface PipelineRun {
  id: string;
  pipeline_id: string;
  status: string;
  records_collected: number;
  sources_queried: string[] | null;
  insights: Record<string, unknown> | null;
  error_message: string | null;
  processing_time_ms: number | null;
  credits_used: number;
  started_at: string;
  completed_at: string | null;
}

const CRON_PRESETS = {
  'Every hour': '0 * * * *',
  'Every 6 hours': '0 */6 * * *',
  'Every 12 hours': '0 */12 * * *',
  'Daily': '0 0 * * *',
  'Weekly': '0 0 * * 0',
};

export function useScheduledPipelines() {
  const { session, user } = useAuth();
  const [pipelines, setPipelines] = useState<ScheduledPipeline[]>([]);
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPipelines = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scheduled_pipelines')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPipelines((data as ScheduledPipeline[]) || []);
    } catch (error) {
      console.error('Failed to fetch pipelines:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRuns = async (pipelineId?: string) => {
    if (!user?.id) return;

    try {
      let query = supabase
        .from('pipeline_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);

      if (pipelineId) {
        query = query.eq('pipeline_id', pipelineId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRuns((data as PipelineRun[]) || []);
    } catch (error) {
      console.error('Failed to fetch pipeline runs:', error);
    }
  };

  const createPipeline = async (
    name: string,
    prompt: string,
    cronExpression: string,
    config: Record<string, unknown> = {}
  ) => {
    if (!user?.id) {
      toast.error('Please sign in to create pipelines');
      return null;
    }

    try {
      // Calculate next run time
      const { data: nextRunData } = await supabase.rpc('calculate_next_run', {
        p_cron: cronExpression
      });

      const { data, error } = await supabase
        .from('scheduled_pipelines')
        .insert([{
          user_id: user.id,
          name,
          prompt,
          cron_expression: cronExpression,
          next_run_at: nextRunData as string,
          config: config as unknown as Record<string, never>
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Pipeline scheduled!');
      await fetchPipelines();
      return data;
    } catch (error) {
      console.error('Failed to create pipeline:', error);
      toast.error('Failed to create pipeline');
      return null;
    }
  };

  const togglePipeline = async (pipelineId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('scheduled_pipelines')
        .update({ is_active: isActive })
        .eq('id', pipelineId);

      if (error) throw error;

      toast.success(isActive ? 'Pipeline activated' : 'Pipeline paused');
      await fetchPipelines();
    } catch (error) {
      console.error('Failed to toggle pipeline:', error);
      toast.error('Failed to update pipeline');
    }
  };

  const deletePipeline = async (pipelineId: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_pipelines')
        .delete()
        .eq('id', pipelineId);

      if (error) throw error;

      toast.success('Pipeline deleted');
      await fetchPipelines();
    } catch (error) {
      console.error('Failed to delete pipeline:', error);
      toast.error('Failed to delete pipeline');
    }
  };

  const runNow = async (pipelineId: string) => {
    const pipeline = pipelines.find(p => p.id === pipelineId);
    if (!pipeline) return;

    toast.info('Running pipeline...');

    try {
      const response = await supabase.functions.invoke('omniscient', {
        body: { prompt: pipeline.prompt, config: pipeline.config }
      });

      if (response.error) throw response.error;

      toast.success('Pipeline completed!');
      await fetchRuns(pipelineId);
    } catch (error) {
      console.error('Pipeline execution failed:', error);
      toast.error('Pipeline execution failed');
    }
  };

  useEffect(() => {
    if (user) {
      fetchPipelines();
      fetchRuns();
    }
  }, [user]);

  return {
    pipelines,
    runs,
    loading,
    cronPresets: CRON_PRESETS,
    createPipeline,
    togglePipeline,
    deletePipeline,
    runNow,
    fetchRuns,
    refresh: fetchPipelines
  };
}
