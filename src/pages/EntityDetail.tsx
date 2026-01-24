import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { EntityLink } from '@/components/EntityLink';
import {
  Building2, DollarSign, FileText, Link2, Lightbulb, MapPin,
  Calendar, TrendingUp, Star, Bell, Download, Share2, ExternalLink,
  ChevronRight, Clock, Activity, Award, Briefcase, Users, Globe,
  Phone, Mail, ArrowLeft, RefreshCw, Loader2
} from 'lucide-react';

interface Entity {
  id: string;
  canonical_name: string;
  entity_type?: string;
  state?: string;
  city?: string;
  description?: string;
  opportunity_score?: number;
  data_quality_score?: number;
  health_score?: number;
  total_contract_value?: number;
  total_grant_value?: number;
  contract_count?: number;
  grant_count?: number;
  uei?: string;
  cage_code?: string;
  naics_codes?: string[];
  business_types?: string[];
  website?: string;
  phone?: string;
}

interface Contract {
  id: string;
  award_id?: string;
  recipient_name: string;
  awarding_agency?: string;
  description?: string;
  award_amount?: number;
  pop_state?: string;
  start_date?: string;
  end_date?: string;
  naics_code?: string;
  set_aside_type?: string;
}

interface Grant {
  id: string;
  grant_id?: string;
  recipient_name: string;
  awarding_agency?: string;
  project_title?: string;
  award_amount?: number;
  cfda_number?: string;
  start_date?: string;
}

interface Fact {
  id: string;
  fact_type?: string;
  fact_value?: unknown;
  confidence?: number;
  source?: string;
  created_at?: string;
}

interface RelatedEntity {
  id: string;
  canonical_name: string;
  entity_type?: string;
}

interface Relationship {
  id: string;
  relationship_type?: string;
  strength?: number;
  from_entity_id?: string;
  to_entity_id?: string;
  to_entity?: RelatedEntity;
  from_entity?: RelatedEntity;
}

