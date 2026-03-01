// BOMB-02 — Grants Tab V2: With trend chart, agency breakdown, pagination
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Award, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { fmt, fmtDate } from '@/pages/EntityIntelligenceHub';

const PAGE_SIZE = 25;
const COLORS = ['hsl(var(--primary))', 'hsl(158 64% 42%)', 'hsl(38 92% 50%)', 'hsl(350 89% 60%)', 'hsl(258 90% 66%)', 'hsl(199 89% 48%)'];

interface Props { entityId: string; }

export function EntityGrantsTabV2({ entityId }: Props) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['entity-grants-v2', entityId, page],
    queryFn: async () => {
      const { data, count } = await supabase
        .from('grants')
        .select('*', { count: 'exact' })
        .eq('recipient_entity_id', entityId)
        .order('award_amount', { ascending: false, nullsFirst: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      return { rows: data || [], total: count || 0 };
    },
  });

  // Agency pie chart
  const { data: agencyData } = useQuery({
    queryKey: ['entity-grants-agency', entityId],
    queryFn: async () => {
      const { data } = await supabase
        .from('grants')
        .select('awarding_agency, award_amount')
        .eq('recipient_entity_id', entityId);
      if (!data?.length) return [];
      const map: Record<string, number> = {};
      for (const g of data) {
        const agency = g.awarding_agency || 'Unknown';
        map[agency] = (map[agency] || 0) + (Number(g.award_amount) || 0);
      }
      return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));
    },
  });

  // Trend over time
  const { data: trendData } = useQuery({
    queryKey: ['entity-grants-trend', entityId],
    queryFn: async () => {
      const { data } = await supabase
        .from('grants')
        .select('award_date, award_amount')
        .eq('recipient_entity_id', entityId)
        .not('award_date', 'is', null)
        .order('award_date', { ascending: true });
      if (!data?.length) return [];
      const years: Record<string, number> = {};
      for (const g of data) {
        const y = new Date(g.award_date!).getFullYear().toString();
        years[y] = (years[y] || 0) + (Number(g.award_amount) || 0);
      }
      return Object.entries(years).map(([year, value]) => ({ year, value }));
    },
  });

  const filtered = (data?.rows || []).filter(g =>
    !search || g.description?.toLowerCase().includes(search.toLowerCase()) || g.awarding_agency?.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = (data?.rows || []).reduce((sum, g) => sum + (Number(g.award_amount) || 0), 0);

  if (isLoading) return <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;
  if (!data?.total) return <EmptyTab icon={Award} title="No grants found" desc="This entity may not have federal grant records." />;

  return (
    <div className="space-y-6">
      {/* Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {trendData && trendData.length > 1 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Award Trend Over Time</CardTitle></CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Area type="monotone" dataKey="value" stroke="hsl(158 64% 42%)" fill="hsl(158 64% 42% / 0.2)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader><CardTitle className="text-base">Grant Summary</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-secondary/50"><p className="text-sm text-muted-foreground">Total Grant Value</p><p className="text-2xl font-bold text-primary">{fmt(totalValue)}</p></div>
            <div className="p-4 rounded-xl bg-secondary/50"><p className="text-sm text-muted-foreground">Grant Count</p><p className="text-2xl font-bold">{data.total}</p></div>
            <div className="p-4 rounded-xl bg-secondary/50"><p className="text-sm text-muted-foreground">Avg Grant Size</p><p className="text-2xl font-bold">{fmt(totalValue / data.total)}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Search + list */}
      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search grants..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <span className="text-sm text-muted-foreground">{data.total} grants</span>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-muted/50 text-left">
            <th className="p-3 font-medium">Date</th>
            <th className="p-3 font-medium">Funding Agency</th>
            <th className="p-3 font-medium hidden md:table-cell">CFDA</th>
            <th className="p-3 font-medium hidden md:table-cell">Project</th>
            <th className="p-3 font-medium text-right">Amount</th>
          </tr></thead>
          <tbody>
            {filtered.map(g => (
              <tr key={g.id} className="border-t hover:bg-muted/30">
                <td className="p-3 whitespace-nowrap">{fmtDate(g.award_date)}</td>
                <td className="p-3 max-w-[180px] truncate">{g.awarding_agency || '—'}</td>
                <td className="p-3 hidden md:table-cell font-mono text-xs">{g.cfda_number || '—'}</td>
                <td className="p-3 max-w-[280px] truncate hidden md:table-cell text-muted-foreground">{g.project_title || g.description || '—'}</td>
                <td className="p-3 text-right font-mono font-semibold text-primary">{fmt(Number(g.award_amount))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.total)} of {data.total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= data.total}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyTab({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return <div className="text-center py-12"><Icon className="h-12 w-12 mx-auto text-muted-foreground mb-3" /><h3 className="font-semibold mb-1">{title}</h3><p className="text-sm text-muted-foreground max-w-sm mx-auto">{desc}</p></div>;
}
