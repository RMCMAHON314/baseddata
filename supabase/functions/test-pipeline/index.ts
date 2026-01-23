// PRODUCTION-GRADE PIPELINE TEST
// Self-testing function that validates entire system

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  details: string;
  duration_ms?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  console.log('========================================');
  console.log('PIPELINE TEST: Starting full validation');
  console.log('========================================');

  const tests: TestResult[] = [];
  const startTime = Date.now();

  // Test 1: Database Connectivity
  try {
    const testStart = Date.now();
    const { count, error } = await supabase
      .from('api_sources')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    
    tests.push({
      name: 'Database Connection',
      status: 'PASS',
      details: `Connected successfully, ${count} sources configured`,
      duration_ms: Date.now() - testStart
    });
  } catch (error) {
    tests.push({
      name: 'Database Connection',
      status: 'FAIL',
      details: (error as Error).message
    });
  }

  // Test 2: Sources Configuration
  try {
    const { data: sources, error } = await supabase
      .from('api_sources')
      .select('slug, status, health_status, priority')
      .order('priority', { ascending: false });
    
    if (error) throw error;
    
    const active = sources?.filter(s => s.status === 'active').length || 0;
    const healthy = sources?.filter(s => s.health_status === 'healthy').length || 0;
    
    tests.push({
      name: 'Sources Configuration',
      status: active > 0 ? 'PASS' : 'FAIL',
      details: `${active} active sources, ${healthy} healthy, Top: ${sources?.slice(0, 5).map(s => s.slug).join(', ')}`
    });
  } catch (error) {
    tests.push({
      name: 'Sources Configuration',
      status: 'FAIL',
      details: (error as Error).message
    });
  }

  // Test 3: OpenStreetMap API
  try {
    const testStart = Date.now();
    const response = await fetch('https://overpass-api.de/api/status');
    tests.push({
      name: 'OpenStreetMap API',
      status: response.ok ? 'PASS' : 'FAIL',
      details: `HTTP ${response.status}`,
      duration_ms: Date.now() - testStart
    });
  } catch (error) {
    tests.push({
      name: 'OpenStreetMap API',
      status: 'FAIL',
      details: (error as Error).message
    });
  }

  // Test 4: CMS Open Payments API
  try {
    const testStart = Date.now();
    const response = await fetch('https://openpaymentsdata.cms.gov/api/1/metastore/schemas/dataset/items');
    tests.push({
      name: 'CMS Open Payments API',
      status: response.ok ? 'PASS' : 'FAIL',
      details: `HTTP ${response.status}`,
      duration_ms: Date.now() - testStart
    });
  } catch (error) {
    tests.push({
      name: 'CMS Open Payments API',
      status: 'FAIL',
      details: (error as Error).message
    });
  }

  // Test 5: USASpending API
  try {
    const testStart = Date.now();
    const response = await fetch('https://api.usaspending.gov/api/v2/references/agency/');
    tests.push({
      name: 'USASpending API',
      status: response.ok ? 'PASS' : 'FAIL',
      details: `HTTP ${response.status}`,
      duration_ms: Date.now() - testStart
    });
  } catch (error) {
    tests.push({
      name: 'USASpending API',
      status: 'FAIL',
      details: (error as Error).message
    });
  }

  // Test 6: FDA API
  try {
    const testStart = Date.now();
    const response = await fetch('https://api.fda.gov/drug/label.json?limit=1');
    tests.push({
      name: 'FDA Drug API',
      status: response.ok ? 'PASS' : 'FAIL',
      details: `HTTP ${response.status}`,
      duration_ms: Date.now() - testStart
    });
  } catch (error) {
    tests.push({
      name: 'FDA Drug API',
      status: 'FAIL',
      details: (error as Error).message
    });
  }

  // Test 7: NPI Registry
  try {
    const testStart = Date.now();
    const response = await fetch('https://npiregistry.cms.hhs.gov/api/?version=2.1&limit=1');
    tests.push({
      name: 'NPI Registry API',
      status: response.ok ? 'PASS' : 'FAIL',
      details: `HTTP ${response.status}`,
      duration_ms: Date.now() - testStart
    });
  } catch (error) {
    tests.push({
      name: 'NPI Registry API',
      status: 'FAIL',
      details: (error as Error).message
    });
  }

  // Test 8: EPA ECHO
  try {
    const testStart = Date.now();
    const response = await fetch('https://echo.epa.gov/tools/web-services/facility-search?output=JSON');
    tests.push({
      name: 'EPA ECHO API',
      status: response.ok ? 'PASS' : 'FAIL',
      details: `HTTP ${response.status}`,
      duration_ms: Date.now() - testStart
    });
  } catch (error) {
    tests.push({
      name: 'EPA ECHO API',
      status: 'FAIL',
      details: (error as Error).message
    });
  }

  // Test 9: FDIC Banks
  try {
    const testStart = Date.now();
    const response = await fetch('https://banks.data.fdic.gov/api/institutions?limit=1&format=json');
    tests.push({
      name: 'FDIC Banks API',
      status: response.ok ? 'PASS' : 'FAIL',
      details: `HTTP ${response.status}`,
      duration_ms: Date.now() - testStart
    });
  } catch (error) {
    tests.push({
      name: 'FDIC Banks API',
      status: 'FAIL',
      details: (error as Error).message
    });
  }

  // Test 10: Database Functions
  try {
    const testStart = Date.now();
    const { data, error } = await supabase.rpc('get_matched_sources', { p_query: 'hospitals in maryland' });
    
    if (error) throw error;
    
    tests.push({
      name: 'Database Functions',
      status: 'PASS',
      details: `get_matched_sources returned ${data?.length || 0} sources`,
      duration_ms: Date.now() - testStart
    });
  } catch (error) {
    tests.push({
      name: 'Database Functions',
      status: 'FAIL',
      details: (error as Error).message
    });
  }

  // Test 11: Query Logging
  try {
    const testStart = Date.now();
    const { data, error } = await supabase.rpc('log_system_event', {
      p_level: 'INFO',
      p_component: 'test-pipeline',
      p_message: 'Pipeline test executed'
    });
    
    if (error) throw error;
    
    tests.push({
      name: 'System Logging',
      status: data ? 'PASS' : 'FAIL',
      details: `Log entry created: ${data}`,
      duration_ms: Date.now() - testStart
    });
  } catch (error) {
    tests.push({
      name: 'System Logging',
      status: 'FAIL',
      details: (error as Error).message
    });
  }

  // Test 12: End-to-End Mini Query (lightweight)
  try {
    const testStart = Date.now();
    
    // Just test the execute-query function can be invoked
    const { data, error } = await supabase.functions.invoke('execute-query', {
      body: { query: 'test banks in maryland' }
    });
    
    if (error) throw error;
    
    const recordCount = data?.features?.features?.length || 0;
    
    tests.push({
      name: 'End-to-End Query',
      status: recordCount > 0 ? 'PASS' : 'FAIL',
      details: `Query returned ${recordCount} records in ${Date.now() - testStart}ms`,
      duration_ms: Date.now() - testStart
    });
  } catch (error) {
    tests.push({
      name: 'End-to-End Query',
      status: 'FAIL',
      details: (error as Error).message
    });
  }

  // Calculate summary
  const passed = tests.filter(t => t.status === 'PASS').length;
  const failed = tests.filter(t => t.status === 'FAIL').length;
  const total = tests.length;
  const totalTime = Date.now() - startTime;

  console.log('========================================');
  console.log(`PIPELINE TEST COMPLETE: ${passed}/${total} PASSED`);
  tests.forEach(t => console.log(`  ${t.status === 'PASS' ? '✓' : '✗'} ${t.name}: ${t.details}`));
  console.log('========================================');

  // Log test results
  await supabase.rpc('log_system_event', {
    p_level: passed === total ? 'INFO' : 'WARN',
    p_component: 'test-pipeline',
    p_message: `Pipeline test: ${passed}/${total} passed`,
    p_details: { passed, failed, total, duration_ms: totalTime }
  });

  return new Response(
    JSON.stringify({
      summary: {
        passed,
        failed,
        total,
        success_rate: ((passed / total) * 100).toFixed(1) + '%',
        duration_ms: totalTime,
        tested_at: new Date().toISOString()
      },
      tests
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
