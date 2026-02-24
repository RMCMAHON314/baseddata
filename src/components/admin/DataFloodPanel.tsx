import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, Waves, RefreshCw, Zap, Bomb, Clock, Link } from 'lucide-react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { usePlatformStats, useVacuumRuns } from '@/hooks/useNewSources';

function fmt(v: number | null) {
  if (!v) return '$0';
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return '$' + (v / 1e3).toFixed(0) + 'K';
  return '$' + v.toFixed(0);
}

export const DataFloodPanel = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: ps, refetch: refetchStats } = usePlatformStats();
  const { data: runs, refetch: refetchRuns } = useVacuumRuns();
  const { data: linkStats, refetch: refetchLinkStats } = useQuery({
    queryKey: ['link-stats'],
    queryFn: async () => {
      const [contracts, grants, linked] = await Promise.all([
        supabase.from('contracts').select('id', { count: 'exact', head: true }).is('recipient_entity_id', null),
        supabase.from('grants').select('id', { count: 'exact', head: true }).is('recipient_entity_id', null),
        supabase.from('core_entities').select('id', { count: 'exact', head: true }).gt('contract_count', 0),
      ]);
      return {
        unlinked_contracts: contracts.count || 0,
        unlinked_grants: grants.count || 0,
        linked_entities: linked.count || 0,
      };
    }
  });

  const invoke = async (mode: string, label: string) => {
    setLoading(label);
    setResults(null);
    try {
      const { data, error } = await supabase.functions.invoke('vacuum-all', { body: { mode, trigger: 'manual' } });
      if (error) throw error;
      setResults(data);
      toast({ title: '✅ ' + label, description: `Loaded ${data?.total_loaded || 0} records` });
      refetchStats();
      refetchRuns();
      refetchLinkStats();
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const runLinker = async () => {
    setLoading('linking');
    try {
      const { data, error } = await supabase.rpc('link_transactions_to_entities') as { data: any, error: any };
      if (error) throw error;
      setResults(data);
      toast({
        title: '🔗 Entity Linking Complete',
        description: `${data?.contracts_linked || 0} contracts + ${data?.grants_linked || 0} grants linked. ${data?.entities_created || 0} new entities.`
      });
      refetchStats();
      refetchLinkStats();
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
    } catch (e: any) {
      toast({ title: '❌ Linking Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const n = (v: any) => Number(v || 0).toLocaleString();
  const lastRun = (runs as any[])?.[0];

  const INVENTORY = [
    { emoji: '📄', label: 'Contracts', value: ps?.total_contracts },
    { emoji: '📋', label: 'IDVs', value: ps?.total_idvs },
    { emoji: '💰', label: 'Grants', value: ps?.total_grants },
    { emoji: '📋', label: 'Opportunities', value: ps?.total_opportunities },
    { emoji: '🔬', label: 'SBIR Awards', value: ps?.total_sbir },
    { emoji: '🏢', label: 'SAM Entities', value: ps?.total_sam_entities },
    { emoji: '⚖️', label: 'Exclusions', value: ps?.total_exclusions },
    { emoji: '🔭', label: 'NSF Awards', value: ps?.total_nsf },
    { emoji: '📊', label: 'FPDS Awards', value: ps?.total_fpds },
    { emoji: '🤝', label: 'Subawards', value: ps?.total_subawards },
    { emoji: '💵', label: 'Labor Rates', value: ps?.total_labor_rates },
    { emoji: '👥', label: 'Entities', value: ps?.total_entities },
    { emoji: '🔗', label: 'Relationships', value: ps?.total_relationships },
  ];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-primary/20 bg-card">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <CardTitle className="text-primary flex items-center gap-2">
              <Waves className="h-5 w-5" />
              Data Vacuum Engine
              <Badge variant="outline" className="text-xs">Admin</Badge>
              <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* THE ENGINE */}
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Bomb className="h-6 w-6 text-destructive" />
                  <div>
                    <h3 className="text-lg font-bold">VACUUM ALL DATA</h3>
                    <p className="text-sm text-muted-foreground">10 sources · All 50 states · Auto-enriching</p>
                  </div>
                </div>
                {lastRun && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Last run: {new Date(lastRun.started_at).toLocaleString()} · {n(lastRun.total_loaded)} records · {lastRun.status}
                    {lastRun.duration_seconds && ` · ${Math.round(Number(lastRun.duration_seconds))}s`}
                  </p>
                )}
                <div className="flex gap-3 flex-wrap">
                  <Button onClick={() => invoke('full', 'FULL VACUUM')} disabled={!!loading} variant="destructive" className="gap-2">
                    {loading === 'FULL VACUUM' ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Bomb className="h-4 w-4" />}
                    RUN FULL
                  </Button>
                  <Button onClick={() => invoke('quick', 'QUICK VACUUM')} disabled={!!loading} variant="secondary" className="gap-2">
                    {loading === 'QUICK VACUUM' ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Zap className="h-4 w-4" />}
                    QUICK MODE
                  </Button>
                  <Button onClick={runLinker} disabled={!!loading} variant="outline" className="gap-2 border-primary/50 text-primary">
                    {loading === 'linking' ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Link className="h-4 w-4" />}
                    LINK ENTITIES
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* ENTITY HEALTH */}
            {linkStats && (
              <Card className={`p-4 border-l-4 ${
                linkStats.unlinked_contracts + linkStats.unlinked_grants === 0 ? 'border-l-green-500 bg-green-500/5' :
                (linkStats.unlinked_contracts + linkStats.unlinked_grants) < 500 ? 'border-l-yellow-500 bg-yellow-500/5' :
                'border-l-destructive bg-destructive/5'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    <span className="text-sm font-semibold">Entity Health</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => refetchLinkStats()}><RefreshCw className="h-3 w-3" /></Button>
                </div>
                <div className="flex gap-6 mt-2 text-sm">
                  <div><span className="font-mono font-bold text-primary">{n(linkStats.linked_entities)}</span> <span className="text-muted-foreground">linked entities</span></div>
                  <div><span className="font-mono font-bold text-destructive">{n(linkStats.unlinked_contracts)}</span> <span className="text-muted-foreground">orphan contracts</span></div>
                  <div><span className="font-mono font-bold text-destructive">{n(linkStats.unlinked_grants)}</span> <span className="text-muted-foreground">orphan grants</span></div>
                </div>
              </Card>
            )}

            {/* LIVE INVENTORY */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Live Data Inventory</h4>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="font-mono">{n(ps?.total_records)} total</Badge>
                  <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => refetchStats()}><RefreshCw className="h-3 w-3" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {INVENTORY.map(item => (
                  <Card key={item.label} className="p-3">
                    <p className="text-xs text-muted-foreground">{item.emoji} {item.label}</p>
                    <p className="text-xl font-bold font-mono mt-1">{n(item.value)}</p>
                  </Card>
                ))}
              </div>
              {ps && (
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <Card className="p-3 bg-primary/5"><p className="text-xs text-muted-foreground">Contract Value</p><p className="text-lg font-bold font-mono text-primary">{fmt(Number(ps.total_contract_value))}</p></Card>
                  <Card className="p-3 bg-primary/5"><p className="text-xs text-muted-foreground">IDV Ceiling</p><p className="text-lg font-bold font-mono text-primary">{fmt(Number(ps.total_idv_value))}</p></Card>
                  <Card className="p-3 bg-primary/5"><p className="text-xs text-muted-foreground">Grant Value</p><p className="text-lg font-bold font-mono text-primary">{fmt(Number(ps.total_grant_value))}</p></Card>
                </div>
              )}
            </div>

            {/* RUN HISTORY */}
            {(runs as any[])?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Run History
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-muted/50 text-left">
                      <th className="p-2 font-medium">Started</th>
                      <th className="p-2 font-medium">Mode</th>
                      <th className="p-2 font-medium">Status</th>
                      <th className="p-2 font-medium text-right">Records</th>
                      <th className="p-2 font-medium text-right">Errors</th>
                      <th className="p-2 font-medium text-right">Duration</th>
                    </tr></thead>
                    <tbody>
                      {(runs as any[])?.slice(0, 5).map((r: any) => (
                        <tr key={r.id} className="border-t hover:bg-muted/30">
                          <td className="p-2 whitespace-nowrap">{new Date(r.started_at).toLocaleString()}</td>
                          <td className="p-2">{(r.results as any)?.mode || r.trigger}</td>
                          <td className="p-2">
                            <Badge variant={r.status === 'completed' ? 'default' : r.status === 'running' ? 'secondary' : 'destructive'} className="text-xs">
                              {r.status}
                            </Badge>
                          </td>
                          <td className="p-2 text-right font-mono">{n(r.total_loaded)}</td>
                          <td className="p-2 text-right font-mono">{r.total_errors || 0}</td>
                          <td className="p-2 text-right font-mono">{r.duration_seconds ? Math.round(Number(r.duration_seconds)) + 's' : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* MANUAL OVERRIDE */}
            <Collapsible open={manualOpen} onOpenChange={setManualOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground">
                  Manual Override (Single Source)
                  <ChevronDown className={`h-3 w-3 transition-transform ${manualOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { mode: 'contracts-only', label: 'Contracts Only', emoji: '📄' },
                    { mode: 'grants-only', label: 'Grants Only', emoji: '💰' },
                    { mode: 'sbir-only', label: 'SBIR Only', emoji: '🔬' },
                    { mode: 'opportunities-only', label: 'Opportunities Only', emoji: '📋' },
                  ].map(m => (
                    <Button key={m.mode} onClick={() => invoke(m.mode, m.label)} disabled={!!loading} size="sm" variant="outline">
                      {loading === m.label ? '⏳...' : `${m.emoji} ${m.label}`}
                    </Button>
                  ))}
                </div>
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
