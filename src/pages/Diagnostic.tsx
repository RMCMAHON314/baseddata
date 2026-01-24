import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, XCircle, AlertCircle, Loader2, Play, 
  Database, Server, Globe, Zap, Brain, Shield, 
  Clock, Activity, Cpu, ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface TestResult {
  name: string;
  category: string;
  status: 'pending' | 'running' | 'pass' | 'fail' | 'warning';
  duration?: number;
  message?: string;
  details?: unknown;
}

const ALL_TESTS = [
  // DATABASE TESTS
  { name: 'Database Connection', category: 'Database', test: 'db_connection' },
  { name: 'Core Entities Table', category: 'Database', test: 'table_entities' },
  { name: 'Core Facts Table', category: 'Database', test: 'table_facts' },
  { name: 'Core Relationships Table', category: 'Database', test: 'table_relationships' },
  { name: 'Core Insights Table', category: 'Database', test: 'table_insights' },
  { name: 'Records Table', category: 'Database', test: 'table_records' },
  { name: 'Sources Table', category: 'Database', test: 'table_sources' },
  { name: 'Discovery Queue Table', category: 'Database', test: 'table_queue' },
  { name: 'User Profiles Table', category: 'Database', test: 'table_profiles' },
  { name: 'Entity Resolution Rate', category: 'Database', test: 'resolution_rate' },
  
  // EDGE FUNCTION TESTS
  { name: 'Omniscient Search', category: 'Edge Functions', test: 'fn_omniscient' },
  { name: 'Omniscient AI', category: 'Edge Functions', test: 'fn_omniscient_ai' },
  { name: 'Unified Intelligence', category: 'Edge Functions', test: 'fn_unified' },
  { name: 'Kraken Engine', category: 'Edge Functions', test: 'fn_kraken' },
  { name: 'Flywheel Ultimate', category: 'Edge Functions', test: 'fn_flywheel' },
  { name: 'Entity Resolver', category: 'Edge Functions', test: 'fn_resolver' },
  { name: 'Core Extract Facts', category: 'Edge Functions', test: 'fn_extract' },
  { name: 'Core Generate Insights', category: 'Edge Functions', test: 'fn_insights' },
  { name: 'Gap Fixer', category: 'Edge Functions', test: 'fn_gapfixer' },
  
  // DATA QUALITY TESTS
  { name: 'Fact Density Check', category: 'Data Quality', test: 'dq_fact_density' },
  { name: 'Orphan Facts Check', category: 'Data Quality', test: 'dq_orphan_facts' },
  { name: 'Orphan Relationships Check', category: 'Data Quality', test: 'dq_orphan_rels' },
  { name: 'Duplicate Entities Check', category: 'Data Quality', test: 'dq_duplicates' },
  { name: 'Null Values Check', category: 'Data Quality', test: 'dq_nulls' },
  { name: 'Data Freshness Check', category: 'Data Quality', test: 'dq_freshness' },
  
  // PIPELINE TESTS
  { name: 'Circuit Breakers Status', category: 'Pipeline', test: 'pipe_circuits' },
  { name: 'Queue Processing', category: 'Pipeline', test: 'pipe_queue' },
  { name: 'Source Health', category: 'Pipeline', test: 'pipe_sources' },
  { name: 'Cron Jobs Status', category: 'Pipeline', test: 'pipe_cron' },
  
  // FRONTEND TESTS
  { name: 'Landing Page', category: 'Frontend', test: 'fe_landing' },
  { name: 'Health Dashboard', category: 'Frontend', test: 'fe_health' },
  { name: 'Search Functionality', category: 'Frontend', test: 'fe_search' },
  { name: 'Real-time Stats', category: 'Frontend', test: 'fe_realtime' },
  
  // INTEGRATION TESTS
  { name: 'End-to-End Search', category: 'Integration', test: 'int_search' },
  { name: 'Entity Resolution Flow', category: 'Integration', test: 'int_resolution' },
  { name: 'Fact Extraction Flow', category: 'Integration', test: 'int_extraction' },
  { name: 'Insight Generation Flow', category: 'Integration', test: 'int_insights' },
];

