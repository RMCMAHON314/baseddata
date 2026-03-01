// BOMB-02 — Data Quality Indicator: Profile completeness meter + source inventory
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Circle, Sparkles, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

interface Props { entityId: string; entityName: string; }

const DATA_SOURCES = [
  { key: 'contracts', label: 'Federal Contracts', table: 'contracts', field: 'recipient_entity_id' },
  { key: 'grants', label: 'Federal Grants', table: 'grants', field: 'recipient_entity_id' },
  { key: 'relationships', label: 'Relationships', table: 'core_relationships', field: null },
  { key: 'facts', label: 'Core Facts', table: 'core_facts', field: 'entity_id' },
  { key: 'insights', label: 'AI Insights', table: 'core_derived_insights', field: null },
  { key: 'sam_exclusions', label: 'SAM Exclusions', table: 'sam_exclusions', field: null },
  { key: 'sec_filings', label: 'SEC Filings', table: 'sec_filings', field: null },
  { key: 'patents', label: 'Patents', table: 'uspto_patents', field: null },
  { key: 'lobbying', label: 'Lobbying', table: 'lobbying_disclosures', field: null },
  { key: 'clinical_trials', label: 'Clinical Trials', table: 'clinical_trials', field: null },
] as const;

export function EntityDataQuality({ entityId, entityName }: Props) {
  const [enriching, setEnriching] = useState(false);

  const { data: sourceCounts } = useQuery({
    queryKey: ['entity-data-quality', entityId, entityName],
    queryFn: async () => {
      const results: Record<string, number> = {};

      // Direct entity_id queries
      const [contracts, grants, rels, facts] = await Promise.all([
        supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('recipient_entity_id', entityId),
        supabase.from('grants').select('id', { count: 'exact', head: true }).eq('recipient_entity_id', entityId),
        supabase.from('core_relationships').select('id', { count: 'exact', head: true }).or(`from_entity_id.eq.${entityId},to_entity_id.eq.${entityId}`),
        supabase.from('core_facts').select('id', { count: 'exact', head: true }).eq('entity_id', entityId),
      ]);

      results.contracts = contracts.count || 0;
      results.grants = grants.count || 0;
      results.relationships = rels.count || 0;
      results.facts = facts.count || 0;

      // Name-based lookups
      const [insights, exclusions, sec, patents, lobbying, trials] = await Promise.all([
        supabase.from('core_derived_insights').select('id', { count: 'exact', head: true }).contains('related_entities', [entityId]),
        supabase.from('sam_exclusions').select('id', { count: 'exact', head: true }).ilike('name', `%${entityName}%`),
        supabase.from('sec_filings').select('id', { count: 'exact', head: true }).ilike('company_name', `%${entityName}%`),
        supabase.from('uspto_patents').select('id', { count: 'exact', head: true }).ilike('assignee_name', `%${entityName}%`),
        supabase.from('lobbying_disclosures').select('id', { count: 'exact', head: true }).ilike('registrant_name', `%${entityName}%`),
        supabase.from('clinical_trials').select('id', { count: 'exact', head: true }).ilike('lead_sponsor_name', `%${entityName}%`),
      ]);

      results.insights = insights.count || 0;
      results.sam_exclusions = exclusions.count || 0;
      results.sec_filings = sec.count || 0;
      results.patents = patents.count || 0;
      results.lobbying = lobbying.count || 0;
      results.clinical_trials = trials.count || 0;

      return results;
    },
  });

  const populatedSources = sourceCounts ? Object.values(sourceCounts).filter(v => v > 0).length : 0;
  const totalSources = DATA_SOURCES.length;
  const completeness = Math.round((populatedSources / totalSources) * 100);

  const handleEnrich = async () => {
    setEnriching(true);
    try {
      await supabase.functions.invoke('enrich', {
        body: { entity_id: entityId, entity_name: entityName },
      });
      toast.success('Enrichment triggered — data will update shortly');
    } catch {
      toast.error('Failed to trigger enrichment');
    } finally {
      setEnriching(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />Profile Completeness
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Meter */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">{populatedSources} of {totalSources} sources</span>
            <span className="font-bold">{completeness}%</span>
          </div>
          <Progress value={completeness} className="h-3" />
        </div>

        {/* Source inventory */}
        <div className="space-y-1.5">
          {DATA_SOURCES.map(source => {
            const count = sourceCounts?.[source.key] || 0;
            const populated = count > 0;
            return (
              <div key={source.key} className="flex items-center justify-between text-sm py-1">
                <div className="flex items-center gap-2">
                  {populated ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />
                  )}
                  <span className={populated ? 'text-foreground' : 'text-muted-foreground'}>{source.label}</span>
                </div>
                <span className={`text-xs font-mono ${populated ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Enrich button */}
        <Button onClick={handleEnrich} disabled={enriching} size="sm" className="w-full">
          {enriching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Enrich This Entity
        </Button>
      </CardContent>
    </Card>
  );
}
