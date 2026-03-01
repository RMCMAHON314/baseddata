import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { SearchAutocomplete } from '@/components/search/SearchAutocomplete';
import { SearchResults } from '@/components/search/SearchResults';
import { SearchFilters, type SearchFilterState } from '@/components/search/SearchFilters';
import { SearchStatsBar } from '@/components/search/SearchStatsBar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useNaturalQuery } from '@/hooks/useNaturalQuery';
import {
  Search, SlidersHorizontal, Bookmark, Sparkles, TrendingUp, X
} from 'lucide-react';

const EMPTY_FILTERS: SearchFilterState = {
  states: [], entityTypes: [], agencies: [], minValue: 0, maxValue: 0, setAsides: [], dataSources: [],
};

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = (searchParams.get('q') || '').trim();

  const [results, setResults] = useState<any[]>([]);
  const [aggregations, setAggregations] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [responseTime, setResponseTime] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searched, setSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilterState>(EMPTY_FILTERS);

  const { recentQueries, history } = useSearchHistory();
  const { executeQuery: executeNL, result: nlResult, loading: nlLoading } = useNaturalQuery();

  const recentSearchStrings = recentQueries.map(q => q.prompt);

  const doSearch = useCallback(async (q: string, f?: SearchFilterState) => {
    const clean = q.trim();
    if (!clean) { setResults([]); setAggregations(null); setInsights([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    const activeFilters = f || filters;
    try {
      const { data, error } = await supabase.functions.invoke('mega-search', {
        body: {
          query: clean,
          limit: 100,
          filters: {
            states: activeFilters.states.length > 0 ? activeFilters.states : undefined,
            entity_types: activeFilters.entityTypes.length > 0 ? activeFilters.entityTypes : undefined,
            min_value: activeFilters.minValue > 0 ? activeFilters.minValue : undefined,
          },
        }
      });
      if (error) throw error;
      setResults(data?.results || []);
      setAggregations(data?.aggregations || null);
      setInsights(data?.insights || []);
      setResponseTime(data?.response_time_ms || 0);
      setTotalCount(data?.total || 0);
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Search failed');
      setResults([]); setAggregations(null);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (urlQuery) doSearch(urlQuery);
    else { setResults([]); setAggregations(null); setInsights([]); setSearched(false); }
  }, [urlQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (q: string) => {
    setSearchParams({ q }, { replace: true });
  };

  const handleNLQuery = async (q: string) => {
    setSearchParams({ q }, { replace: true });
    // Also run NL query for structured results
    await executeNL(q);
  };

  const handleFilterChange = (newFilters: SearchFilterState) => {
    setFilters(newFilters);
    if (urlQuery) doSearch(urlQuery, newFilters);
  };

  const trendingSearches = ['IT contractors Virginia', 'Healthcare grants NIH', 'DoD cybersecurity', 'Small business Maryland', 'Lockheed Martin', 'Universities NSF funding'];

  return (
    <GlobalLayout>
      <div className="min-h-screen bg-background">
        {/* Hero search area when no results */}
        {!searched && !loading && (
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 radial-overlay" />
            <div className="relative py-20 px-4">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-foreground mb-3 tracking-tight">
                  Search <span className="text-gradient-omni">Everything</span>
                </h1>
                <p className="text-muted-foreground text-base max-w-lg mx-auto">
                  Contracts, entities, grants, and opportunities — the command center for government intelligence.
                </p>
              </div>

              <SearchAutocomplete
                initialQuery={urlQuery}
                recentSearches={recentSearchStrings}
                onSearch={handleSearch}
                onNLQuery={handleNLQuery}
              />

              {/* Recent searches */}
              {recentSearchStrings.length > 0 && (
                <div className="mt-8 text-center">
                  <p className="text-xs text-muted-foreground font-medium mb-3">Recent Searches</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {recentSearchStrings.slice(0, 6).map(s => (
                      <Badge key={s} variant="outline" className="cursor-pointer hover:bg-primary/10 transition-colors text-xs"
                        onClick={() => handleSearch(s)}>
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending */}
              <div className="mt-6 text-center">
                <p className="text-xs text-muted-foreground font-medium mb-3 flex items-center justify-center gap-1.5">
                  <TrendingUp className="w-3 h-3" /> Trending
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {trendingSearches.map(s => (
                    <Badge key={s} variant="secondary" className="cursor-pointer hover:bg-primary/10 transition-colors text-xs"
                      onClick={() => handleSearch(s)}>
                      <Sparkles className="w-3 h-3 mr-1" /> {s}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search bar when results are shown */}
        {(searched || loading) && (
          <div className="sticky top-14 z-40 bg-background/95 backdrop-blur border-b border-border">
            <div className="container max-w-6xl py-3 px-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <SearchAutocomplete
                    initialQuery={urlQuery}
                    recentSearches={recentSearchStrings}
                    onSearch={handleSearch}
                    onNLQuery={handleNLQuery}
                  />
                </div>
                <Button variant={showFilters ? 'default' : 'outline'} size="sm" onClick={() => setShowFilters(!showFilters)} className="shrink-0 gap-1.5">
                  <SlidersHorizontal className="w-4 h-4" /> Filters
                  {(filters.states.length + filters.entityTypes.length + filters.setAsides.length) > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1 ml-1">
                      {filters.states.length + filters.entityTypes.length + filters.setAsides.length}
                    </Badge>
                  )}
                </Button>
                <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => toast.success('Search saved!')}>
                  <Bookmark className="w-4 h-4" /> Save
                </Button>
              </div>

              {/* Stats bar */}
              {aggregations && results.length > 0 && (
                <SearchStatsBar aggregations={aggregations} totalCount={totalCount} responseTime={responseTime} />
              )}
            </div>
          </div>
        )}

        {/* Main content with optional filter sidebar */}
        {(searched || loading) && (
          <div className="container max-w-6xl py-6 px-4">
            <div className="flex gap-6">
              {/* Filters sidebar */}
              {showFilters && (
                <div className="w-64 shrink-0 hidden md:block">
                  <SearchFilters filters={filters} onChange={handleFilterChange} aggregations={aggregations} />
                </div>
              )}

              {/* Results */}
              <div className="flex-1 min-w-0">
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
                  </div>
                ) : (
                  <SearchResults
                    results={results}
                    insights={insights}
                    query={urlQuery}
                    onSuggestionClick={handleSearch}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </GlobalLayout>
  );
}
