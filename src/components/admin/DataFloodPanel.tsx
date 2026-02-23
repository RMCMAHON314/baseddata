import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, Waves, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export const DataFloodPanel = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loadCounts = async () => {
    const [contracts, opps, sbir, samEnts, excl, nsf, fpds, grants, entities] = await Promise.all([
      supabase.from('contracts').select('*', { count: 'exact', head: true }),
      supabase.from('opportunities').select('*', { count: 'exact', head: true }),
      supabase.from('sbir_awards').select('*', { count: 'exact', head: true }),
      supabase.from('sam_entities').select('*', { count: 'exact', head: true }),
      supabase.from('sam_exclusions').select('*', { count: 'exact', head: true }),
      supabase.from('nsf_awards').select('*', { count: 'exact', head: true }),
      supabase.from('fpds_awards').select('*', { count: 'exact', head: true }),
      supabase.from('grants').select('*', { count: 'exact', head: true }),
      supabase.from('core_entities').select('*', { count: 'exact', head: true }),
    ]);
    setCounts({
      contracts: contracts.count || 0,
      opportunities: opps.count || 0,
      sbir: sbir.count || 0,
      samEntities: samEnts.count || 0,
      exclusions: excl.count || 0,
      nsf: nsf.count || 0,
      fpds: fpds.count || 0,
      grants: grants.count || 0,
      entities: entities.count || 0,
    });
  };

  useEffect(() => {
    if (open) loadCounts();
  }, [open]);

  const invoke = async (fnName: string, body: any, label: string) => {
    setLoading(label);
    setResults(null);
    try {
      const { data, error } = await supabase.functions.invoke(fnName, { body });
      if (error) throw error;
      setResults(data);
      toast({ title: '✅ ' + label, description: `Loaded ${data?.loaded || data?.total_loaded || 0} records` });
      loadCounts();
      queryClient.invalidateQueries({ queryKey: ['all-source-counts'] });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const Btn = ({ fn, body, label, emoji, variant = 'outline' as any }: { fn: string; body: any; label: string; emoji: string; variant?: any }) => (
    <Button onClick={() => invoke(fn, body, label)} disabled={!!loading} size="sm" variant={variant}>
      {loading === label ? '⏳ Loading...' : `${emoji} ${label}`}
    </Button>
  );

  const ct = (key: string) => counts[key]?.toLocaleString() || '0';

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-primary/20 bg-card">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <CardTitle className="text-primary flex items-center gap-2">
              <Waves className="h-5 w-5" />
              Data Flood Controls
              <Badge variant="outline" className="text-xs">Admin</Badge>
              <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Stats Row */}
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">📄 Contracts: {ct('contracts')}</Badge>
              <Badge variant="secondary">📑 FPDS: {ct('fpds')}</Badge>
              <Badge variant="secondary">📋 Opps: {ct('opportunities')}</Badge>
              <Badge variant="secondary">🔬 SBIR: {ct('sbir')}</Badge>
              <Badge variant="secondary">🏢 SAM: {ct('samEntities')}</Badge>
              <Badge variant="secondary">⚖️ Excl: {ct('exclusions')}</Badge>
              <Badge variant="secondary">🔭 NSF: {ct('nsf')}</Badge>
              <Badge variant="secondary">💰 Grants: {ct('grants')}</Badge>
              <Badge variant="secondary">👥 Entities: {ct('entities')}</Badge>
              <Button variant="ghost" size="sm" className="h-5 px-1" onClick={loadCounts}><RefreshCw className="h-3 w-3" /></Button>
            </div>

            {/* Federal Contracts */}
            <Section title="Federal Contracts">
              <Btn fn="usaspending-bulk-load" body={{ state: 'MD', fiscal_year: 2025, limit: 100, page: 1 }} label="MD Contracts" emoji="🏠" />
              <Btn fn="usaspending-bulk-load" body={{ state: 'VA', fiscal_year: 2025, limit: 100, page: 1 }} label="VA Contracts" emoji="🏛️" />
              <Btn fn="data-flood" body={{ mode: 'targeted', fiscal_year: 2025, pages: 3 }} label="Top 5 States (1,500)" emoji="🌟" variant="secondary" />
              <Btn fn="data-flood" body={{ mode: 'full', fiscal_year: 2025, pages: 2 }} label="ALL 50 States (10K+)" emoji="🌊" variant="destructive" />
            </Section>

            {/* FPDS Detail */}
            <Section title="FPDS Detail Awards">
              <Btn fn="load-fpds" body={{ department_code: '9700' }} label="FPDS — DoD" emoji="📑" />
              <Btn fn="load-fpds" body={{ department_code: '7000' }} label="FPDS — DHS" emoji="📑" />
              <Btn fn="load-fpds" body={{ department_code: '3600' }} label="FPDS — VA" emoji="📑" />
              <Btn fn="load-fpds" body={{ department_code: '4700' }} label="FPDS — GSA" emoji="📑" />
            </Section>

            {/* Opportunities */}
            <Section title="Opportunities">
              <Btn fn="sam-opportunities-load" body={{ limit: 25, offset: 0, posted_from: '01/01/2025' }} label="SAM Opportunities (25)" emoji="📋" />
            </Section>

            {/* SBIR/STTR */}
            <Section title="SBIR/STTR Innovation Awards">
              <Btn fn="load-sbir" body={{ agency: 'DOD', year: 2024 }} label="SBIR — DOD 2024" emoji="🔬" />
              <Btn fn="load-sbir" body={{ agency: 'HHS', year: 2024 }} label="SBIR — HHS 2024" emoji="🔬" />
              <Btn fn="load-sbir" body={{ agency: 'NASA', year: 2024 }} label="SBIR — NASA 2024" emoji="🔬" />
              <Btn fn="load-sbir" body={{ agency: 'NSF', year: 2024 }} label="SBIR — NSF 2024" emoji="🔬" />
              <Btn fn="load-sbir" body={{ agency: 'DOE', year: 2024 }} label="SBIR — DOE 2024" emoji="🔬" />
            </Section>

            {/* Entity Registry */}
            <Section title="Entity Registry (SAM.gov)">
              <Btn fn="load-sam-entities" body={{ state: 'MD' }} label="SAM Entities — MD" emoji="🏢" />
              <Btn fn="load-sam-entities" body={{ state: 'VA' }} label="SAM Entities — VA" emoji="🏢" />
              <Btn fn="load-sam-entities" body={{ state: 'DC' }} label="SAM Entities — DC" emoji="🏢" />
              <Btn fn="load-sam-entities" body={{ state: 'CA' }} label="SAM Entities — CA" emoji="🏢" />
            </Section>

            {/* Risk Intelligence */}
            <Section title="Risk Intelligence">
              <Btn fn="load-sam-exclusions" body={{}} label="Load Exclusions" emoji="⚖️" variant="destructive" />
            </Section>

            {/* Research Grants */}
            <Section title="Research Grants (NSF)">
              <Btn fn="load-nsf" body={{ keyword: 'cybersecurity' }} label="NSF — cybersecurity" emoji="🔭" />
              <Btn fn="load-nsf" body={{ keyword: 'artificial intelligence' }} label="NSF — AI" emoji="🔭" />
              <Btn fn="load-nsf" body={{ keyword: 'data science' }} label="NSF — data science" emoji="🔭" />
              <Btn fn="load-nsf" body={{ keyword: 'climate' }} label="NSF — climate" emoji="🔭" />
            </Section>

            {/* System */}
            <Section title="System">
              <Btn fn="usaspending-bulk-load" body={{ state: 'MD', fiscal_year: 2025, limit: 100, page: 1, award_type: 'grants' }} label="MD Grants (100)" emoji="💰" />
              <Btn fn="scheduled-refresh" body={{}} label="Run Full Scheduled Refresh" emoji="🔄" variant="default" />
            </Section>

            {/* VACUUM ENGINE */}
            <Section title="🚀 Autonomous Vacuum Engine">
              <Btn fn="vacuum-all" body={{ mode: 'quick' }} label="Quick Vacuum (5 states)" emoji="⚡" variant="secondary" />
              <Btn fn="vacuum-all" body={{ mode: 'full' }} label="FULL VACUUM (all sources)" emoji="💣" variant="destructive" />
              <Btn fn="vacuum-all" body={{ mode: 'contracts-only' }} label="Contracts Only" emoji="📄" />
              <Btn fn="vacuum-all" body={{ mode: 'sbir-only' }} label="SBIR Only" emoji="🔬" />
              <Btn fn="vacuum-all" body={{ mode: 'opportunities-only' }} label="Opportunities Only" emoji="📋" />
            </Section>

            {results && (
              <pre className="bg-muted rounded p-3 text-xs text-foreground overflow-auto max-h-48">
                {JSON.stringify(results, null, 2)}
              </pre>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border pt-3">
      <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wider">{title}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {children}
      </div>
    </div>
  );
}
