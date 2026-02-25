// BASED DATA v7.5 - Results View
// Shows ACTUAL DATA not just counts - species, weather, regulations with source links
// Premium split-view with scrollable panels

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Layers, Table, Lightbulb, 
  Share2, ChevronRight, Clock, Database, 
  CheckCircle2, Zap, Globe, Sparkles, Copy, 
  FileText, BarChart3, PieChart, Link2, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Logo } from '@/components/Logo';
import { MapContainer } from '@/components/map/MapContainer';
import { LayerControls } from '@/components/map/LayerControls';
import { FeaturePopup } from '@/components/map/FeaturePopup';
import { DataGrid } from '@/components/data/DataGrid';
import { DataShowcase } from '@/components/data/DataShowcase';
import { EnrichmentBadges } from '@/components/data/EnrichmentBadges';
import { SourceCard } from '@/components/data/SourceCard';
import type { GeoJSONFeature, GeoJSONFeatureCollection, CollectedData, OmniscientInsights, MapLayer } from '@/types/omniscient';
import { CATEGORY_COLORS } from '@/lib/mapbox';
import { toast } from 'sonner';
import { exportData, type ExportFormat } from '@/lib/export';
import { useVoting } from '@/hooks/useVoting';

interface OmniscientResultsProps {
  prompt: string;
  features?: GeoJSONFeatureCollection;
  collectedData: CollectedData[];
  insights?: OmniscientInsights;
  creditsUsed: number;
  processingTimeMs?: number;
  sourcesUsed?: string[];
  enrichments?: string[]; // NEW: Auto-enrichment types
  onBack: () => void;
}

