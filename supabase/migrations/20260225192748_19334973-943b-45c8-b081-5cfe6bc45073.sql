-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Automated data fill: rotates through empty sources every 10 minutes
SELECT cron.schedule(
  'fill-source-auto',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url:='https://ttzogrpnqpjtkttpupgs.supabase.co/functions/v1/fill-source',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0em9ncnBucXBqdGt0dHB1cGdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMTMwODEsImV4cCI6MjA4NDU4OTA4MX0.fpqtiZFZRgzhQOzbUAsn2WA8uNKIXusgb9xa_B3_tI8"}'::jsonb,
    body:='{"source": "auto"}'::jsonb
  ) as request_id;
  $$
);