import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, MapPin, Calendar, TrendingUp, AlertTriangle, 
  ArrowLeft, Star, Bell, Download, Share2, ExternalLink,
  FileText, Users, DollarSign, Shield, Clock, Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';

interface EntityData {
  id: string;
  canonical_name: string;
  entity_type: string;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  data_quality_score: number | null;
  health_score: number | null;
  opportunity_score: number | null;
  risk_score: number | null;
  source_count: number | null;
  tags: string[] | null;
  merged_data: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

interface EntityFact {
  id: string;
  fact_type: string;
  fact_value: Record<string, unknown>;
  confidence: number | null;
  source_name: string | null;
  created_at: string | null;
}

interface EntityRelationship {
  id: string;
  relationship_type: string;
  confidence: number | null;
  related_entity: {
    id: string;
    canonical_name: string;
    entity_type: string;
  };
}

export default function EntityProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [entity, setEntity] = useState<EntityData | null>(null);
  const [facts, setFacts] = useState<EntityFact[]>([]);
  const [relationships, setRelationships] = useState<EntityRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWatched, setIsWatched] = useState(false);

  useEffect(() => {
    if (id) loadEntity();
  }, [id]);

  const loadEntity = async () => {
    setLoading(true);
    
    const [entityRes, factsRes, relsRes] = await Promise.all([
      supabase.from('core_entities').select('*').eq('id', id).single(),
      supabase.from('core_facts').select('*').eq('entity_id', id).order('created_at', { ascending: false }).limit(50),
      supabase.from('core_relationships').select(`
        id, relationship_type, confidence,
        to_entity:core_entities!core_relationships_to_entity_id_fkey(id, canonical_name, entity_type)
      `).eq('from_entity_id', id).limit(20)
    ]);

    if (entityRes.data) setEntity(entityRes.data as EntityData);
    if (factsRes.data) setFacts(factsRes.data as EntityFact[]);
    if (relsRes.data) {
      setRelationships(relsRes.data.map((r: any) => ({
        id: r.id,
        relationship_type: r.relationship_type,
        confidence: r.confidence,
        related_entity: r.to_entity
      })));
    }
    
    setLoading(false);
  };

  const toggleWatch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    if (isWatched) {
      await supabase.from('entity_watchlist').delete().eq('entity_id', id).eq('user_id', user.id);
    } else {
      await supabase.from('entity_watchlist').insert({ entity_id: id, user_id: user.id });
    }
    setIsWatched(!isWatched);
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading entity...</div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Entity Not Found</h1>
        <Link to="/"><Button>Back to Search</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
            </Link>
            <Logo />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleWatch}>
              <Star className={`w-4 h-4 mr-2 ${isWatched ? 'fill-yellow-400 text-yellow-400' : ''}`} />
              {isWatched ? 'Watching' : 'Watch'}
            </Button>
            <Button variant="outline" size="sm">
              <Bell className="w-4 h-4 mr-2" /> Alert
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" /> Share
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Entity Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline" className="text-primary border-primary">
                  {entity.entity_type}
                </Badge>
                {entity.tags?.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
              <h1 className="text-3xl font-bold">{entity.canonical_name}</h1>
              {(entity.city || entity.state) && (
                <p className="text-muted-foreground flex items-center gap-2 mt-2">
                  <MapPin className="w-4 h-4" />
                  {[entity.city, entity.state, entity.country].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Score Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <ScoreCard 
              label="Data Quality" 
              value={entity.data_quality_score} 
              icon={<Activity className="w-5 h-5" />}
            />
            <ScoreCard 
              label="Health Score" 
              value={entity.health_score} 
              icon={<Shield className="w-5 h-5" />}
            />
            <ScoreCard 
              label="Opportunity" 
              value={entity.opportunity_score} 
              icon={<TrendingUp className="w-5 h-5" />}
            />
            <ScoreCard 
              label="Risk Level" 
              value={entity.risk_score} 
              icon={<AlertTriangle className="w-5 h-5" />}
              inverted
            />
            <ScoreCard 
              label="Sources" 
              value={entity.source_count} 
              icon={<FileText className="w-5 h-5" />}
              isCount
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="facts">Facts ({facts.length})</TabsTrigger>
            <TabsTrigger value="relationships">Relationships ({relationships.length})</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    Entity Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DetailRow label="Type" value={entity.entity_type} />
                  <DetailRow label="Location" value={[entity.city, entity.state].filter(Boolean).join(', ') || 'N/A'} />
                  <DetailRow label="Country" value={entity.country || 'N/A'} />
                  <DetailRow label="Sources" value={`${entity.source_count || 0} data sources`} />
                  <DetailRow label="Last Updated" value={entity.updated_at ? new Date(entity.updated_at).toLocaleDateString() : 'N/A'} />
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Key Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {facts.slice(0, 5).map(fact => (
                    <div key={fact.id} className="flex justify-between items-center">
                      <span className="text-muted-foreground capitalize">{fact.fact_type.replace(/_/g, ' ')}</span>
                      <span className="font-medium">
                        {typeof fact.fact_value === 'object' 
                          ? JSON.stringify(fact.fact_value).slice(0, 30) 
                          : String(fact.fact_value)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="facts">
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {facts.map(fact => (
                    <div key={fact.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium capitalize">{fact.fact_type.replace(/_/g, ' ')}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {typeof fact.fact_value === 'object' 
                              ? JSON.stringify(fact.fact_value, null, 2).slice(0, 100) 
                              : String(fact.fact_value)}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <Badge variant="outline" className="mb-1">
                            {Math.round((fact.confidence || 0) * 100)}% confident
                          </Badge>
                          <p className="text-muted-foreground">{fact.source_name || 'Unknown'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="relationships">
            <div className="grid md:grid-cols-2 gap-4">
              {relationships.map(rel => (
                <Card key={rel.id} className="bg-card border-border hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{rel.related_entity?.canonical_name}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {rel.relationship_type.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                      <Link to={`/entity/${rel.related_entity?.id}`}>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="timeline">
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="space-y-6">
                  <TimelineItem 
                    date={entity.created_at || ''} 
                    title="Entity Created" 
                    description="First discovered in data pipeline"
                  />
                  {facts.slice(0, 5).map(fact => (
                    <TimelineItem 
                      key={fact.id}
                      date={fact.created_at || ''} 
                      title={`New ${fact.fact_type.replace(/_/g, ' ')}`} 
                      description={`From ${fact.source_name || 'Unknown source'}`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contracts">
            <Card className="bg-card border-border">
              <CardContent className="p-6 text-center text-muted-foreground">
                <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Contract data will appear here when available.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function ScoreCard({ label, value, icon, inverted = false, isCount = false }: {
  label: string;
  value: number | null;
  icon: React.ReactNode;
  inverted?: boolean;
  isCount?: boolean;
}) {
  const displayValue = value ?? 0;
  const getColor = () => {
    if (isCount) return 'text-primary';
    if (inverted) {
      if (displayValue >= 70) return 'text-red-400';
      if (displayValue >= 40) return 'text-yellow-400';
      return 'text-green-400';
    }
    if (displayValue >= 70) return 'text-green-400';
    if (displayValue >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-muted-foreground text-sm">{label}</span>
          <span className={getColor()}>{icon}</span>
        </div>
        <p className={`text-2xl font-bold ${getColor()}`}>
          {isCount ? displayValue : `${displayValue}%`}
        </p>
        {!isCount && (
          <Progress value={displayValue} className="h-1 mt-2" />
        )}
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function TimelineItem({ date, title, description }: { date: string; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-3 h-3 rounded-full bg-primary" />
        <div className="w-px h-full bg-border" />
      </div>
      <div className="pb-6">
        <p className="text-sm text-muted-foreground">
          {date ? new Date(date).toLocaleDateString() : 'Unknown date'}
        </p>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
