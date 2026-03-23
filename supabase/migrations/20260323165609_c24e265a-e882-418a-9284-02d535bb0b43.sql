-- Freeze this project's automatic backend jobs to stop recurring usage.
-- Unschedule every currently active pg_cron job that is driving automated edge-function calls.
SELECT cron.unschedule(1);
SELECT cron.unschedule(2);
SELECT cron.unschedule(3);
SELECT cron.unschedule(4);
SELECT cron.unschedule(5);
SELECT cron.unschedule(6);
SELECT cron.unschedule(7);
SELECT cron.unschedule(8);
SELECT cron.unschedule(9);
SELECT cron.unschedule(10);
SELECT cron.unschedule(11);
SELECT cron.unschedule(12);
SELECT cron.unschedule(14);

-- Also disable any app-level automation flags so nothing resumes accidentally.
UPDATE public.scheduled_pipelines
SET is_active = false,
    updated_at = now()
WHERE is_active = true;

UPDATE public.auto_crawlers
SET is_active = false,
    updated_at = now()
WHERE is_active = true;