// BASED DATA - Analytics Command Center
// Executive dashboard with deep analytics
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, Map, PieChart, Users, DollarSign, Building2,
  Activity, Zap, Target, FileText, Award, RefreshCw, ChevronDown, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { PredictiveCalendar } from '@/components/analytics/PredictiveCalendar';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, 
  PieChart as RechartsPie, Pie, Cell, Treemap, ScatterChart, Scatter, ZAxis
} from 'recharts';

interface Metrics {
  totalEntities: number;
  totalContracts: number;
  totalGrants: number;
  totalValue: number;
  totalRelationships: number;
  totalFacts: number;
  activeOpportunities: number;
  dataFreshness: number;
}

interface TrendData {
  month: string;
  contracts: number;
  grants: number;
  value: number;
}

interface StateData {
  state: string;
  value: number;
  count: number;
}

interface AgencyData {
  agency: string;
  value: number;
  contracts: number;
}

interface NAICSData {
  code: string;
  name: string;
  value: number;
  size: number;
}

interface ScatterPoint {
  name: string;
  contractCount: number;
  totalValue: number;
  opportunityScore: number;
}

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#14B8A6'];

export default function AnalyticsCommandCenter() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [stateData, setStateData] = useState<StateData[]>([]);
  const [agencyData, setAgencyData] = useState<AgencyData[]>([]);
  const [naicsData, setNaicsData] = useState<NAICSData[]>([]);
  const [scatterData, setScatterData] = useState<ScatterPoint[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<string>('all');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadMetrics(),
      loadTrendData(),
      loadStateData(),
      loadAgencyData(),
      loadNAICSData(),
      loadScatterData(),
    ]);
    setLoading(false);
  };

  const loadMetrics = async () => {
    const [entities, contracts, grants, relationships, facts, opportunities] = await Promise.all([
      supabase.from('core_entities').select('*', { count: 'exact', head: true }),
      supabase.from('contracts').select('award_amount'),
      supabase.from('grants').select('award_amount'),
      supabase.from('core_relationships').select('*', { count: 'exact', head: true }),
      supabase.from('core_facts').select('*', { count: 'exact', head: true }),
      supabase.from('opportunities').select('*', { count: 'exact', head: true }).eq('is_active', true),
    ]);

    const totalContractValue = (contracts.data || []).reduce((sum, c) => sum + (c.award_amount || 0), 0);
    const totalGrantValue = (grants.data || []).reduce((sum, g) => sum + (g.award_amount || 0), 0);

    setMetrics({
      totalEntities: entities.count || 0,
      totalContracts: contracts.data?.length || 0,
      totalGrants: grants.data?.length || 0,
      totalValue: totalContractValue + totalGrantValue,
      totalRelationships: relationships.count || 0,
      totalFacts: facts.count || 0,
      activeOpportunities: opportunities.count || 0,
      dataFreshness: 94, // Mock - would calculate from actual data age
    });
  };

  const loadTrendData = async () => {
    // Generate mock trend data - would aggregate from real data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = months.map((month, i) => ({
      month,
      contracts: Math.floor(Math.random() * 500) + 200 + i * 20,
      grants: Math.floor(Math.random() * 200) + 50 + i * 10,
      value: Math.floor(Math.random() * 50) + 20 + i * 5,
    }));
    setTrendData(data);
  };

  const loadStateData = async () => {
    const { data } = await supabase
      .from('core_entities')
      .select('state, total_contract_value')
      .not('state', 'is', null)
      .limit(1000);

    if (data) {
      const stateMap = data.reduce((acc, e) => {
        if (e.state) {
          if (!acc[e.state]) acc[e.state] = { value: 0, count: 0 };
          acc[e.state].value += e.total_contract_value || 0;
          acc[e.state].count += 1;
        }
        return acc;
      }, {} as Record<string, { value: number; count: number }>);

      const states = Object.entries(stateMap)
        .map(([state, data]) => ({ state, ...data }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 15);
      
      setStateData(states);
    }
  };

  const loadAgencyData = async () => {
    const { data } = await supabase
      .from('contracts')
      .select('awarding_agency, award_amount')
      .not('awarding_agency', 'is', null)
      .limit(1000);

    if (data) {
      const agencyMap = data.reduce((acc, c) => {
        const agency = c.awarding_agency || 'Unknown';
        if (!acc[agency]) acc[agency] = { value: 0, contracts: 0 };
        acc[agency].value += c.award_amount || 0;
        acc[agency].contracts += 1;
        return acc;
      }, {} as Record<string, { value: number; contracts: number }>);

      const agencies = Object.entries(agencyMap)
        .map(([agency, data]) => ({ agency, ...data }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
      
      setAgencyData(agencies);
    }
  };

  const loadNAICSData = async () => {
    const { data } = await supabase
      .from('core_entities')
      .select('naics_codes, total_contract_value')
      .not('naics_codes', 'is', null)
      .limit(500);

    if (data) {
      const naicsMap = data.reduce((acc, e) => {
        (e.naics_codes || []).forEach((code: string) => {
          if (!acc[code]) acc[code] = 0;
          acc[code] += e.total_contract_value || 0;
        });
        return acc;
      }, {} as Record<string, number>);

      const naics = Object.entries(naicsMap)
        .map(([code, value]) => ({
          code,
          name: code,
          value: value as number,
          size: value as number,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 20);
      
      setNaicsData(naics);
    }
  };

  const loadScatterData = async () => {
    const { data } = await supabase
      .from('core_entities')
      .select('canonical_name, contract_count, total_contract_value, opportunity_score')
      .gt('total_contract_value', 1000000)
      .limit(100);

    if (data) {
      const scatter = data.map(e => ({
        name: e.canonical_name.slice(0, 20),
        contractCount: e.contract_count || 0,
        totalValue: e.total_contract_value || 0,
        opportunityScore: e.opportunity_score || 50,
      }));
      setScatterData(scatter);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <GlobalLayout>
        <div className="container py-8">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </GlobalLayout>
    );
  }

  return (
    <GlobalLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="container py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-primary" />
                  Analytics Command Center
                </h1>
                <p className="text-muted-foreground">Executive intelligence dashboard</p>
              </div>
              <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        <div className="container py-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <MetricCard
              icon={DollarSign}
              label="Total Indexed Value"
              value={formatCurrency(metrics?.totalValue || 0)}
              trend="+12.3%"
              variant="primary"
            />
            <MetricCard
              icon={Building2}
              label="Entities Tracked"
              value={metrics?.totalEntities.toLocaleString() || '0'}
              trend="+5.2%"
            />
            <MetricCard
              icon={Target}
              label="Active Opportunities"
              value={metrics?.activeOpportunities.toString() || '0'}
              variant="hot"
            />
            <MetricCard
              icon={Activity}
              label="Data Freshness"
              value={`${metrics?.dataFreshness || 0}%`}
              variant="success"
            />
          </div>

          {/* Main Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Spending Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Federal Spending Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="colorContracts" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorGrants" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Legend />
                      <Area type="monotone" dataKey="contracts" stroke="#3B82F6" fill="url(#colorContracts)" name="Contracts" />
                      <Area type="monotone" dataKey="grants" stroke="#10B981" fill="url(#colorGrants)" name="Grants" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Agency Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-primary" />
                  Agency Spending Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={agencyData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ agency, percent }) => `${agency.slice(0, 12)}... (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {agencyData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Second Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* State Breakdown */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5 text-primary" />
                  Geographic Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stateData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} stroke="hsl(var(--muted-foreground))" />
                      <YAxis type="category" dataKey="state" width={40} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <QuickStat
                  icon={FileText}
                  label="Contracts"
                  value={metrics?.totalContracts.toLocaleString() || '0'}
                />
                <QuickStat
                  icon={Award}
                  label="Grants"
                  value={metrics?.totalGrants.toLocaleString() || '0'}
                />
                <QuickStat
                  icon={Users}
                  label="Relationships"
                  value={metrics?.totalRelationships.toLocaleString() || '0'}
                />
                <QuickStat
                  icon={Zap}
                  label="Facts"
                  value={metrics?.totalFacts.toLocaleString() || '0'}
                />
              </CardContent>
            </Card>
          </div>

          {/* Competitive Landscape */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Competitive Landscape
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      type="number" 
                      dataKey="contractCount" 
                      name="Contract Count" 
                      stroke="hsl(var(--muted-foreground))"
                      label={{ value: 'Contract Count', position: 'bottom' }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="totalValue" 
                      name="Total Value"
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(v) => formatCurrency(v)}
                      label={{ value: 'Total Value', angle: -90, position: 'left' }}
                    />
                    <ZAxis type="number" dataKey="opportunityScore" range={[50, 400]} />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      formatter={(value: number, name: string) => 
                        name === 'Total Value' ? formatCurrency(value) : value
                      }
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Scatter name="Entities" data={scatterData} fill="hsl(var(--primary))" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-8 mt-4 text-sm text-muted-foreground">
                <span>📍 Bottom-Left: Emerging Players</span>
                <span>📍 Top-Right: Market Leaders</span>
                <span>📍 Size = Opportunity Score</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Predictive Analytics Section */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Predictive Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PredictiveCalendar />
            </CardContent>
          </Card>
        </div>
      </div>
    </GlobalLayout>
  );
}

// Metric Card Component
interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  trend?: string;
  variant?: 'default' | 'primary' | 'success' | 'hot';
}

function MetricCard({ icon: Icon, label, value, trend, variant = 'default' }: MetricCardProps) {
  const variantClasses = {
    default: 'metric-card',
    primary: 'metric-card border-primary/30',
    success: 'metric-card border-emerald-300',
    hot: 'metric-card metric-hot',
  };

  return (
    <motion.div
      className={variantClasses[variant]}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className="h-5 w-5 text-muted-foreground" />
        {trend && (
          <span className="text-xs text-emerald-600 font-medium">{trend}</span>
        )}
      </div>
      <p className="metric-value text-2xl">{value}</p>
      <p className="metric-label">{label}</p>
    </motion.div>
  );
}

// Quick Stat Component
function QuickStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}
