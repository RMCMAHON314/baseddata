// BASED DATA - Market Explorer
// Interactive market analysis with filters, results grid, and analytics
import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Grid3X3, List, Download, ChevronDown, X, Building2,
  MapPin, DollarSign, FileText, TrendingUp, BarChart3, Loader2, SlidersHorizontal, Network, BookmarkPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { NetworkGraph } from '@/components/visualizations/NetworkGraph';
import { SavedSearchManager } from '@/components/saved-searches/SavedSearchManager';

interface Entity {
  id: string;
  canonical_name: string;
  entity_type: string | null;
  state: string | null;
  city: string | null;
  naics_codes: string[] | null;
  business_types: string[] | null;
  total_contract_value: number | null;
  contract_count: number | null;
  opportunity_score: number | null;
}

interface Filters {
  search: string;
  states: string[];
  naicsCodes: string[];
  businessTypes: string[];
  minValue: number;
  maxValue: number;
  entityTypes: string[];
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

const BUSINESS_TYPES = [
  'Small Business', '8(a)', 'HUBZone', 'WOSB', 'SDVOSB', 'Large Business', 'Non-Profit'
];

const QUICK_REGIONS = [
  { label: 'DMV', states: ['DC', 'MD', 'VA'] },
  { label: 'Northeast', states: ['NY', 'NJ', 'PA', 'CT', 'MA'] },
  { label: 'Southeast', states: ['FL', 'GA', 'NC', 'SC', 'AL'] },
  { label: 'Southwest', states: ['TX', 'AZ', 'NM', 'OK'] },
  { label: 'West Coast', states: ['CA', 'WA', 'OR'] },
];

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899'];

export default function MarketExplorer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const [filters, setFilters] = useState<Filters>({
    search: searchParams.get('q') || '',
    states: searchParams.get('states')?.split(',').filter(Boolean) || [],
    naicsCodes: [],
    businessTypes: [],
    minValue: 0,
    maxValue: 10000000000,
    entityTypes: [],
  });

  const [analytics, setAnalytics] = useState({
    totalMarketValue: 0,
    topContractors: [] as { name: string; value: number }[],
    stateBreakdown: [] as { name: string; value: number }[],
  });

