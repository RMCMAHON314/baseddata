import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Database, Brain, Zap, Globe, FileText,
  Users, BarChart3, Shield, Clock, Cpu, Network,
  Layers, Target, Sparkles, TrendingUp, X
} from 'lucide-react';
import { DiagramNode } from './DiagramNode';
import { DataFlowLine } from './DataFlowLine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface SystemStats {
  entities: number;
  sources: number;
  contracts: number;
  facts: number;
  pendingJobs: number;
}

const NODES = [
  {
    id: 'user-query',
    label: 'User Query',
    description: 'Natural language input',
    icon: Search,
    variant: 'primary' as const,
    position: { x: 15, y: 20 },
    category: 'input',
  },
  {
    id: 'omniscient',
    label: 'Omniscient',
    description: 'Primary orchestrator',
    icon: Brain,
    variant: 'accent' as const,
    position: { x: 35, y: 20 },
    category: 'processing',
  },
  {
    id: 'data-sources',
    label: 'Data Sources',
    description: '185 Government APIs',
    icon: Globe,
    variant: 'secondary' as const,
    position: { x: 15, y: 50 },
    category: 'sources',
  },
  {
    id: 'mega-ingest',
    label: 'Mega Ingest',
    description: 'Bulk data firehose',
    icon: Zap,
    variant: 'accent' as const,
    position: { x: 35, y: 50 },
    category: 'processing',
  },
  {
    id: 'records',
    label: 'Records',
    description: 'Raw data storage',
    icon: FileText,
    variant: 'muted' as const,
    position: { x: 55, y: 35 },
    category: 'storage',
  },
  {
    id: 'entity-resolver',
    label: 'Entity Resolver',
    description: 'Fuzzy matching engine',
    icon: Users,
    variant: 'accent' as const,
    position: { x: 55, y: 55 },
    category: 'processing',
  },
  {
    id: 'core-entities',
    label: 'Core Entities',
    description: 'Unified entity brain',
    icon: Database,
    variant: 'primary' as const,
    position: { x: 75, y: 35 },
    category: 'storage',
  },
  {
    id: 'core-facts',
    label: 'Core Facts',
    description: 'Temporal memory',
    icon: Layers,
    variant: 'secondary' as const,
    position: { x: 75, y: 55 },
    category: 'storage',
  },
  {
    id: 'scorer',
    label: 'Scorer',
    description: 'Health & opportunity',
    icon: Target,
    variant: 'accent' as const,
    position: { x: 55, y: 75 },
    category: 'processing',
  },
  {
    id: 'insights',
    label: 'AI Insights',
    description: 'Derived intelligence',
    icon: Sparkles,
    variant: 'primary' as const,
    position: { x: 75, y: 75 },
    category: 'output',
  },
  {
    id: 'flywheel',
    label: 'Flywheel',
    description: '10-phase orchestrator',
    icon: Cpu,
    variant: 'accent' as const,
    position: { x: 15, y: 75 },
    category: 'orchestration',
  },
  {
    id: 'kraken',
    label: 'The Kraken',
    description: 'Growth engine',
    icon: Network,
    variant: 'secondary' as const,
    position: { x: 35, y: 75 },
    category: 'orchestration',
  },
  {
    id: 'response',
    label: 'Response',
    description: 'Rich intelligence',
    icon: TrendingUp,
    variant: 'primary' as const,
    position: { x: 85, y: 20 },
    category: 'output',
  },
  {
    id: 'security',
    label: 'Security',
    description: 'RLS & circuit breakers',
    icon: Shield,
    variant: 'muted' as const,
    position: { x: 50, y: 92 },
    category: 'infrastructure',
  },
];

const CONNECTIONS = [
  { from: 'user-query', to: 'omniscient', label: 'NL Query' },
  { from: 'omniscient', to: 'records', label: 'Collect' },
  { from: 'data-sources', to: 'mega-ingest', label: 'APIs' },
  { from: 'mega-ingest', to: 'records', label: 'Ingest' },
  { from: 'records', to: 'entity-resolver', label: 'Resolve' },
  { from: 'entity-resolver', to: 'core-entities', label: 'Upsert' },
  { from: 'entity-resolver', to: 'core-facts', label: 'Extract' },
  { from: 'core-entities', to: 'response', label: 'Results' },
  { from: 'core-facts', to: 'scorer', label: 'Score' },
  { from: 'scorer', to: 'insights', label: 'Generate' },
  { from: 'insights', to: 'response', label: 'Enrich' },
  { from: 'flywheel', to: 'kraken', label: 'Trigger' },
  { from: 'kraken', to: 'data-sources', label: 'Hunt' },
  { from: 'flywheel', to: 'scorer', label: 'Schedule' },
];

