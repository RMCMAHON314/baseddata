// ============================================================================
// BASED DATA v10.0 - NUCLEAR RESULTS VIEW
// THE PALANTIR KILLER - Bloomberg Terminal meets Apple Maps meets Intelligence Platform
// ============================================================================

import { useState, useMemo, useCallback, useRef, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Table, Lightbulb, Share2, Database, 
  CheckCircle2, Sparkles, Copy, Search, Download, Eye,
  Filter, Layers, MapPin, ChevronDown, X, FileText,
  TrendingUp, Shield, DollarSign, Users, Target, List,
  Clock, PanelLeftClose, PanelLeft, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Logo } from '@/components/Logo';
import { SimpleMap } from '@/components/map/SimpleMap';
import { DataGrid } from '@/components/data/DataGrid';
import { ResultsDataTable } from '@/components/data/ResultsDataTable';
import { RecordDossier } from '@/components/dossier/RecordDossier';
import { EntityProfile } from '@/components/entity/EntityProfile';
import { EntityDeepDive } from '@/components/entity/EntityDeepDive';
import { HistorySidebar } from '@/components/history/HistorySidebar';
import { InsightsPanel } from '@/components/insights/InsightsPanel';
import { CriticalInsightsBanner } from '@/components/insights/CriticalInsightsBanner';
import { LiveDashboardStats } from '@/components/insights/LiveDashboardStats';
import type { GeoJSONFeature, GeoJSONFeatureCollection, CollectedData, OmniscientInsights, MapLayer } from '@/types/omniscient';
import { CATEGORY_COLORS } from '@/lib/mapbox';
import { toast } from 'sonner';
import { exportData, type ExportFormat } from '@/lib/export';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { deduplicateRecords, groupResults, getDataStats, type ProcessedRecord } from '@/lib/dataProcessing';
import { generateMockEnrichment, type EnrichedRecord } from '@/types/enriched';

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

