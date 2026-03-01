
CREATE TABLE IF NOT EXISTS public.scheduler_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_name text NOT NULL,
  edge_function text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  rows_affected integer DEFAULT 0,
  error_message text,
  duration_ms integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_scheduler_runs_task ON public.scheduler_runs(task_name);
CREATE INDEX idx_scheduler_runs_status ON public.scheduler_runs(status);
CREATE INDEX idx_scheduler_runs_started ON public.scheduler_runs(started_at DESC);

ALTER TABLE public.scheduler_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view scheduler runs" ON public.scheduler_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role can manage scheduler runs" ON public.scheduler_runs FOR ALL USING (true) WITH CHECK (true);
