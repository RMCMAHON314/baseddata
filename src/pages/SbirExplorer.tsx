// BASED DATA — SBIR Innovation Explorer
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Beaker, Filter, Building2, DollarSign, Users, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const AGENCIES = ['__all__', 'DOD', 'HHS', 'NASA', 'NSF', 'DOE', 'USDA', 'EPA', 'DOT', 'DHS', 'ED'];
const PHASES = ['__all__', 'Phase I', 'Phase II', 'Phase III'];
const COLORS = ['hsl(var(--primary))', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#f97316', '#ec4899'];

function fmt(v: number | null) {
  if (!v) return '$0';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

const STATES = ['__all__','AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

export default function SbirExplorer() {
  const [agency, setAgency] = useState('__all__');
  const [state, setState] = useState('__all__');
  const [phase, setPhase] = useState('__all__');

  const { data: awards, isLoading } = useQuery({
    queryKey: ['sbir-explorer', agency, state, phase],
    queryFn: async () => {
      let query = supabase.from('sbir_awards').select('*').order('award_amount', { ascending: false }).limit(200);
      if (agency !== '__all__') query = query.ilike('agency', `%${agency}%`);
      if (state !== '__all__') query = query.eq('state', state);
      if (phase !== '__all__') query = query.eq('phase', phase);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: landscape } = useQuery({
    queryKey: ['sbir-landscape', state, agency],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_sbir_landscape', {
        p_state: state !== '__all__' ? state : null,
        p_agency: agency !== '__all__' ? agency : null,
      });
      if (error) throw error;
      return (data as any)?.[0] || null;
    },
  });

  const totalValue = awards?.reduce((s, a) => s + (Number(a.award_amount) || 0), 0) || 0;
  const avgAward = awards?.length ? totalValue / awards.length : 0;

  // Aggregate for charts
  const agencyData = (() => {
    if (!awards?.length) return [];
    const map = new Map<string, number>();
    for (const a of awards) {
      if (a.agency) map.set(a.agency, (map.get(a.agency) || 0) + (Number(a.award_amount) || 0));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  })();

  const phaseData = (() => {
    if (!awards?.length) return [];
    const map = new Map<string, number>();
    for (const a of awards) {
      const p = a.phase || 'Unknown';
      map.set(p, (map.get(p) || 0) + 1);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  })();

  const diversityStats = landscape?.diversity_stats || {};

  // Top firms
  const firmMap = new Map<string, { firm: string; city: string; state: string; value: number; count: number; phases: Set<string> }>();
  for (const a of awards || []) {
    const key = a.firm;
    const existing = firmMap.get(key) || { firm: key, city: a.city || '', state: a.state || '', value: 0, count: 0, phases: new Set() };
    existing.value += Number(a.award_amount) || 0;
    existing.count++;
    if (a.phase) existing.phases.add(a.phase);
    firmMap.set(key, existing);
  }
  const topFirms = [...firmMap.values()].sort((a, b) => b.value - a.value).slice(0, 20);

  return (
    <GlobalLayout>
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card">
          <div className="container py-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Beaker className="h-6 w-6 text-primary" />
              SBIR/STTR Innovation Explorer
            </h1>
            <p className="text-muted-foreground mt-1">Small Business Innovation Research awards — R&D intelligence</p>
          </div>
        </div>

        <div className="container py-6 space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
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

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Total Awards</p>
              <p className="text-2xl font-bold">{awards?.length || 0}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold text-primary">{fmt(totalValue)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Avg Award</p>
              <p className="text-2xl font-bold">{fmt(avgAward)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">% Woman-Owned</p>
              <p className="text-2xl font-bold">{diversityStats.women_owned_pct || 0}%</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">% HUBZone</p>
              <p className="text-2xl font-bold">{diversityStats.hubzone_pct || 0}%</p>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Agency Breakdown</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-48" /> : !agencyData.length ? (
                  <p className="text-center text-muted-foreground py-8">Load SBIR data to see charts</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={agencyData} layout="vertical">
                        <XAxis type="number" tickFormatter={v => fmt(v)} />
                        <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => fmt(v)} />
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
                {isLoading ? <Skeleton className="h-48" /> : !phaseData.length ? (
                  <p className="text-center text-muted-foreground py-8">No phase data</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={phaseData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} (${value})`}>
                          {phaseData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Firms Table */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" />Top Firms</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-48" /> : !topFirms.length ? (
                <p className="text-center text-muted-foreground py-8">Load SBIR data from the admin panel to populate this table.</p>
              ) : (
                <div className="border rounded-lg overflow-auto max-h-[500px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted"><tr>
                      <th className="p-2 text-left font-medium">#</th>
                      <th className="p-2 text-left font-medium">Firm</th>
                      <th className="p-2 text-left font-medium hidden md:table-cell">Location</th>
                      <th className="p-2 text-left font-medium">Phases</th>
                      <th className="p-2 text-right font-medium">Awards</th>
                      <th className="p-2 text-right font-medium">Value</th>
                    </tr></thead>
                    <tbody>
                      {topFirms.map((f, i) => (
                        <tr key={i} className="border-t hover:bg-muted/30">
                          <td className="p-2 text-muted-foreground">{i + 1}</td>
                          <td className="p-2 font-medium max-w-[200px] truncate">{f.firm}</td>
                          <td className="p-2 text-muted-foreground hidden md:table-cell">{[f.city, f.state].filter(Boolean).join(', ')}</td>
                          <td className="p-2">
                            <div className="flex gap-1">{[...f.phases].map(p => <Badge key={p} variant="outline" className="text-xs">{p}</Badge>)}</div>
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
