// OMNISCIENT Export Utilities
// Client-side export helpers for multi-format data download

import type { GeoJSONFeature, OmniscientInsights } from '@/types/omniscient';

export type ExportFormat = 'csv' | 'geojson' | 'json' | 'pdf';

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
export function downloadFile(content: string, filename: string, mimeType: string) {
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
        downloadFile(content, `omniscient-export-${timestamp}.json`, 'application/json');
      }
      break;
    }
  }
}

// Format icons and labels
export const EXPORT_FORMATS: { format: ExportFormat; label: string; icon: string; description: string }[] = [
  { format: 'csv', label: 'CSV', icon: '📊', description: 'Spreadsheet-compatible' },
  { format: 'geojson', label: 'GeoJSON', icon: '🗺️', description: 'Map-ready format' },
  { format: 'json', label: 'JSON', icon: '{ }', description: 'Full data + insights' },
  { format: 'pdf', label: 'PDF Report', icon: '📄', description: 'AI-powered summary' },
];
