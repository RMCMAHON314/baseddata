// Admin Launch Checklist — SECTION 12 of SHIP IT
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { PageSEO } from '@/components/layout/PageSEO';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, Rocket } from 'lucide-react';
import { motion } from 'framer-motion';

interface HealthCheck {
  label: string;
  table: string;
  threshold: number;
  count: number | null;
  loading: boolean;
  pass: boolean;
}

function useTableCount(table: string) {
  return useQuery({
    queryKey: ['launch-check', table],
    queryFn: async () => {
      const { count, error } = await supabase.from(table as any).select('*', { count: 'exact', head: true });
      if (error) return -1;
      return count ?? 0;
    },
    staleTime: 60_000,
  });
}

const DATA_CHECKS: { label: string; table: string; threshold: number }[] = [
  { label: 'Core Entities', table: 'core_entities', threshold: 3000 },
  { label: 'Contracts', table: 'contracts', threshold: 4000 },
  { label: 'Grants', table: 'grants', threshold: 2000 },
  { label: 'Opportunities', table: 'opportunities', threshold: 1000 },
  { label: 'Relationships', table: 'core_relationships', threshold: 10000 },
  { label: 'Derived Insights', table: 'core_derived_insights', threshold: 3000 },
  { label: 'GSA Labor Rates', table: 'gsa_labor_rates', threshold: 2000 },
  { label: 'Subawards', table: 'subawards', threshold: 3000 },
  { label: 'NSF Awards', table: 'nsf_awards', threshold: 500 },
  { label: 'Vacuum Runs', table: 'vacuum_runs', threshold: 3 },
  { label: 'SBIR Awards', table: 'sbir_awards', threshold: 1 },
  { label: 'SAM Entities', table: 'sam_entities', threshold: 1 },
  { label: 'SAM Exclusions', table: 'sam_exclusions', threshold: 1 },
  { label: 'FPDS Awards', table: 'fpds_awards', threshold: 1 },
  { label: 'GSA Contracts', table: 'gsa_contracts', threshold: 1 },
  { label: 'Lobbying Disclosures', table: 'lobbying_disclosures', threshold: 1 },
  { label: 'USPTO Patents', table: 'uspto_patents', threshold: 1 },
];

function CheckRow({ label, table, threshold }: { label: string; table: string; threshold: number }) {
  const { data: count, isLoading } = useTableCount(table);
  const pass = count !== null && count !== undefined && count >= threshold;

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : pass ? (
          <CheckCircle2 className="h-4 w-4" style={{ color: 'hsl(var(--success))' }} />
        ) : (
          <XCircle className="h-4 w-4 text-destructive" />
        )}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="font-mono text-muted-foreground">
          {isLoading ? '...' : count === -1 ? 'error' : (count ?? 0).toLocaleString()}
        </span>
        <span className="text-muted-foreground/50">/ {threshold.toLocaleString()}</span>
      </div>
    </div>
  );
}

function EdgeFunctionCheck({ name }: { name: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['ef-check', name],
    queryFn: async () => {
      const start = performance.now();
      try {
        const { error } = await supabase.functions.invoke(name, { body: { health_check: true } });
        const ms = Math.round(performance.now() - start);
        return { ok: !error, ms };
      } catch {
        return { ok: false, ms: 0 };
      }
    },
    staleTime: 60_000,
  });

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : data?.ok ? (
          <CheckCircle2 className="h-4 w-4" style={{ color: 'hsl(var(--success))' }} />
        ) : (
          <XCircle className="h-4 w-4 text-destructive" />
        )}
        <span className="text-sm font-medium font-mono">{name}</span>
      </div>
      {data && (
        <span className="text-xs text-muted-foreground font-mono">{data.ms}ms</span>
      )}
    </div>
  );
}

export default function LaunchChecklist() {
  // Compute overall score by collecting table counts
  const counts = DATA_CHECKS.map(c => {
    // We can't call hooks in a map, so we'll compute score in the render
    return c;
  });

  return (
    <GlobalLayout>
      <PageSEO title="Launch Checklist" description="Pre-launch verification dashboard" path="/admin/launch-checklist" />
      <div className="container py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <Rocket className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Launch Readiness Checklist</h1>
            <p className="text-muted-foreground">Programmatic ship-readiness verification</p>
          </div>
        </div>

        {/* Data Health */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">Data Health Checks</h2>
          {DATA_CHECKS.map(c => (
            <CheckRow key={c.table} {...c} />
          ))}
        </Card>

        {/* Edge Function Health */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">Edge Function Health</h2>
          {['health-check', 'mega-search', 'omniscient'].map(name => (
            <EdgeFunctionCheck key={name} name={name} />
          ))}
        </Card>

        {/* Feature Checks (manual) */}
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4">Feature Checks (Manual Verification)</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>☐ Auth flow: signup → email verify → login → dashboard redirect</p>
            <p>☐ Search returns results on /search</p>
            <p>☐ Entity profile loads with 8 tabs at /entity/:id</p>
            <p>☐ Map renders with markers at /explore</p>
            <p>☐ Export generates a file from /entities</p>
            <p>☐ AI chat returns a response</p>
          </div>
        </Card>
      </div>
    </GlobalLayout>
  );
}
