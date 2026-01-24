// BASED DATA - Entities List Page
// Searchable list of all entities with quick navigation and portfolio management
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2, Search, Filter, Download, Grid3X3, List, 
  MapPin, DollarSign, FileText, TrendingUp, ChevronRight, ChevronLeft, Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { PortfolioManager } from '@/components/portfolio/PortfolioManager';

interface Entity {
  id: string;
  canonical_name: string;
  entity_type: string | null;
  state: string | null;
  city: string | null;
  total_contract_value: number | null;
  contract_count: number | null;
  opportunity_score: number | null;
  uei: string | null;
}

export default function EntitiesList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [sortBy, setSortBy] = useState('total_contract_value');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [view, setView] = useState<'list' | 'portfolios'>('list');
  const pageSize = 50;

  useEffect(() => {
    loadEntities();
  }, [searchQuery, sortBy, page]);

  const loadEntities = async () => {
    setLoading(true);
    
    let query = supabase
      .from('core_entities')
      .select('id, canonical_name, entity_type, state, city, total_contract_value, contract_count, opportunity_score, uei', { count: 'exact' })
      .eq('is_canonical', true)
      .order(sortBy, { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (searchQuery) {
      query = query.ilike('canonical_name', `%${searchQuery}%`);
    }

    const { data, count, error } = await query;

    if (!error && data) {
      setEntities(data);
      setTotalCount(count || 0);
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

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(0);
    if (value) {
      setSearchParams({ q: value });
    } else {
      setSearchParams({});
    }
  };

  return (
    <GlobalLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="container py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-primary" />
                  Entities Directory
                </h1>
                <p className="text-muted-foreground">{totalCount.toLocaleString()} government contractors tracked</p>
              </div>

              {/* View Toggle */}
              <div className="flex gap-2">
                <Button 
                  variant={view === 'list' ? 'default' : 'outline'}
                  onClick={() => setView('list')}
                  className="gap-2"
                >
                  <Building2 className="h-4 w-4" />
                  Directory
                </Button>
                <Button 
                  variant={view === 'portfolios' ? 'default' : 'outline'}
                  onClick={() => setView('portfolios')}
                  className="gap-2"
                >
                  <Briefcase className="h-4 w-4" />
                  Portfolios
                </Button>
              </div>
            </div>

            {/* Search & Filters - Only show in list view */}
            {view === 'list' && (
              <div className="flex flex-col sm:flex-row gap-4 mt-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search by name, UEI, or keyword..."
                    className="pl-10 h-12"
                  />
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total_contract_value">Contract Value</SelectItem>
                    <SelectItem value="contract_count">Contract Count</SelectItem>
                    <SelectItem value="opportunity_score">Opportunity Score</SelectItem>
                    <SelectItem value="canonical_name">Name (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <div className="container py-6">
          {view === 'portfolios' ? (
            <PortfolioManager />
          ) : (
            <>
              {/* Results */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : entities.length === 0 ? (
            <Card className="p-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Entities Found</h3>
              <p className="text-muted-foreground">Try a different search term</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {entities.map((entity, index) => (
                <motion.div
                  key={entity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Link to={`/entity/${entity.id}`}>
                    <Card className="p-4 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold truncate">{entity.canonical_name}</h3>
                              {entity.uei && (
                                <Badge variant="outline" className="text-xs shrink-0">Verified</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{entity.entity_type || 'Organization'}</span>
                              {entity.city && entity.state && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {entity.city}, {entity.state}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right hidden sm:block">
                            <p className="font-mono font-semibold text-primary">{formatCurrency(entity.total_contract_value)}</p>
                            <p className="text-xs text-muted-foreground">{entity.contract_count || 0} contracts</p>
                          </div>
                          {entity.opportunity_score && entity.opportunity_score >= 70 && (
                            <Badge className="bg-amber-100 text-amber-700 hidden md:flex">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Hot
                            </Badge>
                          )}
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && entities.length > 0 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalCount)} of {totalCount.toLocaleString()}
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={entities.length < pageSize}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              </div>
            )}
            </>
          )}
        </div>
      </div>
    </GlobalLayout>
  );
}
