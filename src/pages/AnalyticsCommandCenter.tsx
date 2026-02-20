// BASED DATA - Analytics Command Center — Real computed data
import { Link } from 'react-router-dom';
import {
  BarChart3, TrendingUp, Map, Users, DollarSign, Building2,
  Activity, FileText, Award, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { useAnalyticsOverview } from '@/hooks';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#14B8A6', '#F97316', '#6366F1'];

function fmt(v: number | null) {
  if (!v) return '$0';
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export default function AnalyticsCommandCenter() {
  const { data, isLoading } = useAnalyticsOverview();

  if (isLoading) {
    return (
      <GlobalLayout>
        <div className="container py-8">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
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
            <span className="text-foreground">Analytics</span>
          </nav>
        </div>

        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="container py-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Analytics Command Center
            </h1>
            <p className="text-muted-foreground mt-1">Real-time platform intelligence computed from live data</p>
          </div>
        </div>

        <div className="container py-8 space-y-8">
          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-2"><DollarSign className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground uppercase tracking-wide">Contract Value</span></div>
              <p className="text-2xl font-bold text-primary">{fmt(data?.totalContractValue || 0)}</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-2"><Award className="h-4 w-4 text-emerald-600" /><span className="text-xs text-muted-foreground uppercase tracking-wide">Grant Value</span></div>
              <p className="text-2xl font-bold">{fmt(data?.totalGrantValue || 0)}</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-2"><Building2 className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground uppercase tracking-wide">Entities</span></div>
              <p className="text-2xl font-bold">{(data?.entityCount || 0).toLocaleString()}</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-2"><Users className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground uppercase tracking-wide">Relationships</span></div>
              <p className="text-2xl font-bold">{(data?.relationshipCount || 0).toLocaleString()}</p>
            </Card>
          </div>

          {/* Row 2: Agencies + Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-primary" />Top Agencies by Contract Value</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  {(data?.topAgencies?.length || 0) > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data!.topAgencies} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tickFormatter={v => fmt(v)} stroke="hsl(var(--muted-foreground))" />
                        <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted-foreground pt-12">No agency data available</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-primary" />Award Timeline</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  {(data?.timeline?.length || 0) > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data!.timeline}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="quarter" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tickFormatter={v => fmt(v)} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                        <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted-foreground pt-12">No timeline data available</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 3: States + NAICS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Map className="h-4 w-4 text-primary" />Geographic Distribution</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  {(data?.topStates?.length || 0) > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data!.topStates}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="state" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted-foreground pt-12">No state data available</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4 text-primary" />NAICS Sectors</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  {(data?.topNaics?.length || 0) > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie data={data!.topNaics} dataKey="count" nameKey="code" cx="50%" cy="50%" outerRadius={100} label={({ code, percent }) => `${code} (${(percent * 100).toFixed(0)}%)`}>
                          {data!.topNaics.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted-foreground pt-12">No NAICS data available</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 4: Entity Composition */}
          {(data?.entityTypes?.length || 0) > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4 text-primary" />Entity Composition</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie data={data!.entityTypes} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={100} label={({ type, percent }) => `${type} (${(percent * 100).toFixed(0)}%)`}>
                        {data!.entityTypes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </GlobalLayout>
  );
}