// BASED DATA - Agency Deep Dive — Real data via unified hooks
import { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Building2, ChevronRight, ArrowLeft
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { useAgencyDetail, useAgencyTopContractors } from '@/hooks';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid
} from 'recharts';

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

  const { data: agencyData, isLoading } = useAgencyDetail(decoded);
  const { data: topContractors } = useAgencyTopContractors(decoded);

  // NAICS breakdown from contracts
  const naicsBreakdown = useMemo(() => {
    if (!agencyData?.contracts) return [];
    const map = new Map<string, { count: number; value: number }>();
    for (const c of agencyData.contracts) {
      if (c.naics_code) {
        const ex = map.get(c.naics_code) || { count: 0, value: 0 };
        ex.count++;
        ex.value += Number(c.award_amount) || 0;
        map.set(c.naics_code, ex);
      }
    }
    return [...map.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([name, d]) => ({ name, count: d.count, value: d.value }));
  }, [agencyData]);

  // Award timeline from contracts
  const timeline = useMemo(() => {
    if (!agencyData?.contracts) return [];
    const qMap = new Map<string, number>();
    for (const c of agencyData.contracts) {
      if (c.award_date) {
        const d = new Date(c.award_date);
        const key = `${d.getFullYear()} Q${Math.floor(d.getMonth() / 3) + 1}`;
        qMap.set(key, (qMap.get(key) || 0) + (Number(c.award_amount) || 0));
      }
    }
    return [...qMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, value]) => ({ name, value }));
  }, [agencyData]);

  const maxContractorValue = topContractors?.[0]?.totalValue || 1;

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

  if (!agencyData || agencyData.contractCount === 0) {
    return (
      <GlobalLayout>
        <div className="container py-16 text-center">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">No Contracts Found</h1>
          <p className="text-muted-foreground mb-6">No contracts found for "{decoded}". It may be spelled differently in the database.</p>
          <Link to="/explore"><Button>Back to Explorer</Button></Link>
        </div>
      </GlobalLayout>
    );
  }

  return (
    <GlobalLayout>
      <div className="min-h-screen bg-background">
        {/* Breadcrumb */}
        <div className="container pt-4">
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/explore" className="hover:text-foreground">Explore</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground truncate max-w-[300px]">{decoded}</span>
          </nav>
        </div>

        {/* Hero */}
        <div className="border-b border-border bg-card">
          <div className="container py-8">
            <Link to="/explore" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="h-4 w-4" />Back to Explore
            </Link>
            <h1 className="text-3xl font-bold">{decoded}</h1>
            <p className="text-muted-foreground mt-1">Federal Agency Profile</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <Card className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Total Value</p><p className="text-2xl font-bold text-primary mt-1">{fmt(agencyData.totalValue)}</p></Card>
              <Card className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Contracts</p><p className="text-2xl font-bold mt-1">{agencyData.contractCount.toLocaleString()}</p></Card>
              <Card className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">Vendors</p><p className="text-2xl font-bold mt-1">{agencyData.vendorCount.toLocaleString()}</p></Card>
              <Card className="p-4"><p className="text-xs text-muted-foreground uppercase tracking-wider">NAICS Codes</p><p className="text-2xl font-bold mt-1">{agencyData.naicsCount.toLocaleString()}</p></Card>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="container py-8">
          <Tabs defaultValue="contractors">
            <TabsList>
              <TabsTrigger value="contractors">Top Contractors</TabsTrigger>
              <TabsTrigger value="naics">NAICS Breakdown</TabsTrigger>
              <TabsTrigger value="timeline">Award Timeline</TabsTrigger>
            </TabsList>

            {/* Top Contractors */}
            <TabsContent value="contractors" className="mt-6">
              {!topContractors?.length ? (
                <Card className="p-8 text-center text-muted-foreground">No contractor data available.</Card>
              ) : (
                <div className="space-y-2">
                  {topContractors.map((c, i) => (
                    <Card key={c.id} className="p-3 hover:border-primary/30 cursor-pointer transition-all" onClick={() => navigate(`/entity/${c.id}`)}>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-muted-foreground w-6 shrink-0">#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium truncate">{c.canonical_name}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant="secondary" className="text-xs">{c.contractCount} contracts</Badge>
                              <span className="font-mono font-semibold text-primary">{fmt(c.totalValue)}</span>
                            </div>
                          </div>
                          {/* Proportional bar */}
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(c.totalValue / maxContractorValue) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* NAICS */}
            <TabsContent value="naics" className="mt-6">
              {!naicsBreakdown.length ? (
                <Card className="p-8 text-center text-muted-foreground">No NAICS data available.</Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="p-6">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={naicsBreakdown} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={120} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                            {naicsBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: number, name: string, props: any) => [v, props.payload.name]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                  <Card className="p-6">
                    <h3 className="font-semibold mb-3 text-sm">NAICS Code Detail</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead><tr className="bg-muted/50"><th className="p-2 text-left font-medium">NAICS</th><th className="p-2 text-right font-medium">Count</th><th className="p-2 text-right font-medium">Value</th></tr></thead>
                        <tbody>
                          {naicsBreakdown.map((n, i) => (
                            <tr key={n.name} className="border-t">
                              <td className="p-2 flex items-center gap-2"><span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />{n.name}</td>
                              <td className="p-2 text-right">{n.count}</td>
                              <td className="p-2 text-right font-mono text-primary">{fmt(n.value)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Timeline */}
            <TabsContent value="timeline" className="mt-6">
              {!timeline.length ? (
                <Card className="p-8 text-center text-muted-foreground">No timeline data available.</Card>
              ) : (
                <Card className="p-6">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timeline}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tickFormatter={v => fmt(v)} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                        <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" />
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