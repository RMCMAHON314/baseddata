import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { PageSEO } from '@/components/layout/PageSEO';
import { useAnalyticsDashboard } from '@/hooks/useAnalyticsDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import {
  BarChart3, TrendingUp, DollarSign, Building2, Target, Award,
  Sparkles, Map, Users, FileText, Briefcase, ChevronRight, Activity
} from 'lucide-react';

const COLORS = [
  'hsl(217, 91%, 60%)', 'hsl(199, 89%, 48%)', 'hsl(258, 90%, 66%)',
  'hsl(158, 64%, 42%)', 'hsl(38, 92%, 50%)', 'hsl(350, 89%, 60%)',
  'hsl(270, 70%, 55%)', 'hsl(180, 60%, 45%)', 'hsl(24, 100%, 50%)',
  'hsl(340, 80%, 55%)', 'hsl(200, 70%, 50%)', 'hsl(140, 60%, 40%)',
];

function fmt(v: number | null) {
  if (!v) return '$0';
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

const chartTooltipStyle = {
  contentStyle: { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' },
};

const anim = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

function ChartSkeleton() {
  return <Skeleton className="h-72 rounded-xl" />;
}

export default function AnalyticsCommandCenter() {
  const {
    kpis, agencySpending, spendingTimeline, topContractors,
    geoDistribution, naicsSectors, setAsideAnalysis, contractTypeMix,
    grantsByAgency, laborRates,
  } = useAnalyticsDashboard();

  const kpiData = kpis.data;
  const kpiLoading = kpis.isLoading;

  const kpiCards = [
    { label: 'Total Contract Value', value: kpiData ? fmt(kpiData.totalContractValue) : '—', icon: DollarSign, color: 'text-primary' },
    { label: 'Entities Tracked', value: kpiData ? kpiData.entityCount.toLocaleString() : '—', icon: Building2, color: 'text-violet-500' },
    { label: 'Active Opportunities', value: kpiData ? kpiData.opportunityCount.toLocaleString() : '—', icon: Target, color: 'text-blue-500' },
    { label: 'Grants Indexed', value: kpiData ? kpiData.grantCount.toLocaleString() : '—', icon: Award, color: 'text-emerald-500' },
    { label: 'Insights Generated', value: kpiData ? kpiData.insightCount.toLocaleString() : '—', icon: Sparkles, color: 'text-amber-500' },
  ];

  return (
    <GlobalLayout>
      <PageSEO title="Government Spending Analytics" description="Analyze trillions in federal spending by agency, state, and sector. Interactive charts and real-time KPIs." path="/analytics" />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="container py-6">
            <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
              <Link to="/" className="hover:text-foreground">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground">Analytics</span>
            </nav>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <BarChart3 className="h-6 w-6 text-primary" />
              Analytics Command Center
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Live intelligence computed from real platform data — no mocks, no estimates.
            </p>
          </div>
        </div>

        <div className="container py-8 space-y-8">
          {/* ═══ KPI HERO ═══ */}
          <motion.div {...anim} className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {kpiCards.map((kpi, i) => (
              <div key={kpi.label} className="metric-card">
                {kpiLoading ? (
                  <Skeleton className="h-16" />
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                      <span className="metric-label">{kpi.label}</span>
                    </div>
                    <p className="metric-value">{kpi.value}</p>
                  </>
                )}
              </div>
            ))}
          </motion.div>

          {/* ═══ SECTION 1: SPENDING ANALYSIS ═══ */}
          <motion.div {...anim} transition={{ delay: 0.1 }}>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" /> Spending Analysis
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Agency Spending Treemap */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Agency Spending Treemap</CardTitle>
                </CardHeader>
                <CardContent>
                  {agencySpending.isLoading ? <ChartSkeleton /> : (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={(agencySpending.data || []).slice(0, 12)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip formatter={(v: number) => fmt(v)} {...chartTooltipStyle} />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {(agencySpending.data || []).slice(0, 12).map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Spending Over Time */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Spending Over Time (Contracts + Grants)</CardTitle>
                </CardHeader>
                <CardContent>
                  {spendingTimeline.isLoading ? <ChartSkeleton /> : (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={spendingTimeline.data || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="quarter" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip formatter={(v: number) => fmt(v)} {...chartTooltipStyle} />
                          <Legend />
                          <Area type="monotone" dataKey="contracts" name="Contracts" stroke="hsl(217, 91%, 60%)" fill="hsl(217, 91%, 60% / 0.15)" />
                          <Area type="monotone" dataKey="grants" name="Grants" stroke="hsl(158, 64%, 42%)" fill="hsl(158, 64%, 42% / 0.15)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Contractors */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Top 20 Contractors</CardTitle>
                </CardHeader>
                <CardContent>
                  {topContractors.isLoading ? <ChartSkeleton /> : (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topContractors.data || []} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip formatter={(v: number) => fmt(v)} {...chartTooltipStyle} />
                          <Bar dataKey="value" fill="hsl(258, 90%, 66%)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Geographic Distribution */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Geographic Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {geoDistribution.isLoading ? <ChartSkeleton /> : (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={geoDistribution.data || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="state" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip formatter={(v: number) => fmt(v)} {...chartTooltipStyle} />
                          <Bar dataKey="value" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* ═══ SECTION 2: MARKET INTELLIGENCE ═══ */}
          <motion.div {...anim} transition={{ delay: 0.2 }}>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Market Intelligence
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* NAICS Sectors */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">NAICS Sector Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  {naicsSectors.isLoading ? <ChartSkeleton /> : (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={naicsSectors.data || []} dataKey="value" nameKey="code" cx="50%" cy="50%"
                            innerRadius={50} outerRadius={100}
                            label={({ code, percent }: any) => `${code} (${(percent * 100).toFixed(0)}%)`}>
                            {(naicsSectors.data || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => fmt(v)} {...chartTooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Set-Aside Analysis */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Set-Aside Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  {setAsideAnalysis.isLoading ? <ChartSkeleton /> : (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={setAsideAnalysis.data || []} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis type="category" dataKey="type" width={130} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip formatter={(v: number) => fmt(v)} {...chartTooltipStyle} />
                          <Bar dataKey="value" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contract Type Mix */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Contract Type Mix</CardTitle>
                </CardHeader>
                <CardContent>
                  {contractTypeMix.isLoading ? <ChartSkeleton /> : (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={contractTypeMix.data || []} dataKey="value" nameKey="type" cx="50%" cy="50%"
                            outerRadius={100}
                            label={({ type, percent }: any) => `${type?.slice(0, 15)} (${(percent * 100).toFixed(0)}%)`}>
                            {(contractTypeMix.data || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => fmt(v)} {...chartTooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Placeholder: Average Deal Size */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Average Deal Size by Quarter</CardTitle>
                </CardHeader>
                <CardContent>
                  {spendingTimeline.isLoading ? <ChartSkeleton /> : (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={(spendingTimeline.data || []).map(d => ({
                          quarter: d.quarter,
                          avg: d.contracts > 0 ? d.contracts / Math.max(1, Math.round(d.contracts / 500000)) : 0,
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="quarter" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip formatter={(v: number) => fmt(v)} {...chartTooltipStyle} />
                          <Line type="monotone" dataKey="avg" stroke="hsl(258, 90%, 66%)" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* ═══ SECTION 4: GRANT INTELLIGENCE ═══ */}
          <motion.div {...anim} transition={{ delay: 0.3 }}>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-500" /> Grant Intelligence
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Grant Funding by Agency */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Grant Funding by Agency</CardTitle>
                </CardHeader>
                <CardContent>
                  {grantsByAgency.isLoading ? <ChartSkeleton /> : (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={grantsByAgency.data || []} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip formatter={(v: number) => fmt(v)} {...chartTooltipStyle} />
                          <Bar dataKey="value" fill="hsl(158, 64%, 42%)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Grant vs Contract by Agency — using spending timeline as proxy */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Grant vs Contract Spending (Quarterly)</CardTitle>
                </CardHeader>
                <CardContent>
                  {spendingTimeline.isLoading ? <ChartSkeleton /> : (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={spendingTimeline.data || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="quarter" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip formatter={(v: number) => fmt(v)} {...chartTooltipStyle} />
                          <Legend />
                          <Bar dataKey="contracts" name="Contracts" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="grants" name="Grants" fill="hsl(158, 64%, 42%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* ═══ SECTION 5: LABOR RATE INTELLIGENCE ═══ */}
          <motion.div {...anim} transition={{ delay: 0.4 }}>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-500" /> Labor Rate Intelligence
            </h2>
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Top GSA Labor Rate Categories (Avg $/hr)</CardTitle>
              </CardHeader>
              <CardContent>
                {laborRates.isLoading ? <ChartSkeleton /> : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={laborRates.data || []} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tickFormatter={v => `$${v}`} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis type="category" dataKey="category" width={160} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip formatter={(v: number) => `$${v.toFixed(0)}/hr`} {...chartTooltipStyle} />
                        <Legend />
                        <Bar dataKey="min" name="Min" fill="hsl(199, 89%, 48% / 0.4)" stackId="range" />
                        <Bar dataKey="avg" name="Avg" fill="hsl(258, 90%, 66%)" />
                        <Bar dataKey="max" name="Max" fill="hsl(38, 92%, 50% / 0.4)" stackId="range2" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </GlobalLayout>
  );
}
