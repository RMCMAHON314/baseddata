// BASED DATA - Intelligence Dashboard
// Computed intelligence from real SQL — zero AI API cost
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Brain, Target, TrendingUp, Clock, Shield, BarChart3,
  ChevronDown, ChevronUp, AlertTriangle, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function fmt(v: number | null) {
  if (!v) return '$0';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

const COLORS = ['hsl(var(--primary))', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#f97316', '#ec4899', '#6366f1', '#14b8a6'];
const URGENCY: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-200',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  LOW: 'bg-muted text-muted-foreground',
};
const SIGNAL_BADGE: Record<string, string> = {
  'New Entrant': 'bg-blue-100 text-blue-700',
  'Hypergrowth': 'bg-purple-100 text-purple-700',
  'Growing': 'bg-emerald-100 text-emerald-700',
  'Steady': 'bg-muted text-muted-foreground',
  'Declining': 'bg-red-100 text-red-700',
};

export default function IntelligenceDashboard() {
  const [concNaics, setConcNaics] = useState('');
  const [concAgency, setConcAgency] = useState('');
  const [concState, setConcState] = useState('');
  const [recompeteState, setRecompeteState] = useState('');
  const [velocityState, setVelocityState] = useState('');

  // Filter options
  const { data: filterOpts } = useQuery({
    queryKey: ['intel-filter-options'],
    queryFn: async () => {
      const [naics, agencies, states] = await Promise.all([
        supabase.from('contracts').select('naics_code').not('naics_code', 'is', null).limit(1000),
        supabase.from('contracts').select('awarding_agency').not('awarding_agency', 'is', null).limit(1000),
        supabase.from('contracts').select('pop_state').not('pop_state', 'is', null).limit(1000),
      ]);
      return {
        naics: [...new Set((naics.data || []).map(r => r.naics_code).filter(Boolean))].sort(),
        agencies: [...new Set((agencies.data || []).map(r => r.awarding_agency).filter(Boolean))].sort(),
        states: [...new Set((states.data || []).map(r => r.pop_state).filter(Boolean))].sort(),
      };
    },
    staleTime: 10 * 60 * 1000,
  });

  // Market concentration
  const { data: concentration, isLoading: loadingConc, refetch: refetchConc } = useQuery({
    queryKey: ['market-concentration', concNaics, concAgency, concState],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('compute_market_concentration', {
        p_naics: concNaics || null,
        p_agency: concAgency || null,
        p_state: concState || null,
      });
      if (error) throw error;
      return (data as any)?.[0] || null;
    },
  });

  // Recompete pipeline
  const { data: recompetes, isLoading: loadingRecomp } = useQuery({
    queryKey: ['recompete-pipeline', recompeteState],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_recompete_pipeline', {
        p_months_ahead: 12,
        p_state: recompeteState || null,
        p_min_value: 0,
      });
      if (error) throw error;
      return data || [];
    },
  });

  // Buying patterns
  const { data: buyingPatterns, isLoading: loadingBuy } = useQuery({
    queryKey: ['buying-patterns'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_agency_buying_patterns', { p_agency: null, p_naics: null });
      if (error) throw error;
      return data || [];
    },
  });

  // Velocity signals
  const { data: velocity, isLoading: loadingVel } = useQuery({
    queryKey: ['velocity-signals', velocityState],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_velocity_signals', {
        p_months: 6,
        p_state: velocityState || null,
        p_limit: 20,
      });
      if (error) throw error;
      return data || [];
    },
  });

  // Set-aside analysis
  const { data: setAsides, isLoading: loadingSA } = useQuery({
    queryKey: ['set-aside-analysis'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_set_aside_analysis', { p_set_aside: null, p_state: null, p_naics: null });
      if (error) throw error;
      return data || [];
    },
  });

  // Aggregate buying patterns for chart
  const buyingChartData = (() => {
    if (!buyingPatterns?.length) return [];
    const qMap = new Map<string, { quarter: string; label: string; value: number; count: number }>();
    for (const bp of buyingPatterns as any[]) {
      const key = bp.fiscal_quarter;
      const existing = qMap.get(key) || { quarter: key, label: bp.quarter_label, value: 0, count: 0 };
      existing.value += Number(bp.total_value) || 0;
      existing.count += Number(bp.contract_count) || 0;
      qMap.set(key, existing);
    }
    return [...qMap.values()].sort((a, b) => a.quarter.localeCompare(b.quarter));
  })();

  const recompeteStats = (() => {
    if (!recompetes?.length) return { total: 0, value: 0, critical: 0 };
    const arr = recompetes as any[];
    return {
      total: arr.length,
      value: arr.reduce((s, r) => s + (Number(r.award_amount) || 0), 0),
      critical: arr.filter(r => r.urgency === 'CRITICAL').length,
    };
  })();

  const concTopContractors = concentration?.top_contractors
    ? (typeof concentration.top_contractors === 'string'
        ? JSON.parse(concentration.top_contractors)
        : concentration.top_contractors)
    : [];

  const hhiColor = !concentration?.hhi_score ? 'text-muted-foreground'
    : Number(concentration.hhi_score) > 2500 ? 'text-red-600'
    : Number(concentration.hhi_score) > 1500 ? 'text-amber-600'
    : 'text-emerald-600';

  return (
    <GlobalLayout>
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card">
          <div className="container py-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Intelligence Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">Computed market intelligence — zero AI cost, pure SQL analytics</p>
          </div>
        </div>

        <div className="container py-6 space-y-8">

          {/* ── SECTION 1: Market Concentration ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Market Concentration Scanner (HHI)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select value={concNaics} onValueChange={setConcNaics}>
                  <SelectTrigger><SelectValue placeholder="All NAICS" /></SelectTrigger>
                  <SelectContent>{filterOpts?.naics?.slice(0, 50).map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={concAgency} onValueChange={setConcAgency}>
                  <SelectTrigger><SelectValue placeholder="All Agencies" /></SelectTrigger>
                  <SelectContent>{filterOpts?.agencies?.slice(0, 30).map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={concState} onValueChange={setConcState}>
                  <SelectTrigger><SelectValue placeholder="All States" /></SelectTrigger>
                  <SelectContent>{filterOpts?.states?.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {loadingConc ? <Skeleton className="h-48" /> : !concentration ? (
                <p className="text-center text-muted-foreground py-8">Select filters or load more data to see market concentration.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">HHI Score</p>
                      <p className={`text-2xl font-bold ${hhiColor}`}>{Number(concentration.hhi_score).toLocaleString()}</p>
                      <p className="text-xs mt-1">{concentration.concentration_level}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Market Value</p>
                      <p className="text-2xl font-bold">{fmt(Number(concentration.total_value))}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Contractors</p>
                      <p className="text-2xl font-bold">{Number(concentration.contractor_count).toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Contracts</p>
                      <p className="text-2xl font-bold">{Number(concentration.contract_count).toLocaleString()}</p>
                    </div>
                  </div>

                  {concTopContractors?.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={concTopContractors.slice(0, 10)} layout="vertical">
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(v: number) => fmt(v)} />
                            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={concTopContractors.slice(0, 8)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, share_pct }) => `${name?.slice(0, 15)}… ${share_pct}%`} labelLine={false}>
                              {concTopContractors.slice(0, 8).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(v: number) => fmt(v)} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* ── SECTION 2: Recompete Radar ── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" />Recompete Radar</CardTitle>
                <Select value={recompeteState} onValueChange={setRecompeteState}>
                  <SelectTrigger className="w-32"><SelectValue placeholder="All States" /></SelectTrigger>
                  <SelectContent>{filterOpts?.states?.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loadingRecomp ? <Skeleton className="h-48" /> : !(recompetes as any[])?.length ? (
                <p className="text-center text-muted-foreground py-8">No expiring contracts found. Load more data to populate.</p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-muted/50 text-center">
                      <p className="text-xs text-muted-foreground">Pipeline</p>
                      <p className="text-xl font-bold">{recompeteStats.total}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 text-center">
                      <p className="text-xs text-muted-foreground">Value</p>
                      <p className="text-xl font-bold text-primary">{fmt(recompeteStats.value)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-red-50 text-center border border-red-200">
                      <p className="text-xs text-red-600">Critical</p>
                      <p className="text-xl font-bold text-red-700">{recompeteStats.critical}</p>
                    </div>
                  </div>
                  <div className="border rounded-lg overflow-auto max-h-[400px]">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted"><tr>
                        <th className="p-2 text-left font-medium">Recipient</th>
                        <th className="p-2 text-left font-medium">Agency</th>
                        <th className="p-2 text-right font-medium">Value</th>
                        <th className="p-2 text-left font-medium">Expires</th>
                        <th className="p-2 text-left font-medium">Urgency</th>
                      </tr></thead>
                      <tbody>
                        {(recompetes as any[]).map((r, i) => (
                          <tr key={i} className="border-t hover:bg-muted/30">
                            <td className="p-2 max-w-[160px] truncate">{r.recipient_name}</td>
                            <td className="p-2 max-w-[160px] truncate">{r.awarding_agency}</td>
                            <td className="p-2 text-right font-mono text-primary">{fmt(Number(r.award_amount))}</td>
                            <td className="p-2 whitespace-nowrap">{r.days_until_expiry}d</td>
                            <td className="p-2"><Badge className={URGENCY[r.urgency] || ''}>{r.urgency}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ── SECTION 3: Buying Patterns ── */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Agency Buying Patterns (Fiscal Quarters)</CardTitle></CardHeader>
            <CardContent>
              {loadingBuy ? <Skeleton className="h-48" /> : !buyingChartData.length ? (
                <p className="text-center text-muted-foreground py-8">No buying pattern data available.</p>
              ) : (
                <>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={buyingChartData}>
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => fmt(v)} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {buyingChartData.length >= 4 && (() => {
                    const q4 = buyingChartData.find(d => d.quarter === 'Q4');
                    const total = buyingChartData.reduce((s, d) => s + d.value, 0);
                    const q4Pct = q4 && total > 0 ? Math.round(q4.value / total * 100) : 0;
                    return q4Pct > 0 ? (
                      <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                        <strong>💡 Insight:</strong> Q4 (Jul-Sep) accounts for <strong>{q4Pct}%</strong> of annual spending — budget season peaks in August/September.
                      </div>
                    ) : null;
                  })()}
                </>
              )}
            </CardContent>
          </Card>

          {/* ── SECTION 4: Velocity Signals ── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Velocity Signals — Fastest Growing Contractors</CardTitle>
                <Select value={velocityState} onValueChange={setVelocityState}>
                  <SelectTrigger className="w-32"><SelectValue placeholder="All States" /></SelectTrigger>
                  <SelectContent>{filterOpts?.states?.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loadingVel ? <Skeleton className="h-48" /> : !(velocity as any[])?.length ? (
                <p className="text-center text-muted-foreground py-8">No velocity data. Need contracts with dates.</p>
              ) : (
                <div className="space-y-2">
                  {(velocity as any[]).map((v, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg font-bold text-muted-foreground w-6">#{i + 1}</span>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{v.entity_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {v.recent_contracts} contracts ({fmt(Number(v.recent_value))}) vs prior {v.prior_contracts} ({fmt(Number(v.prior_value))})
                          </p>
                        </div>
                      </div>
                      <Badge className={SIGNAL_BADGE[v.signal] || 'bg-muted'}>{v.signal}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── SECTION 5: Set-Aside Markets ── */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" />Set-Aside Market Analysis</CardTitle></CardHeader>
            <CardContent>
              {loadingSA ? <Skeleton className="h-48" /> : !(setAsides as any[])?.length ? (
                <p className="text-center text-muted-foreground py-8">No set-aside data available.</p>
              ) : (
                <div className="space-y-3">
                  {(setAsides as any[]).map((sa, i) => (
                    <SetAsideCard key={i} sa={sa} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── SECTION 6: Competition Intelligence (FPDS) ── */}
          <CompetitionIntelligenceSection />

        </div>
      </div>
    </GlobalLayout>
  );
}

function SetAsideCard({ sa }: { sa: any }) {
  const [open, setOpen] = useState(false);
  const topContractors = sa.top_contractors
    ? (typeof sa.top_contractors === 'string' ? JSON.parse(sa.top_contractors) : sa.top_contractors)
    : [];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors">
          <div>
            <p className="font-medium">{sa.set_aside}</p>
            <p className="text-xs text-muted-foreground">{Number(sa.contractor_count)} contractors · {Number(sa.contract_count)} contracts · Avg {fmt(Number(sa.avg_contract_value))}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-primary">{fmt(Number(sa.total_value))}</span>
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {topContractors.length > 0 && (
          <div className="p-3 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Top Contractors</p>
            <div className="space-y-1.5">
              {topContractors.map((tc: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="truncate max-w-[200px]">{tc.name}</span>
                  <span className="font-mono text-primary">{fmt(Number(tc.value))} ({tc.contracts})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function CompetitionIntelligenceSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['competition-intelligence'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_competition_intelligence', {
        p_naics: null, p_agency: null, p_state: null,
      });
      if (error) throw error;
      return (data as any)?.[0] || null;
    },
  });

  if (isLoading) return <Card><CardContent className="py-8"><Skeleton className="h-48" /></CardContent></Card>;
  if (!data || Number(data.total_awards) === 0) return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Competition Intelligence (FPDS)</CardTitle></CardHeader>
      <CardContent><p className="text-center text-muted-foreground py-8">Load FPDS data from the admin panel to see competition intelligence.</p></CardContent>
    </Card>
  );

  const compBreakdown = data.competition_breakdown ? Object.entries(data.competition_breakdown).map(([name, value]) => ({ name: String(name).slice(0, 25), value: Number(value) })) : [];
  const offersData = data.offers_distribution ? Object.entries(data.offers_distribution).map(([name, value]) => ({ name, value: Number(value) })) : [];

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Competition Intelligence (FPDS)</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">FPDS Awards</p>
            <p className="text-2xl font-bold">{Number(data.total_awards).toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Avg Offers</p>
            <p className="text-2xl font-bold">{data.avg_offers || '—'}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Sole Source %</p>
            <p className="text-2xl font-bold text-amber-600">{data.sole_source_pct || 0}%</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Full & Open %</p>
            <p className="text-2xl font-bold text-emerald-600">{data.full_open_pct || 0}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {compBreakdown.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Competition Type</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={compBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                      {compBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {offersData.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Offers Distribution</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={offersData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
