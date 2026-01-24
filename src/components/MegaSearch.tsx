import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import debounce from 'lodash/debounce';
import {
  Search, Building2, FileText, Award, Briefcase, DollarSign, MapPin, 
  Loader2, TrendingUp, Filter, X, ChevronRight, ChevronDown, Sparkles, 
  Zap, Clock, Calendar, ExternalLink
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
  by_state: { key: string; count: number }[];
  by_agency: { key: string; count: number }[];
}

interface Insight {
  type: string;
  icon: string;
  title: string;
  description: string;
  priority: string;
}

export default function MegaSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [aggregations, setAggregations] = useState<Aggregations | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [responseTime, setResponseTime] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filters
  const [showFilters, setShowFilters] = useState(true);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [minValue, setMinValue] = useState('');

  const performSearch = useCallback(
    debounce(async (searchQuery: string, filters: { states: string[]; types: string[]; minValue: string }) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setAggregations(null);
        setInsights([]);
        return;
      }

      setLoading(true);

      try {
        const { data, error } = await supabase.functions.invoke('mega-search', {
          body: { 
            query: searchQuery, 
            filters: {
              states: filters.states.length > 0 ? filters.states : null,
              entity_types: filters.types.length > 0 ? filters.types : null,
              min_value: filters.minValue ? parseFloat(filters.minValue) : null
            },
            limit: 100 
          }
        });

        if (error) throw error;

        setResults(data.results || []);
        setAggregations(data.aggregations);
        setInsights(data.insights || []);
        setResponseTime(data.response_time_ms);
        setTotalCount(data.total);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    performSearch(query, { states: selectedStates, types: selectedTypes, minValue });
  }, [query, selectedStates, selectedTypes, minValue, performSearch]);

  function formatCurrency(value: number | undefined) {
    if (!value) return '$0';
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  }

  function getResultIcon(type: string) {
    switch (type) {
      case 'entity': return <Building2 className="w-5 h-5" />;
      case 'contract': return <FileText className="w-5 h-5" />;
      case 'grant': return <Award className="w-5 h-5" />;
      case 'opportunity': return <Briefcase className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  }

  function toggleState(state: string) {
    setSelectedStates(prev => 
      prev.includes(state) ? prev.filter(s => s !== state) : [...prev, state]
    );
  }

  function toggleType(type: string) {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  }

  function clearFilters() {
    setSelectedStates([]);
    setSelectedTypes([]);
    setMinValue('');
  }

  const hasFilters = selectedStates.length > 0 || selectedTypes.length > 0 || minValue;

  return (
    <div className="min-h-screen bg-background">
      {/* Search Header */}
      <div className="sticky top-0 z-50 bg-card border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 flex-shrink-0">
              <Zap className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold hidden md:block">Based Data</span>
            </Link>
            
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search contracts, grants, organizations..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-12 pr-12 h-12 text-lg"
                autoFocus
              />
              {loading && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
              )}
            </div>
            
            <Button
              variant={showFilters ? 'default' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
              className="flex-shrink-0"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {hasFilters && (
                <Badge className="ml-2" variant="secondary">
                  {selectedStates.length + selectedTypes.length + (minValue ? 1 : 0)}
                </Badge>
              )}
            </Button>
          </div>

          {/* Quick stats */}
          {results.length > 0 && (
            <div className="flex items-center gap-4 mt-3 text-sm">
              <span className="text-muted-foreground">
                {totalCount.toLocaleString()} results in {responseTime}ms
              </span>
              {aggregations?.total_value && aggregations.total_value > 0 && (
                <span className="flex items-center gap-1 text-primary font-medium">
                  <DollarSign className="w-4 h-4" />
                  Total: {formatCurrency(aggregations.total_value)}
                </span>
              )}
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                  <X className="w-4 h-4 mr-1" /> Clear filters
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="w-64 flex-shrink-0 space-y-6">
              {/* Result Type Filter */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Result Type</h3>
                  <div className="space-y-2">
                    {['entity', 'contract', 'grant', 'opportunity'].map(type => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer text-sm">
                        <Checkbox
                          checked={selectedTypes.includes(type)}
                          onCheckedChange={() => toggleType(type)}
                        />
                        <span className="capitalize">{type}s</span>
                        {aggregations?.by_type.find(t => t.key === type) && (
                          <span className="ml-auto text-muted-foreground text-xs">
                            {aggregations.by_type.find(t => t.key === type)?.count}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* State Filter */}
              {aggregations?.by_state && aggregations.by_state.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <Collapsible defaultOpen>
                      <CollapsibleTrigger className="flex items-center justify-between w-full">
                        <h3 className="font-semibold">State</h3>
                        <ChevronDown className="w-4 h-4" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <ScrollArea className="h-48 mt-3">
                          <div className="space-y-2">
                            {aggregations.by_state.map(({ key, count }) => (
                              <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
                                <Checkbox
                                  checked={selectedStates.includes(key)}
                                  onCheckedChange={() => toggleState(key)}
                                />
                                <span>{key}</span>
                                <span className="ml-auto text-muted-foreground text-xs">{count}</span>
                              </label>
                            ))}
                          </div>
                        </ScrollArea>
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>
              )}

              {/* Min Value Filter */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Minimum Value</h3>
                  <Input
                    type="number"
                    placeholder="e.g., 1000000"
                    value={minValue}
                    onChange={(e) => setMinValue(e.target.value)}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Results */}
          <div className="flex-1 min-w-0">
            {/* Insights */}
            {insights.length > 0 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {insights.map((insight, i) => (
                  <Card key={i} className={`border-l-4 ${
                    insight.priority === 'high' ? 'border-l-primary' : 'border-l-muted'
                  }`}>
                    <CardContent className="p-3 flex items-start gap-3">
                      <span className="text-2xl">{insight.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{insight.title}</p>
                        <p className="text-xs text-muted-foreground">{insight.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Results List */}
            <div className="space-y-3">
              {results.map((result) => (
                <Link
                  key={result.id}
                  to={result.result_type === 'entity' 
                    ? `/entity/${result.id}` 
                    : result.entity_id 
                      ? `/entity/${result.entity_id}` 
                      : '#'}
                >
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                          {getResultIcon(result.result_type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold truncate">{result.name}</h3>
                            <Badge variant="outline" className="capitalize">
                              {result.result_type}
                            </Badge>
                            {result.set_aside && (
                              <Badge variant="secondary">
                                {result.set_aside}
                              </Badge>
                            )}
                          </div>
                          
                          {result.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {result.description}
                            </p>
                          )}
                          
                          {result.agency && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {result.agency}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {result.state && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {result.state}
                              </span>
                            )}
                            {result.entity_type && result.entity_type !== result.result_type && (
                              <Badge variant="secondary" className="text-xs">{result.entity_type}</Badge>
                            )}
                            {result.deadline && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Due: {new Date(result.deadline).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                          {result.value && result.value > 0 && (
                            <div className="text-lg font-bold text-primary">
                              {formatCurrency(result.value)}
                            </div>
                          )}
                          {result.opportunity_score && (
                            <Badge className={`${
                              result.opportunity_score >= 70 ? 'bg-green-500/20 text-green-500' :
                              result.opportunity_score >= 40 ? 'bg-yellow-500/20 text-yellow-500' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              Score: {result.opportunity_score}
                            </Badge>
                          )}
                        </div>
                        
                        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}

              {results.length === 0 && !loading && query && (
                <div className="text-center py-12">
                  <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">No results found for "{query}"</h3>
                  <p className="text-muted-foreground mt-1">Try different keywords or remove filters</p>
                </div>
              )}

              {!query && (
                <div className="text-center py-16">
                  <Sparkles className="w-20 h-20 text-primary mx-auto mb-6" />
                  <h2 className="text-2xl font-bold">Search Government Data</h2>
                  <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                    Search across millions of contracts, grants, opportunities, and organizations
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-6">
                    {[
                      'IT contractors in Virginia',
                      'Healthcare grants over $1M',
                      'DoD cybersecurity contracts',
                      'Small business set-asides',
                      'Universities NIH funding',
                      'Maryland government contracts'
                    ].map(suggestion => (
                      <Button
                        key={suggestion}
                        variant="outline"
                        size="sm"
                        onClick={() => setQuery(suggestion)}
                      >
                        <Search className="w-3 h-3 mr-2" />
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Aggregations */}
          {aggregations && results.length > 0 && (
            <div className="w-64 flex-shrink-0 hidden xl:block">
              {/* By Agency */}
              {aggregations.by_agency?.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3">Top Agencies</h3>
                    <div className="space-y-2">
                      {aggregations.by_agency.slice(0, 8).map(({ key, count }) => (
                        <div key={key} className="flex items-center justify-between text-sm">
                          <span className="truncate text-muted-foreground">{key}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
