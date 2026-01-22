// OMNISCIENT Results View
// Map + Data Panel split view

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, ArrowLeft, Layers, Table, Lightbulb, Download, 
  FileJson, FileSpreadsheet, Share2, AlertTriangle, CheckCircle2,
  ChevronRight, MapPin, Clock, Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapContainer } from '@/components/map/MapContainer';
import { LayerControls } from '@/components/map/LayerControls';
import { FeaturePopup } from '@/components/map/FeaturePopup';
import { DataTable } from '@/components/DataTable';
import type { OmniscientResult, GeoJSONFeature, MapLayer } from '@/types/omniscient';
import { CATEGORY_COLORS } from '@/lib/mapbox';

interface OmniscientResultsProps {
  result: OmniscientResult;
  onBack: () => void;
  onNewQuery: () => void;
}

export function OmniscientResults({ result, onBack, onNewQuery }: OmniscientResultsProps) {
  const [selectedFeature, setSelectedFeature] = useState<GeoJSONFeature | null>(null);
  const [layers, setLayers] = useState<MapLayer[]>(() => {
    // Group features by category
    const byCategory: Record<string, GeoJSONFeature[]> = {};
    for (const f of result.features.features) {
      const cat = f.properties.category;
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(f);
    }
    return Object.entries(byCategory).map(([cat, features]) => ({
      id: cat.toLowerCase(),
      name: cat.replace('_', ' '),
      category: cat as any,
      visible: true,
      features,
      color: CATEGORY_COLORS[cat] || '#3B82F6',
    }));
  });

  const handleLayerToggle = (layerId: string) => {
    setLayers(prev => prev.map(l => 
      l.id === layerId ? { ...l, visible: !l.visible } : l
    ));
  };

  const handleExportCSV = () => {
    if (!result.tabular_data.length) return;
    const headers = Object.keys(result.tabular_data[0]);
    const csv = [
      headers.join(','),
      ...result.tabular_data.map(row => 
        headers.map(h => JSON.stringify(row[h] ?? '')).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omniscient-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportGeoJSON = () => {
    const json = JSON.stringify(result.features, null, 2);
    const blob = new Blob([json], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omniscient-${Date.now()}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen flex flex-col bg-[#0A0A0A] text-white overflow-hidden">
      {/* Header */}
      <header className="flex-none border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-400" />
              <span className="font-bold">OMNISCIENT</span>
            </div>
          </div>
          
          <div className="flex-1 max-w-2xl mx-4">
            <div className="bg-white/5 rounded-lg px-4 py-2 text-sm text-white/70 truncate">
              {result.prompt}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onNewQuery}>
              New Query
            </Button>
            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-black">
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map Panel - 60% */}
        <div className="w-3/5 relative border-r border-white/10">
          <MapContainer
            features={result.features}
            center={result.intent.location?.center}
            zoom={result.intent.location ? 9 : 4}
            onFeatureClick={(f) => setSelectedFeature(f as any)}
            className="absolute inset-0"
          />
          
          {/* Layer Controls */}
          {layers.length > 0 && (
            <LayerControls
              layers={layers}
              onToggle={handleLayerToggle}
              className="absolute top-4 left-4 w-56"
            />
          )}

          {/* Stats Overlay */}
          <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs space-y-1">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              <span>{result.features.features.length} features loaded</span>
            </div>
            <div className="flex items-center gap-2 text-white/50">
              <Clock className="w-3 h-3" />
              <span>{result.processing_time_ms}ms</span>
            </div>
            <div className="flex items-center gap-2 text-white/50">
              <Database className="w-3 h-3" />
              <span>{result.sources_used.length} sources</span>
            </div>
          </div>

          {/* Feature Popup */}
          <AnimatePresence>
            {selectedFeature && (
              <FeaturePopup
                feature={selectedFeature}
                onClose={() => setSelectedFeature(null)}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Data Panel - 40% */}
        <div className="w-2/5 flex flex-col bg-[#141414] overflow-hidden">
          <Tabs defaultValue="insights" className="flex-1 flex flex-col">
            <TabsList className="flex-none border-b border-white/10 bg-transparent p-0 h-auto">
              <TabsTrigger 
                value="insights"
                className="data-[state=active]:bg-white/10 rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-400 px-4 py-3"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Insights
              </TabsTrigger>
              <TabsTrigger 
                value="data"
                className="data-[state=active]:bg-white/10 rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-400 px-4 py-3"
              >
                <Table className="w-4 h-4 mr-2" />
                Data
              </TabsTrigger>
              <TabsTrigger 
                value="sources"
                className="data-[state=active]:bg-white/10 rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-400 px-4 py-3"
              >
                <Layers className="w-4 h-4 mr-2" />
                Sources
              </TabsTrigger>
            </TabsList>

            {/* Insights Tab */}
            <TabsContent value="insights" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
              {/* Summary */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <p className="text-sm text-white/90">{result.insights.summary}</p>
              </div>

              {/* Key Findings */}
              <div>
                <h3 className="text-sm font-medium text-white/60 mb-3">Key Findings</h3>
                <div className="space-y-2">
                  {result.insights.key_findings.map((finding, i) => (
                    <div key={i} className="flex gap-2 text-sm">
                      <ChevronRight className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-white/80">{finding}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h3 className="text-sm font-medium text-white/60 mb-3">Recommendations</h3>
                <div className="space-y-2">
                  {result.insights.recommendations.map((rec, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-3 text-sm text-white/70">
                      {rec}
                    </div>
                  ))}
                </div>
              </div>

              {/* Warnings */}
              {result.insights.warnings.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-amber-400/80 mb-3">⚠️ Warnings</h3>
                  <div className="space-y-2">
                    {result.insights.warnings.map((warning, i) => (
                      <div key={i} className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-200/80">
                        {warning}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Queries */}
              <div>
                <h3 className="text-sm font-medium text-white/60 mb-3">Related Queries</h3>
                <div className="flex flex-wrap gap-2">
                  {result.insights.related_queries.map((q, i) => (
                    <button
                      key={i}
                      className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs text-white/70 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Data Tab */}
            <TabsContent value="data" className="flex-1 overflow-hidden m-0 flex flex-col">
              <div className="flex-1 overflow-auto">
                <DataTable data={result.tabular_data} />
              </div>
              
              {/* Export Options */}
              <div className="flex-none border-t border-white/10 p-3 flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <FileSpreadsheet className="w-4 h-4 mr-1" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportGeoJSON}>
                  <FileJson className="w-4 h-4 mr-1" />
                  GeoJSON
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-1" />
                  KML
                </Button>
              </div>
            </TabsContent>

            {/* Sources Tab */}
            <TabsContent value="sources" className="flex-1 overflow-y-auto p-4 m-0">
              <div className="space-y-3">
                {result.collected_data.map((source, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border ${
                      source.status === 'success'
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : source.status === 'error'
                        ? 'bg-red-500/5 border-red-500/20'
                        : 'bg-amber-500/5 border-amber-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{source.source}</span>
                      <span className={`text-xs ${
                        source.status === 'success' ? 'text-emerald-400' :
                        source.status === 'error' ? 'text-red-400' : 'text-amber-400'
                      }`}>
                        {source.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/50">
                      <span>{source.record_count} records</span>
                      <span>{source.collection_time_ms}ms</span>
                    </div>
                    {source.error && (
                      <p className="mt-2 text-xs text-red-400">{source.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