export function OmniscientResults({ 
  prompt, 
  features, 
  collectedData, 
  insights, 
  creditsUsed,
  processingTimeMs,
  sourcesUsed,
  enrichments = [],
  onBack 
}: OmniscientResultsProps) {
  const [selectedFeature, setSelectedFeature] = useState<GeoJSONFeature | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const { upvote, downvote, flag, getVoteState, isVoting } = useVoting();
  
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

  const getFeatureKey = (feature: GeoJSONFeature | null): string | null => {
    if (!feature) return null;
    const props = feature.properties;
    const explicit = String(props.source_record_id || props.id || '').trim();
    if (explicit) return explicit;

    const name = String(props.name || props.species || props.title || 'Record');
    if (feature.geometry?.type === 'Point') {
      const coords = feature.geometry.coordinates as number[];
      const lng = Number(coords?.[0] ?? 0);
      const lat = Number(coords?.[1] ?? 0);
      return `${name}:${lng.toFixed(5)},${lat.toFixed(5)}`;
    }
    return `${name}:${JSON.stringify(feature.geometry?.coordinates ?? '').slice(0, 64)}`;
  };

  const handleCategoryChange = (category: string | null) => {
    setSelectedCategory(category);

    // Sync the map layers to the data filters: if a category is chosen, only show that category.
    // If null (All), show everything.
    if (!layers.length) return;
    if (!category) {
      setLayers((prev) => prev.map((l) => ({ ...l, visible: true })));
      return;
    }
    setLayers((prev) =>
      prev.map((l) => ({
        ...l,
        visible: String(l.category || l.name).toUpperCase() === String(category).toUpperCase(),
      }))
    );
  };

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

  // Grid export handler
  const handleGridExport = (format: 'xlsx' | 'csv') => {
    handleExport(format);
  };

  const handleLayerToggle = (layerId: string) => {
    setLayers(prev => prev.map(l => 
      l.id === layerId ? { ...l, visible: !l.visible } : l
    ));
  };

  // Multi-format export handler
  const handleExport = async (format: ExportFormat) => {
    if (!features?.features?.length) {
      toast.error('No data to export');
      return;
    }
    
    setShowExportMenu(false);
    toast.loading(`Exporting as ${format.toUpperCase()}...`);
    
    try {
      await exportData({
        features: features.features,
        format,
        insights,
        queryInfo: {
          prompt,
          sources_used: sourcesUsed || collectedData.filter(d => d.status === 'success').map(d => d.source),
          processing_time_ms: processingTimeMs || totalTime,
        },
      });
      toast.dismiss();
      toast.success(`${format.toUpperCase()} exported successfully!`);
    } catch (e) {
      toast.dismiss();
      toast.error('Export failed');
    }
  };

  // Legacy handlers for backward compat
  const handleExportCSV = () => handleExport('csv');
  const handleExportGeoJSON = () => handleExport('geojson');

  const handleCopyQuery = () => {
    navigator.clipboard.writeText(prompt);
    toast.success('Query copied to clipboard');
  };

  const totalRecords = features?.features?.length || 0;
  const totalTime = collectedData.reduce((sum, d) => sum + d.collection_time_ms, 0);
  const successSources = collectedData.filter(d => d.status === 'success').length;

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex-none border-b border-border px-4 py-3 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onBack}
              className="hover:bg-secondary"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Logo />
            <div className="hidden md:block h-6 w-px bg-border" />
            <span className="hidden md:inline text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Results
            </span>
          </div>
          
          <div className="flex-1 max-w-xl mx-4">
            <button
              onClick={handleCopyQuery}
              className="w-full flex items-center gap-2 bg-secondary hover:bg-secondary/80 rounded-lg px-4 py-2 text-sm text-muted-foreground text-left transition-colors group"
            >
              <span className="truncate flex-1">{prompt}</span>
              <Copy className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
        
        {/* Auto-Enrichment Badges */}
        {enrichments.length > 0 && (
          <div className="mt-2 px-4">
            <EnrichmentBadges enrichments={enrichments} />
          </div>
        )}
      </header>

      {/* Main Content - Split View */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Map Panel - CRITICAL: explicit h-full on desktop for absolute positioned map child */}
        <div className="w-full lg:w-3/5 h-[45vh] lg:h-full relative border-b border-border lg:border-b-0 lg:border-r flex-shrink-0">
          <MapContainer
            features={features}
            layers={layers}
            center={mapCenter}
            zoom={mapCenter ? 9 : 4}
            selectedFeature={selectedFeature}
            onFeatureClick={(f) => {
              const feat = f as any as GeoJSONFeature;
              setSelectedFeature(feat);
              const cat = String(feat?.properties?.category || '').trim();
              if (cat) handleCategoryChange(cat);
            }}
            className="absolute inset-0 w-full h-full"
          />
          
          {/* Layer Controls */}
          {layers.length > 0 && (
            <LayerControls
              layers={layers}
              onToggle={handleLayerToggle}
              className="absolute top-4 left-4 w-60"
            />
          )}

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

        {/* Data Panel */}
        <div className="w-full lg:w-2/5 flex flex-col bg-card overflow-hidden flex-1">
          <Tabs defaultValue="data" className="flex-1 flex flex-col">
            <TabsList className="flex-none border-b border-border bg-transparent p-0 h-auto">
              <TabsTrigger 
                value="data"
                className="data-[state=active]:bg-accent rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-3.5 gap-2"
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Data</span>
                <span className="text-xs text-muted-foreground">({totalRecords})</span>
              </TabsTrigger>
              <TabsTrigger 
                value="insights"
                className="data-[state=active]:bg-accent rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-3.5 gap-2"
              >
                <Lightbulb className="w-4 h-4" />
                <span className="hidden sm:inline">Insights</span>
              </TabsTrigger>
              <TabsTrigger 
                value="grid"
                className="data-[state=active]:bg-accent rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-3.5 gap-2"
              >
                <Table className="w-4 h-4" />
                <span className="hidden sm:inline">Grid</span>
              </TabsTrigger>
              <TabsTrigger 
                value="sources"
                className="data-[state=active]:bg-accent rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-3.5 gap-2"
              >
                <Layers className="w-4 h-4" />
                <span className="hidden sm:inline">Sources</span>
              </TabsTrigger>
            </TabsList>

            {/* DATA SHOWCASE - Shows ACTUAL data not meta-charts */}
            <TabsContent value="data" className="flex-1 overflow-y-auto p-4 m-0">
              {features?.features?.length ? (
                <DataShowcase 
                  features={features.features} 
                  onFeatureClick={(f) => {
                    setSelectedFeature(f);
                    const cat = String(f?.properties?.category || '').trim();
                    if (cat) handleCategoryChange(cat);
                  }}
                  selectedCategory={selectedCategory}
                  onSelectedCategoryChange={handleCategoryChange}
                  selectedFeatureId={getFeatureKey(selectedFeature)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Database className="w-12 h-12 mb-3 opacity-30" />
                  <p className="font-medium">No data available</p>
                </div>
              )}
            </TabsContent>

            {/* Insights Tab */}
            <TabsContent value="insights" className="flex-1 overflow-y-auto p-5 space-y-5 m-0 scrollbar-hide">
              {insights ? (
                <>
                  {/* Summary Card */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card-glass p-5 gradient-border"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Sparkles className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">AI Summary</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{insights.summary}</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Key Findings */}
                  {insights.key_findings?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        Key Findings
                      </h3>
                      <div className="space-y-2">
                        {insights.key_findings.map((finding, i) => (
                          <motion.div 
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex gap-3 text-sm"
                          >
                            <ChevronRight className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-foreground">{finding}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {insights.recommendations?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3">Recommendations</h3>
                      <div className="space-y-2">
                        {insights.recommendations.map((rec, i) => (
                          <div key={i} className="bg-secondary/50 rounded-xl p-4 text-sm text-foreground border border-border/50">
                            {rec}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {insights.warnings?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-destructive mb-3">⚠️ Warnings</h3>
                      <div className="space-y-2">
                        {insights.warnings.map((warning, i) => (
                          <div key={i} className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 text-sm text-destructive">
                            {warning}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Related Queries */}
                  {insights.related_queries?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3">Related Queries</h3>
                      <div className="flex flex-wrap gap-2">
                        {insights.related_queries.map((q, i) => (
                          <button
                            key={i}
                            className="px-4 py-2 rounded-full bg-secondary hover:bg-primary/10 hover:text-primary text-xs font-medium text-muted-foreground transition-colors border border-border/50"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No AI insights generated</p>
                  <p className="text-sm mt-1">Try a more specific query for detailed analysis</p>
                </div>
              )}
            </TabsContent>

            {/* Grid Tab - Spreadsheet Grid */}
            <TabsContent value="grid" className="flex-1 overflow-hidden m-0">
              {features?.features?.length ? (
                <DataGrid
                  features={features.features}
                  onExport={handleGridExport}
                  onRowClick={(f) => setSelectedFeature(f)}
                  className="h-full rounded-none border-0"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Database className="w-12 h-12 mb-3 opacity-30" />
                  <p className="font-medium">No data available</p>
                  <p className="text-sm mt-1">Try a different query</p>
                </div>
              )}
            </TabsContent>

            {/* Sources Tab - Enhanced with clickable links */}
            <TabsContent value="sources" className="flex-1 overflow-y-auto p-4 m-0 scrollbar-hide">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1">
                  <Globe className="w-4 h-4 text-primary" />
                  Data Sources Queried
                </h3>
                <p className="text-xs text-muted-foreground">
                  Click on any source to visit their website or explore their API documentation
                </p>
              </div>
              <div className="space-y-3">
                {collectedData.map((source, i) => (
                  <SourceCard key={i} source={source} index={i} />
                ))}
              </div>
              
              {/* All Sources Registry Link */}
              <div className="mt-6 p-4 rounded-xl border border-dashed border-primary/30 bg-primary/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Link2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">70+ Data APIs Available</p>
                    <p className="text-xs text-muted-foreground">
                      BASED DATA aggregates data from government, scientific, and public sources worldwide
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