  // Advanced analytics state
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadEntities();
  }, [filters, page]);

  const loadEntities = async () => {
    setLoading(true);
    
    let query = supabase
      .from('core_entities')
      .select('*', { count: 'exact' })
      .eq('is_canonical', true)
      .gt('total_contract_value', filters.minValue)
      .order('total_contract_value', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (filters.search) {
      query = query.ilike('canonical_name', `%${filters.search}%`);
    }
    if (filters.states.length > 0) {
      query = query.in('state', filters.states);
    }
    if (filters.businessTypes.length > 0) {
      query = query.overlaps('business_types', filters.businessTypes);
    }

    const { data, count, error } = await query;

    if (!error && data) {
      setEntities(data);
      setTotalCount(count || 0);

      // Calculate analytics
      const totalValue = data.reduce((sum, e) => sum + (e.total_contract_value || 0), 0);
      const topContractors = data.slice(0, 10).map(e => ({
        name: e.canonical_name.slice(0, 20),
        value: e.total_contract_value || 0,
      }));

      // State breakdown
      const stateMap = data.reduce((acc, e) => {
        if (e.state) {
          acc[e.state] = (acc[e.state] || 0) + (e.total_contract_value || 0);
        }
        return acc;
      }, {} as Record<string, number>);

      const stateBreakdown = Object.entries(stateMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, value]) => ({ name, value }));

      setAnalytics({ totalMarketValue: totalValue, topContractors, stateBreakdown });
    }

    setLoading(false);
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '$0';
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const toggleState = (state: string) => {
    setFilters(f => ({
      ...f,
      states: f.states.includes(state) 
        ? f.states.filter(s => s !== state)
        : [...f.states, state]
    }));
    setPage(0);
  };

  const toggleBusinessType = (type: string) => {
    setFilters(f => ({
      ...f,
      businessTypes: f.businessTypes.includes(type)
        ? f.businessTypes.filter(t => t !== type)
        : [...f.businessTypes, type]
    }));
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      states: [],
      naicsCodes: [],
      businessTypes: [],
      minValue: 0,
      maxValue: 10000000000,
      entityTypes: [],
    });
    setPage(0);
  };

  const hasActiveFilters = filters.states.length > 0 || filters.businessTypes.length > 0 || filters.minValue > 0;

  const exportCSV = () => {
    const headers = ['Name', 'Type', 'State', 'City', 'Contract Value', 'Contracts', 'NAICS Codes'];
    const rows = entities.map(e => [
      e.canonical_name,
      e.entity_type || '',
      e.state || '',
      e.city || '',
      e.total_contract_value?.toString() || '0',
      e.contract_count?.toString() || '0',
      e.naics_codes?.join(';') || '',
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'market-explorer-export.csv';
    a.click();
  };

  return (
    <GlobalLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="container py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">Market Explorer</h1>
                <p className="text-muted-foreground">Discover and analyze government contractors</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
                  {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
                </Button>
                <Button 
                  variant={showAdvanced ? "secondary" : "outline"} 
                  size="sm" 
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <Network className="h-4 w-4 mr-2" />
                  {showAdvanced ? 'Hide' : 'Show'} Network
                </Button>
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mt-4 flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  value={filters.search}
                  onChange={(e) => {
                    setFilters(f => ({ ...f, search: e.target.value }));
                    setPage(0);
                  }}
                  placeholder="Search contractors, agencies, keywords..."
                  className="pl-10 h-12 text-lg"
                />
              </div>
              <Button 
                variant={showFilters ? "secondary" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1">{filters.states.length + filters.businessTypes.length}</Badge>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="container py-6">
          <div className="flex gap-6">
            {/* Filters Sidebar */}
            <AnimatePresence>
              {showFilters && (
                <motion.aside
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 280, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="shrink-0 overflow-hidden"
                >
                  <Card className="sticky top-24">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Filters</CardTitle>
                        {hasActiveFilters && (
                          <Button variant="ghost" size="sm" onClick={clearFilters}>Clear all</Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Quick Regions */}
                      <div>
                        <p className="text-sm font-medium mb-2">Quick Regions</p>
                        <div className="flex flex-wrap gap-2">
                          {QUICK_REGIONS.map(region => (
                            <Button
                              key={region.label}
                              variant={region.states.every(s => filters.states.includes(s)) ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                const allSelected = region.states.every(s => filters.states.includes(s));
                                setFilters(f => ({
                                  ...f,
                                  states: allSelected 
                                    ? f.states.filter(s => !region.states.includes(s))
                                    : [...new Set([...f.states, ...region.states])]
                                }));
                                setPage(0);
                              }}
                            >
                              {region.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* States */}
                      <div>
                        <p className="text-sm font-medium mb-2">States</p>
                        <ScrollArea className="h-40">
                          <div className="grid grid-cols-4 gap-1">
                            {US_STATES.map(state => (
                              <Button
                                key={state}
                                variant={filters.states.includes(state) ? "default" : "ghost"}
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={() => toggleState(state)}
                              >
                                {state}
                              </Button>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>

                      {/* Business Types */}
                      <div>
                        <p className="text-sm font-medium mb-2">Business Size</p>
                        <div className="space-y-2">
                          {BUSINESS_TYPES.map(type => (
                            <label key={type} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox
                                checked={filters.businessTypes.includes(type)}
                                onCheckedChange={() => toggleBusinessType(type)}
                              />
                              <span className="text-sm">{type}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Min Value */}
                      <div>
                        <p className="text-sm font-medium mb-2">
                          Min Contract Value: {formatCurrency(filters.minValue)}
                        </p>
                        <Slider
                          value={[filters.minValue]}
                          min={0}
                          max={100000000}
                          step={1000000}
                          onValueChange={([v]) => {
                            setFilters(f => ({ ...f, minValue: v }));
                            setPage(0);
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </motion.aside>
              )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Analytics Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Total Market Value</p>
                  <p className="text-3xl font-bold text-gradient-omni">{formatCurrency(analytics.totalMarketValue)}</p>
                  <p className="text-sm text-muted-foreground">{totalCount.toLocaleString()} entities</p>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Top Contractors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.topContractors.slice(0, 5)} layout="vertical">
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Results Header */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Showing {entities.length} of {totalCount.toLocaleString()} results
                </p>
                {page > 0 && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))}>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={entities.length < pageSize}>
                      Next
                    </Button>
                  </div>
                )}
              </div>

              {/* Results Grid */}
              {loading ? (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-3'}>
                  {[...Array(9)].map((_, i) => <Skeleton key={i} className="h-48" />)}
                </div>
              ) : entities.length === 0 ? (
                <Card className="p-12 text-center">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
                  <p className="text-muted-foreground mb-4">Try adjusting your filters or search query</p>
                  <Button onClick={clearFilters}>Clear Filters</Button>
                </Card>
              ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-3'}>
                  {entities.map((entity, index) => (
                    <motion.div
                      key={entity.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <Link to={`/entity/${entity.id}`}>
                        <Card className="p-4 h-full hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold truncate">{entity.canonical_name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {entity.entity_type} • {entity.city}, {entity.state}
                              </p>
                            </div>
                            {entity.opportunity_score && entity.opportunity_score >= 70 && (
                              <Badge className="bg-amber-100 text-amber-700 shrink-0">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Hot
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Contract Value</p>
                              <p className="font-mono font-semibold text-primary">
                                {formatCurrency(entity.total_contract_value)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Contracts</p>
                              <p className="font-semibold">{entity.contract_count || 0}</p>
                            </div>
                          </div>

                          {entity.naics_codes && entity.naics_codes.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {entity.naics_codes.slice(0, 3).map(code => (
                                <Badge key={code} variant="secondary" className="text-xs font-mono">{code}</Badge>
                              ))}
                              {entity.naics_codes.length > 3 && (
                                <Badge variant="secondary" className="text-xs">+{entity.naics_codes.length - 3}</Badge>
                              )}
                            </div>
                          )}

                          {entity.business_types && entity.business_types.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {entity.business_types.slice(0, 2).map(type => (
                                <Badge key={type} variant="outline" className="text-xs">{type}</Badge>
                              ))}
                            </div>
                          )}
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {!loading && entities.length > 0 && (
                <div className="flex justify-center gap-2 mt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <Button variant="outline" disabled>
                    Page {page + 1}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setPage(p => p + 1)}
                    disabled={entities.length < pageSize}
                  >
                    Next
                  </Button>
                </div>
              )}

              {/* Advanced Analytics Section */}
              {showAdvanced && (
                <div className="mt-8 space-y-6">
                  {/* Network Graph */}
                  <Card className="p-4">
                    <CardHeader className="px-0 pt-0">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Network className="h-5 w-5 text-primary" />
                        Entity Relationship Network
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-0">
                      <NetworkGraph height={500} />
                    </CardContent>
                  </Card>

                  {/* Saved Searches */}
                  <SavedSearchManager
                    currentFilters={{
                      states: filters.states,
                      businessTypes: filters.businessTypes,
                      minValue: filters.minValue,
                      search: filters.search
                    }}
                    onLoadSearch={(loadedFilters) => {
                      setFilters(f => ({
                        ...f,
                        states: (loadedFilters.states as string[]) || f.states,
                        businessTypes: (loadedFilters.businessTypes as string[]) || f.businessTypes,
                        minValue: (loadedFilters.minValue as number) || f.minValue,
                        search: (loadedFilters.search as string) || f.search
                      }));
                      setPage(0);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </GlobalLayout>
  );
}
