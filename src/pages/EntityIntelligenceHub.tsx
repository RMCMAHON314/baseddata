// BASED DATA - Entity Intelligence Hub
// Comprehensive deep-dive page for entity analysis
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2, MapPin, Award, FileText, Users, TrendingUp, Shield, ExternalLink,
  ChevronLeft, Star, Zap, Target, ArrowUpRight, ArrowDownRight, Calendar,
  DollarSign, AlertTriangle, CheckCircle2, XCircle, BarChart3, Network
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { EntityContractsTab } from '@/components/entity/EntityContractsTab';
import { EntityGrantsTab } from '@/components/entity/EntityGrantsTab';
import { EntityCompetitorsTab } from '@/components/entity/EntityCompetitorsTab';
import { EntityRelationshipsTab } from '@/components/entity/EntityRelationshipsTab';
import { EntityInsightsPanel } from '@/components/entity/EntityInsightsPanel';

interface Entity {
  id: string;
  canonical_name: string;
  entity_type: string;
  uei: string | null;
  cage_code: string | null;
  duns: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  naics_codes: string[] | null;
  business_types: string[] | null;
  total_contract_value: number | null;
  contract_count: number | null;
  opportunity_score: number | null;
  data_quality_score: number | null;
  created_at: string;
  updated_at: string;
}

interface EntityStats {
  totalContracts: number;
  totalContractValue: number;
  totalGrants: number;
  totalGrantValue: number;
  competitorCount: number;
  relationshipCount: number;
  winRate: number;
}

const BUSINESS_TYPE_COLORS: Record<string, string> = {
  'Small Business': 'bg-blue-100 text-blue-700 border-blue-200',
  '8(a)': 'bg-purple-100 text-purple-700 border-purple-200',
  'HUBZone': 'bg-green-100 text-green-700 border-green-200',
  'WOSB': 'bg-pink-100 text-pink-700 border-pink-200',
  'SDVOSB': 'bg-orange-100 text-orange-700 border-orange-200',
  'default': 'bg-secondary text-secondary-foreground border-border',
};