const NODE_DETAILS: Record<string, { title: string; content: string[]; tables?: string[] }> = {
  'user-query': {
    title: 'User Query Interface',
    content: [
      'Natural language processing',
      'Intent detection & geocoding',
      'Multi-category search',
    ],
  },
  'omniscient': {
    title: 'Omniscient Engine',
    content: [
      'Primary search orchestrator',
      'Parses intent from natural language',
      'Parallel API collection (15+ sources)',
      'Real-time result aggregation',
    ],
    tables: ['queries', 'records'],
  },
  'data-sources': {
    title: 'Government Data Sources',
    content: [
      'USASpending, SAM.gov, Grants.gov',
      'CMS, FDA, EPA, NIH, NSF',
      'OpenStreetMap, Census, FEMA',
      'Circuit breaker protection',
    ],
    tables: ['ingestion_sources', 'api_circuit_breakers'],
  },
  'mega-ingest': {
    title: 'Mega Ingest Pipeline',
    content: [
      'Bulk data firehose',
      'Processes 5 jobs per batch',
      'Routes to specialized handlers',
      'Automatic retry with backoff',
    ],
    tables: ['ingestion_queue'],
  },
  'entity-resolver': {
    title: 'Entity Resolution Engine',
    content: [
      'Fuzzy name matching',
      'Identifier linkage (UEI, DUNS, EIN)',
      'Deduplication & merging',
      'Confidence scoring',
    ],
    tables: ['core_entities', 'core_relationships'],
  },
  'core-entities': {
    title: 'Core Entities Table',
    content: [
      'Unified entity brain',
      'Professional identifiers',
      'Financial aggregates',
      'Health & opportunity scores',
    ],
    tables: ['core_entities'],
  },
  'core-facts': {
    title: 'Core Facts Table',
    content: [
      'Temporal memory system',
      'Valid from/to timestamps',
      'Fact type categorization',
      'Evidence linking',
    ],
    tables: ['core_facts'],
  },
  'scorer': {
    title: 'Scoring Engine',
    content: [
      'Health score calculation',
      'Opportunity score ranking',
      'Data quality metrics',
      'Entity prioritization',
    ],
  },
  'insights': {
    title: 'AI Insights Engine',
    content: [
      'Pattern detection',
      'Anomaly identification',
      'Trend analysis',
      'Recommendation generation',
    ],
    tables: ['core_derived_insights'],
  },
  'flywheel': {
    title: 'Flywheel Ultimate',
    content: [
      '10-phase orchestration',
      'Runs every minute (pg_cron)',
      'Self-healing recovery',
      'Circuit breaker reset',
    ],
    tables: ['flywheel_metrics'],
  },
  'kraken': {
    title: 'The Kraken Engine',
    content: [
      'Autonomous data expansion',
      'Gap identification',
      'Hunter/crawler coordination',
      'Target: 95/100 health score',
    ],
  },
  'response': {
    title: 'Intelligence Response',
    content: [
      'Enriched entity data',
      'AI-generated narratives',
      'Actionable insights',
      'Export capabilities',
    ],
  },
  'security': {
    title: 'Security Layer',
    content: [
      'Row Level Security (RLS)',
      'Service role isolation',
      'Circuit breaker protection',
      'Dead letter queue recovery',
    ],
  },
};

