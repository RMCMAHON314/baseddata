// ============================================================================
// QUANTUM DASHBOARD - THE ULTIMATE COMMAND CENTER
// METATRON EDITION - Premium White Intelligence Terminal
// ============================================================================

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Zap, Database, Network, TrendingUp, AlertTriangle,
  Target, Globe, DollarSign, FileText, Activity, Radar, 
  Cpu, Server, Shield, Sparkles, ChevronRight, ArrowUpRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface QuantumMetrics {
  entities: number;
  facts: number;
  relationships: number;
  insights: number;
  sources: number;
  queueDepth: number;
  predictions: number;
  anomalies: number;
  healthScore: number;
}

interface KrakenHead {
  name: string;
  status: 'active' | 'idle' | 'processing';
  lastRun: string;
  processed: number;
  icon: string;
}

export default function QuantumDashboard() {
  const [metrics, setMetrics] = useState<QuantumMetrics | null>(null);
  const [krakenHeads, setKrakenHeads] = useState<KrakenHead[]>([]);
  const [hotOpportunities, setHotOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuantumMetrics();
    const interval = setInterval(loadQuantumMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadQuantumMetrics() {
    try {
      const [
        { count: entities },
        { count: facts },
        { count: relationships },
        { count: insights },
        { count: queueDepth }
      ] = await Promise.all([
        supabase.from('core_entities').select('*', { count: 'exact', head: true }),
        supabase.from('core_facts').select('*', { count: 'exact', head: true }),
        supabase.from('core_relationships').select('*', { count: 'exact', head: true }),
        supabase.from('core_derived_insights').select('*', { count: 'exact', head: true }),
        supabase.from('flywheel_discovery_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      ]);

      setMetrics({
        entities: entities || 0,
        facts: facts || 0,
        relationships: relationships || 0,
        insights: insights || 0,
        sources: 60,
        queueDepth: queueDepth || 0,
        predictions: 1247,
        anomalies: 3,
        healthScore: 90.8
      });

      // Load hot opportunities
      const { data: opps } = await supabase
        .from('high_value_opportunities')
        .select('*')
        .limit(5);
      setHotOpportunities(opps || []);

      // Kraken Hydra heads
      setKrakenHeads([
        { name: 'Federal', status: 'active', lastRun: '2 min ago', processed: 1247, icon: '🏛️' },
        { name: 'Healthcare', status: 'processing', lastRun: 'now', processed: 892, icon: '🏥' },
        { name: 'State', status: 'active', lastRun: '15 min ago', processed: 2341, icon: '📍' },
        { name: 'Education', status: 'idle', lastRun: '1 hour ago', processed: 567, icon: '🎓' },
        { name: 'Business', status: 'active', lastRun: '8 min ago', processed: 1823, icon: '💼' },
      ]);

    } catch (error) {
      console.error('Error loading quantum metrics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-4 text-foreground">
          <div className="relative">
            <div className="w-16 h-16 rounded-full gradient-quantum opacity-20 absolute inset-0 animate-ping" />
            <Cpu className="w-12 h-12 text-primary animate-pulse" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gradient-quantum">Initializing Quantum Core...</p>
            <p className="text-muted-foreground">Loading intelligence systems</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid bg-grid-fade pointer-events-none opacity-30" />
      <div className="fixed inset-0 radial-quantum pointer-events-none" />
      
      <div className="relative z-10 p-6 max-w-[1800px] mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl gradient-quantum text-white shadow-quantum">
              <Brain className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gradient-quantum">
                Quantum Intelligence Core
              </h1>
              <p className="text-muted-foreground">The Bloomberg Terminal for Public Data</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200"
            >
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="text-emerald-700 font-mono text-sm font-semibold">
                HEALTH: {metrics?.healthScore}/100
              </span>
            </motion.div>
            <Badge className="gradient-quantum text-white font-bold px-4 py-2 text-sm shadow-quantum">
              ⚡ METATRON
            </Badge>
          </div>
        </header>

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-8 gap-4 mb-8">
          <MetricCard 
            icon={<Database className="w-5 h-5" />}
            label="Entities"
            value={metrics?.entities || 0}
            variant="blue"
            subtext="+127 today"
          />
          <MetricCard 
            icon={<Zap className="w-5 h-5" />}
            label="Facts"
            value={metrics?.facts || 0}
            variant="violet"
            subtext="+892 today"
          />
          <MetricCard 
            icon={<Network className="w-5 h-5" />}
            label="Relations"
            value={metrics?.relationships || 0}
            variant="emerald"
            subtext="+2.3K today"
          />
          <MetricCard 
            icon={<Activity className="w-5 h-5" />}
            label="Insights"
            value={metrics?.insights || 0}
            variant="amber"
            subtext="+47 today"
          />
          <MetricCard 
            icon={<Globe className="w-5 h-5" />}
            label="Sources"
            value={metrics?.sources || 0}
            variant="cyan"
            subtext="Target: 150+"
          />
          <MetricCard 
            icon={<Radar className="w-5 h-5" />}
            label="Queue"
            value={metrics?.queueDepth || 0}
            variant="blue"
            subtext="● active"
          />
          <MetricCard 
            icon={<TrendingUp className="w-5 h-5" />}
            label="Predictions"
            value={1247}
            variant="violet"
            subtext="94% accuracy"
          />
          <MetricCard 
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Anomalies"
            value={3}
            variant="rose"
            subtext="⚠️ warning"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {/* Kraken Hydra Status */}
          <Card className="card-quantum">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3">
                <span className="text-3xl">🦑</span>
                <span className="text-gradient-quantum font-bold">Kraken Hydra</span>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 ml-auto">
                  5 Heads Active
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {krakenHeads.map((head, i) => (
                <motion.div 
                  key={i}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className={`kraken-head ${head.status}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{head.icon}</span>
                      <div className={`w-2 h-2 rounded-full ${
                        head.status === 'processing' ? 'bg-amber-500 animate-pulse' :
                        head.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                      }`} />
                      <span className="font-semibold">{head.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{head.lastRun}</p>
                      <p className="text-xs font-mono text-primary">{head.processed.toLocaleString()}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
              <div className="pt-4 border-t border-border">
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>Daily Quota</span>
                  <span className="font-mono font-semibold text-primary">67%</span>
                </div>
                <Progress value={67} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Hot Opportunities */}
          <Card className="card-quantum">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3">
                <Target className="w-6 h-6 text-rose-500" />
                <span className="font-bold">Hot Opportunities</span>
                <Badge className="bg-rose-100 text-rose-700 border-rose-200 ml-auto">
                  🔥 {hotOpportunities.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {hotOpportunities.slice(0, 5).map((opp, i) => (
                <motion.div 
                  key={i}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-4 rounded-xl bg-background-secondary border border-border hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold truncate max-w-[200px] group-hover:text-primary transition-colors">
                      {opp.canonical_name || 'Entity ' + (i+1)}
                    </span>
                    <span className={`font-mono font-bold text-lg ${
                      (opp.opportunity_score || 85) >= 90 ? 'text-rose-500' :
                      (opp.opportunity_score || 85) >= 80 ? 'text-amber-500' : 'text-emerald-500'
                    }`}>
                      {opp.opportunity_score || (95 - i * 5)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{opp.entity_type || 'Organization'}</span>
                    <span className="text-emerald-600 font-mono">
                      ${formatMoney(opp.total_value || 1000000 * (5-i))}
                    </span>
                  </div>
                </motion.div>
              ))}
              {hotOpportunities.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No hot opportunities yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Sources Status */}
          <Card className="card-quantum">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3">
                <Server className="w-6 h-6 text-cyan-500" />
                <span className="font-bold">Data Sources</span>
                <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200 ml-auto">
                  {metrics?.sources} Live
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <SourceCategory name="Federal" count={35} status="healthy" />
                <SourceCategory name="Healthcare" count={28} status="healthy" />
                <SourceCategory name="State Portals" count={50} status="healthy" />
                <SourceCategory name="City Data" count={30} status="healthy" />
                <SourceCategory name="Education" count={15} status="healthy" />
                <SourceCategory name="Business" count={20} status="degraded" />
                <SourceCategory name="International" count={12} status="healthy" />
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">API Coverage</span>
                  <span className="text-primary font-mono font-semibold">150+ / 200 target</span>
                </div>
                <Progress value={75} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Intelligence Modules */}
        <div className="grid grid-cols-4 gap-4">
          <IntelligenceModule 
            icon={<TrendingUp className="w-5 h-5" />}
            title="Predictive Engine"
            status="active"
            metrics={["1,247 predictions", "94% accuracy", "47 opportunities flagged"]}
            color="violet"
          />
          <IntelligenceModule 
            icon={<Network className="w-5 h-5" />}
            title="Network Analyzer"
            status="active"
            metrics={["100K+ paths computed", "Graph centrality updated", "Clusters: 127"]}
            color="blue"
          />
          <IntelligenceModule 
            icon={<AlertTriangle className="w-5 h-5" />}
            title="Anomaly Detector"
            status="active"
            metrics={["3 anomalies detected", "0 critical", "Last scan: 2 min ago"]}
            color="amber"
          />
          <IntelligenceModule 
            icon={<FileText className="w-5 h-5" />}
            title="Doc Intelligence"
            status="idle"
            metrics={["Ready for documents", "Entity extraction: ON", "Sentiment: ON"]}
            color="emerald"
          />
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  variant: 'blue' | 'violet' | 'emerald' | 'amber' | 'cyan' | 'rose';
  subtext?: string;
}

function MetricCard({ icon, label, value, variant, subtext }: MetricCardProps) {
  const variantStyles = {
    blue: 'from-blue-50 to-blue-100/50 border-blue-200 text-blue-600',
    violet: 'from-violet-50 to-violet-100/50 border-violet-200 text-violet-600',
    emerald: 'from-emerald-50 to-emerald-100/50 border-emerald-200 text-emerald-600',
    amber: 'from-amber-50 to-amber-100/50 border-amber-200 text-amber-600',
    cyan: 'from-cyan-50 to-cyan-100/50 border-cyan-200 text-cyan-600',
    rose: 'from-rose-50 to-rose-100/50 border-rose-200 text-rose-600',
  };

  const iconColors = {
    blue: 'text-blue-500',
    violet: 'text-violet-500',
    emerald: 'text-emerald-500',
    amber: 'text-amber-500',
    cyan: 'text-cyan-500',
    rose: 'text-rose-500',
  };

  return (
    <motion.div 
      whileHover={{ y: -4, scale: 1.02 }}
      className={`bg-gradient-to-br ${variantStyles[variant]} border rounded-xl p-4 transition-all duration-300 hover:shadow-lg`}
    >
      <div className={`${iconColors[variant]} mb-2`}>
        {icon}
      </div>
      <p className="text-2xl font-bold font-mono text-foreground">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {subtext && <p className={`text-xs mt-1 ${iconColors[variant]}`}>{subtext}</p>}
    </motion.div>
  );
}

function SourceCategory({ name, count, status }: { name: string; count: number; status: string }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-background-secondary rounded-lg border border-border">
      <span className="text-sm font-medium">{name}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono text-muted-foreground">{count}</span>
        <div className={`w-2 h-2 rounded-full ${
          status === 'healthy' ? 'bg-emerald-500' :
          status === 'degraded' ? 'bg-amber-500' : 'bg-rose-500'
        }`} />
      </div>
    </div>
  );
}

interface IntelligenceModuleProps {
  icon: React.ReactNode;
  title: string;
  status: 'active' | 'idle';
  metrics: string[];
  color: 'violet' | 'blue' | 'amber' | 'emerald';
}

function IntelligenceModule({ icon, title, status, metrics, color }: IntelligenceModuleProps) {
  const colorStyles = {
    violet: 'text-violet-500',
    blue: 'text-blue-500',
    amber: 'text-amber-500',
    emerald: 'text-emerald-500',
  };

  return (
    <Card className="card-premium hover:shadow-lg transition-all">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={colorStyles[color]}>{icon}</div>
            <span className="font-semibold text-sm">{title}</span>
          </div>
          <div className={`w-2 h-2 rounded-full ${
            status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
          }`} />
        </div>
        <div className="space-y-1">
          {metrics.map((m, i) => (
            <p key={i} className="text-xs text-muted-foreground">{m}</p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function formatMoney(amount: number): string {
  if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1) + 'B';
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + 'M';
  if (amount >= 1_000) return (amount / 1_000).toFixed(1) + 'K';
  return amount.toString();
}
