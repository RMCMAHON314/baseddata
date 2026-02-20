// BASED DATA - Agency Deep Dive Page
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Building2, ChevronRight, DollarSign, FileText, Users, BarChart3
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

function fmt(v: number | null) {
  if (!v) return '$0';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#14B8A6', '#F97316', '#6366F1'];

export default function AgencyDeepDive() {
  const { agencyName } = useParams<{ agencyName: string }>();
  const navigate = useNavigate();
  const decoded = decodeURIComponent(agencyName || '');

  // Agency stats
  const { data: agencyStats, isLoading } = useQuery({
    queryKey: ['agency-stats', decoded],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('base_and_all_options, recipient_entity_id, naics_code, award_date')
        .eq('awarding_agency', decoded)
        .limit(1000);
      
      const rows = data || [];
      const totalValue = rows.reduce((s, c) => s + (Number(c.base_and_all_options) || 0), 0);
      const uniqueVendors = new Set(rows.map(c => c.recipient_entity_id).filter(Boolean)).size;
      const uniqueNaics = new Set(rows.map(c => c.naics_code).filter(Boolean)).size;

      return { contractCount: rows.length, totalValue, vendorCount: uniqueVendors, naicsCount: uniqueNaics };
    },
    enabled: !!decoded,
  });

  // Top contractors
  const { data: topContractors } = useQuery({
    queryKey: ['agency-contractors', decoded],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('recipient_entity_id, recipient_name, base_and_all_options')
        .eq('awarding_agency', decoded)
        .not('recipient_entity_id', 'is', null)
        .limit(500);

      const map = new Map<string, { id: string; name: string; total: number; count: number }>();
      for (const c of data || []) {
        const key = c.recipient_entity_id!;
        const ex = map.get(key) || { id: key, name: c.recipient_name || 'Unknown', total: 0, count: 0 };
        ex.total += Number(c.base_and_all_options) || 0;
        ex.count++;
        map.set(key, ex);
      }
      return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 20);
    },
    enabled: !!decoded,
  });

  // NAICS breakdown
  const { data: naicsBreakdown } = useQuery({
    queryKey: ['agency-naics', decoded],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('naics_code')
        .eq('awarding_agency', decoded)
        .not('naics_code', 'is', null)
        .limit(1000);
      
      const map = new Map<string, number>();
      for (const c of data || []) {
        map.set(c.naics_code!, (map.get(c.naics_code!) || 0) + 1);
      }
      return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, value]) => ({ name, value }));
    },
    enabled: !!decoded,
  });

  // Award timeline
  const { data: timeline } = useQuery({
    queryKey: ['agency-timeline', decoded],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('award_date, base_and_all_options')
        .eq('awarding_agency', decoded)
        .not('award_date', 'is', null)
        .limit(1000);
      
      const qMap = new Map<string, number>();
      for (const c of data || []) {
        const d = new Date(c.award_date!);
        const key = `${d.getFullYear()} Q${Math.floor(d.getMonth() / 3) + 1}`;
        qMap.set(key, (qMap.get(key) || 0) + (Number(c.base_and_all_options) || 0));
      }
      return [...qMap.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, value]) => ({ name, value }));
    },
    enabled: !!decoded,
  });

  if (isLoading) {
    return (
      <GlobalLayout>
        <div className="container py-8 space-y-4">
          <Skeleton className="h-8 w-96" />
          <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          <Skeleton className="h-[400px]" />
        </div>
      </GlobalLayout>
    );
  }

  return (
    <GlobalLayout>
      <div className="min-h-screen bg-background">
        <div className="container pt-4">
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground truncate max-w-[300px]">{decoded}</span>
          </nav>
        </div>

        <div className="border-b border-border bg-card">
          <div className="container py-8">
            <h1 className="text-3xl font-bold">{decoded}</h1>
            <p className="text-muted-foreground mt-1">Federal Agency Profile</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="metric-card"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Value</p><p className="metric-value">{fmt(agencyStats?.totalValue || 0)}</p></div>
              <div className="metric-card"><p className="text-xs text-muted-foreground uppercase tracking-wider">Contracts</p><p className="metric-value">{agencyStats?.contractCount?.toLocaleString() || '0'}</p></div>
              <div className="metric-card"><p className="text-xs text-muted-foreground uppercase tracking-wider">Vendors</p><p className="metric-value">{agencyStats?.vendorCount?.toLocaleString() || '0'}</p></div>
              <div className="metric-card"><p className="text-xs text-muted-foreground uppercase tracking-wider">NAICS Codes</p><p className="metric-value">{agencyStats?.naicsCount?.toLocaleString() || '0'}</p></div>
            </div>
          </div>
        </div>

        <div className="container py-8">
          <Tabs defaultValue="contractors">
            <TabsList>
              <TabsTrigger value="contractors">Top Contractors</TabsTrigger>
              <TabsTrigger value="naics">NAICS Breakdown</TabsTrigger>
              <TabsTrigger value="timeline">Award Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="contractors" className="mt-6">
              {!topContractors?.length ? (
                <Card className="p-8 text-center text-muted-foreground">No contractor data available.</Card>
              ) : (
                <div className="space-y-6">
                  <Card className="p-4">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topContractors.slice(0, 10)} layout="vertical">
                          <XAxis type="number" tickFormatter={v => fmt(v)} />
                          <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: number) => fmt(v)} />
                          <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                  <div className="space-y-2">
                    {topContractors.map((c, i) => (
                      <Card key={c.id} className="p-3 hover:border-primary/30 cursor-pointer transition-all" onClick={() => navigate(`/entity/${c.id}`)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-mono text-muted-foreground w-6">#{i + 1}</span>
                            <span className="font-medium">{c.name}</span>
                            <Badge variant="secondary" className="text-xs">{c.count} contracts</Badge>
                          </div>
                          <span className="font-mono font-semibold text-primary">{fmt(c.total)}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="naics" className="mt-6">
              {!naicsBreakdown?.length ? (
                <Card className="p-8 text-center text-muted-foreground">No NAICS data available.</Card>
              ) : (
                <Card className="p-6">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={naicsBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                          {naicsBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="mt-6">
              {!timeline?.length ? (
                <Card className="p-8 text-center text-muted-foreground">No timeline data available.</Card>
              ) : (
                <Card className="p-6">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timeline}>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={v => fmt(v)} />
                        <Tooltip formatter={(v: number) => fmt(v)} />
                        <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </GlobalLayout>
  );
}
