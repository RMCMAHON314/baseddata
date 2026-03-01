// BASED DATA - Market Explorer — Geospatial Intelligence Map + Contract Explorer
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Download, Building2, DollarSign, SlidersHorizontal,
  BookmarkPlus, X, ChevronRight, Loader2, Compass, Users, FileText, Shield,
  Map as MapIcon, Table, Target, Network, Flame, ChevronDown, MapPin, Eye, EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { PremiumMapContainer } from '@/components/map/PremiumMapContainer';
import { supabase } from '@/integrations/supabase/client';
import { useMarketExplorer, useMarketFilterOptions, useSaveSearch } from '@/hooks';
import { useDebounce } from '@/hooks/useDebounce';
import { useExportCSV } from '@/hooks/useExportData';
import { useGeoEntities, useStateSpending, STATE_CENTERS } from '@/hooks/useGeoData';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import type { GeoJSONFeatureCollection, GeoJSONFeature } from '@/types/omniscient';

type ViewMode = 'map' | 'table';
type MapMode = 'entities' | 'spending' | 'opportunities';

interface MarketFilters {
  state?: string;
  agency?: string;
  naics?: string;
  setAside?: string;
  keyword?: string;
}

function fmt(v: number | null) {
  if (!v) return '$0';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const ENTITY_TYPE_COLORS: Record<string, string> = {
  'Company': '#3B82F6',
  'Agency': '#EF4444',
  'University': '#22C55E',
  'Non-profit': '#EAB308',
  'Government': '#EF4444',
};

const QUICK_FILTERS = [
  { label: 'Maryland + DoD', filters: { state: 'MD', agency: 'DEPT OF DEFENSE' } },
  { label: 'Virginia IT', filters: { state: 'VA', naics: '541512' } },
  { label: 'Small Business', filters: { setAside: 'SBA' } },
];

const MAP_MODES: { key: MapMode; label: string; icon: typeof Building2; desc: string }[] = [
  { key: 'entities', label: 'Entities', icon: Building2, desc: 'Geocoded entities sized by contract value' },
  { key: 'spending', label: 'Spending', icon: DollarSign, desc: 'Contract spending by state' },
  { key: 'opportunities', label: 'Opportunities', icon: Target, desc: 'Active opportunities by location' },
];

export default function MarketExplorer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [mapMode, setMapMode] = useState<MapMode>('entities');
  const [selectedFeature, setSelectedFeature] = useState<GeoJSONFeature | null>(null);
  const [filterPanelOpen, setFilterPanelOpen] = useState(true);
  const [dataPanelOpen, setDataPanelOpen] = useState(false);

  // Filters
  const [filters, setFilters] = useState<MarketFilters>({
    state: searchParams.get('state') || undefined,
    agency: searchParams.get('agency') || undefined,
    naics: searchParams.get('naics') || undefined,
    setAside: searchParams.get('setAside') || undefined,
    keyword: searchParams.get('keyword') || undefined,
  });
  const [naicsInput, setNaicsInput] = useState(filters.naics || '');
  const [keywordInput, setKeywordInput] = useState(filters.keyword || '');
  const debouncedNaics = useDebounce(naicsInput, 500);
  const debouncedKeyword = useDebounce(keywordInput, 500);

  // Save search
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveNotify, setSaveNotify] = useState(false);

  // Table
  const [sortField, setSortField] = useState<string>('award_amount');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const PAGE_SIZE = 25;

  useEffect(() => {
    setFilters(f => ({ ...f, naics: debouncedNaics || undefined }));
  }, [debouncedNaics]);
  useEffect(() => {
    setFilters(f => ({ ...f, keyword: debouncedKeyword || undefined }));
  }, [debouncedKeyword]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.state) params.set('state', filters.state);
    if (filters.agency) params.set('agency', filters.agency);
    if (filters.naics) params.set('naics', filters.naics);
    if (filters.setAside) params.set('setAside', filters.setAside);
    if (filters.keyword) params.set('keyword', filters.keyword);
    setSearchParams(params, { replace: true });
    setCurrentPage(0);
  }, [filters]);

  const hasFilters = Object.values(filters).some(Boolean);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // Data hooks
  const { data: filterOptions } = useMarketFilterOptions();
  const { data: results, isLoading: loadingResults, isFetching } = useMarketExplorer(filters);
  const saveSearchMutation = useSaveSearch();
  const { exportToCSV } = useExportCSV();

  // Geo data
  const { data: geoEntities, isLoading: loadingGeo } = useGeoEntities({
    state: filters.state,
    entityType: undefined,
    agency: filters.agency,
    naics: filters.naics,
  });
  const { data: stateSpending } = useStateSpending();

  // Convert geo entities to GeoJSON
  const entityFeatures = useMemo<GeoJSONFeatureCollection>(() => {
    if (!geoEntities?.length) return { type: 'FeatureCollection', features: [] };
    return {
      type: 'FeatureCollection',
      features: geoEntities.map(e => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [e.longitude, e.latitude] },
        properties: {
          source: 'core_entities',
          source_id: e.id,
          category: 'GOVERNMENT',
          name: e.canonical_name,
          description: `${e.entity_type} · ${e.city || ''}, ${e.state || ''} · ${fmt(e.total_contract_value)}`,
          entity_type: e.entity_type,
          total_value: e.total_contract_value || 0,
          contract_count: e.contract_count || 0,
          state: e.state,
          city: e.city,
        },
      })),
    };
  }, [geoEntities]);

  // Convert state spending to GeoJSON bubbles
  const spendingFeatures = useMemo<GeoJSONFeatureCollection>(() => {
    if (!stateSpending?.length) return { type: 'FeatureCollection', features: [] };
    return {
      type: 'FeatureCollection',
      features: stateSpending
        .filter(s => STATE_CENTERS[s.state])
        .map(s => {
          const [lng, lat] = STATE_CENTERS[s.state];
          return {
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [lng, lat] },
            properties: {
              source: 'spending',
              source_id: s.state,
              category: 'ECONOMIC',
              name: s.state,
              description: `${fmt(s.total_value)} across ${s.contract_count} contracts`,
              total_value: s.total_value,
              contract_count: s.contract_count,
              entity_count: s.entity_count,
            },
          };
        }),
    };
  }, [stateSpending]);

  const activeFeatures = useMemo(() => {
    switch (mapMode) {
      case 'entities': return entityFeatures;
      case 'spending': return spendingFeatures;
      default: return entityFeatures;
    }
  }, [mapMode, entityFeatures, spendingFeatures]);

  // HHI market intel
  const { data: marketIntel } = useQuery({
    queryKey: ['market-intel-hhi', filters.naics, filters.agency, filters.state],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('compute_market_concentration', {
        p_naics: filters.naics || null,
        p_agency: filters.agency || null,
        p_state: filters.state || null,
      });
      if (error) throw error;
      return (data as any)?.[0] || null;
    },
    enabled: hasFilters,
    staleTime: 5 * 60 * 1000,
  });

  // Market summary
  const summary = useMemo(() => {
    if (!results || results.length === 0) return null;
    const totalValue = results.reduce((s, c) => s + (Number(c.award_amount) || 0), 0);
    const uniqueEntities = new Set(results.map(c => c.recipient_entity_id).filter(Boolean));
    return { totalValue, contractorCount: uniqueEntities.size, contractCount: results.length, avgSize: results.length > 0 ? totalValue / results.length : 0 };
  }, [results]);

  // Top contractors chart
  const topContractors = useMemo(() => {
    if (!results) return [];
    const entityMap = new Map<string, { name: string; id: string; value: number }>();
    for (const c of results) {
      const entity = c.entity as any;
      if (!entity?.id) continue;
      const existing = entityMap.get(entity.id) || { name: entity.canonical_name || 'Unknown', id: entity.id, value: 0 };
      existing.value += Number(c.award_amount) || 0;
      entityMap.set(entity.id, existing);
    }
    return [...entityMap.values()].sort((a, b) => b.value - a.value).slice(0, 5);
  }, [results]);

  // Sorted + paginated
  const displayResults = useMemo(() => {
    if (!results) return [];
    const sorted = [...results].sort((a, b) => {
      const aVal = (a as any)[sortField];
      const bVal = (b as any)[sortField];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'string') return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
    return sorted.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  }, [results, sortField, sortAsc, currentPage]);

  const totalPages = results ? Math.ceil(results.length / PAGE_SIZE) : 0;

  const clearFilters = () => { setFilters({}); setNaicsInput(''); setKeywordInput(''); };
  const handleSort = (field: string) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  };

  const handleSaveSearch = async () => {
    if (!saveName.trim()) return;
    try {
      await saveSearchMutation.mutateAsync({
        name: saveName,
        query: Object.entries(filters).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join('&'),
        filters: filters as Record<string, unknown>,
        notify: saveNotify,
      });
      toast.success('Search saved!', {
        description: 'View in Saved Searches.',
        action: { label: 'View', onClick: () => navigate('/saved-searches') },
      });
      setSaveOpen(false); setSaveName(''); setSaveNotify(false);
    } catch { toast.error('Failed to save search. Are you signed in?'); }
  };

  const handleExport = () => {
    if (!results) return;
    exportToCSV(
      results.map(c => ({
        recipient: (c.entity as any)?.canonical_name || c.recipient_name || '',
        agency: c.awarding_agency || '',
        value: c.award_amount || 0,
        award_date: c.award_date || '',
        naics: c.naics_code || '',
        state: c.pop_state || '',
        description: c.description || '',
      })),
      'market-explorer'
    );
  };

  const handleFeatureClick = useCallback((feature: GeoJSONFeature) => {
    setSelectedFeature(feature);
    setDataPanelOpen(true);
  }, []);

  // Selected state spending data for the data panel
  const selectedStateData = useMemo(() => {
    if (!selectedFeature) return null;
    const id = selectedFeature.properties?.source_id;
    if (mapMode === 'spending' && stateSpending) {
      return stateSpending.find(s => s.state === id) || null;
    }
    return null;
  }, [selectedFeature, mapMode, stateSpending]);

  const FilterControls = () => (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-medium mb-1 block">State</Label>
        <Select value={filters.state || '__all__'} onValueChange={v => setFilters(f => ({ ...f, state: v === '__all__' ? undefined : v }))}>
          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="All states" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All states</SelectItem>
            {(filterOptions?.states || []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs font-medium mb-1 block">Agency</Label>
        <Select value={filters.agency || '__all__'} onValueChange={v => setFilters(f => ({ ...f, agency: v === '__all__' ? undefined : v }))}>
          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="All agencies" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All agencies</SelectItem>
            {(filterOptions?.agencies || []).map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs font-medium mb-1 block">NAICS Code</Label>
        <Input value={naicsInput} onChange={e => setNaicsInput(e.target.value)} placeholder="e.g. 541512" className="h-8 text-sm" />
      </div>
      <div>
        <Label className="text-xs font-medium mb-1 block">Set-Aside</Label>
        <Select value={filters.setAside || '__all__'} onValueChange={v => setFilters(f => ({ ...f, setAside: v === '__all__' ? undefined : v }))}>
          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All types</SelectItem>
            {(filterOptions?.setAsides || []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs font-medium mb-1 block">Keyword</Label>
        <Input value={keywordInput} onChange={e => setKeywordInput(e.target.value)} placeholder="Search descriptions..." className="h-8 text-sm" />
      </div>
      <Button onClick={clearFilters} variant="outline" size="sm" className="w-full">Clear All</Button>
    </div>
  );

  return (
    <GlobalLayout>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="container py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Compass className="h-6 w-6 text-primary" />
                  Market Explorer
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">Geospatial intelligence across federal contracts, entities, and opportunities</p>
              </div>
              <div className="flex items-center gap-2">
                {/* View toggle */}
                <div className="flex items-center bg-secondary rounded-lg p-0.5">
                  <Button
                    variant={viewMode === 'map' ? 'default' : 'ghost'}
                    size="sm"
                    className="gap-1.5 h-8"
                    onClick={() => setViewMode('map')}
                  >
                    <MapIcon className="h-4 w-4" />Map
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    className="gap-1.5 h-8"
                    onClick={() => setViewMode('table')}
                  >
                    <Table className="h-4 w-4" />Table
                  </Button>
                </div>

                {hasFilters && (
                  <Button variant="outline" size="sm" onClick={() => setSaveOpen(true)} className="gap-1.5 h-8">
                    <BookmarkPlus className="h-4 w-4" />Save
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleExport} disabled={!results?.length} className="h-8">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Map mode toggles (only in map view) */}
            {viewMode === 'map' && (
              <div className="flex items-center gap-2 mt-3">
                {MAP_MODES.map(mode => (
                  <Button
                    key={mode.key}
                    variant={mapMode === mode.key ? 'default' : 'outline'}
                    size="sm"
                    className="gap-1.5 h-8"
                    onClick={() => setMapMode(mode.key)}
                  >
                    <mode.icon className="h-3.5 w-3.5" />
                    {mode.label}
                  </Button>
                ))}
                <span className="text-xs text-muted-foreground ml-2 hidden md:inline">
                  {MAP_MODES.find(m => m.key === mapMode)?.desc}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        {viewMode === 'map' ? (
          <div className="flex-1 flex relative" style={{ minHeight: 'calc(100vh - 200px)' }}>
            {/* Left filter panel */}
            <AnimatePresence>
              {filterPanelOpen && (
                <motion.aside
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 260, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="border-r border-border bg-card overflow-y-auto shrink-0 hidden lg:block"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold flex items-center gap-1.5">
                        <Filter className="h-4 w-4" />Filters
                      </h3>
                      {activeFilterCount > 0 && <Badge variant="secondary" className="text-xs">{activeFilterCount}</Badge>}
                    </div>
                    <FilterControls />
                  </div>

                  {/* Quick filters */}
                  <div className="px-4 pb-4 border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Quick Filters</p>
                    <div className="flex flex-col gap-1.5">
                      {QUICK_FILTERS.map(qf => (
                        <Button key={qf.label} variant="ghost" size="sm" className="justify-start h-7 text-xs" onClick={() => {
                          setFilters(qf.filters);
                          if (qf.filters.naics) setNaicsInput(qf.filters.naics);
                        }}>
                          {qf.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="px-4 pb-4 border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Legend</p>
                    {mapMode === 'entities' && (
                      <div className="space-y-1.5">
                        {Object.entries(ENTITY_TYPE_COLORS).map(([type, color]) => (
                          <div key={type} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-xs">{type}</span>
                          </div>
                        ))}
                        <p className="text-[10px] text-muted-foreground mt-1">Marker size = contract value</p>
                      </div>
                    )}
                    {mapMode === 'spending' && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-2 rounded bg-gradient-to-r from-primary/20 to-primary" />
                          <span className="text-xs">Low → High spending</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Bubble size = total contract value</p>
                      </div>
                    )}
                    {mapMode === 'opportunities' && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-destructive" /><span className="text-xs">&lt;7 days</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--warning))' }} /><span className="text-xs">&lt;30 days</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--success))' }} /><span className="text-xs">&gt;30 days</span></div>
                      </div>
                    )}
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>

            {/* Filter toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-0 top-4 z-20 h-8 w-6 rounded-r-lg rounded-l-none bg-card border border-l-0 border-border hidden lg:flex"
              style={{ left: filterPanelOpen ? 260 : 0 }}
              onClick={() => setFilterPanelOpen(!filterPanelOpen)}
            >
              <ChevronRight className={`h-3 w-3 transition-transform ${filterPanelOpen ? 'rotate-180' : ''}`} />
            </Button>

            {/* Map */}
            <div className="flex-1 relative">
              {/* Stats bar */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 shadow-lg">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">
                  {mapMode === 'entities' && `${geoEntities?.length || 0} entities`}
                  {mapMode === 'spending' && `${stateSpending?.length || 0} states`}
                  {mapMode === 'opportunities' && 'Opportunities'}
                </span>
                {loadingGeo && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5">{activeFilterCount} filtered</Badge>
                )}
              </div>

              <PremiumMapContainer
                features={activeFeatures}
                center={[-77.0, 38.9]}
                zoom={7}
                selectedFeature={selectedFeature}
                onFeatureClick={handleFeatureClick}
                className="w-full h-full"
              />
            </div>

            {/* Right data panel */}
            <AnimatePresence>
              {dataPanelOpen && selectedFeature && (
                <motion.aside
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 320, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="border-l border-border bg-card overflow-y-auto shrink-0"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold">Details</h3>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setDataPanelOpen(false); setSelectedFeature(null); }}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Entity detail */}
                    {mapMode === 'entities' && selectedFeature.properties && (
                      <div className="space-y-3">
                        <div>
                          <p className="font-semibold text-base">{selectedFeature.properties.name}</p>
                          <p className="text-xs text-muted-foreground">{String(selectedFeature.properties.entity_type || '')} · {String(selectedFeature.properties.city || '')}, {String(selectedFeature.properties.state || '')}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Card className="p-2.5">
                            <p className="text-[10px] text-muted-foreground uppercase">Contract Value</p>
                            <p className="text-lg font-bold text-primary">{fmt(selectedFeature.properties.total_value as number)}</p>
                          </Card>
                          <Card className="p-2.5">
                            <p className="text-[10px] text-muted-foreground uppercase">Contracts</p>
                            <p className="text-lg font-bold">{(selectedFeature.properties.contract_count as number || 0).toLocaleString()}</p>
                          </Card>
                        </div>
                        {selectedFeature.properties.source_id && (
                          <Button size="sm" className="w-full" onClick={() => navigate(`/entity/${selectedFeature.properties.source_id}`)}>
                            View Full Profile <ChevronRight className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Spending detail */}
                    {mapMode === 'spending' && selectedStateData && (
                      <div className="space-y-3">
                        <div>
                          <p className="font-semibold text-xl">{selectedStateData.state}</p>
                          <p className="text-xs text-muted-foreground">{selectedStateData.entity_count} entities · {selectedStateData.contract_count} contracts</p>
                        </div>
                        <Card className="p-3">
                          <p className="text-[10px] text-muted-foreground uppercase">Total Contract Value</p>
                          <p className="text-2xl font-bold text-primary">{fmt(selectedStateData.total_value)}</p>
                        </Card>
                        {selectedStateData.top_agencies.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold mb-1.5">Top Agencies</p>
                            {selectedStateData.top_agencies.map(a => (
                              <div key={a.name} className="flex items-center justify-between py-1 text-xs">
                                <span className="truncate max-w-[180px]">{a.name}</span>
                                <span className="font-mono text-primary">{fmt(a.value)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {selectedStateData.top_entities.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold mb-1.5">Top Entities</p>
                            {selectedStateData.top_entities.map(e => (
                              <div key={e.name} className="flex items-center justify-between py-1 text-xs">
                                <Link to={e.id ? `/entity/${e.id}` : '#'} className="truncate max-w-[180px] hover:text-primary hover:underline">{e.name}</Link>
                                <span className="font-mono text-primary">{fmt(e.value)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <Button variant="outline" size="sm" className="w-full" onClick={() => { setFilters(f => ({ ...f, state: selectedStateData.state })); setViewMode('table'); }}>
                          Explore Contracts in {selectedStateData.state}
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* TABLE VIEW — original contract table */
          <div className="container py-6">
            <div className="flex gap-6">
              {/* Desktop Filter Sidebar */}
              <aside className="hidden lg:block w-[280px] shrink-0">
                <Card className="sticky top-20">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2"><Filter className="h-4 w-4" />Filters</CardTitle>
                      {activeFilterCount > 0 && <Badge variant="secondary">{activeFilterCount} active</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent><FilterControls /></CardContent>
                </Card>
              </aside>

              <div className="flex-1 min-w-0">
                {!hasFilters && !loadingResults && (
                  <Card className="p-12 text-center">
                    <Compass className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Select filters to explore the market</h3>
                    <p className="text-muted-foreground mb-6">Choose a state, agency, or NAICS code to discover contracts</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {QUICK_FILTERS.map(qf => (
                        <Button key={qf.label} variant="outline" size="sm" onClick={() => {
                          setFilters(qf.filters);
                          if (qf.filters.naics) setNaicsInput(qf.filters.naics);
                        }}>{qf.label}</Button>
                      ))}
                    </div>
                  </Card>
                )}

                {hasFilters && loadingResults && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
                    <Skeleton className="h-48" />
                    <div className="space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
                  </div>
                )}

                {hasFilters && !loadingResults && (
                  <>
                    {summary && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <Card className="p-4">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Addressable</p>
                          <p className="text-2xl font-bold text-primary mt-1">{fmt(summary.totalValue)}</p>
                        </Card>
                        <Card className="p-4">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Contractors</p>
                          <p className="text-2xl font-bold mt-1">{summary.contractorCount}</p>
                        </Card>
                        <Card className="p-4">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Contracts Found</p>
                          <p className="text-2xl font-bold mt-1">{summary.contractCount}</p>
                        </Card>
                        <Card className="p-4">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Size</p>
                          <p className="text-2xl font-bold mt-1">{fmt(summary.avgSize)}</p>
                        </Card>
                      </div>
                    )}

                    {marketIntel && (
                      <Card className="mb-6 border-primary/20">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Shield className={`h-5 w-5 mt-0.5 shrink-0 ${Number(marketIntel.hhi_score) > 2500 ? 'text-red-500' : Number(marketIntel.hhi_score) > 1500 ? 'text-amber-500' : 'text-emerald-500'}`} />
                            <div>
                              <p className="font-medium text-sm">
                                Market Intelligence — HHI: {Number(marketIntel.hhi_score).toLocaleString()}
                                <Badge variant="outline" className="ml-2 text-xs">{marketIntel.concentration_level}</Badge>
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                This market has {String(marketIntel.contractor_count ?? 0)} contractors competing for {fmt(Number(marketIntel.total_value))} in contracts.
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {topContractors.length > 0 && (
                      <Card className="mb-6">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" />Top 5 Contractors</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-40">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={topContractors} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                                <RechartsTooltip formatter={(v: number) => fmt(v)} />
                                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(data: any) => data?.id && navigate(`/entity/${data.id}`)} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {results && results.length === 0 ? (
                      <Card className="p-12 text-center">
                        <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No contracts match these filters</h3>
                        <p className="text-muted-foreground">Try broadening your search.</p>
                      </Card>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm text-muted-foreground">
                            {results?.length || 0} results · Page {currentPage + 1} of {totalPages || 1}
                            {isFetching && <Loader2 className="inline h-3 w-3 ml-2 animate-spin" />}
                          </p>
                        </div>
                        <div className="border rounded-lg overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted/50 text-left">
                                <th className="p-3 font-medium cursor-pointer hover:text-primary" onClick={() => handleSort('recipient_name')}>Recipient</th>
                                <th className="p-3 font-medium cursor-pointer hover:text-primary hidden md:table-cell" onClick={() => handleSort('awarding_agency')}>Agency</th>
                                <th className="p-3 font-medium cursor-pointer hover:text-primary text-right" onClick={() => handleSort('award_amount')}>Value</th>
                                <th className="p-3 font-medium cursor-pointer hover:text-primary hidden md:table-cell" onClick={() => handleSort('award_date')}>Award Date</th>
                                <th className="p-3 font-medium hidden lg:table-cell">NAICS</th>
                                <th className="p-3 font-medium hidden lg:table-cell">State</th>
                              </tr>
                            </thead>
                            <tbody>
                              {displayResults.map(c => {
                                const entity = c.entity as any;
                                return (
                                  <tr key={c.id} className="border-t hover:bg-muted/30">
                                    <td className="p-3 max-w-[200px] truncate">
                                      {entity?.id ? (
                                        <Link to={`/entity/${entity.id}`} className="hover:text-primary hover:underline font-medium">
                                          {entity.canonical_name || c.recipient_name || '—'}
                                        </Link>
                                      ) : (c.recipient_name || '—')}
                                    </td>
                                    <td className="p-3 max-w-[200px] truncate hidden md:table-cell">
                                      <Link to={`/agency/${encodeURIComponent(c.awarding_agency || '')}`} className="hover:text-primary hover:underline">
                                        {c.awarding_agency || '—'}
                                      </Link>
                                    </td>
                                    <td className="p-3 text-right font-mono font-semibold text-primary">{fmt(Number(c.award_amount))}</td>
                                    <td className="p-3 hidden md:table-cell whitespace-nowrap">{fmtDate(c.award_date)}</td>
                                    <td className="p-3 hidden lg:table-cell"><Badge variant="secondary" className="font-mono text-xs">{c.naics_code || '—'}</Badge></td>
                                    <td className="p-3 hidden lg:table-cell">{c.pop_state || '—'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        {totalPages > 1 && (
                          <div className="flex justify-center gap-2 mt-4">
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}>Previous</Button>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages - 1}>Next</Button>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Save Search Dialog */}
        <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Save This Search</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="search-name">Name this search</Label>
                <Input id="search-name" value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="e.g. Maryland Cybersecurity" className="mt-1.5" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="notify-toggle">Notify me of changes</Label>
                <Switch id="notify-toggle" checked={saveNotify} onCheckedChange={setSaveNotify} />
              </div>
              <p className="text-xs text-muted-foreground">Filters: {Object.entries(filters).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join(', ') || 'None'}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveSearch} disabled={!saveName.trim() || saveSearchMutation.isPending}>
                {saveSearchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </GlobalLayout>
  );
}
