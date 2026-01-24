import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { 
  Search, SortAsc, SortDesc, Download, RefreshCw,
  Building2, FileText, Link2, Lightbulb, ChevronLeft, ChevronRight,
  Eye, Star, MapPin, Loader2, X,
  Database, Grid3X3, List, ExternalLink, Copy, Check, Home
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

// Types
interface Entity {
  id: string;
  canonical_name: string;
  entity_type: string;
  city: string;
  state: string;
  opportunity_score: number;
  data_quality_score: number;
  source_count: number;
  created_at: string;
}

interface Fact {
  id: string;
  entity_id: string;
  fact_type: string;
  fact_value: unknown;
  confidence: number;
  source_name: string;
  created_at: string;
  entity?: { canonical_name: string };
}

interface Relationship {
  id: string;
  from_entity_id: string;
  to_entity_id: string;
  relationship_type: string;
  strength: number;
  from_entity?: { canonical_name: string; id?: string };
  to_entity?: { canonical_name: string; id?: string };
}

interface Insight {
  id: string;
  insight_type: string;
  title: string;
  description: string;
  severity: string;
  confidence: number;
  created_at: string;
}

const ITEMS_PER_PAGE = 50;

export default function Explorer() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('entities');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  // Data states
  const [entities, setEntities] = useState<Entity[]>([]);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  
  // Counts
  const [counts, setCounts] = useState({
    entities: 0,
    facts: 0,
    relationships: 0,
    insights: 0
  });
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filters
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('all');
  const [state, setState] = useState('all');
  const [factType, setFactType] = useState('all');
  const [insightType, setInsightType] = useState('all');
  const [minScore, setMinScore] = useState(0);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Filter options
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [factTypes, setFactTypes] = useState<string[]>([]);
  const [insightTypes, setInsightTypes] = useState<string[]>([]);
  
  // Selected entity for detail view
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [entityFacts, setEntityFacts] = useState<Fact[]>([]);
  const [entityRelationships, setEntityRelationships] = useState<Relationship[]>([]);
  
  // Copy state
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    loadFilterOptions();
    loadCounts();
  }, []);

  useEffect(() => {
    loadData();
  }, [activeTab, page, search, entityType, state, factType, insightType, minScore, sortBy, sortOrder]);

  async function loadFilterOptions() {
    const [typesRes, statesRes, fTypesRes, iTypesRes] = await Promise.all([
      supabase.from('core_entities').select('entity_type').not('entity_type', 'is', null),
      supabase.from('core_entities').select('state').not('state', 'is', null),
      supabase.from('core_facts').select('fact_type').not('fact_type', 'is', null),
      supabase.from('core_derived_insights').select('insight_type').not('insight_type', 'is', null)
    ]);

    setEntityTypes([...new Set(typesRes.data?.map(t => t.entity_type).filter(Boolean) || [])].sort());
    setStates([...new Set(statesRes.data?.map(s => s.state).filter(Boolean) || [])].sort());
    setFactTypes([...new Set(fTypesRes.data?.map(f => f.fact_type).filter(Boolean) || [])].sort());
    setInsightTypes([...new Set(iTypesRes.data?.map(i => i.insight_type).filter(Boolean) || [])].sort());
  }

  async function loadCounts() {
    const [entitiesCount, factsCount, relsCount, insightsCount] = await Promise.all([
      supabase.from('core_entities').select('*', { count: 'exact', head: true }),
      supabase.from('core_facts').select('*', { count: 'exact', head: true }),
      supabase.from('core_relationships').select('*', { count: 'exact', head: true }),
      supabase.from('core_derived_insights').select('*', { count: 'exact', head: true })
    ]);

    setCounts({
      entities: entitiesCount.count || 0,
      facts: factsCount.count || 0,
      relationships: relsCount.count || 0,
      insights: insightsCount.count || 0
    });
  }

  async function loadData() {
    setLoading(true);
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    try {
      switch (activeTab) {
        case 'entities': {
          let query = supabase
            .from('core_entities')
            .select('*', { count: 'exact' });

          if (search) query = query.ilike('canonical_name', `%${search}%`);
          if (entityType !== 'all') query = query.eq('entity_type', entityType);
          if (state !== 'all') query = query.eq('state', state);
          if (minScore > 0) query = query.gte('opportunity_score', minScore);

          query = query.order(sortBy, { ascending: sortOrder === 'asc' });
          query = query.range(from, to);

          const { data, count } = await query;
          setEntities((data || []) as Entity[]);
          setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
          break;
        }

        case 'facts': {
          let query = supabase
            .from('core_facts')
            .select(`*, entity:core_entities(canonical_name)`, { count: 'exact' });

          if (search) query = query.or(`fact_type.ilike.%${search}%,source.ilike.%${search}%`);
          if (factType !== 'all') query = query.eq('fact_type', factType);

          query = query.order(sortBy === 'created_at' ? 'created_at' : 'confidence', { ascending: sortOrder === 'asc' });
          query = query.range(from, to);

          const { data, count } = await query;
          setFacts((data || []) as Fact[]);
          setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
          break;
        }

        case 'relationships': {
          let query = supabase
            .from('core_relationships')
            .select(`*, from_entity:core_entities!from_entity_id(id, canonical_name), to_entity:core_entities!to_entity_id(id, canonical_name)`, { count: 'exact' });

          if (search) query = query.ilike('relationship_type', `%${search}%`);

          query = query.order(sortBy === 'created_at' ? 'created_at' : 'strength', { ascending: sortOrder === 'asc' });
          query = query.range(from, to);

          const { data, count } = await query;
          setRelationships((data || []) as Relationship[]);
          setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
          break;
        }

        case 'insights': {
          let query = supabase
            .from('core_derived_insights')
            .select('*', { count: 'exact' });

          if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
          if (insightType !== 'all') query = query.eq('insight_type', insightType);

          query = query.order(sortBy === 'created_at' ? 'created_at' : 'confidence', { ascending: sortOrder === 'asc' });
          query = query.range(from, to);

          const { data, count } = await query;
          setInsights((data || []) as Insight[]);
          setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
          break;
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadEntityDetails(entity: Entity) {
    setSelectedEntity(entity);
    
    const [factsRes, relsRes] = await Promise.all([
      supabase.from('core_facts').select('*').eq('entity_id', entity.id).order('confidence', { ascending: false }).limit(100),
      supabase.from('core_relationships')
        .select(`*, from_entity:core_entities!from_entity_id(id, canonical_name), to_entity:core_entities!to_entity_id(id, canonical_name)`)
        .or(`from_entity_id.eq.${entity.id},to_entity_id.eq.${entity.id}`)
        .order('strength', { ascending: false })
        .limit(50)
    ]);

    setEntityFacts((factsRes.data || []) as Fact[]);
    setEntityRelationships((relsRes.data || []) as Relationship[]);
  }

  function resetFilters() {
    setSearch('');
    setEntityType('all');
    setState('all');
    setFactType('all');
    setInsightType('all');
    setMinScore(0);
    setSortBy('created_at');
    setSortOrder('desc');
    setPage(1);
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  async function exportData() {
    let data: unknown[] = [];
    switch (activeTab) {
      case 'entities': data = entities; break;
      case 'facts': data = facts; break;
      case 'relationships': data = relationships; break;
      case 'insights': data = insights; break;
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `based-data-${activeTab}-export.json`;
    a.click();
  }

  function getScoreColor(score: number | null) {
    if (!score) return 'bg-muted';
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  }

  function getSeverityColor(severity: string) {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          {/* Title Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon" className="mr-2">
                  <Home className="w-5 h-5" />
                </Button>
              </Link>
              <div className="p-3 bg-gradient-to-br from-primary to-primary/60 rounded-xl shadow-lg shadow-primary/20">
                <Database className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                  Data Explorer
                </h1>
                <p className="text-sm text-muted-foreground">
                  {counts.entities.toLocaleString()} entities • {counts.facts.toLocaleString()} facts • {counts.relationships.toLocaleString()} relationships
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => { loadData(); loadCounts(); }}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportData}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <div className="flex items-center border border-border rounded-lg overflow-hidden">
                <Button 
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-none"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button 
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-none"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }}>
            <TabsList className="bg-muted p-1 gap-1">
              <TabsTrigger value="entities" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Building2 className="w-4 h-4 mr-2" />
                Entities ({counts.entities.toLocaleString()})
              </TabsTrigger>
              <TabsTrigger value="facts" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                <FileText className="w-4 h-4 mr-2" />
                Facts ({counts.facts.toLocaleString()})
              </TabsTrigger>
              <TabsTrigger value="relationships" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                <Link2 className="w-4 h-4 mr-2" />
                Relationships ({counts.relationships.toLocaleString()})
              </TabsTrigger>
              <TabsTrigger value="insights" className="data-[state=active]:bg-muted data-[state=active]:text-foreground">
                <Lightbulb className="w-4 h-4 mr-2" />
                Insights ({counts.insights.toLocaleString()})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        {/* Filters Bar */}
        <Card className="bg-card/80 border-border mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Search */}
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-10"
                />
              </div>

              {/* Tab-specific filters */}
              {activeTab === 'entities' && (
                <>
                  <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(1); }}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Entity Type" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="all">All Types</SelectItem>
                      {entityTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={state} onValueChange={(v) => { setState(v); setPage(1); }}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="all">All States</SelectItem>
                      {states.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-2 min-w-[200px]">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Min Score:</span>
                    <Slider
                      value={[minScore]}
                      onValueChange={([v]) => { setMinScore(v); setPage(1); }}
                      max={100}
                      step={10}
                      className="w-24"
                    />
                    <span className="text-sm font-mono w-8">{minScore}</span>
                  </div>
                </>
              )}

              {activeTab === 'facts' && (
                <Select value={factType} onValueChange={(v) => { setFactType(v); setPage(1); }}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Fact Type" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="all">All Types</SelectItem>
                    {factTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {activeTab === 'insights' && (
                <Select value={insightType} onValueChange={(v) => { setInsightType(v); setPage(1); }}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Insight Type" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="all">All Types</SelectItem>
                    {insightTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Sort */}
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Date</SelectItem>
                    {activeTab === 'entities' && <SelectItem value="opportunity_score">Score</SelectItem>}
                    {activeTab === 'entities' && <SelectItem value="canonical_name">Name</SelectItem>}
                    {activeTab === 'facts' && <SelectItem value="confidence">Confidence</SelectItem>}
                    {activeTab === 'relationships' && <SelectItem value="strength">Strength</SelectItem>}
                    {activeTab === 'insights' && <SelectItem value="confidence">Confidence</SelectItem>}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                </Button>
              </div>

              {/* Reset */}
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="w-4 h-4 mr-1" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Display */}
        <div className="relative min-h-[400px]">
          {loading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-xl">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
          )}

          {/* ENTITIES TAB */}
          {activeTab === 'entities' && (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2'}>
              {entities.map((entity) => (
                <Card 
                  key={entity.id} 
                  className={`bg-card/80 border-border hover:border-primary/50 transition-all cursor-pointer group ${
                    viewMode === 'grid' ? '' : 'flex items-center'
                  }`}
                  onClick={() => loadEntityDetails(entity)}
                >
                  <CardContent className={`p-4 ${viewMode === 'grid' ? '' : 'flex items-center justify-between w-full'}`}>
                    {viewMode === 'grid' ? (
                      <>
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div className={`w-3 h-3 rounded-full ${getScoreColor(entity.opportunity_score)}`} />
                        </div>
                        <h3 className="font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                          {entity.canonical_name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">{entity.entity_type}</p>
                        <div className="flex items-center justify-between text-xs">
                          {entity.city && entity.state && (
                            <span className="text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {entity.city}, {entity.state}
                            </span>
                          )}
                          <Badge variant="outline" className="text-xs">
                            Score: {entity.opportunity_score || 'N/A'}
                          </Badge>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {entity.canonical_name}
                            </h3>
                            <p className="text-sm text-muted-foreground">{entity.entity_type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 flex-shrink-0">
                          {entity.city && entity.state && (
                            <span className="text-sm text-muted-foreground flex items-center gap-1 hidden lg:flex">
                              <MapPin className="w-4 h-4" />
                              {entity.city}, {entity.state}
                            </span>
                          )}
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getScoreColor(entity.opportunity_score)}`} />
                            <span className="font-mono text-sm">{entity.opportunity_score || '-'}</span>
                          </div>
                          <Eye className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
              {entities.length === 0 && !loading && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  No entities found. Try adjusting your filters.
                </div>
              )}
            </div>
          )}

          {/* FACTS TAB */}
          {activeTab === 'facts' && (
            <div className="space-y-2">
              {facts.map((fact) => (
                <Card key={fact.id} className="bg-card/80 border-border hover:border-accent transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-accent/20 text-accent-foreground border-accent/30">
                            {fact.fact_type}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            from {fact.entity?.canonical_name || 'Unknown'}
                          </span>
                        </div>
                        <div className="bg-muted rounded-lg p-3 font-mono text-sm overflow-x-auto">
                          <pre className="whitespace-pre-wrap text-muted-foreground">
                            {typeof fact.fact_value === 'object' 
                              ? JSON.stringify(fact.fact_value, null, 2)
                              : String(fact.fact_value)}
                          </pre>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <span>Source: {fact.source_name || 'Unknown'}</span>
                          <span>•</span>
                          <span>{new Date(fact.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Confidence</p>
                          <p className="font-mono text-lg font-bold text-accent-foreground">
                            {(fact.confidence * 100).toFixed(0)}%
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(JSON.stringify(fact.fact_value), fact.id);
                          }}
                        >
                          {copied === fact.id ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {facts.length === 0 && !loading && (
                <div className="text-center py-12 text-muted-foreground">
                  No facts found. Try adjusting your filters.
                </div>
              )}
            </div>
          )}

          {/* RELATIONSHIPS TAB */}
          {activeTab === 'relationships' && (
            <div className="space-y-2">
              {relationships.map((rel) => (
                <Card key={rel.id} className="bg-card/80 border-border hover:border-secondary transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="text-right min-w-[200px]">
                          <p className="font-semibold text-foreground truncate">
                            {rel.from_entity?.canonical_name || 'Unknown'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 px-4">
                          <div className="h-[2px] w-8 bg-gradient-to-r from-secondary to-transparent" />
                          <Badge className="bg-secondary/20 text-secondary-foreground border-secondary/30 whitespace-nowrap">
                            {rel.relationship_type}
                          </Badge>
                          <div className="h-[2px] w-8 bg-gradient-to-l from-secondary to-transparent" />
                        </div>
                        <div className="text-left min-w-[200px]">
                          <p className="font-semibold text-foreground truncate">
                            {rel.to_entity?.canonical_name || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Strength</p>
                          <p className="font-mono text-lg font-bold text-secondary-foreground">
                            {(rel.strength * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {relationships.length === 0 && !loading && (
                <div className="text-center py-12 text-muted-foreground">
                  No relationships found. Try adjusting your filters.
                </div>
              )}
            </div>
          )}

          {/* INSIGHTS TAB */}
          {activeTab === 'insights' && (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
              {insights.map((insight) => (
                <Card key={insight.id} className="bg-card/80 border-border hover:border-muted transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <Badge className="bg-muted text-muted-foreground border-border">
                        {insight.insight_type}
                      </Badge>
                      <Badge className={getSeverityColor(insight.severity)}>
                        {insight.severity}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{insight.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{insight.description}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{new Date(insight.created_at).toLocaleDateString()}</span>
                      <span className="font-mono">
                        Confidence: {(insight.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {insights.length === 0 && !loading && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  No insights found. Try adjusting your filters.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages.toLocaleString()} • Showing {ITEMS_PER_PAGE} items per page
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
            >
              Last
            </Button>
          </div>
        </div>
      </div>

      {/* Entity Detail Sheet */}
      <Sheet open={!!selectedEntity} onOpenChange={() => setSelectedEntity(null)}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
          {selectedEntity && (
            <>
              <SheetHeader className="mb-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <SheetTitle className="text-2xl">{selectedEntity.canonical_name}</SheetTitle>
                    <p className="text-muted-foreground">{selectedEntity.entity_type}</p>
                    {selectedEntity.city && selectedEntity.state && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-4 h-4" />
                        {selectedEntity.city}, {selectedEntity.state}
                      </p>
                    )}
                  </div>
                </div>
              </SheetHeader>

              {/* Scores */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">Opportunity</p>
                  <p className={`text-2xl font-bold ${
                    (selectedEntity.opportunity_score || 0) >= 70 ? 'text-green-500' :
                    (selectedEntity.opportunity_score || 0) >= 40 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {selectedEntity.opportunity_score || 'N/A'}
                  </p>
                </div>
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">Data Quality</p>
                  <p className="text-2xl font-bold text-primary">
                    {selectedEntity.data_quality_score || 'N/A'}
                  </p>
                </div>
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">Sources</p>
                  <p className="text-2xl font-bold text-secondary-foreground">
                    {selectedEntity.source_count || 0}
                  </p>
                </div>
              </div>

              {/* Facts */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent-foreground" />
                  Facts ({entityFacts.length})
                </h3>
                <ScrollArea className="h-[300px] rounded-lg border border-border">
                  <div className="p-4 space-y-2">
                    {entityFacts.map((fact) => (
                      <div key={fact.id} className="bg-muted rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="text-xs">{fact.fact_type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {(fact.confidence * 100).toFixed(0)}% confidence
                          </span>
                        </div>
                        <pre className="text-sm text-muted-foreground font-mono whitespace-pre-wrap overflow-x-auto">
                          {typeof fact.fact_value === 'object' 
                            ? JSON.stringify(fact.fact_value, null, 2)
                            : String(fact.fact_value)}
                        </pre>
                      </div>
                    ))}
                    {entityFacts.length === 0 && (
                      <p className="text-muted-foreground text-center py-8">No facts found</p>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Relationships */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-secondary-foreground" />
                  Relationships ({entityRelationships.length})
                </h3>
                <ScrollArea className="h-[200px] rounded-lg border border-border">
                  <div className="p-4 space-y-2">
                    {entityRelationships.map((rel) => {
                      const isFrom = rel.from_entity?.id === selectedEntity.id;
                      const otherEntity = isFrom ? rel.to_entity : rel.from_entity;
                      return (
                        <div key={rel.id} className="flex items-center justify-between bg-muted rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{rel.relationship_type}</Badge>
                            <span className="text-sm text-muted-foreground">{otherEntity?.canonical_name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {(rel.strength * 100).toFixed(0)}% strength
                          </span>
                        </div>
                      );
                    })}
                    {entityRelationships.length === 0 && (
                      <p className="text-muted-foreground text-center py-8">No relationships found</p>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-6 pt-6 border-t border-border">
                <Button className="flex-1">
                  <Star className="w-4 h-4 mr-2" /> Add to Watchlist
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => navigate(`/entity/${selectedEntity.id}`)}>
                  <ExternalLink className="w-4 h-4 mr-2" /> View Full Profile
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
