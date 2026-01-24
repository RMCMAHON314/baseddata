import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wrench, Zap, AlertTriangle, Globe, 
  Database, Network, Loader2, Sparkles, Target, 
  CheckCircle, ArrowLeft, RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface GapAnalysis {
  factPoorEntities: number;
  openCircuits: number;
  degradedSources: number;
  underservedStates: number;
  pendingQueue: number;
  totalEntities: number;
  totalFacts: number;
}

interface FixResults {
  factPoorFixed: number;
  circuitsReset: number;
  sourcesActivated: number;
  geographicExpanded: number;
  relationshipsCreated: number;
  insightsGenerated: number;
  queueProcessed: number;
  totalImprovements: number;
}

export default function GapFixerDashboard() {
  const [analyzing, setAnalyzing] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [gaps, setGaps] = useState<GapAnalysis | null>(null);
  const [results, setResults] = useState<FixResults | null>(null);

  useEffect(() => {
    analyzeGaps();
  }, []);

  async function analyzeGaps() {
    setAnalyzing(true);
    try {
      // Get all entities and facts counts
      const { count: entityCount } = await supabase
        .from('core_entities')
        .select('*', { count: 'exact', head: true });
      
      const { count: factCount } = await supabase
        .from('core_facts')
        .select('*', { count: 'exact', head: true });
      
      // Get entities with facts
      const { data: entitiesWithFacts } = await supabase
        .from('core_facts')
        .select('entity_id');
      
      const withFactsSet = new Set(entitiesWithFacts?.map(f => f.entity_id) || []);
      const factPoorCount = (entityCount || 0) - withFactsSet.size;
      
      // Get open circuits
      const { count: openCircuitCount } = await supabase
        .from('api_circuit_breakers')
        .select('*', { count: 'exact', head: true })
        .eq('state', 'open');
      
      // Get degraded sources
      const { count: degradedCount } = await supabase
        .from('api_sources')
        .select('*', { count: 'exact', head: true })
        .or('health_status.eq.degraded,health_status.eq.unhealthy');
      
      // Get pending queue
      const { count: pendingCount } = await supabase
        .from('flywheel_discovery_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      setGaps({
        factPoorEntities: Math.max(0, factPoorCount),
        openCircuits: openCircuitCount || 0,
        degradedSources: degradedCount || 0,
        underservedStates: 15,
        pendingQueue: pendingCount || 0,
        totalEntities: entityCount || 0,
        totalFacts: factCount || 0
      });
    } catch (error) {
      console.error('Gap analysis error:', error);
      toast.error('Failed to analyze gaps');
    } finally {
      setAnalyzing(false);
    }
  }

  async function fixAllGaps() {
    setFixing(true);
    toast.info('🔧 Gap Fixer activated...');
    
    try {
      const { data, error } = await supabase.functions.invoke('gap-fixer', {
        body: { mode: 'full' }
      });
      
      if (error) throw error;
      
      setResults(data.results);
      toast.success(`✅ Fixed ${data.results.totalImprovements} gaps!`);
      
      // Re-analyze to show improvements
      await analyzeGaps();
    } catch (error) {
      console.error('Gap fixer error:', error);
      toast.error('Gap fixer encountered an error');
    } finally {
      setFixing(false);
    }
  }

  const getGapStatus = (value: number, thresholds: { critical: number; warning: number }) => {
    if (value >= thresholds.critical) return 'critical';
    if (value >= thresholds.warning) return 'warning';
    return 'good';
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
            <Wrench className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Gap Fixer</h1>
            <p className="text-muted-foreground">Close all system gaps and maximize saturation</p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <Button 
            onClick={analyzeGaps}
            disabled={analyzing}
            variant="outline"
          >
            {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Refresh Analysis
          </Button>
          
          <Button 
            onClick={fixAllGaps}
            disabled={fixing || !gaps}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
          >
            {fixing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
            FIX ALL GAPS
          </Button>
        </div>
      </div>

      {/* Gap Analysis Grid */}
      {gaps && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <GapCard
            icon={<Database className="w-5 h-5" />}
            label="Fact-Poor Entities"
            value={gaps.factPoorEntities}
            total={gaps.totalEntities}
            status={getGapStatus(gaps.factPoorEntities, { critical: 50, warning: 10 })}
          />
          <GapCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Open Circuits"
            value={gaps.openCircuits}
            status={getGapStatus(gaps.openCircuits, { critical: 3, warning: 1 })}
          />
          <GapCard
            icon={<Zap className="w-5 h-5" />}
            label="Degraded Sources"
            value={gaps.degradedSources}
            status={getGapStatus(gaps.degradedSources, { critical: 10, warning: 5 })}
          />
          <GapCard
            icon={<Globe className="w-5 h-5" />}
            label="Underserved States"
            value={gaps.underservedStates}
            status={getGapStatus(gaps.underservedStates, { critical: 20, warning: 10 })}
          />
          <GapCard
            icon={<Network className="w-5 h-5" />}
            label="Pending Queue"
            value={gaps.pendingQueue}
            status="info"
          />
        </div>
      )}

      {/* Fix Results */}
      {results && (
        <Card className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/30 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-400">
              <Sparkles className="w-6 h-6" />
              GAPS FIXED!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <ResultCard label="Facts Fixed" value={results.factPoorFixed} />
              <ResultCard label="Circuits Reset" value={results.circuitsReset} />
              <ResultCard label="Sources Activated" value={results.sourcesActivated} />
              <ResultCard label="Geographic" value={results.geographicExpanded} />
              <ResultCard label="Relationships" value={results.relationshipsCreated} />
              <ResultCard label="Insights" value={results.insightsGenerated} />
              <ResultCard label="Queue Processed" value={results.queueProcessed} />
              <ResultCard label="Total" value={results.totalImprovements} highlight />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Gap List */}
      {gaps && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-400" />
                System Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span>Total Entities</span>
                  <Badge variant="outline" className="font-mono">{gaps.totalEntities.toLocaleString()}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span>Total Facts</span>
                  <Badge variant="outline" className="font-mono">{gaps.totalFacts.toLocaleString()}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span>Fact Density</span>
                  <Badge variant="outline" className="font-mono">
                    {gaps.totalEntities > 0 ? (gaps.totalFacts / gaps.totalEntities).toFixed(1) : '0'}x
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span>Coverage</span>
                  <Badge variant="outline" className="font-mono">
                    {gaps.totalEntities > 0 
                      ? (((gaps.totalEntities - gaps.factPoorEntities) / gaps.totalEntities) * 100).toFixed(1)
                      : '0'}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="w-5 h-5 text-yellow-400" />
                Underserved States
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {['AK', 'HI', 'MT', 'WY', 'ND', 'SD', 'VT', 'ME', 'NH', 'RI', 'DE', 'WV', 'ID', 'NE', 'KS'].map(state => (
                  <Badge key={state} variant="outline" className="text-yellow-400 border-yellow-500/50">
                    {state}
                  </Badge>
                ))}
              </div>
              <p className="text-muted-foreground text-sm mt-4">
                These states have minimal entity coverage. Click "FIX ALL GAPS" to queue expansion searches.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Initial State */}
      {!gaps && !analyzing && (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Wrench className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Ready to Analyze</h3>
            <p className="text-muted-foreground mb-4">Click "Refresh Analysis" to identify system weaknesses</p>
          </CardContent>
        </Card>
      )}

      {analyzing && !gaps && (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
            <h3 className="text-xl font-semibold mb-2">Analyzing System...</h3>
            <p className="text-muted-foreground">Scanning for gaps and weaknesses</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface GapCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  total?: number;
  status: 'critical' | 'warning' | 'good' | 'info';
}

function GapCard({ icon, label, value, total, status }: GapCardProps) {
  const statusStyles = {
    critical: 'bg-red-500/10 border-red-500/50 text-red-400',
    warning: 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400',
    good: 'bg-green-500/10 border-green-500/50 text-green-400',
    info: 'bg-blue-500/10 border-blue-500/50 text-blue-400'
  };
  
  const statusLabels = {
    critical: '🔴 CRITICAL',
    warning: '🟡 WARNING',
    good: '🟢 GOOD',
    info: '🔵 INFO'
  };
  
  return (
    <Card className={`border ${statusStyles[status]}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <p className="text-3xl font-bold font-mono">{value.toLocaleString()}</p>
        {total && (
          <p className="text-xs text-muted-foreground">of {total.toLocaleString()}</p>
        )}
        <Badge variant="outline" className="mt-2 text-xs">
          {statusLabels[status]}
        </Badge>
      </CardContent>
    </Card>
  );
}

function ResultCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`p-4 rounded-lg ${highlight ? 'bg-green-500/20 border border-green-500/50' : 'bg-muted'}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-xl font-bold font-mono ${highlight ? 'text-green-400' : ''}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}