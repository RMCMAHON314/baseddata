// PRODUCTION-GRADE HEALTH CHECK ENGINE
// Tests all data sources and updates health status

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthResult {
  source: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'timeout' | 'error';
  response_time_ms: number;
  http_status: number;
  error?: string;
}

// Test endpoints for each source
const TEST_ENDPOINTS: Record<string, string> = {
  'openstreetmap': 'https://overpass-api.de/api/status',
  'cms-open-payments': 'https://openpaymentsdata.cms.gov/api/1/metastore/schemas/dataset/items',
  'usaspending': 'https://api.usaspending.gov/api/v2/references/agency/',
  'npi-registry': 'https://npiregistry.cms.hhs.gov/api/?version=2.1&limit=1',
  'fda-drugs': 'https://api.fda.gov/drug/label.json?limit=1',
  'clinical-trials': 'https://clinicaltrials.gov/api/v2/studies?pageSize=1',
  'epa-echo': 'https://echo.epa.gov/tools/web-services/facility-search?output=JSON&p_st=MD',
  'epa-tri': 'https://enviro.epa.gov/triexplorer/tri_release.html',
  'fdic-banks': 'https://banks.data.fdic.gov/api/institutions?limit=1&format=json',
  'sec-edgar': 'https://data.sec.gov/submissions/CIK0000320193.json',
  'ev-charging': 'https://api.openchargemap.io/v3/poi?output=json&maxresults=1',
  'nhtsa-recalls': 'https://api.nhtsa.gov/recalls/recallsByManufacturer?manufacturer=ford&limit=1',
  'osha': 'https://enforcedata.dol.gov/api/ords/enforcedata/v1/inspections/'
};

async function checkSource(slug: string, endpoint: string): Promise<HealthResult> {
  const startTime = Date.now();
  let status: HealthResult['status'] = 'unhealthy';
  let httpStatus = 0;
  let errorMessage = '';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'OMNISCIENT-HealthCheck/1.0'
      }
    });

    clearTimeout(timeout);
    httpStatus = response.status;

    if (response.ok) {
      status = 'healthy';
    } else if (response.status < 500) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }
  } catch (error) {
    errorMessage = (error as Error).message;
    if (errorMessage.includes('aborted') || errorMessage.includes('timeout')) {
      status = 'timeout';
    } else {
      status = 'error';
    }
  }

  return {
    source: slug,
    status,
    response_time_ms: Date.now() - startTime,
    http_status: httpStatus,
    error: errorMessage || undefined
  };
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
  console.log('HEALTH CHECK: Starting all source tests');
  console.log('========================================');

  // Get all active sources from database
  const { data: sources } = await supabase
    .from('api_sources')
    .select('id, slug, name, base_url')
    .eq('status', 'active');

  const results: HealthResult[] = [];

  // Check all sources in parallel (batched to avoid overwhelming)
  const BATCH_SIZE = 5;
  const sourcesToCheck = sources || [];

  for (let i = 0; i < sourcesToCheck.length; i += BATCH_SIZE) {
    const batch = sourcesToCheck.slice(i, i + BATCH_SIZE);
    
    const batchResults = await Promise.all(
      batch.map(async (source) => {
        const endpoint = TEST_ENDPOINTS[source.slug] || source.base_url;
        const result = await checkSource(source.slug, endpoint);

        // Log health check to database
        await supabase.from('health_checks').insert({
          source_id: source.id,
          source_slug: source.slug,
          status: result.status,
          response_time_ms: result.response_time_ms,
          http_status: result.http_status,
          test_endpoint: endpoint,
          error_message: result.error || null
        });

        // Update source health status
        const healthStatus = result.status === 'healthy' || result.status === 'degraded' 
          ? result.status 
          : 'unhealthy';

        await supabase.from('api_sources')
          .update({
            health_status: healthStatus,
            last_health_check: new Date().toISOString(),
            avg_response_time_ms: result.response_time_ms,
            consecutive_failures: result.status === 'healthy' ? 0 : undefined
          })
          .eq('id', source.id);

        console.log(`${result.status === 'healthy' ? '✓' : '✗'} ${source.slug}: ${result.status} (${result.response_time_ms}ms)`);

        return result;
      })
    );

    results.push(...batchResults);
  }

  // Calculate summary
  const healthy = results.filter(r => r.status === 'healthy').length;
  const degraded = results.filter(r => r.status === 'degraded').length;
  const unhealthy = results.filter(r => r.status !== 'healthy' && r.status !== 'degraded').length;
  const total = results.length;

  const avgResponseTime = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.response_time_ms, 0) / results.length)
    : 0;

  console.log('========================================');
  console.log(`HEALTH CHECK COMPLETE: ${healthy}/${total} healthy`);
  console.log('========================================');

  // Log summary
  await supabase.rpc('log_system_event', {
    p_level: 'INFO',
    p_component: 'health-check',
    p_message: `Health check completed: ${healthy}/${total} sources healthy`,
    p_details: {
      healthy,
      degraded,
      unhealthy,
      total,
      avg_response_time_ms: avgResponseTime
    }
  });

  return new Response(
    JSON.stringify({
      summary: {
        healthy,
        degraded,
        unhealthy,
        total,
        health_percentage: ((healthy / total) * 100).toFixed(1) + '%',
        avg_response_time_ms: avgResponseTime,
        checked_at: new Date().toISOString()
      },
      results
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
