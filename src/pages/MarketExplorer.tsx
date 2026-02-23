// BASED DATA - Market Explorer — Contract-based filtering with real data
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Download, Building2, DollarSign, SlidersHorizontal,
  BookmarkPlus, X, ChevronRight, Loader2, Compass, Users, FileText, Shield
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
import { supabase } from '@/integrations/supabase/client';
import { useMarketExplorer, useMarketFilterOptions, useSaveSearch } from '@/hooks';
import { useDebounce } from '@/hooks/useDebounce';
import { useExportCSV } from '@/hooks/useExportData';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

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

const QUICK_FILTERS = [
  { label: 'Maryland + DoD', filters: { state: 'MD', agency: 'DEPT OF DEFENSE' } },
  { label: 'Virginia IT', filters: { state: 'VA', naics: '541512' } },
  { label: 'Small Business', filters: { setAside: 'SBA' } },
];

export default function MarketExplorer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Initialize filters from URL params
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

  // Save search modal
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveNotify, setSaveNotify] = useState(false);

  // Mobile filter drawer
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<string>('award_amount');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const PAGE_SIZE = 25;

  // Update filters when debounced inputs change
  useEffect(() => {
    setFilters(f => ({ ...f, naics: debouncedNaics || undefined }));
  }, [debouncedNaics]);

  useEffect(() => {
    setFilters(f => ({ ...f, keyword: debouncedKeyword || undefined }));
  }, [debouncedKeyword]);

  // Sync filters to URL
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
  const { data: filterOptions, isLoading: loadingOptions } = useMarketFilterOptions();
  const { data: results, isLoading: loadingResults, isFetching } = useMarketExplorer(filters);
  const saveSearchMutation = useSaveSearch();
  const { exportToCSV } = useExportCSV();

  // Market intelligence via HHI
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

  // Computed market summary
  const summary = useMemo(() => {
    if (!results || results.length === 0) return null;
    const totalValue = results.reduce((s, c) => s + (Number(c.award_amount) || 0), 0);
    const uniqueEntities = new Set(results.map(c => c.recipient_entity_id).filter(Boolean));
    return {
      totalValue,
      contractorCount: uniqueEntities.size,
      contractCount: results.length,
      avgSize: results.length > 0 ? totalValue / results.length : 0,
    };
  }, [results]);

  // Top 5 contractors bar chart data
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

  // Sorted + paginated results
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

  const clearFilters = () => {
    setFilters({});
    setNaicsInput('');
    setKeywordInput('');
  };

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
      setSaveOpen(false);
      setSaveName('');
      setSaveNotify(false);
    } catch {
      toast.error('Failed to save search. Are you signed in?');
    }
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

  // Filter controls component (shared between desktop sidebar and mobile drawer)
  const FilterControls = () => (
    <div className="space-y-5">
      {/* State */}
      <div>
        <Label className="text-sm font-medium mb-1.5 block">State</Label>
        <Select value={filters.state || ''} onValueChange={v => setFilters(f => ({ ...f, state: v || undefined }))}>
          <SelectTrigger><SelectValue placeholder="All states" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All states</SelectItem>
            {(filterOptions?.states || []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Agency */}
      <div>
        <Label className="text-sm font-medium mb-1.5 block">Agency</Label>
        <Select value={filters.agency || ''} onValueChange={v => setFilters(f => ({ ...f, agency: v || undefined }))}>
          <SelectTrigger><SelectValue placeholder="All agencies" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All agencies</SelectItem>
            {(filterOptions?.agencies || []).map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* NAICS */}
      <div>
        <Label className="text-sm font-medium mb-1.5 block">NAICS Code</Label>
        <Input value={naicsInput} onChange={e => setNaicsInput(e.target.value)} placeholder="e.g. 541512" />
      </div>

      {/* Set-Aside */}
      <div>
        <Label className="text-sm font-medium mb-1.5 block">Set-Aside</Label>
        <Select value={filters.setAside || ''} onValueChange={v => setFilters(f => ({ ...f, setAside: v || undefined }))}>
          <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All types</SelectItem>
            {(filterOptions?.setAsides || []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Keyword */}
      <div>
        <Label className="text-sm font-medium mb-1.5 block">Keyword</Label>
        <Input value={keywordInput} onChange={e => setKeywordInput(e.target.value)} placeholder="Search descriptions..." />
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={clearFilters} variant="outline" size="sm" className="flex-1">Clear All</Button>
      </div>
    </div>
  );

  return (
    <GlobalLayout>
      <div className="min-h-screen bg-background">
        {/* Breadcrumb */}
        <div className="container pt-4">
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">Market Explorer</span>
          </nav>
        </div>

        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="container py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Compass className="h-6 w-6 text-primary" />
                  Market Explorer
                </h1>
                <p className="text-muted-foreground mt-1">Filter contracts by state, agency, NAICS, and more</p>
              </div>
              <div className="flex items-center gap-2">
                {hasFilters && (
                  <Button variant="outline" size="sm" onClick={() => setSaveOpen(true)} className="gap-1.5">
                    <BookmarkPlus className="h-4 w-4" />Save Search
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleExport} disabled={!results?.length}>
                  <Download className="h-4 w-4 mr-1.5" />Export
                </Button>
                {/* Mobile filter trigger */}
                <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden gap-1.5">
                      <SlidersHorizontal className="h-4 w-4" />Filters
                      {activeFilterCount > 0 && <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[300px]">
                    <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
                    <div className="mt-6"><FilterControls /></div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </div>

        <div className="container py-6">
          <div className="flex gap-6">
            {/* Desktop Filter Sidebar */}
            <aside className="hidden lg:block w-[280px] shrink-0">
              <Card className="sticky top-20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Filter className="h-4 w-4" />Filters
                    </CardTitle>
                    {activeFilterCount > 0 && (
                      <Badge variant="secondary">{activeFilterCount} active</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent><FilterControls /></CardContent>
              </Card>
            </aside>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* No filters prompt */}
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
                      }}>
                        {qf.label}
                      </Button>
                    ))}
                  </div>
                </Card>
              )}

              {/* Loading */}
              {hasFilters && loadingResults && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
                  </div>
                  <Skeleton className="h-48" />
                  <div className="space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
                </div>
              )}

              {/* Results */}
              {hasFilters && !loadingResults && (
                <>
                  {/* Market Summary */}
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

                  {/* Market Intelligence Card */}
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
                              This market has {Number(marketIntel.contractor_count)} contractors competing for {fmt(Number(marketIntel.total_value))} in contracts.
                            </p>
                            {Number(marketIntel.hhi_score) > 2500 && (() => {
                              const top = marketIntel.top_contractors?.[0] || (typeof marketIntel.top_contractors === 'string' ? JSON.parse(marketIntel.top_contractors)?.[0] : null);
                              return top ? <p className="text-xs text-red-600 mt-1">⚠️ Highly concentrated — dominated by {top.name} ({top.share_pct}% share)</p> : null;
                            })()}
                            {Number(marketIntel.hhi_score) < 1500 && (
                              <p className="text-xs text-emerald-600 mt-1">✅ Competitive market — good entry opportunity</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {topContractors.length > 0 && (
                    <Card className="mb-6">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Users className="h-4 w-4" />Top 5 Contractors
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topContractors} layout="vertical">
                              <XAxis type="number" hide />
                              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                              <Tooltip formatter={(v: number) => fmt(v)} />
                              <Bar
                                dataKey="value"
                                fill="hsl(var(--primary))"
                                radius={[0, 4, 4, 0]}
                                cursor="pointer"
                                onClick={(data: any) => data?.id && navigate(`/entity/${data.id}`)}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Results Table */}
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
                                  <td className="p-3 hidden lg:table-cell">
                                    <Badge variant="secondary" className="font-mono text-xs">{c.naics_code || '—'}</Badge>
                                  </td>
                                  <td className="p-3 hidden lg:table-cell">{c.pop_state || '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {/* Pagination */}
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