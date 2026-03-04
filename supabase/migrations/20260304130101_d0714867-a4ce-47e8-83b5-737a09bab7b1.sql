
DROP TABLE public.ingestion_queue;

CREATE TABLE public.ingestion_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type text NOT NULL,
  task_config jsonb NOT NULL DEFAULT '{}',
  priority integer NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  records_ingested integer DEFAULT 0,
  error_message text,
  locked_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  next_run_at timestamptz NOT NULL DEFAULT now(),
  recurrence_interval interval,
  source_label text
);

CREATE INDEX idx_iq_poll ON public.ingestion_queue (priority, next_run_at) WHERE status = 'pending';
CREATE INDEX idx_iq_status ON public.ingestion_queue (status);

CREATE TABLE public.ingestion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id uuid REFERENCES public.ingestion_queue(id) ON DELETE SET NULL,
  task_type text NOT NULL,
  status text NOT NULL,
  records_ingested integer DEFAULT 0,
  duration_ms integer,
  error_message text,
  response_summary jsonb,
  executed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_il_time ON public.ingestion_log (executed_at DESC);

ALTER TABLE public.ingestion_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_queue" ON public.ingestion_queue FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_log" ON public.ingestion_log FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.claim_next_ingestion_task()
RETURNS SETOF public.ingestion_queue
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE ingestion_queue
  SET status = 'running', locked_at = now(), started_at = now(), attempt_count = attempt_count + 1
  WHERE id = (
    SELECT id FROM ingestion_queue
    WHERE status = 'pending' AND next_run_at <= now() AND attempt_count < max_attempts
    ORDER BY priority ASC, next_run_at ASC LIMIT 1
    FOR UPDATE SKIP LOCKED
  ) RETURNING *;
$$;

CREATE OR REPLACE FUNCTION public.complete_ingestion_task(
  p_task_id uuid, p_records integer DEFAULT 0, p_error text DEFAULT NULL, p_response jsonb DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_task ingestion_queue;
BEGIN
  SELECT * INTO v_task FROM ingestion_queue WHERE id = p_task_id;
  INSERT INTO ingestion_log (queue_id, task_type, status, records_ingested, duration_ms, error_message, response_summary)
  VALUES (p_task_id, v_task.task_type, CASE WHEN p_error IS NULL THEN 'complete' ELSE 'failed' END, p_records,
    EXTRACT(EPOCH FROM (now() - COALESCE(v_task.started_at, now())))::integer * 1000, p_error, p_response);
  IF p_error IS NOT NULL THEN
    IF v_task.attempt_count >= v_task.max_attempts THEN
      UPDATE ingestion_queue SET status = 'failed', error_message = p_error, completed_at = now() WHERE id = p_task_id;
    ELSE
      UPDATE ingestion_queue SET status = 'pending', error_message = p_error, next_run_at = now() + (interval '5 minutes' * v_task.attempt_count) WHERE id = p_task_id;
    END IF;
  ELSE
    IF v_task.recurrence_interval IS NOT NULL THEN
      UPDATE ingestion_queue SET status = 'pending', records_ingested = COALESCE(records_ingested, 0) + p_records,
        error_message = NULL, completed_at = now(), next_run_at = now() + v_task.recurrence_interval, attempt_count = 0,
        task_config = CASE WHEN task_config ? 'page' THEN jsonb_set(task_config, '{page}', to_jsonb((task_config->>'page')::int + 1)) ELSE task_config END
      WHERE id = p_task_id;
    ELSE
      UPDATE ingestion_queue SET status = 'complete', records_ingested = p_records, completed_at = now() WHERE id = p_task_id;
    END IF;
  END IF;
END; $$;
