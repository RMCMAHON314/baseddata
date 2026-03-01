// BASED DATA - Healthcare Intelligence Hub — BOMB-06 Rebuild
// Clinical Trials + Healthcare Contracts + Healthcare Grants
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  FlaskConical, Stethoscope, Activity, Search, ExternalLink,
  Users, Calendar, Building2, DollarSign, TrendingUp, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { EntityLink } from '@/components/EntityLink';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const HEALTHCARE_NAICS = ['621', '622', '623', '624'];
const HEALTHCARE_AGENCIES = ['HHS', 'VA', 'DOD', 'CDC', 'NIH'];
const COLORS = ['hsl(var(--primary))', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#f97316', '#ec4899'];

const STATUS_COLORS: Record<string, string> = {
  'Recruiting': 'bg-emerald-100 text-emerald-700',
  'Active, not recruiting': 'bg-blue-100 text-blue-700',
  'Completed': 'bg-secondary text-secondary-foreground',
  'Terminated': 'bg-destructive/10 text-destructive',
};

function fmt(v: number | null) {
  if (!v) return '$0';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export default function Healthcare() {
  const [activeTab, setActiveTab] = useState('contracts');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [phaseFilter, setPhaseFilter] = useState('all');

  // Hero stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['healthcare-hero-stats'],
    queryFn: async () => {
      const [contractsRes, trialsRes, grantsRes, entitiesRes] = await Promise.all([
        supabase.from('contracts').select('award_amount').or(HEALTHCARE_NAICS.map(n => `naics_code.like.${n}%`).join(',')),
        supabase.from('clinical_trials').select('id', { count: 'exact', head: true }),
        supabase.from('grants').select('award_amount').or('awarding_agency.ilike.%health%,awarding_agency.ilike.%hhs%,awarding_agency.ilike.%nih%,awarding_agency.ilike.%cdc%'),
        supabase.from('core_entities').select('id', { count: 'exact', head: true }).overlaps('naics_codes', HEALTHCARE_NAICS),
      ]);
      const contractTotal = contractsRes.data?.reduce((s, c) => s + (Number(c.award_amount) || 0), 0) || 0;
      const grantTotal = grantsRes.data?.reduce((s, g) => s + (Number(g.award_amount) || 0), 0) || 0;
      return {
        contractTotal,
        trialsCount: trialsRes.count || 0,
        grantTotal,
        grantCount: grantsRes.data?.length || 0,
        entitiesCount: entitiesRes.count || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  // Healthcare contracts
  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['healthcare-contracts', searchQuery],
    queryFn: async () => {
      let query = supabase.from('contracts').select('id, recipient_name, recipient_entity_id, awarding_agency, award_amount, award_date, naics_code, naics_description, description, set_aside_type')
        .or(HEALTHCARE_NAICS.map(n => `naics_code.like.${n}%`).join(','))
        .order('award_amount', { ascending: false })
        .limit(200);
      if (searchQuery.length >= 2) query = query.or(`recipient_name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      const { data } = await query;
      return data || [];
    },
  });

  // Clinical trials
  const { data: trials = [], isLoading: trialsLoading } = useQuery({
    queryKey: ['healthcare-trials', statusFilter, phaseFilter, searchQuery],
    queryFn: async () => {
      let query = supabase.from('clinical_trials').select('*').order('enrollment', { ascending: false, nullsFirst: false }).limit(200);
      if (statusFilter !== 'all') query = query.eq('overall_status', statusFilter);
      if (phaseFilter !== 'all') query = query.eq('phase', phaseFilter);
      if (searchQuery.length >= 2) query = query.or(`title.ilike.%${searchQuery}%,lead_sponsor_name.ilike.%${searchQuery}%`);
      const { data } = await query;
      return data || [];
    },
  });

  // Healthcare grants
  const { data: grants = [], isLoading: grantsLoading } = useQuery({
    queryKey: ['healthcare-grants', searchQuery],
    queryFn: async () => {
      let query = supabase.from('grants').select('id, recipient_name, recipient_entity_id, awarding_agency, award_amount, award_date, description, cfda_number')
        .or('awarding_agency.ilike.%health%,awarding_agency.ilike.%hhs%,awarding_agency.ilike.%nih%,awarding_agency.ilike.%cdc%')
        .order('award_amount', { ascending: false })
        .limit(200);
      if (searchQuery.length >= 2) query = query.or(`recipient_name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      const { data } = await query;
      return data || [];
    },
  });

  // Chart: contracts by agency
  const contractsByAgency = (() => {
    const map = new Map<string, number>();
    for (const c of contracts) if (c.awarding_agency) map.set(c.awarding_agency, (map.get(c.awarding_agency) || 0) + (Number(c.award_amount) || 0));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name: name.length > 25 ? name.slice(0, 25) + '…' : name, value }));
  })();

  // Chart: trials by phase
  const trialsByPhase = (() => {
    const map = new Map<string, number>();
    for (const t of trials) map.set(t.phase || 'Unknown', (map.get(t.phase || 'Unknown') || 0) + 1);
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  })();

  // Chart: trials by status
  const trialsByStatus = (() => {
    const map = new Map<string, number>();
    for (const t of trials) map.set(t.overall_status || 'Unknown', (map.get(t.overall_status || 'Unknown') || 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));
  })();

  // Chart: grants by agency
  const grantsByAgency = (() => {
    const map = new Map<string, number>();
    for (const g of grants) if (g.awarding_agency) map.set(g.awarding_agency, (map.get(g.awarding_agency) || 0) + (Number(g.award_amount) || 0));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name: name.length > 25 ? name.slice(0, 25) + '…' : name, value }));
  })();

  return (
    <GlobalLayout>
      <div className="min-h-screen bg-background">
        {/* Hero */}
        <div className="border-b border-border bg-gradient-to-br from-card via-card to-emerald-50/30">
          <div className="container py-8">
            <h1 className="text-3xl font-bold flex items-center gap-3 mb-1">
              <Stethoscope className="h-7 w-7 text-emerald-600" />
              Healthcare Intelligence
            </h1>
            <p className="text-muted-foreground mb-6">Healthcare contracting, clinical trials, and grants intelligence</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Healthcare Contracts', value: fmt(stats?.contractTotal || 0), icon: DollarSign },
                { label: 'Clinical Trials', value: stats?.trialsCount?.toLocaleString() || '—', icon: FlaskConical },
                { label: 'Healthcare Grants', value: fmt(stats?.grantTotal || 0), icon: TrendingUp },
                { label: 'Healthcare Entities', value: stats?.entitiesCount?.toLocaleString() || '—', icon: Building2 },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="p-4 border-emerald-200/30">
                    <div className="flex items-center gap-2 mb-1">
                      <s.icon className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs text-muted-foreground">{s.label}</span>
                    </div>
                    <p className="text-2xl font-bold">{statsLoading ? '—' : s.value}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="container py-6 space-y-6">
          {/* Search */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search contracts, trials, sponsors..." className="pl-9" />
            </div>
            {activeTab === 'trials' && (
              <>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Recruiting">Recruiting</SelectItem>
                    <SelectItem value="Active, not recruiting">Active</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={phaseFilter} onValueChange={setPhaseFilter}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Phase" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Phases</SelectItem>
                    <SelectItem value="Phase 1">Phase 1</SelectItem>
                    <SelectItem value="Phase 2">Phase 2</SelectItem>
                    <SelectItem value="Phase 3">Phase 3</SelectItem>
                    <SelectItem value="Phase 4">Phase 4</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="contracts" className="gap-2"><FileText className="h-4 w-4" />Healthcare Contracting</TabsTrigger>
              <TabsTrigger value="trials" className="gap-2"><FlaskConical className="h-4 w-4" />Clinical Trials</TabsTrigger>
              <TabsTrigger value="grants" className="gap-2"><DollarSign className="h-4 w-4" />Healthcare Grants</TabsTrigger>
            </TabsList>

            {/* Healthcare Contracting */}
            <TabsContent value="contracts" className="space-y-6">
              {/* Agency chart */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Top Healthcare Agencies by Spend</CardTitle></CardHeader>
                <CardContent>
                  {!contractsByAgency.length ? <p className="text-center text-muted-foreground py-8">No data</p> : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={contractsByAgency} layout="vertical">
                          <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                          <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contract cards */}
              {contractsLoading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
              ) : (
                <div className="space-y-3">
                  {contracts.slice(0, 30).map((c, i) => (
                    <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }}>
                      <Card className="p-4 hover:border-emerald-300/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <Badge className="bg-emerald-100 text-emerald-700 text-xs">{c.awarding_agency || '—'}</Badge>
                              {c.naics_code && <Badge variant="outline" className="text-xs font-mono">{c.naics_code}</Badge>}
                              {c.set_aside_type && <Badge variant="secondary" className="text-xs">{c.set_aside_type}</Badge>}
                            </div>
                            <p className="text-sm line-clamp-2 mb-1">{c.description || 'No description'}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Building2 className="h-3.5 w-3.5" />
                              <EntityLink name={c.recipient_name} id={c.recipient_entity_id || undefined} className="hover:text-primary" />
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold text-primary font-mono">{fmt(Number(c.award_amount))}</p>
                            <p className="text-xs text-muted-foreground">{c.award_date ? new Date(c.award_date).toLocaleDateString() : '—'}</p>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Clinical Trials */}
            <TabsContent value="trials" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Trials by Phase</CardTitle></CardHeader>
                  <CardContent>
                    {!trialsByPhase.length ? <p className="text-center text-muted-foreground py-8">No data</p> : (
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart><Pie data={trialsByPhase} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} (${value})`}>
                            {trialsByPhase.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie><Tooltip /></PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Trials by Status</CardTitle></CardHeader>
                  <CardContent>
                    {!trialsByStatus.length ? <p className="text-center text-muted-foreground py-8">No data</p> : (
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={trialsByStatus}>
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                            <Bar dataKey="value" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {trialsLoading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
              ) : trials.length === 0 ? (
                <Card className="p-12 text-center">
                  <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Trials Found</h3>
                  <p className="text-muted-foreground">Adjust filters</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {trials.slice(0, 30).map((trial, i) => (
                    <motion.div key={trial.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }}>
                      <Card className="p-4 hover:border-emerald-300/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge className={STATUS_COLORS[trial.overall_status || ''] || 'bg-secondary text-secondary-foreground'}>{trial.overall_status || 'Unknown'}</Badge>
                              {trial.phase && <Badge variant="outline">{trial.phase}</Badge>}
                              <span className="text-xs font-mono text-muted-foreground">{trial.nct_id}</span>
                            </div>
                            <h3 className="font-semibold line-clamp-2 mb-2">{trial.title}</h3>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-2">
                              <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{trial.lead_sponsor_name || 'Unknown'}</span>
                              {trial.enrollment && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{trial.enrollment.toLocaleString()} enrolled</span>}
                              {trial.start_date && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Started {new Date(trial.start_date).toLocaleDateString()}</span>}
                            </div>
                            {trial.conditions?.length > 0 && (
                              <div className="flex flex-wrap gap-1">{trial.conditions.slice(0, 4).map((c, j) => <Badge key={j} variant="outline" className="text-xs">{c}</Badge>)}</div>
                            )}
                          </div>
                          {trial.url && (
                            <a href={trial.url} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="icon"><ExternalLink className="h-4 w-4" /></Button></a>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Healthcare Grants */}
            <TabsContent value="grants" className="space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-sm">Grant Funding by Agency</CardTitle></CardHeader>
                <CardContent>
                  {!grantsByAgency.length ? <p className="text-center text-muted-foreground py-8">No data</p> : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={grantsByAgency} layout="vertical">
                          <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                          <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {grantsLoading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
              ) : grants.length === 0 ? (
                <Card className="p-12 text-center">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Healthcare Grants Found</h3>
                  <p className="text-muted-foreground">Grant data will appear here once loaded</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {grants.slice(0, 30).map((g, i) => (
                    <motion.div key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }}>
                      <Card className="p-4 hover:border-violet-300/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <Badge className="bg-violet-100 text-violet-700 text-xs mb-2">{g.awarding_agency || '—'}</Badge>
                            <p className="text-sm line-clamp-2 mb-1">{g.description || 'No description'}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Building2 className="h-3.5 w-3.5" />
                              <EntityLink name={g.recipient_name} id={g.recipient_entity_id || undefined} className="hover:text-primary" />
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold text-primary font-mono">{fmt(Number(g.award_amount))}</p>
                            <p className="text-xs text-muted-foreground">{g.award_date ? new Date(g.award_date).toLocaleDateString() : '—'}</p>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </GlobalLayout>
  );
}
