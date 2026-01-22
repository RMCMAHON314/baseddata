// BASED DATA - Results View
// Map + Data Panel split view with clean design

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Layers, Table, Lightbulb, Download, 
  FileJson, FileSpreadsheet, Share2, ChevronRight, Clock, Database, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Logo } from '@/components/Logo';
import { MapContainer } from '@/components/map/MapContainer';
import { LayerControls } from '@/components/map/LayerControls';
import { FeaturePopup } from '@/components/map/FeaturePopup';
import type { GeoJSONFeature, GeoJSONFeatureCollection, CollectedData, OmniscientInsights, MapLayer } from '@/types/omniscient';
import { CATEGORY_COLORS } from '@/lib/mapbox';

interface OmniscientResultsProps {
  prompt: string;
  features?: GeoJSONFeatureCollection;
  collectedData: CollectedData[];
  insights?: OmniscientInsights;
  creditsUsed: number;
  onBack: () => void;
}

export function OmniscientResults({ 
  prompt, 
  features, 
  collectedData, 
  insights, 
  creditsUsed, 
  onBack 
}: OmniscientResultsProps) {
  const [selectedFeature, setSelectedFeature] = useState<GeoJSONFeature | null>(null);
  
  // Build layers from features
  const [layers, setLayers] = useState<MapLayer[]>(() => {
    if (!features?.features?.length) return [];
    
    const byCategory: Record<string, GeoJSONFeature[]> = {};
    for (const f of features.features) {
      const cat = f.properties.category || 'UNKNOWN';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(f);
    }
    return Object.entries(byCategory).map(([cat, feats]) => ({
      id: cat.toLowerCase(),
      name: cat.replace('_', ' '),
      category: cat as any,
      visible: true,
      features: feats,
      color: CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] || '#3366FF',
    }));
  });

  // Compute center from features
  const mapCenter = useMemo((): [number, number] | undefined => {
    if (!features?.features?.length) return undefined;
    let sumLng = 0, sumLat = 0, count = 0;
    for (const f of features.features) {
      if (f.geometry.type === 'Point') {
        const coords = f.geometry.coordinates as number[];
        sumLng += coords[0];
        sumLat += coords[1];
        count++;
      }
    }
    if (count === 0) return undefined;
    return [sumLng / count, sumLat / count];
  }, [features]);

  // Build tabular data from features
  const tabularData = useMemo(() => {
    if (!features?.features?.length) return [];
    return features.features.map(f => ({
      source: f.properties.source,
      category: f.properties.category,
      name: f.properties.name,
      description: f.properties.description || '',
      timestamp: f.properties.timestamp || '',
      confidence: f.properties.confidence || 0,
    }));
  }, [features]);

  const handleLayerToggle = (layerId: string) => {
    setLayers(prev => prev.map(l => 
      l.id === layerId ? { ...l, visible: !l.visible } : l
    ));
  };

  const handleExportCSV = () => {
    if (!tabularData.length) return;
    const headers = Object.keys(tabularData[0]);
    const csv = [
      headers.join(','),
      ...tabularData.map(row => 
        headers.map(h => JSON.stringify((row as any)[h] ?? '')).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `based-data-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportGeoJSON = () => {
    if (!features) return;
    const json = JSON.stringify(features, null, 2);
    const blob = new Blob([json], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `based-data-${Date.now()}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalRecords = features?.features?.length || 0;
  const totalTime = collectedData.reduce((sum, d) => sum + d.collection_time_ms, 0);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex-none border-b border-border px-4 py-3 bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Logo variant="compact" />
          </div>
          
          <div className="flex-1 max-w-2xl mx-4">
            <div className="bg-secondary rounded-lg px-4 py-2 text-sm text-muted-foreground truncate">
              {prompt}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{creditsUsed} credits</span>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map Panel - 60% */}
        <div className="w-3/5 relative border-r border-border">
          <MapContainer
            features={features}
            center={mapCenter}
            zoom={mapCenter ? 9 : 4}
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
          <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm rounded-lg px-3 py-2 text-xs space-y-1 border border-border shadow-lg">
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="w-3 h-3" />
              <span>{totalRecords} features loaded</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{(totalTime / 1000).toFixed(1)}s total</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Database className="w-3 h-3" />
              <span>{collectedData.length} sources</span>
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
        <div className="w-2/5 flex flex-col bg-card overflow-hidden">
          <Tabs defaultValue="insights" className="flex-1 flex flex-col">
            <TabsList className="flex-none border-b border-border bg-transparent p-0 h-auto">
              <TabsTrigger 
                value="insights"
                className="data-[state=active]:bg-secondary rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-3"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Insights
              </TabsTrigger>
              <TabsTrigger 
                value="data"
                className="data-[state=active]:bg-secondary rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-3"
              >
                <Table className="w-4 h-4 mr-2" />
                Data
              </TabsTrigger>
              <TabsTrigger 
                value="sources"
                className="data-[state=active]:bg-secondary rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-3"
              >
                <Layers className="w-4 h-4 mr-2" />
                Sources
              </TabsTrigger>
            </TabsList>

            {/* Insights Tab */}
            <TabsContent value="insights" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
              {insights ? (
                <>
                  {/* Summary */}
                  <div className="bg-accent border border-primary/20 rounded-xl p-4">
                    <p className="text-sm text-foreground">{insights.summary}</p>
                  </div>

                  {/* Key Findings */}
                  {insights.key_findings?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">Key Findings</h3>
                      <div className="space-y-2">
                        {insights.key_findings.map((finding, i) => (
                          <div key={i} className="flex gap-2 text-sm">
                            <ChevronRight className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-foreground">{finding}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {insights.recommendations?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">Recommendations</h3>
                      <div className="space-y-2">
                        {insights.recommendations.map((rec, i) => (
                          <div key={i} className="bg-secondary rounded-lg p-3 text-sm text-foreground">
                            {rec}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {insights.warnings?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-destructive mb-3">⚠️ Warnings</h3>
                      <div className="space-y-2">
                        {insights.warnings.map((warning, i) => (
                          <div key={i} className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                            {warning}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Related Queries */}
                  {insights.related_queries?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">Related Queries</h3>
                      <div className="flex flex-wrap gap-2">
                        {insights.related_queries.map((q, i) => (
                          <button
                            key={i}
                            className="px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-xs text-muted-foreground transition-colors"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No AI insights generated</p>
                </div>
              )}
            </TabsContent>

            {/* Data Tab */}
            <TabsContent value="data" className="flex-1 overflow-hidden m-0 flex flex-col">
              <div className="flex-1 overflow-auto">
                {tabularData.length > 0 ? (
                  <table className="w-full text-xs">
                    <thead className="bg-secondary sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium text-muted-foreground">Source</th>
                        <th className="text-left p-2 font-medium text-muted-foreground">Name</th>
                        <th className="text-left p-2 font-medium text-muted-foreground">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tabularData.slice(0, 100).map((row, i) => (
                        <tr key={i} className="border-b border-border hover:bg-secondary/50">
                          <td className="p-2 text-muted-foreground">{row.source}</td>
                          <td className="p-2 text-foreground">{row.name}</td>
                          <td className="p-2 text-muted-foreground">{row.category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No data</div>
                )}
              </div>
              
              {/* Export Options */}
              <div className="flex-none border-t border-border p-3 flex gap-2">
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
                {collectedData.map((source, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border ${
                      source.status === 'success'
                        ? 'bg-success/10 border-success/20'
                        : source.status === 'error'
                        ? 'bg-destructive/10 border-destructive/20'
                        : 'bg-accent border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-foreground">{source.source}</span>
                      <span className={`text-xs ${
                        source.status === 'success' ? 'text-success' :
                        source.status === 'error' ? 'text-destructive' : 'text-muted-foreground'
                      }`}>
                        {source.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{source.record_count} records</span>
                      <span>{source.collection_time_ms}ms</span>
                    </div>
                    {source.error && (
                      <p className="mt-2 text-xs text-destructive">{source.error}</p>
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