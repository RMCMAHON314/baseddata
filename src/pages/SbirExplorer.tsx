// BASED DATA — SBIR/STTR Innovation Explorer — BOMB-06 Rebuild
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Beaker, Search, Building2, DollarSign, Users, Award, TrendingUp, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { PageSEO } from '@/components/layout/PageSEO';
import { EntityLink } from '@/components/EntityLink';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts';

const AGENCIES = ['__all__', 'DOD', 'HHS', 'NASA', 'NSF', 'DOE', 'USDA', 'EPA', 'DOT', 'DHS', 'ED'];
const PHASES = ['__all__', 'Phase I', 'Phase II', 'Phase III'];
const STATES = ['__all__','AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
const COLORS = ['hsl(var(--primary))', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#f97316', '#ec4899'];

function fmt(v: number | null) {
  if (!v) return '$0';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export default function SbirExplorer() {
  const [agency, setAgency] = useState('__all__');
  const [state, setState] = useState('__all__');
  const [phase, setPhase] = useState('__all__');
  const [searchQuery, setSearchQuery] = useState('');

  // Hero stats — full counts
  const { data: heroStats } = useQuery({
    queryKey: ['sbir-hero-stats'],
    queryFn: async () => {
      const [sbirCount, nsfCount, sbirFunding, sbirFirms] = await Promise.all([
        supabase.from('sbir_awards').select('id', { count: 'exact', head: true }),
        supabase.from('nsf_awards').select('id', { count: 'exact', head: true }),
        supabase.from('sbir_awards').select('award_amount'),
        supabase.from('sbir_awards').select('firm'),
      ]);
      const totalFunding = sbirFunding.data?.reduce((s, a) => s + (Number(a.award_amount) || 0), 0) || 0;
      const uniqueFirms = new Set(sbirFirms.data?.map(a => a.firm)).size;
      const avgAward = sbirFunding.data?.length ? totalFunding / sbirFunding.data.length : 0;
      return {
        totalAwards: (sbirCount.count || 0) + (nsfCount.count || 0),
        sbirCount: sbirCount.count || 0,
        nsfCount: nsfCount.count || 0,
        totalFunding,
        uniqueFirms,
        avgAward,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  // Filtered SBIR results
  const { data: awards = [], isLoading } = useQuery({
    queryKey: ['sbir-results', agency, state, phase, searchQuery],
    queryFn: async () => {
      let query = supabase.from('sbir_awards').select('*').order('award_amount', { ascending: false }).limit(500);
      if (agency !== '__all__') query = query.ilike('agency', `%${agency}%`);
      if (state !== '__all__') query = query.eq('state', state);
      if (phase !== '__all__') query = query.eq('phase', phase);
      if (searchQuery.length >= 2) query = query.or(`firm.ilike.%${searchQuery}%,award_title.ilike.%${searchQuery}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Aggregations from current results
  const agencyData = (() => {
    const map = new Map<string, number>();
    for (const a of awards) if (a.agency) map.set(a.agency, (map.get(a.agency) || 0) + (Number(a.award_amount) || 0));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));
  })();

  const phaseData = (() => {
    const map = new Map<string, number>();
    for (const a of awards) map.set(a.phase || 'Unknown', (map.get(a.phase || 'Unknown') || 0) + 1);
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  })();

  const yearData = (() => {
    const map = new Map<number, number>();
    for (const a of awards) {
      const year = a.award_year || null;
      if (year) map.set(year, (map.get(year) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([year, count]) => ({ year, count }));
  })();

  // Top firms
  const firmMap = new Map<string, { firm: string; city: string; state: string; value: number; count: number; phases: Set<string>; womanOwned: boolean; hubzone: boolean }>();
  for (const a of awards) {
    const key = a.firm;
    const existing = firmMap.get(key) || { firm: key, city: a.city || '', state: a.state || '', value: 0, count: 0, phases: new Set(), womanOwned: false, hubzone: false };
    existing.value += Number(a.award_amount) || 0;
    existing.count++;
    if (a.phase) existing.phases.add(a.phase);
    if (a.women_owned === 'Y') existing.womanOwned = true;
    if (a.hubzone_owned === 'Y') existing.hubzone = true;
    firmMap.set(key, existing);
  }
  const topFirms = [...firmMap.values()].sort((a, b) => b.value - a.value).slice(0, 20);

  const topFirmsChart = topFirms.slice(0, 10).map(f => ({
    name: f.firm.length > 20 ? f.firm.slice(0, 20) + '…' : f.firm,
    value: f.value,
  }));

  return (
    <GlobalLayout>
      <PageSEO title="SBIR/STTR Innovation Explorer" description="Explore Small Business Innovation Research awards. Track SBIR/STTR grants by agency, company, and technology area." path="/sbir" />
      <div className="min-h-screen bg-background">
        {/* Hero */}
        <div className="border-b border-border bg-gradient-to-br from-card via-card to-primary/5">
          <div className="container py-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <Beaker className="h-7 w-7 text-primary" />
                  SBIR/STTR Innovation Explorer
                </h1>
                <p className="text-muted-foreground mt-1">Small Business Innovation Research & NSF awards — R&D intelligence for the innovation economy</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Total Awards Indexed', value: heroStats?.totalAwards?.toLocaleString() || '—', icon: Award },
                { label: 'Total Funding', value: fmt(heroStats?.totalFunding || 0), icon: DollarSign, highlight: true },
                { label: 'Unique Firms', value: heroStats?.uniqueFirms?.toLocaleString() || '—', icon: Building2 },
                { label: 'Avg Award Size', value: fmt(heroStats?.avgAward || 0), icon: TrendingUp },
                { label: 'NSF Awards', value: heroStats?.nsfCount?.toLocaleString() || '—', icon: Beaker },
              ].map((stat, i) => (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className={`p-4 ${stat.highlight ? 'border-primary/30 bg-primary/5' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <stat.icon className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                    </div>
                    <p className={`text-2xl font-bold ${stat.highlight ? 'text-primary' : ''}`}>{stat.value}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="container py-6 space-y-6">
          {/* Search + Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search firms, topics, keywords..." className="pl-9" />
            </div>
            <Select value={agency} onValueChange={setAgency}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Agencies" /></SelectTrigger>
              <SelectContent>{AGENCIES.map(a => <SelectItem key={a} value={a}>{a === '__all__' ? 'All Agencies' : a}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger className="w-32"><SelectValue placeholder="All States" /></SelectTrigger>
              <SelectContent>{STATES.map(s => <SelectItem key={s} value={s}>{s === '__all__' ? 'All States' : s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={phase} onValueChange={setPhase}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All Phases" /></SelectTrigger>
              <SelectContent>{PHASES.map(p => <SelectItem key={p} value={p}>{p === '__all__' ? 'All Phases' : p}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <p className="text-sm text-muted-foreground">{awards.length} results</p>

          {/* Award Cards */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36" />)}</div>
          ) : awards.length === 0 ? (
            <Card className="p-12 text-center">
              <Beaker className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Awards Found</h3>
              <p className="text-muted-foreground">Adjust your filters or search query</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {awards.slice(0, 40).map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }}>
                  <Card className="p-4 hover:border-primary/30 transition-colors h-full">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant="outline">{a.phase || '—'}</Badge>
                      <Badge className="bg-primary/10 text-primary">{a.agency || '—'}</Badge>
                      {a.women_owned === 'Y' && <Badge className="bg-pink-100 text-pink-700 text-xs">Woman-Owned</Badge>}
                      {a.hubzone_owned === 'Y' && <Badge className="bg-amber-100 text-amber-700 text-xs">HUBZone</Badge>}
                    </div>
                    <h3 className="font-semibold line-clamp-2 mb-1 text-sm">{a.award_title || 'Untitled Award'}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Building2 className="h-3.5 w-3.5" />
                      <EntityLink name={a.firm} className="hover:text-primary transition-colors" />
                      {a.state && <span>· {a.city ? `${a.city}, ` : ''}{a.state}</span>}
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
                      <span className="text-lg font-bold text-primary font-mono">{fmt(Number(a.award_amount))}</span>
                      <span className="text-xs text-muted-foreground">{a.award_year || '—'}</span>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Awards by Agency</CardTitle></CardHeader>
              <CardContent>
                {!agencyData.length ? <p className="text-center text-muted-foreground py-8">No data</p> : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={agencyData} layout="vertical">
                        <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Phase Distribution</CardTitle></CardHeader>
              <CardContent>
                {!phaseData.length ? <p className="text-center text-muted-foreground py-8">No data</p> : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={phaseData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name} (${value})`}>
                          {phaseData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Top Firms by SBIR Funding</CardTitle></CardHeader>
              <CardContent>
                {!topFirmsChart.length ? <p className="text-center text-muted-foreground py-8">No data</p> : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topFirmsChart} layout="vertical">
                        <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                        <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Awards Over Time</CardTitle></CardHeader>
              <CardContent>
                {!yearData.length ? <p className="text-center text-muted-foreground py-8">No data</p> : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={yearData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                        <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Firms Table */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" />Top Firms by Total SBIR Funding</CardTitle></CardHeader>
            <CardContent>
              {!topFirms.length ? (
                <p className="text-center text-muted-foreground py-8">No firms found</p>
              ) : (
                <div className="border rounded-lg overflow-auto max-h-[500px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted"><tr>
                      <th className="p-2 text-left font-medium">#</th>
                      <th className="p-2 text-left font-medium">Firm</th>
                      <th className="p-2 text-left font-medium hidden md:table-cell">Location</th>
                      <th className="p-2 text-left font-medium">Phases</th>
                      <th className="p-2 text-left font-medium hidden md:table-cell">Badges</th>
                      <th className="p-2 text-right font-medium">Awards</th>
                      <th className="p-2 text-right font-medium">Value</th>
                    </tr></thead>
                    <tbody>
                      {topFirms.map((f, i) => (
                        <tr key={i} className="border-t hover:bg-muted/30">
                          <td className="p-2 text-muted-foreground">{i + 1}</td>
                          <td className="p-2 font-medium max-w-[200px] truncate">
                            <EntityLink name={f.firm} className="hover:text-primary" />
                          </td>
                          <td className="p-2 text-muted-foreground hidden md:table-cell">{[f.city, f.state].filter(Boolean).join(', ')}</td>
                          <td className="p-2"><div className="flex gap-1">{[...f.phases].map(p => <Badge key={p} variant="outline" className="text-xs">{p}</Badge>)}</div></td>
                          <td className="p-2 hidden md:table-cell">
                            <div className="flex gap-1">
                              {f.womanOwned && <Badge className="bg-pink-100 text-pink-700 text-xs">W</Badge>}
                              {f.hubzone && <Badge className="bg-amber-100 text-amber-700 text-xs">HZ</Badge>}
                            </div>
                          </td>
                          <td className="p-2 text-right">{f.count}</td>
                          <td className="p-2 text-right font-mono text-primary">{fmt(f.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </GlobalLayout>
  );
}
