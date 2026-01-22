// BASED DATA v8.1 - Premium Results View
// Bloomberg Terminal meets Apple Maps meets Palantir
// Full three-column layout with glass morphism, 3D map, premium UI, two-way sync

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Table, Lightbulb, Share2, Database, 
  CheckCircle2, Sparkles, Copy, Search, Download, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';

import { TooltipProvider } from '@/components/ui/tooltip';
import { Logo } from '@/components/Logo';
import { SimpleMap } from '@/components/map/SimpleMap';
import { PremiumLayerPanel } from '@/components/map/PremiumLayerPanel';
import { PremiumStatsBar } from '@/components/map/PremiumStatsBar';
import { PremiumDetailPanel, PremiumHoverPopup } from '@/components/map/PremiumMapPopup';
import { PremiumRecordCard } from '@/components/map/PremiumRecordCard';
import { DataGrid } from '@/components/data/DataGrid';
import type { GeoJSONFeature, GeoJSONFeatureCollection, CollectedData, OmniscientInsights, MapLayer } from '@/types/omniscient';
import { CATEGORY_COLORS } from '@/lib/mapbox';
import { toast } from 'sonner';
import { exportData, type ExportFormat } from '@/lib/export';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PremiumOmniscientResultsProps {
  prompt: string;
  features?: GeoJSONFeatureCollection;
  collectedData: CollectedData[];
  insights?: OmniscientInsights;
  creditsUsed: number;
  processingTimeMs?: number;
  sourcesUsed?: string[];
  enrichments?: string[];
  onBack: () => void;
}

