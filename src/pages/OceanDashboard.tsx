import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Activity, Database, TrendingUp, AlertTriangle, CheckCircle,
  XCircle, Clock, RefreshCw, Waves, Building2, FileText, Award,
  Briefcase, GitBranch, Lightbulb, Gauge, Play
} from 'lucide-react';

const SchedulerDashboard = lazy(() => import('@/components/scheduler/SchedulerDashboard'));

interface OceanHealth {
  id: string;
  total_entities: number;
  total_contracts: number;
  total_grants: number;
  total_opportunities: number;
  total_facts: number;
  total_relationships: number;
  total_insights: number;
  total_contract_value: number;
  entities_last_hour: number;
  contracts_last_hour: number;
  records_last_hour: number;
  avg_entity_quality: number;
  entities_with_uei: number;
  active_sources: number;
  healthy_sources: number;
  degraded_sources: number;
  failed_sources: number;
  pipeline_health_score: number;
  freshness_score: number;
  coverage_score: number;
  overall_health_score: number;
  snapshot_at: string;
}

interface SystemLog {
  id: string;
  level: string;
  component: string;
  message: string;
  details: any;
  created_at: string;
}

export default function OceanDashboard() {
  const [health, setHealth] = useState<OceanHealth | null>(null);
  const [healthHistory, setHealthHistory] = useState<OceanHealth[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoking, setInvoking] = useState(false);
  const [tab, setTab] = useState('overview');

  const loadData = useCallback(async () => {
    try {
      const { data: currentHealth } = await supabase
        .from('ocean_health_snapshots')
        .select('*')
        .order('snapshot_at', { ascending: false })
        .limit(1)
        .single();

      if (currentHealth) setHealth(currentHealth as OceanHealth);

      const { data: history } = await supabase
        .from('ocean_health_snapshots')
        .select('*')
        .gte('snapshot_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('snapshot_at', { ascending: true });

      if (history) setHealthHistory(history as OceanHealth[]);

      const { data: recentLogs } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (recentLogs) setLogs(recentLogs as SystemLog[]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  const invokeOceanController = async () => {
    setInvoking(true);
    try {
      await supabase.functions.invoke('ocean-controller');
      setTimeout(loadData, 3000);
    } catch (error) {
      console.error('Error invoking ocean controller:', error);
    } finally {
      setInvoking(false);
    }
  };

  const formatNumber = (n: number) => {
    if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return n?.toLocaleString() || '0';
  };

  const formatCurrency = (n: number) => {
    if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    return `$${n?.toLocaleString() || '0'}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'from-green-500/20 to-emerald-500/20 border-green-500/30';
    if (score >= 60) return 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30';
    if (score >= 40) return 'from-orange-500/20 to-red-500/20 border-orange-500/30';
    return 'from-red-500/20 to-rose-500/20 border-red-500/30';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Waves className="w-16 h-16 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading Ocean Status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Waves className="w-12 h-12 text-primary" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse" />
              </div>
              <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                  DATA OCEAN
                </h1>
                <p className="text-muted-foreground text-sm">Real-time Intelligence Platform</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Last Updated</p>
                <p className="text-sm text-foreground">
                  {health?.snapshot_at ? new Date(health.snapshot_at).toLocaleTimeString() : 'Never'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={invokeOceanController}
                disabled={invoking}
                className="bg-primary hover:bg-primary/90"
              >
                {invoking ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Running...</>
                ) : (
                  <><Play className="w-4 h-4 mr-2" />🌊 Run Ocean Cycle</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Health Score Hero */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className={`bg-gradient-to-br ${getScoreBg(health?.overall_health_score || 0)} border col-span-1`}>
            <CardContent className="p-6 text-center">
              <Gauge className={`w-8 h-8 mx-auto mb-2 ${getScoreColor(health?.overall_health_score || 0)}`} />
              <p className="text-sm text-muted-foreground mb-1">Overall Health</p>
              <p className={`text-5xl font-black ${getScoreColor(health?.overall_health_score || 0)}`}>
                {health?.overall_health_score || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6 text-center">
              <Activity className="w-6 h-6 mx-auto mb-2 text-purple-400" />
              <p className="text-xs text-muted-foreground">Pipeline</p>
              <p className={`text-3xl font-bold ${getScoreColor(health?.pipeline_health_score || 0)}`}>
                {health?.pipeline_health_score || 0}
              </p>
              <Progress value={health?.pipeline_health_score || 0} className="mt-2 h-1" />
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6 text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-cyan-400" />
              <p className="text-xs text-muted-foreground">Freshness</p>
              <p className={`text-3xl font-bold ${getScoreColor(health?.freshness_score || 0)}`}>
                {health?.freshness_score || 0}
              </p>
              <Progress value={health?.freshness_score || 0} className="mt-2 h-1" />
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6 text-center">
              <Database className="w-6 h-6 mx-auto mb-2 text-teal-400" />
              <p className="text-xs text-muted-foreground">Coverage</p>
              <p className={`text-3xl font-bold ${getScoreColor(health?.coverage_score || 0)}`}>
                {health?.coverage_score || 0}
              </p>
              <Progress value={health?.coverage_score || 0} className="mt-2 h-1" />
            </CardContent>
          </Card>
        </div>

        {/* Total Value Banner */}
        <Card className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/30 mb-8">
          <CardContent className="p-6 text-center">
            <p className="text-green-400 text-sm font-medium mb-1">Total Contract Value Indexed</p>
            <p className="text-5xl font-black text-green-400 font-mono">
              {formatCurrency(health?.total_contract_value || 0)}
            </p>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          {[
            { label: 'Entities', value: health?.total_entities, icon: Building2, color: 'text-blue-400', change: health?.entities_last_hour },
            { label: 'Contracts', value: health?.total_contracts, icon: FileText, color: 'text-green-400', change: health?.contracts_last_hour },
            { label: 'Grants', value: health?.total_grants, icon: Award, color: 'text-purple-400' },
            { label: 'Opportunities', value: health?.total_opportunities, icon: Briefcase, color: 'text-orange-400' },
            { label: 'Facts', value: health?.total_facts, icon: Database, color: 'text-cyan-400' },
            { label: 'Relationships', value: health?.total_relationships, icon: GitBranch, color: 'text-pink-400' },
            { label: 'Insights', value: health?.total_insights, icon: Lightbulb, color: 'text-yellow-400' },
          ].map((stat) => (
            <Card key={stat.label} className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
                <p className="text-2xl font-bold font-mono">{formatNumber(stat.value || 0)}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                {stat.change !== undefined && stat.change > 0 && (
                  <Badge className="mt-1 bg-green-500/20 text-green-400 text-xs">
                    +{stat.change}/hr
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="scheduler">Scheduler</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="scheduler">
            <Suspense fallback={<div className="text-center p-8 text-muted-foreground">Loading scheduler...</div>}>
              <SchedulerDashboard />
            </Suspense>
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Health Score History (24h)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={healthHistory}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="snapshot_at"
                        tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        className="text-muted-foreground"
                        fontSize={10}
                      />
                      <YAxis domain={[0, 100]} className="text-muted-foreground" fontSize={10} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        labelFormatter={(v) => new Date(v).toLocaleString()}
                      />
                      <Area
                        type="monotone"
                        dataKey="overall_health_score"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary) / 0.2)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Data Flow (Records/Hour)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={healthHistory}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="snapshot_at"
                        tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        className="text-muted-foreground"
                        fontSize={10}
                      />
                      <YAxis className="text-muted-foreground" fontSize={10} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        labelFormatter={(v) => new Date(v).toLocaleString()}
                      />
                      <Line type="monotone" dataKey="records_last_hour" stroke="#a855f7" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="entities_last_hour" stroke="#22c55e" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Source Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-background rounded-lg">
                    <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-400">{health?.healthy_sources || 0}</p>
                    <p className="text-xs text-muted-foreground">Healthy</p>
                  </div>
                  <div className="text-center p-4 bg-background rounded-lg">
                    <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-yellow-400">{health?.degraded_sources || 0}</p>
                    <p className="text-xs text-muted-foreground">Degraded</p>
                  </div>
                  <div className="text-center p-4 bg-background rounded-lg">
                    <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-red-400">{health?.failed_sources || 0}</p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                  <div className="text-center p-4 bg-background rounded-lg">
                    <Database className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-400">{health?.active_sources || 0}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className={`p-3 rounded-lg border ${log.level === 'ERROR' ? 'bg-red-500/10 border-red-500/30' :
                            log.level === 'WARN' ? 'bg-yellow-500/10 border-yellow-500/30' :
                              'bg-background border-border'
                          }`}
                      >
                        <div className="flex items-start gap-3">
                          <Badge
                            variant="outline"
                            className={
                              log.level === 'ERROR' ? 'border-red-500 text-red-400' :
                                log.level === 'WARN' ? 'border-yellow-500 text-yellow-400' :
                                  'border-blue-500 text-blue-400'
                            }
                          >
                            {log.level}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground">{log.message}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{log.component}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(log.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sources">
            <SourcesTab />
          </TabsContent>

          <TabsContent value="insights">
            <InsightsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SourcesTab() {
  const [sources, setSources] = useState<any[]>([]);

  useEffect(() => {
    loadSources();
  }, []);

  async function loadSources() {
    const { data } = await supabase
      .from('ingestion_sources')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });
    if (data) setSources(data);
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg">Active Data Sources</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sources.map((source) => (
            <div
              key={source.slug}
              className={`p-4 rounded-lg border ${source.consecutive_failures >= 5 ? 'bg-red-500/10 border-red-500/30' :
                  source.consecutive_failures > 0 ? 'bg-yellow-500/10 border-yellow-500/30' :
                    'bg-background border-border'
                }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium truncate">{source.name}</span>
                {source.consecutive_failures >= 5 ? (
                  <XCircle className="w-4 h-4 text-red-400" />
                ) : source.consecutive_failures > 0 ? (
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                )}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Priority: {source.priority}</p>
                <p>Category: {source.category}</p>
                {source.last_fetched_at && (
                  <p>Last: {new Date(source.last_fetched_at).toLocaleString()}</p>
                )}
                {source.total_records_fetched > 0 && (
                  <p>Total Records: {source.total_records_fetched.toLocaleString()}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function InsightsTab() {
  const [insights, setInsights] = useState<any[]>([]);

  useEffect(() => {
    loadInsights();
  }, []);

  async function loadInsights() {
    const { data } = await supabase
      .from('insights')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setInsights(data);
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg">Recent Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-3">
            {insights.map((insight) => (
              <div key={insight.id} className={`p-4 rounded-lg border ${getSeverityColor(insight.severity)}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                  </div>
                  <Badge variant="outline" className={getSeverityColor(insight.severity)}>
                    {insight.severity}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">{insight.insight_type}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(insight.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