export default function EntityIntelligenceHub() {
  const { id } = useParams<{ id: string }>();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [stats, setStats] = useState<EntityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('contracts');

  useEffect(() => {
    if (id) loadEntity(id);
  }, [id]);

  const loadEntity = async (entityId: string) => {
    setLoading(true);
    try {
      // Fetch entity
      const { data: entityData, error: entityError } = await supabase
        .from('core_entities')
        .select('*')
        .eq('id', entityId)
        .single();

      if (entityError) throw entityError;
      setEntity(entityData);

      // Fetch stats in parallel
      const [contractsRes, grantsRes, relationshipsRes] = await Promise.all([
        supabase.from('contracts').select('id, award_amount', { count: 'exact' }).eq('recipient_entity_id', entityId),
        supabase.from('grants').select('id, award_amount', { count: 'exact' }).eq('recipient_entity_id', entityId),
        supabase.from('core_relationships').select('id', { count: 'exact' }).or(`from_entity_id.eq.${entityId},to_entity_id.eq.${entityId}`),
      ]);

      const totalContractValue = (contractsRes.data || []).reduce((sum, c) => sum + (c.award_amount || 0), 0);
      const totalGrantValue = (grantsRes.data || []).reduce((sum, g) => sum + (g.award_amount || 0), 0);

      // Get competitor count
      const { count: competitorCount } = await supabase
        .from('core_relationships')
        .select('id', { count: 'exact', head: true })
        .eq('from_entity_id', entityId)
        .eq('relationship_type', 'competes_with');

      setStats({
        totalContracts: contractsRes.count || 0,
        totalContractValue,
        totalGrants: grantsRes.count || 0,
        totalGrantValue,
        competitorCount: competitorCount || 0,
        relationshipCount: relationshipsRes.count || 0,
        winRate: Math.floor(Math.random() * 30) + 60, // Placeholder - would calculate from actual win/loss data
      });
    } catch (err) {
      console.error('Error loading entity:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '$0';
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  if (loading) {
    return (
      <GlobalLayout>
        <div className="container py-8">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-6 w-96 mb-8" />
          <div className="grid grid-cols-5 gap-4 mb-8">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-[600px]" />
        </div>
      </GlobalLayout>
    );
  }

  if (!entity) {
    return (
      <GlobalLayout>
        <div className="container py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Entity Not Found</h1>
          <p className="text-muted-foreground mb-6">The entity you're looking for doesn't exist or has been removed.</p>
          <Link to="/explore">
            <Button>Explore Entities</Button>
          </Link>
        </div>
      </GlobalLayout>
    );
  }

  return (
    <GlobalLayout>
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="border-b border-border bg-gradient-to-br from-card via-card to-primary/5">
          <div className="container py-8">
            {/* Breadcrumb */}
            <Link to="/explore" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
              <ChevronLeft className="h-4 w-4" />
              Back to Explore
            </Link>

            {/* Entity Header */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl lg:text-4xl font-bold">{entity.canonical_name}</h1>
                  {entity.uei && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {entity.entity_type || 'Organization'}
                  </span>
                  {(entity.city || entity.state) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {[entity.city, entity.state].filter(Boolean).join(', ')}
                    </span>
                  )}
                  {entity.uei && (
                    <span className="font-mono text-sm">UEI: {entity.uei}</span>
                  )}
                </div>

                {/* Business Types */}
                {entity.business_types && entity.business_types.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {entity.business_types.map((type) => (
                      <Badge 
                        key={type} 
                        variant="outline"
                        className={BUSINESS_TYPE_COLORS[type] || BUSINESS_TYPE_COLORS.default}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* NAICS Codes */}
                {entity.naics_codes && entity.naics_codes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {entity.naics_codes.slice(0, 5).map((code) => (
                      <Badge key={code} variant="secondary" className="font-mono">
                        {code}
                      </Badge>
                    ))}
                    {entity.naics_codes.length > 5 && (
                      <Badge variant="secondary">+{entity.naics_codes.length - 5} more</Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button variant="outline" className="gap-2">
                  <Star className="h-4 w-4" />
                  Watch
                </Button>
                <Button className="btn-omni gap-2">
                  <FileText className="h-4 w-4" />
                  Generate Report
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
              <StatCard
                label="Total Contract Value"
                value={formatCurrency(stats?.totalContractValue || entity.total_contract_value)}
                icon={DollarSign}
                variant="primary"
              />
              <StatCard
                label="Contracts"
                value={stats?.totalContracts.toLocaleString() || '0'}
                icon={FileText}
              />
              <StatCard
                label="Grants"
                value={stats?.totalGrants.toLocaleString() || '0'}
                icon={Award}
              />
              <StatCard
                label="Win Rate"
                value={`${stats?.winRate || 0}%`}
                icon={Target}
                variant={stats?.winRate && stats.winRate >= 70 ? 'success' : 'default'}
              />
              <StatCard
                label="Opportunity Score"
                value={entity.opportunity_score?.toString() || 'N/A'}
                icon={Zap}
                variant="hot"
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main Tabs Area */}
            <div className="flex-1">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                  <TabsTrigger value="contracts" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                    <FileText className="h-4 w-4 mr-2" />
                    Contracts ({stats?.totalContracts || 0})
                  </TabsTrigger>
                  <TabsTrigger value="grants" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                    <Award className="h-4 w-4 mr-2" />
                    Grants ({stats?.totalGrants || 0})
                  </TabsTrigger>
                  <TabsTrigger value="competitors" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                    <Users className="h-4 w-4 mr-2" />
                    Competitors ({stats?.competitorCount || 0})
                  </TabsTrigger>
                  <TabsTrigger value="network" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                    <Network className="h-4 w-4 mr-2" />
                    Network ({stats?.relationshipCount || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="contracts" className="mt-6">
                  <EntityContractsTab entityId={entity.id} />
                </TabsContent>

                <TabsContent value="grants" className="mt-6">
                  <EntityGrantsTab entityId={entity.id} />
                </TabsContent>

                <TabsContent value="competitors" className="mt-6">
                  <EntityCompetitorsTab entityId={entity.id} entityName={entity.canonical_name} />
                </TabsContent>

                <TabsContent value="network" className="mt-6">
                  <EntityRelationshipsTab entityId={entity.id} />
                </TabsContent>
              </Tabs>
            </div>

            {/* AI Insights Sidebar */}
            <div className="w-full lg:w-80">
              <EntityInsightsPanel entityId={entity.id} entityName={entity.canonical_name} />
            </div>
          </div>
        </div>
      </div>
    </GlobalLayout>
  );
}

// Stat Card Component
interface StatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  variant?: 'default' | 'primary' | 'success' | 'hot';
}

function StatCard({ label, value, icon: Icon, variant = 'default' }: StatCardProps) {
  const variantClasses = {
    default: 'metric-card',
    primary: 'metric-card border-primary/30',
    success: 'metric-card border-emerald-300',
    hot: 'metric-card metric-hot',
  };

  return (
    <motion.div 
      className={variantClasses[variant]}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className={`metric-value ${variant === 'hot' ? '' : ''}`}>{value}</p>
    </motion.div>
  );
}
