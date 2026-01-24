import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Zap, 
  TrendingUp, 
  Database, 
  GitBranch,
  Lightbulb,
  Clock,
  Activity,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { Infinity as InfinityIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface AlgorithmStatus {
  total_entities: number;
  total_facts: number;
  total_relationships: number;
  total_insights: number;
  queue_pending: number;
  queue_processing: number;
  completed_24h: number;
  avg_opportunity_score: number;
  last_cycle: string | null;
  last_cycle_duration: number | null;
  entities_expanded_24h: number;
  facts_enriched_24h: number;
  relationships_discovered_24h: number;
  insights_generated_24h: number;
}

interface MetricCycleProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  suffix?: string;
  color: string;
}

const MetricCycle = ({ icon, label, value, suffix = "", color }: MetricCycleProps) => (
  <motion.div 
    className="flex items-center gap-2 p-2 rounded-lg bg-background/50 border border-border/50"
    whileHover={{ scale: 1.02, borderColor: color }}
    transition={{ duration: 0.2 }}
  >
    <div className="p-1.5 rounded-md" style={{ backgroundColor: `${color}20` }}>
      <span style={{ color }}>{icon}</span>
    </div>
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-mono font-bold text-foreground">
        {value.toLocaleString()}{suffix}
      </span>
    </div>
  </motion.div>
);

export function InfiniteAlgorithmWidget() {
  const [status, setStatus] = useState<AlgorithmStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadStatus = async () => {
    try {
      // Query the status view directly
      const { data, error } = await supabase
        .from('infinite_algorithm_status')
        .select('*')
        .single();

      if (error) {
        console.error('Error loading algorithm status:', error);
        // Fallback to basic counts
        const [entities, facts, relationships, insights] = await Promise.all([
          supabase.from('core_entities').select('id', { count: 'exact', head: true }),
          supabase.from('core_facts').select('id', { count: 'exact', head: true }),
          supabase.from('core_relationships').select('id', { count: 'exact', head: true }),
          supabase.from('core_derived_insights').select('id', { count: 'exact', head: true })
        ]);

        setStatus({
          total_entities: entities.count || 0,
          total_facts: facts.count || 0,
          total_relationships: relationships.count || 0,
          total_insights: insights.count || 0,
          queue_pending: 0,
          queue_processing: 0,
          completed_24h: 0,
          avg_opportunity_score: 50,
          last_cycle: null,
          last_cycle_duration: null,
          entities_expanded_24h: 0,
          facts_enriched_24h: 0,
          relationships_discovered_24h: 0,
          insights_generated_24h: 0
        });
      } else {
        setStatus(data as AlgorithmStatus);
      }
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to load algorithm status:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerAlgorithm = async () => {
    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('infinite-algorithm', {
        body: { mode: 'standard' }
      });
      
      if (error) throw error;
      
      console.log('♾️ Infinite Algorithm triggered:', data);
      // Reload status after run
      await loadStatus();
    } catch (err) {
      console.error('Failed to trigger algorithm:', err);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardContent className="p-6 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          >
            <InfinityIcon className="h-8 w-8 text-primary" />
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  const isActive = status?.queue_processing && status.queue_processing > 0;
  const timeSinceLastCycle = status?.last_cycle 
    ? Math.round((Date.now() - new Date(status.last_cycle).getTime()) / 60000) 
    : null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden relative">
      {/* Animated background pulse when active */}
      <AnimatePresence>
        {(isActive || isRunning) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-r from-primary via-violet-500 to-cyan-500"
            style={{
              backgroundSize: '200% 200%',
              animation: 'gradient-shift 3s ease infinite'
            }}
          />
        )}
      </AnimatePresence>

      <CardHeader className="pb-2 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              animate={isActive || isRunning ? { rotate: 360 } : {}}
              transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            >
              <InfinityIcon className="h-5 w-5 text-primary" />
            </motion.div>
            <CardTitle className="text-base font-bold">
              The Infinite Algorithm
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={isActive ? "default" : "secondary"} 
              className={isActive ? "bg-green-500/20 text-green-400 border-green-500/50" : ""}
            >
              {isActive ? (
                <span className="flex items-center gap-1">
                  <Activity className="h-3 w-3 animate-pulse" />
                  ACTIVE
                </span>
              ) : "READY"}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={triggerAlgorithm}
              disabled={isRunning}
              className="h-7 w-7 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        {timeSinceLastCycle !== null && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Clock className="h-3 w-3" />
            Last cycle: {timeSinceLastCycle}m ago
            {status?.last_cycle_duration && (
              <span className="text-primary">({status.last_cycle_duration}ms)</span>
            )}
          </p>
        )}
      </CardHeader>

      <CardContent className="relative z-10 space-y-4">
        {/* Core Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MetricCycle 
            icon={<Database className="h-4 w-4" />}
            label="Entities"
            value={status?.total_entities || 0}
            color="#3b82f6"
          />
          <MetricCycle 
            icon={<Sparkles className="h-4 w-4" />}
            label="Facts"
            value={status?.total_facts || 0}
            color="#8b5cf6"
          />
          <MetricCycle 
            icon={<GitBranch className="h-4 w-4" />}
            label="Relationships"
            value={status?.total_relationships || 0}
            color="#06b6d4"
          />
          <MetricCycle 
            icon={<Lightbulb className="h-4 w-4" />}
            label="Insights"
            value={status?.total_insights || 0}
            color="#f59e0b"
          />
        </div>

        {/* 24h Activity */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">24h Growth</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-lg font-mono font-bold text-primary">
                +{status?.entities_expanded_24h || 0}
              </div>
              <div className="text-[10px] text-muted-foreground">Expanded</div>
            </div>
            <div>
              <div className="text-lg font-mono font-bold text-violet-500">
                +{status?.facts_enriched_24h || 0}
              </div>
              <div className="text-[10px] text-muted-foreground">Enriched</div>
            </div>
            <div>
              <div className="text-lg font-mono font-bold text-cyan-500">
                +{status?.relationships_discovered_24h || 0}
              </div>
              <div className="text-[10px] text-muted-foreground">Discovered</div>
            </div>
            <div>
              <div className="text-lg font-mono font-bold text-amber-500">
                +{status?.insights_generated_24h || 0}
              </div>
              <div className="text-[10px] text-muted-foreground">Generated</div>
            </div>
          </div>
        </div>

        {/* Queue Status */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-yellow-500" />
              <span className="text-muted-foreground">Queue:</span>
              <span className="font-mono font-bold">{status?.queue_pending || 0}</span>
              <span className="text-muted-foreground">pending</span>
            </div>
            {status?.completed_24h && status.completed_24h > 0 && (
              <div className="text-green-500 font-mono text-xs">
                ✓ {status.completed_24h} done today
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Avg Score: <span className="font-mono text-primary font-bold">
              {status?.avg_opportunity_score || 50}
            </span>
          </div>
        </div>

        {/* Philosophy Quote */}
        <div className="text-center text-xs text-muted-foreground italic opacity-70 pt-2 border-t border-border/50">
          "The system feeds itself. The system grows itself. The system improves itself."
        </div>
      </CardContent>
    </Card>
  );
}