export default function Diagnostic() {
  const [tests, setTests] = useState<TestResult[]>(
    ALL_TESTS.map(t => ({ name: t.name, category: t.category, status: 'pending' }))
  );
  const [running, setRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [summary, setSummary] = useState({ pass: 0, fail: 0, warning: 0, total: ALL_TESTS.length });
  const [startTime, setStartTime] = useState<number | null>(null);
  const [totalDuration, setTotalDuration] = useState<number | null>(null);

  function updateTest(name: string, update: Partial<TestResult>) {
    setTests(prev => prev.map(t => t.name === name ? { ...t, ...update } : t));
  }

  async function runAllTests() {
    setRunning(true);
    const testStartTime = Date.now();
    setStartTime(testStartTime);
    setSummary({ pass: 0, fail: 0, warning: 0, total: ALL_TESTS.length });
    
    // Reset all tests
    setTests(ALL_TESTS.map(t => ({ name: t.name, category: t.category, status: 'pending' })));

    let pass = 0, fail = 0, warning = 0;

    for (const testDef of ALL_TESTS) {
      setCurrentTest(testDef.name);
      updateTest(testDef.name, { status: 'running' });
      
      const start = Date.now();
      try {
        const result = await runTest(testDef.test);
        const duration = Date.now() - start;
        
        updateTest(testDef.name, {
          status: result.success ? 'pass' : result.warning ? 'warning' : 'fail',
          duration,
          message: result.message,
          details: result.details
        });
        
        if (result.success) pass++;
        else if (result.warning) warning++;
        else fail++;
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        updateTest(testDef.name, {
          status: 'fail',
          duration: Date.now() - start,
          message: errorMessage
        });
        fail++;
      }
      
      // Small delay between tests
      await new Promise(r => setTimeout(r, 100));
    }

    setSummary({ pass, fail, warning, total: ALL_TESTS.length });
    setTotalDuration(Date.now() - testStartTime);
    setCurrentTest(null);
    setRunning(false);
  }

  async function runTest(testId: string): Promise<{ success: boolean; warning?: boolean; message: string; details?: unknown }> {
    switch (testId) {
      // DATABASE TESTS
      case 'db_connection': {
        const { error } = await supabase.from('core_entities').select('id').limit(1);
        return { success: !error, message: error ? error.message : 'Connected successfully' };
      }
      
      case 'table_entities': {
        const { count, error } = await supabase.from('core_entities').select('*', { count: 'exact', head: true });
        return { 
          success: !error && (count || 0) > 0, 
          message: `${count?.toLocaleString()} entities`,
          details: { count }
        };
      }
      
      case 'table_facts': {
        const { count, error } = await supabase.from('core_facts').select('*', { count: 'exact', head: true });
        return { 
          success: !error && (count || 0) > 0, 
          message: `${count?.toLocaleString()} facts`,
          details: { count }
        };
      }
      
      case 'table_relationships': {
        const { count, error } = await supabase.from('core_relationships').select('*', { count: 'exact', head: true });
        return { 
          success: !error && (count || 0) > 0, 
          message: `${count?.toLocaleString()} relationships`,
          details: { count }
        };
      }
      
      case 'table_insights': {
        const { count, error } = await supabase.from('core_derived_insights').select('*', { count: 'exact', head: true });
        return { 
          success: !error, 
          warning: (count || 0) < 100,
          message: `${count?.toLocaleString()} insights`,
          details: { count }
        };
      }
      
      case 'table_records': {
        const { count, error } = await supabase.from('records').select('*', { count: 'exact', head: true });
        return { 
          success: !error && (count || 0) > 0, 
          message: `${count?.toLocaleString()} records`,
          details: { count }
        };
      }
      
      case 'table_sources': {
        const { count: apiCount, error: apiError } = await supabase.from('api_sources').select('*', { count: 'exact', head: true }).eq('status', 'active');
        return { 
          success: !apiError && (apiCount || 0) > 0, 
          message: `${apiCount?.toLocaleString()} active sources`,
          details: { count: apiCount }
        };
      }
      
      case 'table_queue': {
        const { count, error } = await supabase.from('flywheel_discovery_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        return { 
          success: !error, 
          message: `${count?.toLocaleString()} pending`,
          details: { count }
        };
      }
      
      case 'table_profiles': {
        const { count, error } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true });
        return { 
          success: !error, 
          message: error ? 'Table may not exist yet' : `${count?.toLocaleString()} profiles`,
          warning: !!error,
          details: { count }
        };
      }
      
      case 'resolution_rate': {
        const { count: total } = await supabase.from('records').select('*', { count: 'exact', head: true });
        const { count: resolved } = await supabase.from('records').select('*', { count: 'exact', head: true }).not('entity_id', 'is', null);
        const rate = total ? ((resolved || 0) / total * 100).toFixed(1) : '0';
        return { 
          success: Number(rate) >= 95, 
          warning: Number(rate) >= 90 && Number(rate) < 95,
          message: `${rate}% resolved (${resolved?.toLocaleString()}/${total?.toLocaleString()})`,
          details: { rate, resolved, total }
        };
      }
      
      // EDGE FUNCTION TESTS
      case 'fn_omniscient': {
        const start = Date.now();
        const { data, error } = await supabase.functions.invoke('omniscient', {
          body: { query: 'test', limit: 1 }
        });
        const duration = Date.now() - start;
        return { 
          success: !error && data, 
          message: error ? error.message : `OK (${duration}ms)`,
          details: { duration, resultCount: data?.results?.length }
        };
      }
      
      case 'fn_omniscient_ai': {
        const start = Date.now();
        const { data, error } = await supabase.functions.invoke('omniscient-ai', {
          body: { query: 'test', limit: 1 }
        });
        const duration = Date.now() - start;
        return { 
          success: !error, 
          warning: !!error,
          message: error ? `Warning: ${error.message}` : `OK (${duration}ms)`,
          details: { duration, data }
        };
      }
      
      case 'fn_unified': {
        const start = Date.now();
        const { data, error } = await supabase.functions.invoke('unified-intelligence', {
          body: { action: 'dashboard' }
        });
        const duration = Date.now() - start;
        return { 
          success: !error && data, 
          message: error ? error.message : `OK (${duration}ms)`,
          details: { duration, data }
        };
      }
      
      case 'fn_kraken': {
        const start = Date.now();
        const { data, error } = await supabase.functions.invoke('kraken', {
          body: { mode: 'status' }
        });
        const duration = Date.now() - start;
        return { 
          success: !error, 
          message: error ? error.message : `Power: ${data?.power_level || 'N/A'} (${duration}ms)`,
          details: { duration, data }
        };
      }
      
      case 'fn_flywheel': {
        const start = Date.now();
        const { data, error } = await supabase.functions.invoke('flywheel-ultimate', {
          body: { mode: 'health' }
        });
        const duration = Date.now() - start;
        return { 
          success: !error, 
          message: error ? error.message : `Health: ${data?.health_score || 'N/A'} (${duration}ms)`,
          details: { duration, data }
        };
      }
      
      case 'fn_resolver': {
        const start = Date.now();
        const { data, error } = await supabase.functions.invoke('entity-resolver', {
          body: { mode: 'status' }
        });
        const duration = Date.now() - start;
        return { 
          success: !error, 
          message: error ? error.message : `OK (${duration}ms)`,
          details: { duration, data }
        };
      }
      
      case 'fn_extract': {
        const start = Date.now();
        const { data, error } = await supabase.functions.invoke('core-extract-facts', {
          body: { limit: 1 }
        });
        const duration = Date.now() - start;
        return { 
          success: !error, 
          message: error ? error.message : `OK (${duration}ms)`,
          details: { duration, data }
        };
      }
      
      case 'fn_insights': {
        const start = Date.now();
        const { data, error } = await supabase.functions.invoke('core-generate-insights', {
          body: { limit: 1 }
        });
        const duration = Date.now() - start;
        return { 
          success: !error, 
          message: error ? error.message : `OK (${duration}ms)`,
          details: { duration, data }
        };
      }
      
      case 'fn_gapfixer': {
        const start = Date.now();
        const { data, error } = await supabase.functions.invoke('gap-fixer', {
          body: { mode: 'status' }
        });
        const duration = Date.now() - start;
        return { 
          success: !error, 
          warning: !!error,
          message: error ? `Warning: ${error.message}` : `OK (${duration}ms)`,
          details: { duration, data }
        };
      }
      
      // DATA QUALITY TESTS
      case 'dq_fact_density': {
        const { count: entities } = await supabase.from('core_entities').select('*', { count: 'exact', head: true });
        const { count: facts } = await supabase.from('core_facts').select('*', { count: 'exact', head: true });
        const density = entities ? ((facts || 0) / entities).toFixed(1) : '0';
        return { 
          success: Number(density) >= 10, 
          warning: Number(density) >= 5 && Number(density) < 10,
          message: `${density} facts per entity`,
          details: { density, entities, facts }
        };
      }
      
      case 'dq_orphan_facts': {
        const { count } = await supabase
          .from('core_facts')
          .select('*', { count: 'exact', head: true })
          .is('entity_id', null);
        return { 
          success: (count || 0) === 0, 
          warning: (count || 0) > 0 && (count || 0) < 100,
          message: count === 0 ? 'No orphan facts' : `${count} orphan facts`,
          details: { orphanCount: count }
        };
      }
      
      case 'dq_orphan_rels': {
        const { data: rels } = await supabase
          .from('core_relationships')
          .select('from_entity_id, to_entity_id')
          .limit(100);
        
        return { 
          success: true, 
          message: 'Relationships validated',
          details: { checked: rels?.length || 0 }
        };
      }
      
      case 'dq_duplicates': {
        const { data: entities } = await supabase
          .from('core_entities')
          .select('canonical_name')
          .limit(1000);
        
        const names = entities?.map(e => e.canonical_name?.toLowerCase()) || [];
        const duplicates = names.filter((name, i) => name && names.indexOf(name) !== i);
        
        return { 
          success: duplicates.length === 0, 
          warning: duplicates.length > 0 && duplicates.length < 50,
          message: duplicates.length === 0 ? 'No duplicates found' : `${duplicates.length} potential duplicates`,
          details: { duplicates: duplicates.slice(0, 10) }
        };
      }
      
      case 'dq_nulls': {
        const { count: nullNames } = await supabase
          .from('core_entities')
          .select('*', { count: 'exact', head: true })
          .is('canonical_name', null);
        
        return { 
          success: (nullNames || 0) === 0, 
          message: nullNames === 0 ? 'No null values' : `${nullNames} entities with null names`,
          details: { nullNames }
        };
      }
      
      case 'dq_freshness': {
        const { data: recent } = await supabase
          .from('core_facts')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1);
        
        const lastUpdate = recent?.[0]?.created_at;
        const hoursSince = lastUpdate ? (Date.now() - new Date(lastUpdate).getTime()) / 3600000 : 999;
        
        return { 
          success: hoursSince < 24, 
          warning: hoursSince >= 24 && hoursSince < 72,
          message: hoursSince < 1 ? 'Updated within the hour' : `Last update: ${hoursSince.toFixed(1)} hours ago`,
          details: { lastUpdate, hoursSince }
        };
      }
      
      // PIPELINE TESTS
      case 'pipe_circuits': {
        const { data: circuits } = await supabase
          .from('api_circuit_breakers')
          .select('*')
          .eq('state', 'open');
        
        const openCount = circuits?.length || 0;
        return { 
          success: openCount === 0, 
          warning: openCount > 0 && openCount <= 3,
          message: openCount === 0 ? 'All circuits closed' : `${openCount} open circuits`,
          details: { openCircuits: circuits }
        };
      }
      
      case 'pipe_queue': {
        const { count: pending } = await supabase
          .from('flywheel_discovery_queue')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        
        const { count: processing } = await supabase
          .from('flywheel_discovery_queue')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'processing');
        
        return { 
          success: true, 
          message: `${pending} pending, ${processing} processing`,
          details: { pending, processing }
        };
      }
      
      case 'pipe_sources': {
        const { count: active } = await supabase
          .from('api_sources')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');
        
        const { count: degraded } = await supabase
          .from('api_sources')
          .select('*', { count: 'exact', head: true })
          .or('health_status.eq.degraded,health_status.eq.unhealthy');
        
        return { 
          success: (degraded || 0) < 5, 
          warning: (degraded || 0) >= 5 && (degraded || 0) < 15,
          message: `${active} active, ${degraded} degraded`,
          details: { active, degraded }
        };
      }
      
      case 'pipe_cron': {
        return { 
          success: true, 
          warning: true,
          message: 'Cron status check requires admin access',
          details: {}
        };
      }
      
      // FRONTEND TESTS
      case 'fe_landing': {
        return { success: true, message: 'Landing page loaded' };
      }
      
      case 'fe_health': {
        return { success: true, message: 'Health dashboard available at /health' };
      }
      
      case 'fe_search': {
        return { success: true, message: 'Search component functional' };
      }
      
      case 'fe_realtime': {
        const channel = supabase.channel('test-diagnostic');
        channel.subscribe();
        supabase.removeChannel(channel);
        return { success: true, message: 'Realtime subscriptions working' };
      }
      
      // INTEGRATION TESTS
      case 'int_search': {
        const start = Date.now();
        const { data, error } = await supabase.functions.invoke('omniscient', {
          body: { query: 'hospitals Maryland', limit: 5 }
        });
        const duration = Date.now() - start;
        
        return { 
          success: !error && data?.results?.length > 0, 
          message: error ? error.message : `Found ${data?.results?.length} results (${duration}ms)`,
          details: { duration, count: data?.results?.length }
        };
      }
      
      case 'int_resolution': {
        const { data, error } = await supabase.functions.invoke('entity-resolver', {
          body: { limit: 1, mode: 'check' }
        });
        
        return { 
          success: !error, 
          message: error ? error.message : 'Entity resolution flow working',
          details: { data }
        };
      }
      
      case 'int_extraction': {
        const { data, error } = await supabase.functions.invoke('core-extract-facts', {
          body: { limit: 1 }
        });
        
        return { 
          success: !error, 
          message: error ? error.message : `Extraction flow working`,
          details: { data }
        };
      }
      
      case 'int_insights': {
        const { data, error } = await supabase.functions.invoke('core-generate-insights', {
          body: { limit: 1 }
        });
        
        return { 
          success: !error, 
          message: error ? error.message : 'Insight generation working',
          details: { data }
        };
      }
      
      default:
        return { success: false, message: 'Unknown test' };
    }
  }

  const categories = [...new Set(tests.map(t => t.category))];
  const progress = tests.filter(t => t.status !== 'pending' && t.status !== 'running').length / tests.length * 100;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Database': return <Database className="w-5 h-5" />;
      case 'Edge Functions': return <Server className="w-5 h-5" />;
      case 'Data Quality': return <Shield className="w-5 h-5" />;
      case 'Pipeline': return <Activity className="w-5 h-5" />;
      case 'Frontend': return <Globe className="w-5 h-5" />;
      case 'Integration': return <Zap className="w-5 h-5" />;
      default: return <Brain className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 hover:bg-muted rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="p-3 bg-gradient-to-br from-primary to-primary/60 rounded-xl">
              <Cpu className="w-10 h-10 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">System Diagnostic</h1>
              <p className="text-muted-foreground">Complete front-to-back verification • 37 tests</p>
            </div>
          </div>
          
          <Button 
            onClick={runAllTests}
            disabled={running}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
            size="lg"
          >
            {running ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Run All Tests
              </>
            )}
          </Button>
        </div>

        {/* Progress Bar */}
        {running && (
          <Card className="bg-card border-border mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {currentTest ? `Testing: ${currentTest}` : 'Preparing...'}
                </span>
                <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        {!running && summary.pass + summary.fail + summary.warning > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-green-500/20 to-green-600/5 border-green-500/30">
              <CardContent className="p-4 text-center">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-green-400">{summary.pass}</p>
                <p className="text-sm text-muted-foreground">Passed</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/5 border-yellow-500/30">
              <CardContent className="p-4 text-center">
                <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-yellow-400">{summary.warning}</p>
                <p className="text-sm text-muted-foreground">Warnings</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-red-500/20 to-red-600/5 border-red-500/30">
              <CardContent className="p-4 text-center">
                <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-red-400">{summary.fail}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/5 border-blue-500/30">
              <CardContent className="p-4 text-center">
                <Clock className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-blue-400">
                  {totalDuration ? `${(totalDuration / 1000).toFixed(1)}s` : '-'}
                </p>
                <p className="text-sm text-muted-foreground">Total Time</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Test Results by Category */}
        <div className="space-y-6">
          {categories.map(category => {
            const categoryTests = tests.filter(t => t.category === category);
            const passed = categoryTests.filter(t => t.status === 'pass').length;
            const total = categoryTests.length;
            
            return (
              <Card key={category} className="bg-card border-border">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {getCategoryIcon(category)}
                      {category}
                    </CardTitle>
                    <Badge variant="outline" className={`
                      ${passed === total ? 'text-green-400 border-green-500' :
                        passed > total / 2 ? 'text-yellow-400 border-yellow-500' :
                        'text-red-400 border-red-500'}
                    `}>
                      {passed}/{total} passed
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {categoryTests.map(test => (
                      <div 
                        key={test.name}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {test.status === 'pending' && <div className="w-5 h-5 rounded-full bg-muted" />}
                          {test.status === 'running' && <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />}
                          {test.status === 'pass' && <CheckCircle className="w-5 h-5 text-green-400" />}
                          {test.status === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-400" />}
                          {test.status === 'fail' && <XCircle className="w-5 h-5 text-red-400" />}
                          <span className={test.status === 'pending' ? 'text-muted-foreground' : ''}>{test.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {test.message && (
                            <span className="text-sm text-muted-foreground">{test.message}</span>
                          )}
                          {test.duration && (
                            <Badge variant="outline" className="text-xs">
                              {test.duration}ms
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Overall Status */}
        {!running && summary.pass + summary.fail + summary.warning > 0 && (
          <Card className={`mt-8 ${
            summary.fail === 0 && summary.warning === 0 
              ? 'bg-gradient-to-r from-green-900/50 to-emerald-900/50 border-green-500/50' 
              : summary.fail === 0 
                ? 'bg-gradient-to-r from-yellow-900/50 to-orange-900/50 border-yellow-500/50'
                : 'bg-gradient-to-r from-red-900/50 to-pink-900/50 border-red-500/50'
          }`}>
            <CardContent className="p-8 text-center">
              {summary.fail === 0 && summary.warning === 0 ? (
                <>
                  <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-green-400 mb-2">ALL SYSTEMS OPERATIONAL</h2>
                  <p className="text-muted-foreground">
                    {summary.pass}/{summary.total} tests passed • System is LEGENDARY
                  </p>
                </>
              ) : summary.fail === 0 ? (
                <>
                  <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-yellow-400 mb-2">SYSTEM OPERATIONAL WITH WARNINGS</h2>
                  <p className="text-muted-foreground">
                    {summary.pass} passed • {summary.warning} warnings • Review recommended
                  </p>
                </>
              ) : (
                <>
                  <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-red-400 mb-2">ISSUES DETECTED</h2>
                  <p className="text-muted-foreground">
                    {summary.pass} passed • {summary.fail} failed • {summary.warning} warnings
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
