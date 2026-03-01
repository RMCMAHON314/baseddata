// BASED DATA - Education Intelligence Hub — BOMB-06 Rebuild
// Federal education contracts, grants, NSF university awards
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  GraduationCap, Building2, DollarSign, TrendingUp, Search,
  FileText, School, Award, Users
} from 'lucide-react';
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
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';

const EDUCATION_NAICS = ['611'];
const COLORS = ['hsl(var(--primary))', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#10b981'];

function fmt(v: number | null) {
  if (!v) return '$0';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export default function Education() {
  const [activeTab, setActiveTab] = useState('contracts');
  const [searchQuery, setSearchQuery] = useState('');

  // Hero stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['education-hero-stats'],
    queryFn: async () => {
      const [contractsRes, grantsRes, nsfRes, entitiesRes] = await Promise.all([
        supabase.from('contracts').select('award_amount').or(`naics_code.like.611%,awarding_agency.ilike.%education%`),
        supabase.from('grants').select('award_amount').or('awarding_agency.ilike.%education%,awarding_agency.ilike.%school%'),
        supabase.from('nsf_awards').select('award_amount'),
        supabase.from('core_entities').select('id', { count: 'exact', head: true }).or('canonical_name.ilike.%university%,canonical_name.ilike.%college%,canonical_name.ilike.%school%'),
      ]);
      const contractTotal = contractsRes.data?.reduce((s, c) => s + (Number(c.award_amount) || 0), 0) || 0;
      const grantTotal = grantsRes.data?.reduce((s, g) => s + (Number(g.award_amount) || 0), 0) || 0;
      const nsfTotal = nsfRes.data?.reduce((s, n) => s + (Number(n.award_amount) || 0), 0) || 0;
      return {
        totalSpending: contractTotal + grantTotal + nsfTotal,
        contractCount: contractsRes.data?.length || 0,
        grantCount: grantsRes.data?.length || 0,
        nsfCount: nsfRes.data?.length || 0,
        entitiesCount: entitiesRes.count || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  // Education contracts (K-12 + Higher Ed)
  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['education-contracts', searchQuery],
    queryFn: async () => {
      let query = supabase.from('contracts').select('id, recipient_name, recipient_entity_id, awarding_agency, award_amount, award_date, naics_code, description, set_aside_type')
        .or(`naics_code.like.611%,awarding_agency.ilike.%education%`)
        .order('award_amount', { ascending: false })
        .limit(200);
      if (searchQuery.length >= 2) query = query.or(`recipient_name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      const { data } = await query;
      return data || [];
    },
  });

  // NSF university awards
  const { data: nsfAwards = [], isLoading: nsfLoading } = useQuery({
    queryKey: ['education-nsf', searchQuery],
    queryFn: async () => {
      let query = supabase.from('nsf_awards').select('*').order('award_amount', { ascending: false }).limit(200);
      if (searchQuery.length >= 2) query = query.or(`institution_name.ilike.%${searchQuery}%,title.ilike.%${searchQuery}%`);
      const { data } = await query;
      return data || [];
    },
  });

  // Education grants
  const { data: grants = [], isLoading: grantsLoading } = useQuery({
    queryKey: ['education-grants', searchQuery],
    queryFn: async () => {
      let query = supabase.from('grants').select('id, recipient_name, recipient_entity_id, awarding_agency, award_amount, award_date, description')
        .or('awarding_agency.ilike.%education%,awarding_agency.ilike.%school%')
        .order('award_amount', { ascending: false })
        .limit(200);
      if (searchQuery.length >= 2) query = query.or(`recipient_name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      const { data } = await query;
      return data || [];
    },
  });

  // Chart: top universities by NSF funding
  const topUniversities = (() => {
    const map = new Map<string, number>();
    for (const a of nsfAwards) if (a.institution_name) map.set(a.institution_name, (map.get(a.institution_name) || 0) + (Number(a.award_amount) || 0));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name: name.length > 25 ? name.slice(0, 25) + '…' : name, value }));
  })();

  // Chart: contracts by agency
  const contractsByAgency = (() => {
    const map = new Map<string, number>();
    for (const c of contracts) if (c.awarding_agency) map.set(c.awarding_agency, (map.get(c.awarding_agency) || 0) + (Number(c.award_amount) || 0));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name: name.length > 25 ? name.slice(0, 25) + '…' : name, value }));
  })();

  // Chart: ed-tech vendors (top contract recipients)
  const topVendors = (() => {
    const map = new Map<string, { name: string; value: number; count: number }>();
    for (const c of contracts) {
      const existing = map.get(c.recipient_name) || { name: c.recipient_name, value: 0, count: 0 };
      existing.value += Number(c.award_amount) || 0;
      existing.count++;
      map.set(c.recipient_name, existing);
    }
    return [...map.values()].sort((a, b) => b.value - a.value).slice(0, 10);
  })();

  return (
    <GlobalLayout>
      <div className="min-h-screen bg-background">
        {/* Hero */}
        <div className="border-b border-border bg-gradient-to-br from-card via-card to-amber-50/30">
          <div className="container py-8">
            <h1 className="text-3xl font-bold flex items-center gap-3 mb-1">
              <GraduationCap className="h-7 w-7 text-amber-600" />
              Education Intelligence
            </h1>
            <p className="text-muted-foreground mb-6">Federal education spending, NSF university research, and SLED market intelligence</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Education Spending', value: fmt(stats?.totalSpending || 0), icon: DollarSign },
                { label: 'Education Entities', value: stats?.entitiesCount?.toLocaleString() || '—', icon: Building2 },
                { label: 'NSF Research Awards', value: stats?.nsfCount?.toLocaleString() || '—', icon: Award },
                { label: 'Education Grants', value: stats?.grantCount?.toLocaleString() || '—', icon: TrendingUp },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="p-4 border-amber-200/30">
                    <div className="flex items-center gap-2 mb-1">
                      <s.icon className="h-4 w-4 text-amber-600" />
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
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search contracts, grants, universities..." className="pl-9" />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="contracts" className="gap-2"><FileText className="h-4 w-4" />K-12 & Contracting</TabsTrigger>
              <TabsTrigger value="higher-ed" className="gap-2"><GraduationCap className="h-4 w-4" />Higher Education</TabsTrigger>
              <TabsTrigger value="grants" className="gap-2"><DollarSign className="h-4 w-4" />Education Grants</TabsTrigger>
            </TabsList>

            {/* K-12 / Contracting */}
            <TabsContent value="contracts" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Education Spending by Agency</CardTitle></CardHeader>
                  <CardContent>
                    {!contractsByAgency.length ? <p className="text-center text-muted-foreground py-8">No data</p> : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={contractsByAgency} layout="vertical">
                            <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 11 }} />
                            <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                            <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Top Ed-Tech Vendors</CardTitle></CardHeader>
                  <CardContent>
                    {!topVendors.length ? <p className="text-center text-muted-foreground py-8">No data</p> : (
                      <div className="border rounded-lg overflow-auto max-h-[260px]">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-muted"><tr>
                            <th className="p-2 text-left font-medium">#</th>
                            <th className="p-2 text-left font-medium">Vendor</th>
                            <th className="p-2 text-right font-medium">Awards</th>
                            <th className="p-2 text-right font-medium">Value</th>
                          </tr></thead>
                          <tbody>
                            {topVendors.map((v, i) => (
                              <tr key={i} className="border-t hover:bg-muted/30">
                                <td className="p-2 text-muted-foreground">{i + 1}</td>
                                <td className="p-2 font-medium truncate max-w-[200px]"><EntityLink name={v.name} className="hover:text-primary" /></td>
                                <td className="p-2 text-right">{v.count}</td>
                                <td className="p-2 text-right font-mono text-primary">{fmt(v.value)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {contractsLoading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
              ) : (
                <div className="space-y-3">
                  {contracts.slice(0, 30).map((c, i) => (
                    <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }}>
                      <Card className="p-4 hover:border-amber-300/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <Badge className="bg-amber-100 text-amber-700 text-xs">{c.awarding_agency || '—'}</Badge>
                              {c.naics_code && <Badge variant="outline" className="text-xs font-mono">{c.naics_code}</Badge>}
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

            {/* Higher Education / NSF */}
            <TabsContent value="higher-ed" className="space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-sm">Top Universities by Federal Funding (NSF)</CardTitle></CardHeader>
                <CardContent>
                  {!topUniversities.length ? <p className="text-center text-muted-foreground py-8">No data</p> : (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topUniversities} layout="vertical">
                          <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                          <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {nsfLoading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
              ) : nsfAwards.length === 0 ? (
                <Card className="p-12 text-center">
                  <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No NSF Awards Found</h3>
                  <p className="text-muted-foreground">NSF data will appear once loaded</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {nsfAwards.slice(0, 30).map((a, i) => (
                    <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }}>
                      <Card className="p-4 hover:border-violet-300/50 transition-colors h-full">
                        <Badge variant="outline" className="text-xs mb-2">{a.agency || 'NSF'}</Badge>
                        <h3 className="font-semibold line-clamp-2 text-sm mb-2">{a.title || 'Untitled'}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <Building2 className="h-3.5 w-3.5" />
                          <EntityLink name={a.institution_name || 'Unknown'} className="hover:text-primary" />
                          {a.institution_state && <span>· {a.institution_state}</span>}
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border mt-auto">
                          <span className="text-lg font-bold text-primary font-mono">{fmt(Number(a.award_amount))}</span>
                          <span className="text-xs text-muted-foreground">{a.start_date ? new Date(a.start_date).getFullYear() : '—'}</span>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Education Grants */}
            <TabsContent value="grants" className="space-y-6">
              {grantsLoading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
              ) : grants.length === 0 ? (
                <Card className="p-12 text-center">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Education Grants Found</h3>
                  <p className="text-muted-foreground">Grant data will appear once loaded</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {grants.slice(0, 30).map((g, i) => (
                    <motion.div key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }}>
                      <Card className="p-4 hover:border-amber-300/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <Badge className="bg-amber-100 text-amber-700 text-xs mb-2">{g.awarding_agency || '—'}</Badge>
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
