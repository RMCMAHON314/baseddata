// BASED DATA Export Utilities
// Client-side export helpers for multi-format data download

import type { GeoJSONFeature, OmniscientInsights } from '@/types/omniscient';
import * as XLSX from 'xlsx';

export type ExportFormat = 'csv' | 'geojson' | 'json' | 'pdf' | 'xlsx';

interface ExportOptions {
  features: GeoJSONFeature[];
  format: ExportFormat;
  insights?: OmniscientInsights;
  queryInfo?: {
    prompt: string;
    sources_used: string[];
    processing_time_ms: number;
  };
}

// Generate CSV from features (client-side)
export function toCSV(features: GeoJSONFeature[]): string {
  if (!features.length) return '';
  
  const allKeys = new Set<string>();
  features.forEach(f => {
    Object.keys(f.properties || {}).forEach(k => allKeys.add(k));
  });
  
  const headers = ['latitude', 'longitude', ...Array.from(allKeys)];
  
  const rows = features.map(f => {
    const coords = f.geometry?.coordinates || [0, 0];
    const lat = f.geometry?.type === 'Point' ? (coords as number[])[1] : 0;
    const lng = f.geometry?.type === 'Point' ? (coords as number[])[0] : 0;
    
    const values: (string | number)[] = [lat, lng];
    allKeys.forEach(key => {
      let val: any = f.properties?.[key] ?? '';
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

// Generate GeoJSON string
export function toGeoJSON(features: GeoJSONFeature[]): string {
  return JSON.stringify({
    type: 'FeatureCollection',
    features: features.map(f => ({
      type: 'Feature',
      geometry: f.geometry,
      properties: f.properties,
    })),
  }, null, 2);
}

// Generate JSON export
export function toJSON(features: GeoJSONFeature[], insights?: OmniscientInsights): string {
  return JSON.stringify({
    exported_at: new Date().toISOString(),
    record_count: features.length,
    insights,
    data: features,
  }, null, 2);
}

// Download file utility
export function downloadFile(content: string | ArrayBuffer, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Generate Excel workbook from features
export function toXLSX(features: GeoJSONFeature[], insights?: OmniscientInsights): ArrayBuffer {
  // Collect all unique property keys
  const allKeys = new Set<string>();
  features.forEach(f => {
    Object.keys(f.properties || {}).forEach(k => allKeys.add(k));
  });
  
  // Build data rows
  const headers = ['Name', 'Category', 'Source', 'Latitude', 'Longitude', ...Array.from(allKeys).filter(k => !['name', 'category', 'source'].includes(k))];
  
  const rows = features.map(f => {
    const coords = f.geometry?.coordinates || [0, 0];
    const lat = f.geometry?.type === 'Point' ? (coords as number[])[1] : 0;
    const lng = f.geometry?.type === 'Point' ? (coords as number[])[0] : 0;
    
    const row: Record<string, any> = {
      'Name': f.properties?.name || '',
      'Category': f.properties?.category || '',
      'Source': f.properties?.source || '',
      'Latitude': lat,
      'Longitude': lng,
    };
    
    allKeys.forEach(key => {
      if (!['name', 'category', 'source'].includes(key)) {
        let val = f.properties?.[key] ?? '';
        if (typeof val === 'object') val = JSON.stringify(val);
        row[key.charAt(0).toUpperCase() + key.slice(1)] = val;
      }
    });
    
    return row;
  });
  
  // Create workbook with data sheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  
  // Auto-size columns
  const colWidths = headers.map(h => ({ wch: Math.max(h.length, 15) }));
  ws['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  
  // Add insights sheet if available
  if (insights) {
    const insightRows = [
      { Section: 'Summary', Content: insights.summary || '' },
      { Section: '', Content: '' },
      { Section: 'Key Findings', Content: '' },
      ...(insights.key_findings || []).map((f, i) => ({ Section: `  ${i + 1}.`, Content: f })),
      { Section: '', Content: '' },
      { Section: 'Recommendations', Content: '' },
      ...(insights.recommendations || []).map((r, i) => ({ Section: `  ${i + 1}.`, Content: r })),
    ];
    const insightWs = XLSX.utils.json_to_sheet(insightRows);
    insightWs['!cols'] = [{ wch: 20 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, insightWs, 'Insights');
  }
  
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}

// Main export function
export async function exportData({ features, format, insights, queryInfo }: ExportOptions): Promise<void> {
  const timestamp = Date.now();
  
  switch (format) {
    case 'csv': {
      const content = toCSV(features);
      downloadFile(content, `omniscient-export-${timestamp}.csv`, 'text/csv');
      break;
    }
    
    case 'geojson': {
      const content = toGeoJSON(features);
      downloadFile(content, `omniscient-export-${timestamp}.geojson`, 'application/geo+json');
      break;
    }
    
    case 'json': {
      const content = toJSON(features, insights);
      downloadFile(content, `omniscient-export-${timestamp}.json`, 'application/json');
      break;
    }
    
    case 'xlsx': {
      const content = toXLSX(features, insights);
      downloadFile(content, `based-data-export-${timestamp}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      break;
    }
    
    case 'pdf': {
      // For PDF, we call the edge function to generate HTML report
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            features,
            format: 'pdf',
            insights,
            query_info: queryInfo,
            include_ai_summary: true,
          }),
        });
        
        if (response.ok) {
          const html = await response.text();
          // Open in new window for printing/saving as PDF
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            // Auto-trigger print dialog after a short delay
            setTimeout(() => printWindow.print(), 500);
          }
        } else {
          throw new Error('PDF generation failed');
        }
      } catch (e) {
        console.error('PDF export error:', e);
        // Fallback to JSON export
        const content = toJSON(features, insights);
        downloadFile(content, `based-data-export-${timestamp}.json`, 'application/json');
      }
      break;
    }
  }
}

// Generate an API endpoint URL for the data (shareable link concept)
export function generateAPIEndpoint(features: GeoJSONFeature[], queryInfo?: { prompt: string }): string {
  // Encode the query as a shareable param (in production this would save to DB)
  const encodedQuery = encodeURIComponent(queryInfo?.prompt || 'data-export');
  const recordCount = features.length;
  const timestamp = Date.now();
  
  // This creates a mock API endpoint structure - in production would hit an edge function
  const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://api.baseddata.com';
  return `${baseUrl}/functions/v1/developer-api?q=${encodedQuery}&t=${timestamp}&n=${recordCount}`;
}

// Copy API endpoint to clipboard
export function copyAPIEndpoint(features: GeoJSONFeature[], queryInfo?: { prompt: string }): void {
  const endpoint = generateAPIEndpoint(features, queryInfo);
  navigator.clipboard.writeText(endpoint);
}

// Generate markdown summary for sharing
export function toMarkdown(features: GeoJSONFeature[], insights?: OmniscientInsights, queryInfo?: { prompt: string }): string {
  const lines: string[] = [
    '# BASED DATA Export',
    '',
    `**Query:** ${queryInfo?.prompt || 'Data Export'}`,
    `**Records:** ${features.length}`,
    `**Generated:** ${new Date().toISOString()}`,
    '',
  ];
  
  if (insights?.summary) {
    lines.push('## Summary', '', insights.summary, '');
  }
  
  if (insights?.key_findings?.length) {
    lines.push('## Key Findings', '');
    insights.key_findings.forEach((f, i) => lines.push(`${i + 1}. ${f}`));
    lines.push('');
  }
  
  if (insights?.recommendations?.length) {
    lines.push('## Recommendations', '');
    insights.recommendations.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
    lines.push('');
  }
  
  // Sample data table
  lines.push('## Sample Data (Top 10)', '');
  lines.push('| Name | Category | Source | Confidence |');
  lines.push('|------|----------|--------|------------|');
  
  features.slice(0, 10).forEach(f => {
    const name = String(f.properties?.name || 'Unknown').replace(/\|/g, '-');
    const category = String(f.properties?.category || '-');
    const source = String(f.properties?.source || '-');
    const confidence = f.properties?.confidence ? `${Math.round(Number(f.properties.confidence) * 100)}%` : '-';
    lines.push(`| ${name} | ${category} | ${source} | ${confidence} |`);
  });
  
  return lines.join('\n');
}

// Generate KML for Google Earth
export function toKML(features: GeoJSONFeature[]): string {
  const placemarks = features
    .filter(f => f.geometry?.type === 'Point')
    .map(f => {
      const coords = f.geometry.coordinates as number[];
      const name = String(f.properties?.name || 'Unknown').replace(/&/g, '&amp;').replace(/</g, '&lt;');
      const desc = String(f.properties?.description || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
      return `    <Placemark>
      <name>${name}</name>
      <description>${desc}</description>
      <Point>
        <coordinates>${coords[0]},${coords[1]},0</coordinates>
      </Point>
    </Placemark>`;
    }).join('\n');
    
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>BASED DATA Export</name>
${placemarks}
  </Document>
</kml>`;
}

// Generate SQL INSERT statements
export function toSQL(features: GeoJSONFeature[], tableName: string = 'records'): string {
  if (!features.length) return '-- No records to export';
  
  const lines = [
    '-- BASED DATA SQL Export',
    `-- Generated: ${new Date().toISOString()}`,
    `-- Records: ${features.length}`,
    '',
    `-- Create table (if not exists)`,
    `CREATE TABLE IF NOT EXISTS ${tableName} (`,
    '  id SERIAL PRIMARY KEY,',
    '  name TEXT,',
    '  category TEXT,',
    '  source TEXT,',
    '  latitude DOUBLE PRECISION,',
    '  longitude DOUBLE PRECISION,',
    '  properties JSONB,',
    '  created_at TIMESTAMPTZ DEFAULT NOW()',
    ');',
    '',
    `-- Insert records`,
  ];
  
  features.forEach(f => {
    const coords = f.geometry?.type === 'Point' ? f.geometry.coordinates as number[] : [0, 0];
    const name = String(f.properties?.name || 'Unknown').replace(/'/g, "''");
    const category = String(f.properties?.category || '');
    const source = String(f.properties?.source || '');
    const props = JSON.stringify(f.properties || {}).replace(/'/g, "''");
    
    lines.push(
      `INSERT INTO ${tableName} (name, category, source, latitude, longitude, properties)`,
      `VALUES ('${name}', '${category}', '${source}', ${coords[1]}, ${coords[0]}, '${props}');`
    );
  });
  
  return lines.join('\n');
}

// Copy all data as formatted table string
export function toFormattedTable(features: GeoJSONFeature[]): string {
  if (!features.length) return 'No data';
  
  const rows = features.slice(0, 100).map(f => ({
    Name: String(f.properties?.name || 'Unknown').slice(0, 40),
    Category: String(f.properties?.category || '-'),
    Source: String(f.properties?.source || '-'),
    Lat: f.geometry?.type === 'Point' ? (f.geometry.coordinates as number[])[1].toFixed(4) : '-',
    Lng: f.geometry?.type === 'Point' ? (f.geometry.coordinates as number[])[0].toFixed(4) : '-',
  }));
  
  // Calculate column widths
  const cols = ['Name', 'Category', 'Source', 'Lat', 'Lng'] as const;
  const widths = cols.map(col => Math.max(col.length, ...rows.map(r => String(r[col]).length)));
  
  const header = cols.map((c, i) => c.padEnd(widths[i])).join(' | ');
  const separator = widths.map(w => '-'.repeat(w)).join('-+-');
  const body = rows.map(row => cols.map((c, i) => String(row[c]).padEnd(widths[i])).join(' | ')).join('\n');
  
  return [header, separator, body].join('\n');
}

// Format icons and labels
export const EXPORT_FORMATS: { format: ExportFormat; label: string; icon: string; description: string }[] = [
  { format: 'xlsx', label: 'Excel (.xlsx)', icon: '📗', description: 'Best for spreadsheets' },
  { format: 'csv', label: 'CSV', icon: '📊', description: 'Universal format' },
  { format: 'geojson', label: 'GeoJSON', icon: '🗺️', description: 'Map-ready format' },
  { format: 'json', label: 'JSON', icon: '{ }', description: 'Full data + insights' },
  { format: 'pdf', label: 'PDF Report', icon: '📄', description: 'AI-powered summary' },
];

// Extended export formats
export const ADVANCED_EXPORT_FORMATS = [
  { id: 'api', label: 'Copy API Endpoint', icon: '🔗', description: 'REST API URL' },
  { id: 'markdown', label: 'Markdown Summary', icon: '📝', description: 'For documentation' },
  { id: 'kml', label: 'Google Earth (KML)', icon: '🌍', description: 'For Google Earth' },
  { id: 'sql', label: 'SQL Inserts', icon: '🗃️', description: 'Database import' },
  { id: 'clipboard', label: 'Copy as Table', icon: '📋', description: 'Paste anywhere' },
];