export default function EntityDetail() {
  const { id } = useParams();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (id) loadEntityData(id);
  }, [id]);

  async function loadEntityData(entityId: string) {
    setLoading(true);

    try {
      // Try using the 360 function first
      const { data: data360, error: error360 } = await supabase
        .rpc('get_entity_360', { p_entity_id: entityId });

      if (data360 && !error360 && typeof data360 === 'object' && data360 !== null) {
        const d360 = data360 as Record<string, unknown>;
        setEntity(d360.entity as Entity);
        setContracts((d360.contracts || []) as Contract[]);
        setGrants((d360.grants || []) as Grant[]);
        setFacts((d360.facts || []) as Fact[]);
        setRelationships((d360.relationships || []) as Relationship[]);
      } else {
        // Fallback to individual queries
        const [entityRes, contractsRes, grantsRes, factsRes, relsRes] = await Promise.all([
          supabase.from('core_entities').select('*').eq('id', entityId).single(),
          supabase.from('contracts').select('*').eq('recipient_entity_id', entityId).order('award_amount', { ascending: false }).limit(100),
          supabase.from('grants').select('*').eq('recipient_entity_id', entityId).order('award_amount', { ascending: false }).limit(100),
          supabase.from('core_facts').select('*').eq('entity_id', entityId).order('created_at', { ascending: false }).limit(100),
          supabase.from('core_relationships').select('*, to_entity:core_entities!core_relationships_to_entity_id_fkey(id, canonical_name, entity_type), from_entity:core_entities!core_relationships_from_entity_id_fkey(id, canonical_name, entity_type)').or(`from_entity_id.eq.${entityId},to_entity_id.eq.${entityId}`).limit(50)
        ]);

        setEntity(entityRes.data);
        setContracts(contractsRes.data || []);
        setGrants(grantsRes.data || []);
        setFacts(factsRes.data || []);
        setRelationships(relsRes.data || []);
      }
    } catch (error) {
      console.error('Error loading entity:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(value: number | null | undefined) {
    if (!value) return '$0';
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  }

  function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading entity data...</span>
        </div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Building2 className="w-16 h-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Entity Not Found</h1>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Search
          </Button>
        </Link>
      </div>
    );
  }

  const totalValue = (entity.total_contract_value || 0) + (entity.total_grant_value || 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          {/* Back button */}
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Search
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-8 h-8 text-primary" />
              </div>

              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{entity.canonical_name}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant="outline">{entity.entity_type || 'Unknown'}</Badge>
                  {entity.city && entity.state && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {entity.city}, {entity.state}
                    </span>
                  )}
                  {entity.opportunity_score && (
                    <Badge className={`${
                      entity.opportunity_score >= 70 ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' :
                      entity.opportunity_score >= 40 ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      <Star className="w-3 h-3 mr-1" />
                      Score: {entity.opportunity_score}
                    </Badge>
                  )}
                </div>

                {entity.description && (
                  <p className="mt-3 text-sm text-muted-foreground max-w-2xl">{entity.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm">
                <Star className="w-4 h-4 mr-1" /> Save
              </Button>
              <Button variant="outline" size="sm">
                <Bell className="w-4 h-4 mr-1" /> Alert
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-1" /> Share
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1" /> Export
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <DollarSign className="w-3 h-3" />
                  Total Value
                </div>
                <div className="text-xl font-bold text-primary">
                  {formatCurrency(totalValue)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <FileText className="w-3 h-3" />
                  Contracts
                </div>
                <div className="text-xl font-bold">{entity.contract_count || contracts.length}</div>
                <div className="text-xs text-muted-foreground">{formatCurrency(entity.total_contract_value)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Award className="w-3 h-3" />
                  Grants
                </div>
                <div className="text-xl font-bold">{entity.grant_count || grants.length}</div>
                <div className="text-xs text-muted-foreground">{formatCurrency(entity.total_grant_value)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Link2 className="w-3 h-3" />
                  Relationships
                </div>
                <div className="text-xl font-bold">{relationships.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Lightbulb className="w-3 h-3" />
                  Facts
                </div>
                <div className="text-xl font-bold">{facts.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <TrendingUp className="w-3 h-3" />
                  Opportunity
                </div>
                <div className="text-xl font-bold">{entity.opportunity_score || 'N/A'}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contracts">Contracts ({contracts.length})</TabsTrigger>
            <TabsTrigger value="grants">Grants ({grants.length})</TabsTrigger>
            <TabsTrigger value="relationships">Relationships ({relationships.length})</TabsTrigger>
            <TabsTrigger value="facts">Facts ({facts.length})</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Recent Activity */}
              <div className="lg:col-span-2 space-y-6">
                {/* Top Contracts */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Top Contracts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {contracts.slice(0, 5).map((contract) => (
                        <div key={contract.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{contract.description || contract.awarding_agency || 'Contract Award'}</p>
                            <p className="text-xs text-muted-foreground">{contract.awarding_agency}</p>
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <span className="font-bold text-primary">{formatCurrency(contract.award_amount)}</span>
                          </div>
                        </div>
                      ))}
                      {contracts.length === 0 && (
                        <p className="text-muted-foreground text-center py-4">No contracts found</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Facts */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {facts.slice(0, 5).map((fact) => (
                        <div key={fact.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                          <Badge variant="outline" className="mt-0.5">
                            {fact.fact_type?.replace(/_/g, ' ')}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              {typeof fact.fact_value === 'object' 
                                ? JSON.stringify(fact.fact_value).slice(0, 100) 
                                : String(fact.fact_value)}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(fact.created_at)}</span>
                        </div>
                      ))}
                      {facts.length === 0 && (
                        <p className="text-muted-foreground text-center py-4">No facts recorded</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Entity Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Entity Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {entity.uei && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">UEI</span>
                        <span className="font-mono">{entity.uei}</span>
                      </div>
                    )}
                    {entity.cage_code && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">CAGE Code</span>
                        <span className="font-mono">{entity.cage_code}</span>
                      </div>
                    )}
                    {entity.naics_codes && entity.naics_codes.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">NAICS Codes</span>
                        <div className="flex flex-wrap gap-1">
                          {entity.naics_codes.slice(0, 5).map((code: string) => (
                            <Badge key={code} variant="secondary" className="text-xs">{code}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {entity.business_types && entity.business_types.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Business Types</span>
                        <div className="flex flex-wrap gap-1">
                          {entity.business_types.slice(0, 5).map((type: string) => (
                            <Badge key={type} variant="outline" className="text-xs">{type}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <Separator />
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">Data Quality</span>
                      <div className="flex items-center gap-2">
                        <Progress value={entity.data_quality_score || 80} className="flex-1" />
                        <span className="text-sm font-medium">{entity.data_quality_score || 80}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Connections */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Top Connections</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {relationships.slice(0, 5).map((rel) => {
                        const relatedEntity = rel.to_entity?.id === id ? rel.from_entity : rel.to_entity;
                        if (!relatedEntity) return null;
                        return (
                          <Link 
                            key={rel.id} 
                            to={`/entity/${relatedEntity.id}`}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors group"
                          >
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm flex-1 truncate group-hover:text-primary transition-colors">
                              {relatedEntity.canonical_name}
                            </span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </Link>
                        );
                      })}
                      {relationships.length === 0 && (
                        <p className="text-muted-foreground text-center py-4 text-sm">No relationships found</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* CONTRACTS TAB */}
          <TabsContent value="contracts">
            <Card>
              <CardContent className="p-6">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {contracts.map(contract => (
                      <div key={contract.id} className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium">{contract.description || 'Contract Award'}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{contract.awarding_agency}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {contract.pop_state && <Badge variant="outline">{contract.pop_state}</Badge>}
                              {contract.start_date && <Badge variant="secondary">{formatDate(contract.start_date)}</Badge>}
                              {contract.naics_code && <Badge variant="secondary">NAICS: {contract.naics_code}</Badge>}
                              {contract.set_aside_type && <Badge variant="secondary">{contract.set_aside_type}</Badge>}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-xl font-bold text-primary">
                              {formatCurrency(contract.award_amount)}
                            </div>
                            {contract.award_id && (
                              <p className="text-xs text-muted-foreground mt-1">ID: {contract.award_id}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {contracts.length === 0 && (
                      <p className="text-muted-foreground text-center py-8">No contracts found for this entity</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* GRANTS TAB */}
          <TabsContent value="grants">
            <Card>
              <CardContent className="p-6">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {grants.map(grant => (
                      <div key={grant.id} className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium">{grant.project_title || 'Grant Award'}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{grant.awarding_agency}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {grant.cfda_number && <Badge variant="outline">CFDA: {grant.cfda_number}</Badge>}
                              {grant.start_date && <Badge variant="secondary">{formatDate(grant.start_date)}</Badge>}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-xl font-bold text-primary">{formatCurrency(grant.award_amount)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {grants.length === 0 && (
                      <p className="text-muted-foreground text-center py-8">No grants found for this entity</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* RELATIONSHIPS TAB */}
          <TabsContent value="relationships">
            <Card>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {relationships.map(rel => {
                    const relatedEntity = rel.to_entity?.id === id ? rel.from_entity : rel.to_entity;
                    if (!relatedEntity) return null;
                    return (
                      <Link 
                        key={rel.id}
                        to={`/entity/${relatedEntity.id}`}
                        className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <Building2 className="w-8 h-8 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate group-hover:text-primary transition-colors">
                              {relatedEntity.canonical_name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {rel.relationship_type?.replace(/_/g, ' ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <Badge variant="outline">{relatedEntity.entity_type}</Badge>
                          <Badge variant="secondary">{((rel.strength || 0) * 100).toFixed(0)}% strength</Badge>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                {relationships.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">No relationships found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* FACTS TAB */}
          <TabsContent value="facts">
            <Card>
              <CardContent className="p-6">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {facts.map(fact => (
                      <div key={fact.id} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <Badge variant="outline">{fact.fact_type?.replace(/_/g, ' ')}</Badge>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{((fact.confidence || 0) * 100).toFixed(0)}% confidence</span>
                            <span>•</span>
                            <span>{formatDate(fact.created_at)}</span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <pre className="text-sm bg-muted p-3 rounded overflow-x-auto">
                            {JSON.stringify(fact.fact_value, null, 2)}
                          </pre>
                        </div>
                        {fact.source && (
                          <p className="text-xs text-muted-foreground mt-2">Source: {fact.source}</p>
                        )}
                      </div>
                    ))}
                    {facts.length === 0 && (
                      <p className="text-muted-foreground text-center py-8">No facts recorded for this entity</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