// Category icons for filter sidebar - aligned with intelligence platform
const CATEGORY_ICONS: Record<string, string> = {
  WILDLIFE: '🦅',
  WEATHER: '🌤️',
  MARINE: '🌊',
  REGULATIONS: '📜',
  GOVERNMENT: '🏛️',
  GEOSPATIAL: '🗺️',
  TRANSPORTATION: '✈️',
  HEALTH: '🏥',
  HEALTHCARE: '🏥',
  ENERGY: '⚡',
  ECONOMIC: '💰',
  FINANCIAL: '💵',
  RECREATION: '🏕️',
  DEMOGRAPHICS: '👥',
  RESEARCH: '🔬',
  COMPLIANCE: '📋',
  ENVIRONMENTAL: '🌱',
};

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
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'grid'>('table');
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(true);
  const [historySidebarOpen, setHistorySidebarOpen] = useState(false);
  const [dossierRecord, setDossierRecord] = useState<EnrichedRecord | null>(null);
  const [entityProfileFeature, setEntityProfileFeature] = useState<GeoJSONFeature | null>(null);
  const [entityDeepDive, setEntityDeepDive] = useState<ProcessedRecord | null>(null);
  const [showInsightsPanel, setShowInsightsPanel] = useState(true); // Default open for NUCLEAR
  const [showCriticalBanner, setShowCriticalBanner] = useState(true);
  const dataScrollRef = useRef<HTMLDivElement>(null);

  // Process and deduplicate data
  const processedRecords = useMemo(() => {
    if (!features?.features?.length) return [];
    return deduplicateRecords(features.features);
  }, [features]);

  const groupedResults = useMemo(() => {
    return groupResults(processedRecords);
  }, [processedRecords]);

  const dataStats = useMemo(() => {
    return getDataStats(processedRecords);
  }, [processedRecords]);

  // Build layers from processed data
  const [layers, setLayers] = useState<MapLayer[]>(() => {
    if (!features?.features?.length) return [];
    const byCategory: Record<string, GeoJSONFeature[]> = {};
    for (const f of features.features) {
      const cat = (f.properties as Record<string, unknown>)?.category as string || 'UNKNOWN';
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

  // Filter by category
  const filteredRecords = useMemo(() => {
    if (!selectedCategory) return processedRecords;
    return processedRecords.filter(r => 
      String((r.properties as Record<string, unknown>)?.category || '').toUpperCase() === selectedCategory
    );
  }, [processedRecords, selectedCategory]);

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

  const totalRecords = dataStats.totalRecords;
  const successSources = collectedData.filter(d => d.status === 'success').length;

  const handleLayerToggle = useCallback((layerId: string) => {
    setLayers(prev => prev.map(l =>
      l.id === layerId ? { ...l, visible: !l.visible } : l
    ));
  }, []);

  const handleFeatureClick = useCallback((feature: GeoJSONFeature | ProcessedRecord) => {
    setSelectedFeature(feature as GeoJSONFeature);
    const cat = String((feature.properties as Record<string, unknown>)?.category || '').toUpperCase();
    if (cat) setSelectedCategory(cat);
  }, []);

  const handleOpenDossier = useCallback((record: ProcessedRecord) => {
    const enriched = generateMockEnrichment(record);
    setDossierRecord(enriched);
  }, []);

  const handleCopyQuery = () => {
    navigator.clipboard.writeText(prompt);
    toast.success('Query copied to clipboard');
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
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
      {/* Header Bar - White */}
      <header className="flex-none h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-4 z-40 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="text-slate-500 hover:text-slate-900 hover:bg-slate-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-3">
          <Logo variant="compact" />
          <div className="h-6 w-px bg-slate-200" />
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Results</span>
        </div>

        {/* Query Display */}
        <div className="flex-1 flex items-center gap-3 max-w-2xl mx-4">
          <Search className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <button
            onClick={handleCopyQuery}
            className="flex-1 text-left text-slate-800 font-medium truncate hover:text-blue-600 transition-colors group"
          >
            {prompt}
            <Copy className="w-4 h-4 ml-2 inline opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
          </button>
          {enrichments.length > 0 && (
            <div className="flex items-center gap-2 ml-4">
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                ✓ Auto-enriched
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
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
              className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
              <ChevronDown className="w-4 h-4 ml-1" />
            </Button>
            <AnimatePresence>
              {showExportMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl p-2 min-w-[160px] z-50 shadow-lg"
                >
                  {(['xlsx', 'csv', 'geojson', 'json'] as ExportFormat[]).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => handleExport(fmt)}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      Export as {fmt.toUpperCase()}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </header>

      {/* Smart Stats Dashboard - Category-specific intelligence */}
      <div className="flex-none px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {totalRecords} Results Found
            </h2>
            <p className="text-slate-500 text-sm">
              Aggregated from {successSources} sources across {dataStats.categories} categories
              {dataStats.totalDuplicatesRemoved > 0 && (
                <span className="text-slate-400"> • {dataStats.totalDuplicatesRemoved} duplicates removed</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInsightsPanel(!showInsightsPanel)}
              className={cn(
                "border-slate-200",
                showInsightsPanel && "bg-amber-50 border-amber-200 text-amber-700"
              )}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Insights
            </Button>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
              ✓ Deduplicated
            </span>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              {dataStats.geoPercent}% Geo
            </span>
          </div>
        </div>
        {/* NUCLEAR: Live Dashboard Stats */}
        <LiveDashboardStats records={processedRecords} />
        
        {/* NUCLEAR: Critical Insights Banner */}
        {showCriticalBanner && processedRecords.length > 0 && (
          <CriticalInsightsBanner 
            records={processedRecords}
            onShowOnMap={(records) => {
              // Filter map to show these records
              toast.success(`Showing ${records.length} records on map`);
            }}
            onViewDetails={(insight) => {
              if (insight.relatedRecords?.[0]) {
                setEntityDeepDive(insight.relatedRecords[0]);
              }
            }}
          />
        )}
        
        {/* Collapsible Insights Panel */}
        <AnimatePresence>
          {showInsightsPanel && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 320, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-slate-200 h-full">
                <ScrollArea className="h-[280px]">
                  <InsightsPanel
                    insights={insights}
                    records={processedRecords}
                  />
                </ScrollArea>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* History Sidebar (Vision: Left panel with search history) */}
        <AnimatePresence>
          {historySidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <HistorySidebar
                isCollapsed={false}
                onToggleCollapse={() => setHistorySidebarOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* History Toggle (when collapsed) */}
        {!historySidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setHistorySidebarOpen(true)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-30 bg-white border border-slate-200 shadow-md hover:bg-slate-50"
          >
            <Clock className="w-4 h-4" />
          </Button>
        )}

        {/* Filter Sidebar */}
        <aside className={cn(
          "w-64 bg-white border-r border-slate-200 flex flex-col transition-all duration-300",
          !filterSidebarOpen && "-ml-64"
        )}>
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-500" />
              Filters
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFilterSidebarOpen(false)}
              className="h-6 w-6"
            >
              <PanelLeftClose className="w-4 h-4" />
            </Button>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Categories */}
              <div>
                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Categories</h4>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                      !selectedCategory ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 text-slate-600"
                    )}
                  >
                    <span>All Categories</span>
                    <span className="ml-auto text-xs font-medium">{totalRecords}</span>
                  </button>
                  {layers.map(layer => (
                    <button
                      key={layer.id}
                      onClick={() => setSelectedCategory(layer.category as string)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                        selectedCategory === layer.category 
                          ? "bg-blue-50 text-blue-700" 
                          : "hover:bg-slate-50 text-slate-600"
                      )}
                    >
                      <span>{CATEGORY_ICONS[layer.category as string] || '📊'}</span>
                      <span className="truncate">{layer.name}</span>
                      <span className="ml-auto text-xs font-medium">{layer.features?.length || 0}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Layer Visibility */}
              <div>
                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Map Layers</h4>
                <div className="space-y-1">
                  {layers.map(layer => (
                    <label
                      key={layer.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={layer.visible}
                        onChange={() => handleLayerToggle(layer.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: layer.color }}
                      />
                      <span className="text-sm text-slate-600">{layer.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Insights Panel (in sidebar when not table view) */}
              {viewMode !== 'table' && (
                <div className="pt-4 border-t border-slate-200">
                  <InsightsPanel
                    insights={insights}
                    records={processedRecords}
                    compact={true}
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Filter Toggle (when collapsed) */}
        {!filterSidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setFilterSidebarOpen(true)}
            className="absolute left-2 top-20 z-30 bg-white border border-slate-200 shadow-md hover:bg-slate-50"
          >
            <PanelLeft className="w-4 h-4" />
          </Button>
        )}

        {/* Map & Data Panel */}
        <div className="flex-1 flex flex-col lg:flex-row min-w-0">
          {/* Map */}
          <div className="flex-1 relative min-h-[300px] lg:min-h-0">
            <SimpleMap
              features={features}
              layers={layers}
              center={mapCenter}
              zoom={mapCenter ? 10 : 4}
              selectedFeature={selectedFeature}
              hoveredFeature={hoveredFeature}
              onFeatureClick={handleFeatureClick}
              onFeatureHover={setHoveredFeature}
              onCursorMove={setCursorCoords}
              className="w-full h-full"
            />
            
            {/* Coordinates Display */}
            <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg border border-slate-200 text-xs text-slate-500 font-mono">
              {cursorCoords 
                ? `${cursorCoords.lat.toFixed(5)}°, ${cursorCoords.lng.toFixed(5)}°`
                : 'Hover for coordinates'
              }
            </div>
          </div>

          {/* Data Cards / Grid Panel */}
          <div className="w-full lg:w-[480px] flex flex-col bg-white border-l border-slate-200">
            {/* Panel Header */}
            <div className="flex-none px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('table')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    viewMode === 'table' ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <List className="w-4 h-4" />
                  Table
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    viewMode === 'cards' ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Eye className="w-4 h-4" />
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    viewMode === 'grid' ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Table className="w-4 h-4" />
                  Grid
                </button>
              </div>
              <span className="text-xs text-slate-400">{filteredRecords.length} records</span>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
              {viewMode === 'table' ? (
                <div className="p-4">
                  <ResultsDataTable 
                    records={filteredRecords}
                    onRowClick={handleFeatureClick}
                    onOpenDossier={handleOpenDossier}
                  />
                </div>
              ) : viewMode === 'cards' ? (
                <div ref={dataScrollRef} className="p-4 space-y-6">
                  {/* Grouped Results */}
                  {Object.entries(groupedResults).map(([groupName, items]) => (
                    <div key={groupName} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                          {groupName}
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                            {items.length}
                          </span>
                        </h3>
                      </div>
                      
                      <div className="space-y-2">
                        {items.slice(0, 5).map((record, i) => (
                          <ResultCard
                            key={record.id}
                            record={record}
                            isSelected={selectedFeature === record}
                            isHovered={hoveredFeature === record}
                            onHover={() => setHoveredFeature(record)}
                            onHoverEnd={() => hoveredFeature === record && setHoveredFeature(null)}
                            onClick={() => handleFeatureClick(record)}
                            onOpenDossier={() => handleOpenDossier(record)}
                          />
                        ))}
                        {items.length > 5 && (
                          <button className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                            View all {items.length} {groupName.toLowerCase()} →
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* AI Insights */}
                  {insights && (
                    <div className="mt-6 pt-6 border-t border-slate-200">
                      <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        AI Insights
                      </h3>
                      
                      <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100">
                        <p className="text-slate-700 text-sm leading-relaxed">{insights.summary}</p>
                      </div>

                      {insights.key_findings?.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide">Key Findings</h4>
                          {insights.key_findings.map((finding, i) => (
                            <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-slate-50">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                              <p className="text-slate-600 text-sm">{finding}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {insights.recommendations?.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide">Recommendations</h4>
                          {insights.recommendations.map((rec, i) => (
                            <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-slate-50">
                              <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                              <p className="text-slate-600 text-sm">{rec}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <DataGrid
                  features={filteredRecords}
                  onExport={(fmt) => handleExport(fmt)}
                  onRowClick={handleFeatureClick}
                  className="h-full rounded-none border-0"
                />
              )}
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* 10x Enriched Dossier Panel */}
      <AnimatePresence>
        {dossierRecord && (
          <RecordDossier 
            record={dossierRecord} 
            onClose={() => setDossierRecord(null)} 
          />
        )}
        {entityProfileFeature && !dossierRecord && (
          <EntityProfile 
            feature={entityProfileFeature}
            relatedFeatures={filteredRecords.filter(r => 
              r !== entityProfileFeature && 
              String((r.properties as Record<string, unknown>)?.category) === String((entityProfileFeature.properties as Record<string, unknown>)?.category)
            ).slice(0, 5)}
            onClose={() => setEntityProfileFeature(null)}
            onViewRelated={(f) => setEntityProfileFeature(f)}
          />
        )}
      </AnimatePresence>
    </div>
    </TooltipProvider>
  );
}

// Quick Stat Component
function QuickStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

// Result Card Component - Light Theme with 10x Dossier
const ResultCard = forwardRef<HTMLDivElement, {
  record: ProcessedRecord;
  isSelected?: boolean;
  isHovered?: boolean;
  onHover?: () => void;
  onHoverEnd?: () => void;
  onClick?: () => void;
  onOpenDossier?: () => void;
}>(({ 
  record, 
  isSelected, 
  isHovered, 
  onHover, 
  onHoverEnd, 
  onClick,
  onOpenDossier
}, ref) => {
  const props = (record.properties || {}) as Record<string, unknown>;
  const category = String(props.category || 'OTHER').toUpperCase();
  const color = CATEGORY_COLORS[category] || '#3B82F6';
  const title = record.displayName;
  const source = String(props.source || '');
  const quality = record.bestConfidence;
  const address = props.address ? String(props.address) : undefined;
  const description = props.description ? String(props.description) : undefined;

  // Generate enrichment preview data
  const enrichmentPreview = useMemo(() => {
    const mockEnriched = generateMockEnrichment(record);
    return {
      qualityScore: mockEnriched.scores.overall_quality,
      riskScore: mockEnriched.scores.risk_score,
      opportunityScore: mockEnriched.scores.opportunity_score,
      ownership: mockEnriched.ownership.owner_type,
      complianceStatus: mockEnriched.regulatory.compliance_status,
      investment: mockEnriched.financial.total_public_investment,
      population: mockEnriched.context.demographics.population_1mi,
    };
  }, [record]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer",
        isSelected && "ring-2 ring-blue-500 border-blue-500",
        isHovered && !isSelected && "border-blue-200 shadow-md"
      )}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      onClick={onClick}
    >
      {/* Category Header */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {category}
          </span>
        </div>
        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
          {source}
        </span>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 text-lg mb-1 line-clamp-2">
          {title}
        </h3>
        {(description || address) && (
          <p className="text-sm text-slate-500 mb-3 line-clamp-2">
            {address || description}
          </p>
        )}
        
        {/* 10x Intelligence Preview */}
        <div className="grid grid-cols-4 gap-2 mb-3 p-3 bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-xl border border-slate-100">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Target className="w-3 h-3 text-emerald-500" />
              <span className="text-xs font-bold text-slate-900">{enrichmentPreview.qualityScore}</span>
            </div>
            <span className="text-[10px] text-slate-400">Quality</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Shield className="w-3 h-3 text-amber-500" />
              <span className="text-xs font-bold text-slate-900">{enrichmentPreview.riskScore}</span>
            </div>
            <span className="text-[10px] text-slate-400">Risk</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3 text-blue-500" />
              <span className="text-xs font-bold text-slate-900">{enrichmentPreview.opportunityScore}</span>
            </div>
            <span className="text-[10px] text-slate-400">Opportunity</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Users className="w-3 h-3 text-purple-500" />
              <span className="text-xs font-bold text-slate-900">{(enrichmentPreview.population / 1000).toFixed(0)}K</span>
            </div>
            <span className="text-[10px] text-slate-400">Pop 1mi</span>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className={cn(
            "text-xs px-2 py-1 rounded-full",
            enrichmentPreview.ownership === 'government' 
              ? "bg-emerald-100 text-emerald-700" 
              : enrichmentPreview.ownership === 'nonprofit'
              ? "bg-blue-100 text-blue-700"
              : "bg-slate-100 text-slate-600"
          )}>
            {enrichmentPreview.ownership}
          </span>
          <span className={cn(
            "text-xs px-2 py-1 rounded-full",
            enrichmentPreview.complianceStatus === 'compliant' 
              ? "bg-emerald-100 text-emerald-700" 
              : enrichmentPreview.complianceStatus === 'major_issues'
              ? "bg-red-100 text-red-700"
              : "bg-amber-100 text-amber-700"
          )}>
            {enrichmentPreview.complianceStatus}
          </span>
          {enrichmentPreview.investment > 0 && (
            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
              ${(enrichmentPreview.investment / 1000).toFixed(0)}K invested
            </span>
          )}
        </div>
        
        {/* Duplicate indicator */}
        {record.duplicateCount > 1 && (
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
              Found in {record.duplicateCount} records
            </span>
            <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
              {record.sources.length} sources
            </span>
          </div>
        )}
        
        {/* Footer with Dossier Button */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <MapPin className="w-3 h-3" />
              <span>Geo</span>
            </div>
            {/* 10x Dossier Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenDossier?.();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-full transition-all shadow-sm hover:shadow-md"
            >
              <FileText className="w-3 h-3" />
              <span>10x Dossier</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full"
                style={{ 
                  width: `${quality * 100}%`,
                  backgroundColor: quality > 0.7 ? '#10B981' : quality > 0.4 ? '#F59E0B' : '#EF4444'
                }}
              />
            </div>
            <span className="text-xs text-slate-500">{Math.round(quality * 100)}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

ResultCard.displayName = 'ResultCard';