export function PremiumOmniscientResults({
  prompt,
  features,
  collectedData,
  insights,
  creditsUsed,
  processingTimeMs = 0,
  sourcesUsed,
  enrichments = [],
  onBack,
}: PremiumOmniscientResultsProps) {
  const [selectedFeature, setSelectedFeature] = useState<GeoJSONFeature | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<GeoJSONFeature | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cursorCoords, setCursorCoords] = useState<{ lng: number; lat: number } | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [layerOpacities, setLayerOpacities] = useState<Record<string, number>>({});
  const [showExportMenu, setShowExportMenu] = useState(false);
  const dataScrollRef = useRef<HTMLDivElement>(null);

  // Build layers
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
      color: CATEGORY_COLORS[cat] || '#3B82F6',
    }));
  });

  // Map center
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

  const totalRecords = features?.features?.length || 0;
  const successSources = collectedData.filter(d => d.status === 'success').length;
  const totalSources = collectedData.length;
  const successRate = totalSources > 0 ? (successSources / totalSources) * 100 : 0;

  const handleLayerToggle = useCallback((layerId: string) => {
    setLayers(prev => prev.map(l =>
      l.id === layerId ? { ...l, visible: !l.visible } : l
    ));
  }, []);

  const handleLayerOpacity = useCallback((layerId: string, opacity: number) => {
    setLayerOpacities(prev => ({ ...prev, [layerId]: opacity }));
  }, []);

  const handleFeatureClick = useCallback((feature: GeoJSONFeature) => {
    setSelectedFeature(feature);
    setShowDetailPanel(true);
    const cat = String(feature.properties?.category || '').toUpperCase();
    if (cat) setSelectedCategory(cat);
    // Scroll corresponding card into view in data panel
    const idx = features?.features?.findIndex(f => f === feature) ?? -1;
    if (idx >= 0) {
      setTimeout(() => {
        const el = document.getElementById(`record-card-${idx}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [features]);

  const handleCopyQuery = () => {
    navigator.clipboard.writeText(prompt);
    toast.success('Query copied');
  };

  const handleExport = async (format: ExportFormat) => {
    if (!features?.features?.length) {
      toast.error('No data to export');
      return;
    }
    setShowExportMenu(false);
    toast.loading(`Exporting ${format.toUpperCase()}...`);
    try {
      await exportData({
        features: features.features,
        format,
        insights,
        queryInfo: { prompt, sources_used: sourcesUsed || [], processing_time_ms: processingTimeMs },
      });
      toast.dismiss();
      toast.success('Export complete');
    } catch {
      toast.dismiss();
      toast.error('Export failed');
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
    <div className="h-screen flex flex-col bg-black text-white overflow-hidden">
      {/* Top Header Bar */}
      <header className="flex-none h-16 bg-black/80 backdrop-blur-xl border-b border-white/10 flex items-center px-6 gap-4 z-40">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-3">
          <Logo variant="compact" />
          <div className="h-6 w-px bg-white/20" />
          <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Results</span>
        </div>

        {/* Query Display */}
        <div className="flex-1 flex items-center gap-3 max-w-2xl mx-4">
          <Search className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          <button
            onClick={handleCopyQuery}
            className="flex-1 text-left text-white font-medium truncate hover:text-cyan-400 transition-colors group"
          >
            {prompt}
            <Copy className="w-4 h-4 ml-2 inline opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          {enrichments.length > 0 && (
            <div className="flex items-center gap-2 ml-4">
              <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                ✓ Auto-enriched
              </span>
              <span className="px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-medium">
                ✓ Cross-Referenced
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <AnimatePresence>
              {showExportMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute right-0 top-full mt-1 bg-black/95 border border-white/20 rounded-lg p-2 min-w-[140px] z-50"
                >
                  {(['csv', 'xlsx', 'geojson', 'json'] as ExportFormat[]).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => handleExport(fmt)}
                      className="w-full text-left px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button
            size="sm"
            className="bg-cyan-500 hover:bg-cyan-400 text-black"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </header>

      {/* Main Three-Column Layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Sidebar - Layer Panel */}
        <PremiumLayerPanel
          layers={layers}
          onToggle={handleLayerToggle}
          onOpacityChange={handleLayerOpacity}
          totalFeatures={totalRecords}
          sourcesCount={successSources}
          className="hidden lg:flex flex-shrink-0"
        />

        {/* Center - Compact Map */}
        <div className="w-[400px] flex flex-col min-h-0 flex-shrink-0">
          {/* MAP CONTAINER - Compact size */}
          <div className="flex-1 relative min-h-0">
            <div className="absolute inset-0">
              <SimpleMap
                features={features}
                layers={layers}
                layerOpacities={layerOpacities}
                center={mapCenter}
                zoom={mapCenter ? 9 : 4}
                selectedFeature={selectedFeature}
                hoveredFeature={hoveredFeature}
                onFeatureClick={handleFeatureClick}
                onFeatureHover={setHoveredFeature}
                onCursorMove={setCursorCoords}
                className="w-full h-full"
              />
            </div>
            
            {/* Hover Popup */}
            <AnimatePresence>
              {hoveredFeature && !showDetailPanel && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                  <PremiumHoverPopup feature={hoveredFeature} />
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Stats Bar */}
          <PremiumStatsBar
            totalRecords={totalRecords}
            sourcesCount={successSources}
            successRate={successRate}
            cursorCoords={cursorCoords}
            queryTimeMs={processingTimeMs}
          />
        </div>

        {/* Data Panels - All visible at once */}
        <div className="flex-1 h-full flex min-w-0 border-l border-white/10">
          {/* Data Cards Column */}
          <div className="w-[280px] flex-shrink-0 flex flex-col map-panel-glass border-r border-white/10">
            <div className="flex-none px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-white">Data</span>
                <span className="text-xs text-white/50">({totalRecords})</span>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div ref={dataScrollRef} className="p-3 space-y-2">
                {features?.features?.slice(0, 50).map((record, i) => (
                  <PremiumRecordCard
                    key={i}
                    id={`record-card-${i}`}
                    record={record}
                    index={i}
                    isSelected={selectedFeature === record}
                    isHovered={hoveredFeature === record}
                    onHover={() => setHoveredFeature(record)}
                    onHoverEnd={() => hoveredFeature === record && setHoveredFeature(null)}
                    onClick={() => handleFeatureClick(record)}
                  />
                ))}
                {(!features?.features?.length) && (
                  <div className="text-center py-8 text-white/50">
                    <Database className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No data</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Insights Column */}
          <div className="w-[260px] flex-shrink-0 flex flex-col map-panel-glass border-r border-white/10">
            <div className="flex-none px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-white">Insights</span>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-3">
                {insights ? (
                  <>
                    {/* AI Summary */}
                    <div className="p-3 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-3 h-3 text-cyan-400" />
                        <span className="text-xs font-medium text-cyan-400">AI Summary</span>
                      </div>
                      <p className="text-white/80 text-xs leading-relaxed">{insights.summary}</p>
                    </div>

                    {/* Key Findings */}
                    {insights.key_findings?.length > 0 && (
                      <div className="space-y-1.5">
                        <h4 className="text-white/50 text-[10px] font-medium uppercase tracking-wide">
                          Key Findings
                        </h4>
                        {insights.key_findings.map((finding, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-white/5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <p className="text-white/70 text-xs">{finding}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Recommendations */}
                    {insights.recommendations?.length > 0 && (
                      <div className="space-y-1.5">
                        <h4 className="text-white/50 text-[10px] font-medium uppercase tracking-wide">
                          Recommendations
                        </h4>
                        {insights.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-white/5">
                            <Lightbulb className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                            <p className="text-white/70 text-xs">{rec}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-white/50">
                    <Lightbulb className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No insights</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Grid Column - Expands */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-none px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-white">Grid</span>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              {features?.features?.length ? (
                <DataGrid
                  features={features.features}
                  onExport={(fmt) => handleExport(fmt)}
                  onRowClick={handleFeatureClick}
                  className="h-full rounded-none border-0"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-white/50">
                  <Database className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">No data</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Panel (slides in from right) */}
      <AnimatePresence>
        {showDetailPanel && selectedFeature && (
          <PremiumDetailPanel
            feature={selectedFeature}
            onClose={() => setShowDetailPanel(false)}
          />
        )}
      </AnimatePresence>
    </div>
    </TooltipProvider>
  );
}
