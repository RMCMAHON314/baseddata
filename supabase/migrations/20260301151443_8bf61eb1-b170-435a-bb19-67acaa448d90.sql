
-- ============================================================
-- SECURITY HARDENING PHASE 2 — Drop all "Service role" write policies
-- Edge functions use service_role key which BYPASSES RLS entirely.
-- These policies only serve to open write access to anon/authenticated users.
-- ============================================================

-- Flywheel internals
DROP POLICY IF EXISTS "Service role full access collection_log" ON public.flywheel_collection_log;
DROP POLICY IF EXISTS "Service role full access crawl_log" ON public.flywheel_crawl_log;
DROP POLICY IF EXISTS "Service role manages dead letter queue" ON public.flywheel_dead_letter_queue;
DROP POLICY IF EXISTS "Service role full access discovery_queue" ON public.flywheel_discovery_queue;
DROP POLICY IF EXISTS "Service role full access to flywheel_metrics" ON public.flywheel_metrics;
DROP POLICY IF EXISTS "Service role full access source_health" ON public.flywheel_source_health;

-- Federal data tables
DROP POLICY IF EXISTS "Service write fpds" ON public.fpds_awards;
DROP POLICY IF EXISTS "Service role write access for grants" ON public.grants;
DROP POLICY IF EXISTS "Service write gsa" ON public.gsa_labor_rates;
DROP POLICY IF EXISTS "Service write nsf" ON public.nsf_awards;
DROP POLICY IF EXISTS "Service write opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Service role write access for opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Service write sam_entities" ON public.sam_entities;
DROP POLICY IF EXISTS "Service write exclusions" ON public.sam_exclusions;
DROP POLICY IF EXISTS "Service write sbir" ON public.sbir_awards;
DROP POLICY IF EXISTS "Service write sub" ON public.subawards;
DROP POLICY IF EXISTS "Service write vacuum" ON public.vacuum_runs;

-- Internal system tables
DROP POLICY IF EXISTS "Service role full access health_checks" ON public.health_checks;
DROP POLICY IF EXISTS "Service role can manage scheduler runs" ON public.scheduler_runs;
DROP POLICY IF EXISTS "Service role write access for search_logs" ON public.search_logs;
DROP POLICY IF EXISTS "Service role full access system_logs" ON public.system_logs;
DROP POLICY IF EXISTS "Service role full access query_sources" ON public.query_sources;
DROP POLICY IF EXISTS "Service role full access to records" ON public.records;
DROP POLICY IF EXISTS "Service write ocean_health_snapshots" ON public.ocean_health_snapshots;

-- Intelligence tables
DROP POLICY IF EXISTS "Service write insights" ON public.insights;
DROP POLICY IF EXISTS "Service write market_shifts" ON public.market_shifts;
DROP POLICY IF EXISTS "Service write win_predictions" ON public.win_predictions;
DROP POLICY IF EXISTS "Service write teaming_partners" ON public.teaming_partners;
DROP POLICY IF EXISTS "Service write relationship_types" ON public.relationship_types;
DROP POLICY IF EXISTS "Service role has full access to narrative_templates" ON public.narrative_templates;

-- Specific UPDATE/INSERT service policies
DROP POLICY IF EXISTS "Service update federal_audits" ON public.federal_audits;
DROP POLICY IF EXISTS "Service insert federal_audits" ON public.federal_audits;
DROP POLICY IF EXISTS "Service insert gsa_contracts" ON public.gsa_contracts;
DROP POLICY IF EXISTS "Service update gsa_contracts" ON public.gsa_contracts;
DROP POLICY IF EXISTS "Service update lobbying" ON public.lobbying_disclosures;
DROP POLICY IF EXISTS "Service insert lobbying" ON public.lobbying_disclosures;
DROP POLICY IF EXISTS "Service update sec_filings" ON public.sec_filings;
DROP POLICY IF EXISTS "Service insert sec_filings" ON public.sec_filings;
DROP POLICY IF EXISTS "Service update uspto_patents" ON public.uspto_patents;
DROP POLICY IF EXISTS "Service insert uspto_patents" ON public.uspto_patents;
DROP POLICY IF EXISTS "Service write opp_intel_log" ON public.opportunity_intelligence_log;
DROP POLICY IF EXISTS "Service write opp_matches" ON public.opportunity_matches;
DROP POLICY IF EXISTS "Service update opp_matches" ON public.opportunity_matches;

-- Add read-only policy for tables that lost all policies (RLS enabled but no policy)
CREATE POLICY "Public read api_circuit_breakers" ON public.api_circuit_breakers FOR SELECT USING (true);
CREATE POLICY "Public read discovery_dead_letter" ON public.discovery_dead_letter FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