export function ArchitectureDiagram() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [stats, setStats] = useState<SystemStats>({
    entities: 0,
    sources: 0,
    contracts: 0,
    facts: 0,
    pendingJobs: 0,
  });
  const [activeFlow, setActiveFlow] = useState<string[]>([]);

  useEffect(() => {
    async function fetchStats() {
      const [
        { count: entities },
        { count: sources },
        { count: contracts },
        { count: facts },
        { count: pendingJobs },
      ] = await Promise.all([
        supabase.from('core_entities').select('*', { count: 'exact', head: true }),
        supabase.from('ingestion_sources').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('contracts').select('*', { count: 'exact', head: true }),
        supabase.from('core_facts').select('*', { count: 'exact', head: true }),
        supabase.from('ingestion_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      setStats({
        entities: entities || 0,
        sources: sources || 0,
        contracts: contracts || 0,
        facts: facts || 0,
        pendingJobs: pendingJobs || 0,
      });
    }

    fetchStats();
  }, []);

  // Animate data flow
  useEffect(() => {
    const flowSequences = [
      ['user-query', 'omniscient', 'records', 'entity-resolver', 'core-entities', 'response'],
      ['data-sources', 'mega-ingest', 'records', 'entity-resolver', 'core-facts', 'scorer', 'insights'],
      ['flywheel', 'kraken', 'data-sources'],
    ];

    let currentSequence = 0;
    let currentStep = 0;

    const interval = setInterval(() => {
      const sequence = flowSequences[currentSequence];
      if (currentStep < sequence.length) {
        setActiveFlow(sequence.slice(0, currentStep + 1));
        currentStep++;
      } else {
        currentStep = 0;
        currentSequence = (currentSequence + 1) % flowSequences.length;
        setActiveFlow([]);
      }
    }, 800);

    return () => clearInterval(interval);
  }, []);

  const getNodePosition = (id: string) => {
    const node = NODES.find(n => n.id === id);
    return node ? { x: node.position.x * 10, y: node.position.y * 5 } : { x: 0, y: 0 };
  };

  const selectedDetails = selectedNode ? NODE_DETAILS[selectedNode] : null;

  return (
    <div className="relative w-full h-full min-h-[600px] bg-background rounded-xl border overflow-hidden">
      {/* Stats Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex gap-4 flex-wrap">
        <Card className="bg-background/80 backdrop-blur-sm">
          <CardContent className="p-3 flex gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.entities.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Entities</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary">{stats.sources}</div>
              <div className="text-xs text-muted-foreground">Sources</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">{stats.contracts.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Contracts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground">{stats.facts.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Facts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{stats.pendingJobs}</div>
              <div className="text-xs text-muted-foreground">Queue</div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 items-center ml-auto">
          <Badge variant="outline" className="bg-primary/20">
            <span className="animate-pulse mr-2">●</span> Live System
          </Badge>
        </div>
      </div>

      {/* SVG Connection Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 1000 500">
        {CONNECTIONS.map((conn, i) => {
          const from = getNodePosition(conn.from);
          const to = getNodePosition(conn.to);
          const isActive = activeFlow.includes(conn.from) && activeFlow.includes(conn.to);
          
          return (
            <DataFlowLine
              key={i}
              from={from}
              to={to}
              label={conn.label}
              delay={i * 0.1}
              color={isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
              animated={isActive}
            />
          );
        })}
      </svg>

      {/* Nodes */}
      <div className="absolute inset-0 pt-20">
        {NODES.map((node) => (
          <DiagramNode
            key={node.id}
            {...node}
            isActive={activeFlow.includes(node.id)}
            onClick={() => setSelectedNode(node.id === selectedNode ? null : node.id)}
            stats={
              node.id === 'core-entities' ? [{ label: 'Total', value: stats.entities }] :
              node.id === 'data-sources' ? [{ label: 'Active', value: stats.sources }] :
              node.id === 'mega-ingest' ? [{ label: 'Queue', value: stats.pendingJobs }] :
              undefined
            }
          />
        ))}
      </div>

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedDetails && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-20 right-4 z-30 w-72"
          >
            <Card className="bg-background/95 backdrop-blur-md border-primary/20">
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <CardTitle className="text-lg">{selectedDetails.title}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setSelectedNode(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="text-sm space-y-1">
                  {selectedDetails.content.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
                {selectedDetails.tables && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Related Tables:</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedDetails.tables.map((table) => (
                        <Badge key={table} variant="secondary" className="text-xs">
                          {table}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-20">
        <Card className="bg-background/80 backdrop-blur-sm">
          <CardContent className="p-3 flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-primary/50 border border-primary" />
              <span>Core Systems</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-accent/50 border border-accent" />
              <span>Processing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-secondary/50 border border-secondary" />
              <span>Storage</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-muted/50 border border-muted-foreground/30" />
              <span>Infrastructure</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
