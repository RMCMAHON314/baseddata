import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Search, Building2, FileText, Award, Briefcase, MapPin,
  Loader2, ChevronRight, ArrowRight, DollarSign, Calendar, Zap
} from 'lucide-react';

interface SearchResult {
  id: string;
  name: string;
  result_type: 'entity' | 'contract' | 'grant' | 'opportunity';
  entity_type?: string;
  entity_id?: string;
  agency?: string;
  state?: string;
  city?: string;
  value?: number;
  opportunity_score?: number;
  description?: string;
  deadline?: string;
  set_aside?: string;
}

interface Aggregations {
  total_value: number;
  by_type: { key: string; count: number }[];
  entity_count: number;
  contract_count: number;
  grant_count: number;
  opportunity_count: number;
}

function fmt(v: number) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

const RESULT_ICONS: Record<string, typeof Building2> = {
  entity: Building2,
  contract: FileText,
  grant: Award,
  opportunity: Briefcase,
};

const TYPE_COLORS: Record<string, string> = {
  entity: 'bg-violet-500/10 text-violet-600 border-violet-200',
  contract: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  grant: 'bg-amber-500/10 text-amber-600 border-amber-200',
  opportunity: 'bg-blue-500/10 text-blue-600 border-blue-200',
};

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = (searchParams.get('q') || '').trim();

  const [query, setQuery] = useState(urlQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [aggregations, setAggregations] = useState<Aggregations | null>(null);
  const [loading, setLoading] = useState(false);
  const [responseTime, setResponseTime] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searched, setSearched] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);

  const doSearch = useCallback(async (q: string) => {
    const clean = q.trim();
    if (!clean) {
      setResults([]);
      setAggregations(null);
      setResponseTime(0);
      setTotalCount(0);
      setSearched(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const { data, error } = await supabase.functions.invoke('mega-search', {
        body: { query: clean, limit: 100 }
      });

      if (error) throw error;

      setResults(data?.results || []);
      setAggregations(data?.aggregations || null);
      setResponseTime(data?.response_time_ms || 0);
      setTotalCount(data?.total || 0);
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Search failed. Please try again.');
      setResults([]);
      setAggregations(null);
      setResponseTime(0);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setQuery(urlQuery);
    if (urlQuery) {
      setFilterType(null);
      doSearch(urlQuery);
    } else {
      setResults([]);
      setAggregations(null);
      setResponseTime(0);
      setTotalCount(0);
      setSearched(false);
      setLoading(false);
    }
  }, [urlQuery, doSearch]);

  const handleSubmit = (e?: { preventDefault: () => void }) => {
    e?.preventDefault();
    const clean = query.trim();
    if (!clean) return;
    setFilterType(null);
    setSearchParams({ q: clean }, { replace: true });
  };

  const filteredResults = filterType ? results.filter(r => r.result_type === filterType) : results;

  const getLink = (r: SearchResult) => {
    if (r.result_type === 'entity') return `/entity/${r.id}`;
    if (r.entity_id) return `/entity/${r.entity_id}`;
    return '#';
  };

  const suggestions = ['IT contractors Virginia', 'Healthcare grants', 'DoD cybersecurity', 'Small business Maryland', 'Lockheed Martin'];

  return (
    <GlobalLayout>
      <div className="min-h-screen bg-background">
        <div className="sticky top-14 z-40 bg-background/95 backdrop-blur border-b border-border">
          <div className="container max-w-4xl py-4">
            <form onSubmit={handleSubmit} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search everything..."
                className="pl-12 pr-28 h-12 text-base rounded-xl border-input shadow-sm"
                autoFocus
              />
              {loading ? (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <Button type="submit" disabled={!query.trim()} size="sm" className="absolute right-2 top-1/2 -translate-y-1/2 gap-1.5">
                  Search <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </form>

            {aggregations && results.length > 0 && (
              <div className="flex items-center gap-2 mt-3 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setFilterType(null)}
                  className={`text-sm px-3 py-1 rounded-full transition-colors whitespace-nowrap ${!filterType ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  All ({totalCount})
                </button>

                {aggregations.entity_count > 0 && (
                  <button type="button" onClick={() => setFilterType('entity')}
                    className={`text-sm px-3 py-1 rounded-full transition-colors whitespace-nowrap flex items-center gap-1 ${filterType === 'entity' ? 'bg-violet-500/20 text-violet-600' : 'text-muted-foreground hover:bg-muted'}`}>
                    <Building2 className="w-3.5 h-3.5" /> Entities ({aggregations.entity_count})
                  </button>
                )}
                {aggregations.contract_count > 0 && (
                  <button type="button" onClick={() => setFilterType('contract')}
                    className={`text-sm px-3 py-1 rounded-full transition-colors whitespace-nowrap flex items-center gap-1 ${filterType === 'contract' ? 'bg-emerald-500/20 text-emerald-600' : 'text-muted-foreground hover:bg-muted'}`}>
                    <FileText className="w-3.5 h-3.5" /> Contracts ({aggregations.contract_count})
                  </button>
                )}
                {aggregations.grant_count > 0 && (
                  <button type="button" onClick={() => setFilterType('grant')}
                    className={`text-sm px-3 py-1 rounded-full transition-colors whitespace-nowrap flex items-center gap-1 ${filterType === 'grant' ? 'bg-amber-500/20 text-amber-600' : 'text-muted-foreground hover:bg-muted'}`}>
                    <Award className="w-3.5 h-3.5" /> Grants ({aggregations.grant_count})
                  </button>
                )}
                {aggregations.opportunity_count > 0 && (
                  <button type="button" onClick={() => setFilterType('opportunity')}
                    className={`text-sm px-3 py-1 rounded-full transition-colors whitespace-nowrap flex items-center gap-1 ${filterType === 'opportunity' ? 'bg-blue-500/20 text-blue-600' : 'text-muted-foreground hover:bg-muted'}`}>
                    <Briefcase className="w-3.5 h-3.5" /> Opportunities ({aggregations.opportunity_count})
                  </button>
                )}

                <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
                  <Zap className="w-3 h-3 inline" /> {responseTime}ms
                  {aggregations.total_value > 0 && <> · <DollarSign className="w-3 h-3 inline" /> {fmt(aggregations.total_value)} total</>}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="container max-w-4xl py-6">
          {loading && (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          )}

          {!loading && searched && filteredResults.length > 0 && (
            <div className="space-y-2">
              {filteredResults.map(r => {
                const Icon = RESULT_ICONS[r.result_type] || FileText;
                const tone = TYPE_COLORS[r.result_type] || '';
                const toneParts = tone.split(' ');
                return (
                  <Link key={`${r.result_type}-${r.id}`} to={getLink(r)}>
                    <Card className="hover:bg-muted/40 transition-colors cursor-pointer border-border/60">
                      <CardContent className="p-4 flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${toneParts[0] || 'bg-muted'}`}>
                          <Icon className={`w-4 h-4 ${toneParts[1] || 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm truncate">{r.name}</h3>
                            <Badge variant="outline" className={`text-[10px] capitalize px-1.5 py-0 ${tone}`}>
                              {r.result_type}
                            </Badge>
                            {r.set_aside && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{r.set_aside}</Badge>}
                          </div>
                          {r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{r.description}</p>}
                          {r.agency && <p className="text-xs text-muted-foreground mt-0.5">{r.agency}</p>}
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                            {r.state && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {r.state}</span>}
                            {r.deadline && <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" /> Due {new Date(r.deadline).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          {r.value && r.value > 0 && <span className="text-sm font-bold text-primary font-mono">{fmt(r.value)}</span>}
                          {r.opportunity_score && r.opportunity_score >= 60 && (
                            <Badge className="bg-emerald-500/15 text-emerald-600 text-[10px] px-1.5 py-0">Score {r.opportunity_score}</Badge>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2" />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}

          {!loading && searched && filteredResults.length === 0 && (
            <div className="text-center py-20">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No results for "{query}"</h3>
              <p className="text-muted-foreground text-sm mt-1">Try different keywords or broaden your search</p>
            </div>
          )}

          {!loading && !searched && (
            <div className="text-center py-20">
              <Search className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-foreground mb-2">Search everything</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8">
                Contracts, entities, grants, and opportunities — all in one place.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map(s => (
                  <Badge key={s} variant="outline" className="cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => setSearchParams({ q: s }, { replace: true })}>
                    <Search className="w-3 h-3 mr-1" /> {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </GlobalLayout>
  );
}
