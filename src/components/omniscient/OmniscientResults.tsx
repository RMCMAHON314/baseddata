// OMNISCIENT v4.1 - Results View
// Premium split-view with map + data panel + multi-format export + voting

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Layers, Table, Lightbulb, Download, 
  FileJson, FileSpreadsheet, Share2, ChevronRight, Clock, Database, 
  CheckCircle2, Zap, Globe, Sparkles, Copy, ExternalLink, Filter,
  ThumbsUp, ThumbsDown, Flag, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Logo } from '@/components/Logo';
import { MapContainer } from '@/components/map/MapContainer';
import { LayerControls } from '@/components/map/LayerControls';
import { FeaturePopup } from '@/components/map/FeaturePopup';
import type { GeoJSONFeature, GeoJSONFeatureCollection, CollectedData, OmniscientInsights, MapLayer } from '@/types/omniscient';
import { CATEGORY_COLORS } from '@/lib/mapbox';
import { toast } from 'sonner';
import { exportData, EXPORT_FORMATS, type ExportFormat } from '@/lib/export';
import { useVoting } from '@/hooks/useVoting';

interface OmniscientResultsProps {
  prompt: string;
  features?: GeoJSONFeatureCollection;
  collectedData: CollectedData[];
  insights?: OmniscientInsights;
  creditsUsed: number;
  processingTimeMs?: number;
  sourcesUsed?: string[];
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
  onBack 
}: OmniscientResultsProps) {
  const [selectedFeature, setSelectedFeature] = useState<GeoJSONFeature | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
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

  // Build tabular data from features with filtering
  const tabularData = useMemo(() => {
    if (!features?.features?.length) return [];
    let data = features.features.map(f => ({
      source: f.properties.source,
      category: f.properties.category,
      name: f.properties.name,
      description: f.properties.description || '',
      timestamp: f.properties.timestamp || '',
      confidence: f.properties.confidence || 0,
    }));
    
    if (searchFilter) {
      const filter = searchFilter.toLowerCase();
      data = data.filter(row => 
        row.name.toLowerCase().includes(filter) ||
        row.source.toLowerCase().includes(filter) ||
        row.category.toLowerCase().includes(filter)
      );
    }
    
    return data;
  }, [features, searchFilter]);

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
            <Logo variant="compact" />
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
            {/* Stats Pills */}
            <div className="hidden lg:flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {totalRecords} records
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                <Zap className="w-3.5 h-3.5" />
                {(totalTime / 1000).toFixed(1)}s
              </div>
            </div>
            
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <Share2 className="w-4 h-4 mr-2" />
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
              className="absolute top-4 left-4 w-60"
            />
          )}

          {/* Stats Overlay */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-4 left-4 card-glass px-4 py-3 space-y-2"
          >
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="font-medium text-foreground">{totalRecords}</span>
              <span className="text-muted-foreground">features loaded</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {(totalTime / 1000).toFixed(1)}s
              </span>
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                {successSources} sources
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {creditsUsed} credits
              </span>
            </div>
          </motion.div>

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
                className="data-[state=active]:bg-accent rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-5 py-3.5 gap-2"
              >
                <Lightbulb className="w-4 h-4" />
                <span className="hidden sm:inline">Insights</span>
              </TabsTrigger>
              <TabsTrigger 
                value="data"
                className="data-[state=active]:bg-accent rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-5 py-3.5 gap-2"
              >
                <Table className="w-4 h-4" />
                <span className="hidden sm:inline">Data</span>
                <span className="text-xs text-muted-foreground">({totalRecords})</span>
              </TabsTrigger>
              <TabsTrigger 
                value="sources"
                className="data-[state=active]:bg-accent rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-5 py-3.5 gap-2"
              >
                <Layers className="w-4 h-4" />
                <span className="hidden sm:inline">Sources</span>
                <span className="text-xs text-muted-foreground">({collectedData.length})</span>
              </TabsTrigger>
            </TabsList>

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

            {/* Data Tab */}
            <TabsContent value="data" className="flex-1 overflow-hidden m-0 flex flex-col">
              {/* Search/Filter */}
              <div className="flex-none p-3 border-b border-border">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Filter records..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-auto">
                {tabularData.length > 0 ? (
                  <table className="w-full text-xs">
                    <thead className="bg-secondary sticky top-0">
                      <tr>
                        <th className="text-left p-3 font-semibold text-foreground">Source</th>
                        <th className="text-left p-3 font-semibold text-foreground">Name</th>
                        <th className="text-left p-3 font-semibold text-foreground">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tabularData.slice(0, 200).map((row, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                          <td className="p-3 text-muted-foreground font-mono">{row.source}</td>
                          <td className="p-3 text-foreground">{row.name}</td>
                          <td className="p-3">
                            <span className="px-2 py-1 rounded-full bg-secondary text-muted-foreground text-xs">
                              {row.category}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No data available</p>
                  </div>
                )}
              </div>
              
              {/* Export Options - Multi-Format */}
              <div className="flex-none border-t border-border p-3 relative">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowExportMenu(!showExportMenu)} 
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} className="flex-1">
                    <FileText className="w-4 h-4 mr-2" />
                    PDF Report
                  </Button>
                </div>
                
                {/* Export Menu Dropdown */}
                <AnimatePresence>
                  {showExportMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-full left-3 right-3 mb-2 card-glass p-2 border border-border rounded-xl shadow-xl"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        {EXPORT_FORMATS.filter(f => f.format !== 'pdf').map(({ format, label, icon, description }) => (
                          <button
                            key={format}
                            onClick={() => handleExport(format)}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent text-left transition-colors"
                          >
                            <span className="text-xl">{icon}</span>
                            <div>
                              <div className="font-medium text-sm">{label}</div>
                              <div className="text-xs text-muted-foreground">{description}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </TabsContent>

            {/* Sources Tab */}
            <TabsContent value="sources" className="flex-1 overflow-y-auto p-4 m-0 scrollbar-hide">
              <div className="space-y-2">
                {collectedData.map((source, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`p-4 rounded-xl border transition-all ${
                      source.status === 'success'
                        ? 'bg-success/5 border-success/20 hover:border-success/40'
                        : source.status === 'error'
                        ? 'bg-destructive/5 border-destructive/20'
                        : 'bg-accent/50 border-border/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-foreground">{source.source}</span>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        source.status === 'success' 
                          ? 'bg-success/10 text-success' 
                          : source.status === 'error' 
                            ? 'bg-destructive/10 text-destructive' 
                            : 'bg-secondary text-muted-foreground'
                      }`}>
                        {source.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        {source.record_count} records
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {source.collection_time_ms}ms
                      </span>
                    </div>
                    {source.error && (
                      <p className="mt-2 text-xs text-destructive bg-destructive/5 rounded-lg p-2">
                        {source.error}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
