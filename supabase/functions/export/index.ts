// OMNISCIENT Multi-Format Export Engine
// Exports data to CSV, GeoJSON, Shapefile, PDF with AI summaries

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface ExportRequest {
  features: any[];
  format: 'csv' | 'geojson' | 'shapefile' | 'pdf' | 'json';
  insights?: any;
  query_info?: {
    prompt: string;
    sources_used: string[];
    processing_time_ms: number;
  };
  include_ai_summary?: boolean;
}

// Generate CSV from features
function toCSV(features: any[]): string {
  if (!features.length) return '';
  
  // Collect all unique property keys
  const allKeys = new Set<string>();
  features.forEach(f => {
    Object.keys(f.properties || {}).forEach(k => allKeys.add(k));
  });
  
  // Add geometry columns
  const headers = ['latitude', 'longitude', ...Array.from(allKeys)];
  
  // Build CSV
  const rows = features.map(f => {
    const coords = f.geometry?.coordinates || [0, 0];
    const lat = f.geometry?.type === 'Point' ? coords[1] : coords[0]?.[1] || 0;
    const lng = f.geometry?.type === 'Point' ? coords[0] : coords[0]?.[0] || 0;
    
    const values = [lat, lng];
    allKeys.forEach(key => {
      let val = f.properties?.[key] ?? '';
      // Escape CSV values
      if (typeof val === 'object') val = JSON.stringify(val);
      if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      values.push(val);
    });
    return values.join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}

// Generate GeoJSON FeatureCollection
function toGeoJSON(features: any[]): string {
  return JSON.stringify({
    type: 'FeatureCollection',
    features: features.map(f => ({
      type: 'Feature',
      geometry: f.geometry,
      properties: f.properties,
    })),
  }, null, 2);
}

// Generate simplified Shapefile-compatible GeoJSON (for conversion tools)
function toShapefileJSON(features: any[]): string {
  // Flatten properties for shapefile compatibility (10 char field names, no nested objects)
  const flatFeatures = features.map(f => {
    const flatProps: Record<string, any> = {};
    Object.entries(f.properties || {}).forEach(([key, value]) => {
      // Truncate key to 10 chars (shapefile limit)
      const shortKey = key.substring(0, 10);
      // Flatten nested objects
      if (typeof value === 'object' && value !== null) {
        flatProps[shortKey] = JSON.stringify(value).substring(0, 254);
      } else {
        flatProps[shortKey] = String(value ?? '').substring(0, 254);
      }
    });
    return {
      type: 'Feature',
      geometry: f.geometry,
      properties: flatProps,
    };
  });
  
  return JSON.stringify({
    type: 'FeatureCollection',
    features: flatFeatures,
  }, null, 2);
}

// Generate AI-powered PDF summary (returns HTML for PDF rendering)
async function generatePDFContent(
  features: any[],
  insights: any,
  queryInfo: any
): Promise<string> {
  const categories = [...new Set(features.map(f => f.properties?.category))];
  const sources = [...new Set(features.map(f => f.properties?.source))];
  
  // Generate AI summary if available
  let aiSummary = '';
  if (LOVABLE_API_KEY && features.length > 0) {
    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{
            role: 'system',
            content: 'Generate a professional executive summary for a data export report. Be concise but comprehensive.'
          }, {
            role: 'user',
            content: `Create an executive summary for this data export:
Query: ${queryInfo?.prompt || 'Data export'}
Records: ${features.length}
Categories: ${categories.join(', ')}
Sources: ${sources.join(', ')}
Key findings from insights: ${JSON.stringify(insights?.key_findings || [])}`
          }],
          max_tokens: 500,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        aiSummary = data.choices?.[0]?.message?.content || '';
      }
    } catch (e) {
      console.error('AI summary error:', e);
    }
  }
  
  // Generate HTML report
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>OMNISCIENT Data Report</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 40px; color: #1a1a2e; }
    .header { border-bottom: 3px solid #3366FF; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: bold; color: #3366FF; }
    .subtitle { color: #666; margin-top: 5px; }
    .stats { display: flex; gap: 40px; margin: 30px 0; }
    .stat { text-align: center; }
    .stat-value { font-size: 36px; font-weight: bold; color: #3366FF; }
    .stat-label { color: #666; font-size: 14px; }
    .section { margin: 30px 0; }
    .section-title { font-size: 18px; font-weight: bold; color: #1a1a2e; border-bottom: 1px solid #eee; padding-bottom: 10px; }
    .insight { background: #f8f9ff; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #3366FF; }
    .category-tag { display: inline-block; background: #e8edff; color: #3366FF; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin: 2px; }
    .source-item { padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
    th { background: #3366FF; color: white; padding: 10px; text-align: left; }
    td { padding: 8px; border-bottom: 1px solid #eee; }
    tr:nth-child(even) { background: #f8f9ff; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">📊 OMNISCIENT Data Report</div>
    <div class="subtitle">Generated ${new Date().toLocaleString()} • Query: "${queryInfo?.prompt || 'Data Export'}"</div>
  </div>
  
  <div class="stats">
    <div class="stat">
      <div class="stat-value">${features.length.toLocaleString()}</div>
      <div class="stat-label">Total Records</div>
    </div>
    <div class="stat">
      <div class="stat-value">${categories.length}</div>
      <div class="stat-label">Categories</div>
    </div>
    <div class="stat">
      <div class="stat-value">${sources.length}</div>
      <div class="stat-label">Data Sources</div>
    </div>
    <div class="stat">
      <div class="stat-value">${queryInfo?.processing_time_ms || 0}ms</div>
      <div class="stat-label">Processing Time</div>
    </div>
  </div>
  
  ${aiSummary ? `
  <div class="section">
    <div class="section-title">🤖 AI Executive Summary</div>
    <div class="insight">${aiSummary}</div>
  </div>
  ` : ''}
  
  <div class="section">
    <div class="section-title">📂 Data Categories</div>
    <div style="margin-top: 15px;">
      ${categories.map(c => `<span class="category-tag">${c}</span>`).join('')}
    </div>
  </div>
  
  ${insights?.key_findings?.length ? `
  <div class="section">
    <div class="section-title">🔑 Key Findings</div>
    ${insights.key_findings.map((f: string) => `<div class="insight">${f}</div>`).join('')}
  </div>
  ` : ''}
  
  ${insights?.recommendations?.length ? `
  <div class="section">
    <div class="section-title">💡 Recommendations</div>
    ${insights.recommendations.map((r: string) => `<div class="insight">${r}</div>`).join('')}
  </div>
  ` : ''}
  
  <div class="section">
    <div class="section-title">📡 Data Sources Used</div>
    ${sources.map(s => `<div class="source-item">✓ ${s}</div>`).join('')}
  </div>
  
  <div class="section">
    <div class="section-title">📋 Sample Data (First 25 Records)</div>
    <table>
      <tr>
        <th>Name</th>
        <th>Category</th>
        <th>Source</th>
        <th>Description</th>
      </tr>
      ${features.slice(0, 25).map(f => `
        <tr>
          <td>${f.properties?.name || 'N/A'}</td>
          <td>${f.properties?.category || 'N/A'}</td>
          <td>${f.properties?.source || 'N/A'}</td>
          <td>${(f.properties?.description || '').substring(0, 100)}${(f.properties?.description || '').length > 100 ? '...' : ''}</td>
        </tr>
      `).join('')}
    </table>
  </div>
  
  <div class="footer">
    Generated by OMNISCIENT v4.1 • based data engine • ${new Date().toISOString()}
  </div>
</body>
</html>`;
  
  return html;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { features, format, insights, query_info, include_ai_summary } = await req.json() as ExportRequest;
    
    if (!features || !Array.isArray(features)) {
      return new Response(JSON.stringify({ error: 'Features array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    let content: string;
    let contentType: string;
    let filename: string;
    
    switch (format) {
      case 'csv':
        content = toCSV(features);
        contentType = 'text/csv';
        filename = `omniscient-export-${Date.now()}.csv`;
        break;
        
      case 'geojson':
        content = toGeoJSON(features);
        contentType = 'application/geo+json';
        filename = `omniscient-export-${Date.now()}.geojson`;
        break;
        
      case 'shapefile':
        content = toShapefileJSON(features);
        contentType = 'application/geo+json';
        filename = `omniscient-export-${Date.now()}-shapefile.geojson`;
        break;
        
      case 'pdf':
        content = await generatePDFContent(features, insights, query_info);
        contentType = 'text/html';
        filename = `omniscient-report-${Date.now()}.html`;
        break;
        
      case 'json':
      default:
        content = JSON.stringify({
          exported_at: new Date().toISOString(),
          record_count: features.length,
          query: query_info,
          insights,
          data: features,
        }, null, 2);
        contentType = 'application/json';
        filename = `omniscient-export-${Date.now()}.json`;
    }
    
    return new Response(content, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
    
  } catch (e) {
    console.error('Export error:', e);
    return new Response(JSON.stringify({ 
      error: e instanceof Error ? e.message : 'Export failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
