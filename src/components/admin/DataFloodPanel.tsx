import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, Waves, RefreshCw, Zap, Bomb, Clock } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export const DataFloodPanel = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [runs, setRuns] = useState<any[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loadCounts = async () => {
    const [contracts, opps, sbir, samEnts, excl, nsf, fpds, grants, entities, rels, subs] = await Promise.all([
      supabase.from('contracts').select('*', { count: 'exact', head: true }),
      supabase.from('opportunities').select('*', { count: 'exact', head: true }),
      supabase.from('sbir_awards').select('*', { count: 'exact', head: true }),
      supabase.from('sam_entities').select('*', { count: 'exact', head: true }),
      supabase.from('sam_exclusions').select('*', { count: 'exact', head: true }),
      supabase.from('nsf_awards').select('*', { count: 'exact', head: true }),
      supabase.from('fpds_awards').select('*', { count: 'exact', head: true }),
      supabase.from('grants').select('*', { count: 'exact', head: true }),
      supabase.from('core_entities').select('*', { count: 'exact', head: true }),
      supabase.from('core_relationships').select('*', { count: 'exact', head: true }),
      supabase.from('subawards').select('*', { count: 'exact', head: true }),
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
      relationships: rels.count || 0,
      subawards: subs.count || 0,
    });
  };

  const loadRuns = async () => {
    const { data } = await supabase.from('vacuum_runs').select('*').order('started_at', { ascending: false }).limit(10);
    setRuns(data || []);
  };

  useEffect(() => {
    if (open) { loadCounts(); loadRuns(); }
  }, [open]);

  const totalRecords = (counts.contracts || 0) + (counts.opportunities || 0) + (counts.sbir || 0) +
    (counts.samEntities || 0) + (counts.exclusions || 0) + (counts.nsf || 0) + (counts.fpds || 0) +
    (counts.grants || 0) + (counts.subawards || 0);

  const invoke = async (fnName: string, body: any, label: string) => {
    setLoading(label);
    setResults(null);
    try {
      const { data, error } = await supabase.functions.invoke(fnName, { body });
      if (error) throw error;
      setResults(data);
      toast({ title: '✅ ' + label, description: `Loaded ${data?.loaded || data?.total_loaded || 0} records` });
      loadCounts();
      loadRuns();
      queryClient.invalidateQueries({ queryKey: ['all-source-counts'] });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const ct = (key: string) => (counts[key] || 0).toLocaleString();
  const lastRun = runs[0];

  const Btn = ({ fn, body, label, emoji, variant = 'outline' as any }: { fn: string; body: any; label: string; emoji: string; variant?: any }) => (
    <Button onClick={() => invoke(fn, body, label)} disabled={!!loading} size="sm" variant={variant}>
      {loading === label ? '⏳ Loading...' : `${emoji} ${label}`}
    </Button>
  );

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
          <CardContent className="space-y-6">
            {/* THE BIG BUTTON */}
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Bomb className="h-6 w-6 text-destructive" />
                  <div>
                    <h3 className="text-lg font-bold">VACUUM ALL DATA</h3>
                    <p className="text-sm text-muted-foreground">Siphons every free federal source. Auto-paginates. Auto-enriches.</p>
                  </div>
                </div>
                {lastRun && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Last run: {new Date(lastRun.started_at).toLocaleString()} · {lastRun.total_loaded} records · {lastRun.status}
                    {lastRun.duration_seconds && ` · ${Math.round(lastRun.duration_seconds)}s`}
                  </p>
                )}
                <div className="flex gap-3">
                  <Button onClick={() => invoke('vacuum-all', { mode: 'full' }, 'FULL VACUUM')} disabled={!!loading} variant="destructive" className="gap-2">
                    {loading === 'FULL VACUUM' ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Bomb className="h-4 w-4" />}
                    RUN FULL
                  </Button>
                  <Button onClick={() => invoke('vacuum-all', { mode: 'quick' }, 'QUICK VACUUM')} disabled={!!loading} variant="secondary" className="gap-2">
                    {loading === 'QUICK VACUUM' ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Zap className="h-4 w-4" />}
                    QUICK MODE
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Live Data Inventory */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Live Data Inventory</h4>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="font-mono">{totalRecords.toLocaleString()} total</Badge>
                  <Button variant="ghost" size="sm" className="h-6 px-1" onClick={loadCounts}><RefreshCw className="h-3 w-3" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {[
                  { emoji: '📄', label: 'Contracts', key: 'contracts' },
                  { emoji: '📋', label: 'Opportunities', key: 'opportunities' },
                  { emoji: '🔬', label: 'SBIR Awards', key: 'sbir' },
                  { emoji: '🏢', label: 'SAM Entities', key: 'samEntities' },
                  { emoji: '⚖️', label: 'Exclusions', key: 'exclusions' },
                  { emoji: '🔭', label: 'NSF Awards', key: 'nsf' },
                  { emoji: '🤝', label: 'Subawards', key: 'subawards' },
                  { emoji: '💰', label: 'Grants', key: 'grants' },
                  { emoji: '📑', label: 'FPDS Awards', key: 'fpds' },
                  { emoji: '👥', label: 'Entities', key: 'entities' },
                  { emoji: '🔗', label: 'Relationships', key: 'relationships' },
                ].map(item => (
                  <Card key={item.key} className="p-3">
                    <p className="text-xs text-muted-foreground">{item.emoji} {item.label}</p>
                    <p className="text-xl font-bold font-mono mt-1">{ct(item.key)}</p>
                  </Card>
                ))}
              </div>
            </div>

            {/* Run History */}
            {runs.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Run History
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-muted/50 text-left">
                      <th className="p-2 font-medium">Trigger</th>
                      <th className="p-2 font-medium">Status</th>
                      <th className="p-2 font-medium text-right">Loaded</th>
                      <th className="p-2 font-medium text-right">Errors</th>
                      <th className="p-2 font-medium text-right">Duration</th>
                      <th className="p-2 font-medium">Date</th>
                    </tr></thead>
                    <tbody>
                      {runs.map(r => (
                        <tr key={r.id} className="border-t hover:bg-muted/30">
                          <td className="p-2">{r.trigger}</td>
                          <td className="p-2">
                            <Badge variant={r.status === 'completed' ? 'default' : r.status === 'running' ? 'secondary' : 'destructive'} className="text-xs">
                              {r.status}
                            </Badge>
                          </td>
                          <td className="p-2 text-right font-mono">{r.total_loaded?.toLocaleString()}</td>
                          <td className="p-2 text-right font-mono">{r.total_errors}</td>
                          <td className="p-2 text-right font-mono">{r.duration_seconds ? Math.round(r.duration_seconds) + 's' : '—'}</td>
                          <td className="p-2 whitespace-nowrap">{new Date(r.started_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Advanced: Individual source buttons */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground">
                  Advanced: Individual Source Loads
                  <ChevronDown className={`h-3 w-3 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-3">
                <Section title="Federal Contracts">
                  <Btn fn="usaspending-bulk-load" body={{ state: 'MD', fiscal_year: 2025, limit: 100, page: 1 }} label="MD Contracts" emoji="🏠" />
                  <Btn fn="usaspending-bulk-load" body={{ state: 'VA', fiscal_year: 2025, limit: 100, page: 1 }} label="VA Contracts" emoji="🏛️" />
                  <Btn fn="data-flood" body={{ mode: 'targeted', fiscal_year: 2025, pages: 3 }} label="Top 5 States (1,500)" emoji="🌟" variant="secondary" />
                  <Btn fn="data-flood" body={{ mode: 'full', fiscal_year: 2025, pages: 2 }} label="ALL 50 States (10K+)" emoji="🌊" variant="destructive" />
                </Section>
                <Section title="FPDS Detail Awards">
                  <Btn fn="load-fpds" body={{ department_code: '9700' }} label="FPDS — DoD" emoji="📑" />
                  <Btn fn="load-fpds" body={{ department_code: '7000' }} label="FPDS — DHS" emoji="📑" />
                  <Btn fn="load-fpds" body={{ department_code: '3600' }} label="FPDS — VA" emoji="📑" />
                  <Btn fn="load-fpds" body={{ department_code: '4700' }} label="FPDS — GSA" emoji="📑" />
                </Section>
                <Section title="Opportunities">
                  <Btn fn="sam-opportunities-load" body={{ limit: 25, offset: 0, posted_from: '01/01/2025' }} label="SAM Opportunities (25)" emoji="📋" />
                </Section>
                <Section title="SBIR/STTR Innovation Awards">
                  <Btn fn="load-sbir" body={{ agency: 'DOD', year: 2024 }} label="SBIR — DOD 2024" emoji="🔬" />
                  <Btn fn="load-sbir" body={{ agency: 'HHS', year: 2024 }} label="SBIR — HHS 2024" emoji="🔬" />
                  <Btn fn="load-sbir" body={{ agency: 'NASA', year: 2024 }} label="SBIR — NASA 2024" emoji="🔬" />
                  <Btn fn="load-sbir" body={{ agency: 'NSF', year: 2024 }} label="SBIR — NSF 2024" emoji="🔬" />
                  <Btn fn="load-sbir" body={{ agency: 'DOE', year: 2024 }} label="SBIR — DOE 2024" emoji="🔬" />
                </Section>
                <Section title="Entity Registry (SAM.gov)">
                  <Btn fn="load-sam-entities" body={{ state: 'MD' }} label="SAM Entities — MD" emoji="🏢" />
                  <Btn fn="load-sam-entities" body={{ state: 'VA' }} label="SAM Entities — VA" emoji="🏢" />
                  <Btn fn="load-sam-entities" body={{ state: 'DC' }} label="SAM Entities — DC" emoji="🏢" />
                  <Btn fn="load-sam-entities" body={{ state: 'CA' }} label="SAM Entities — CA" emoji="🏢" />
                </Section>
                <Section title="Risk Intelligence">
                  <Btn fn="load-sam-exclusions" body={{}} label="Load Exclusions" emoji="⚖️" variant="destructive" />
                </Section>
                <Section title="Research Grants (NSF)">
                  <Btn fn="load-nsf" body={{ keyword: 'cybersecurity' }} label="NSF — cybersecurity" emoji="🔭" />
                  <Btn fn="load-nsf" body={{ keyword: 'artificial intelligence' }} label="NSF — AI" emoji="🔭" />
                  <Btn fn="load-nsf" body={{ keyword: 'data science' }} label="NSF — data science" emoji="🔭" />
                  <Btn fn="load-nsf" body={{ keyword: 'climate' }} label="NSF — climate" emoji="🔭" />
                </Section>
                <Section title="System">
                  <Btn fn="usaspending-bulk-load" body={{ state: 'MD', fiscal_year: 2025, limit: 100, page: 1, award_type: 'grants' }} label="MD Grants (100)" emoji="💰" />
                  <Btn fn="scheduled-refresh" body={{}} label="Run Full Scheduled Refresh" emoji="🔄" variant="default" />
                </Section>
              </CollapsibleContent>
            </Collapsible>

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
