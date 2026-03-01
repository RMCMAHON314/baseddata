// BOMB-02 — Entity Intelligence Hub — World-Class 360° Profiles
import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Building2, MapPin, ChevronRight, CheckCircle2, Download,
  GitCompare, BookmarkPlus, Zap, Shield, FileText, Award,
  Users, Target, Clock, Brain, Eye, BarChart3, FolderOpen,
  AlertTriangle, Info, TrendingUp, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { PageSEO } from '@/components/layout/PageSEO';
import { toast } from 'sonner';

// Tab components
import { EntityOverviewTab } from '@/components/entity/tabs/EntityOverviewTab';
import { EntityContractsTabV2 } from '@/components/entity/tabs/EntityContractsTabV2';
import { EntityGrantsTabV2 } from '@/components/entity/tabs/EntityGrantsTabV2';
import { EntityOpportunitiesTab } from '@/components/entity/tabs/EntityOpportunitiesTab';
import { EntityRelationshipsTabV2 } from '@/components/entity/tabs/EntityRelationshipsTabV2';
import { EntityCompetitiveTab } from '@/components/entity/tabs/EntityCompetitiveTab';
import { EntityRiskTabV2 } from '@/components/entity/tabs/EntityRiskTabV2';
import { EntityDocumentsTab } from '@/components/entity/tabs/EntityDocumentsTab';
import { EntityDataQuality } from '@/components/entity/EntityDataQuality';

// ── Helpers ──
export function fmt(value: number | null) {
  if (!value) return '$0';
  if (value >= 1e9) return '$' + (value / 1e9).toFixed(2) + 'B';
  if (value >= 1e6) return '$' + (value / 1e6).toFixed(2) + 'M';
  if (value >= 1e3) return '$' + (value / 1e3).toFixed(0) + 'K';
  return '$' + value.toFixed(0);
}

export function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const ENTITY_TYPE_COLORS: Record<string, string> = {
  company: 'bg-primary/10 text-primary',
  agency: 'bg-amber-100 text-amber-700',
  university: 'bg-violet-100 text-violet-700',
  nonprofit: 'bg-emerald-100 text-emerald-700',
  organization: 'bg-secondary text-secondary-foreground',
};

const TABS = [
  { value: 'overview', icon: Eye, label: 'Overview' },
  { value: 'contracts', icon: FileText, label: 'Contracts' },
  { value: 'grants', icon: Award, label: 'Grants' },
  { value: 'opportunities', icon: Target, label: 'Opportunities' },
  { value: 'relationships', icon: Users, label: 'Relationships' },
  { value: 'competitive', icon: BarChart3, label: 'Competitive' },
  { value: 'risk', icon: Shield, label: 'Risk & Compliance' },
  { value: 'documents', icon: FolderOpen, label: 'Documents' },
];

export default function EntityIntelligenceHub() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // ── Entity ──
  const { data: entity, isLoading } = useQuery({
    queryKey: ['entity', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('core_entities')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // ── Stats ──
  const { data: stats } = useQuery({
    queryKey: ['entity-stats', id],
    queryFn: async () => {
      const [contracts, grants, rels, opps] = await Promise.all([
        supabase.from('contracts').select('id, award_amount', { count: 'exact' }).eq('recipient_entity_id', id!),
        supabase.from('grants').select('id, award_amount', { count: 'exact' }).eq('recipient_entity_id', id!),
        supabase.from('core_relationships').select('id', { count: 'exact' }).or("from_entity_id.eq." + id + ",to_entity_id.eq." + id),
        supabase.from('opportunities').select('id', { count: 'exact' }).limit(1),
      ]);
      const contractVal = (contracts.data || []).reduce((s, c) => s + (Number(c.award_amount) || 0), 0);
      const grantVal = (grants.data || []).reduce((s, g) => s + (Number(g.award_amount) || 0), 0);
      return {
        contractCount: contracts.count || 0,
        contractValue: contractVal,
        grantCount: grants.count || 0,
        grantValue: grantVal,
        relationshipCount: rels.count || 0,
        opportunityCount: opps.count || 0,
      };
    },
    enabled: !!id,
  });

  // ── Health Score ──
  const { data: health } = useQuery({
    queryKey: ['entity-health', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('entity_health_scores')
        .select('*')
        .eq('entity_id', id!)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  // Save to watchlist
  const saveToWatchlist = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Sign in to save watchlists'); return; }
    const { error } = await supabase.from('saved_searches').insert({
      user_id: user.id,
      name: 'Watch: ' + (entity?.canonical_name || ''),
      query: 'entity:' + (id || ''),
      filters: { entity_id: id },
      notify_on_change: true,
    });
    if (error) toast.error('Failed to save');
    else toast.success('Added to watchlist');
  };

  // Export CSV
  const exportProfile = async () => {
    const { data: contracts } = await supabase.from('contracts').select('*').eq('recipient_entity_id', id!).limit(200);
    const { data: grants } = await supabase.from('grants').select('*').eq('recipient_entity_id', id!).limit(200);
    const rows = [
      ['Type', 'Agency', 'Value', 'Date', 'Description'],
      ...(contracts || []).map(c => ['Contract', c.awarding_agency, c.award_amount, c.award_date, c.description?.slice(0, 100)]),
      ...(grants || []).map(g => ['Grant', g.awarding_agency, g.award_amount, g.award_date, g.project_title?.slice(0, 100)]),
    ];
    const csv = rows.map(r => r.map(c => '"' + (c || '') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (entity?.canonical_name || 'entity') + '-profile.csv';
    a.click();
    toast.success('Profile exported');
  };

  if (isLoading) {
    return (
      <GlobalLayout>
        <div className="container py-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          <Skeleton className="h-[500px]" />
        </div>
      </GlobalLayout>
    );
  }

  if (!entity) {
    return (
      <GlobalLayout>
        <div className="container py-16 text-center">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Entity Not Found</h1>
          <p className="text-muted-foreground mb-6">Check the entity ID or search the directory.</p>
          <Link to="/entities"><Button>Browse Entities</Button></Link>
        </div>
      </GlobalLayout>
    );
  }

  const healthScore = health?.overall_score;
  const riskScore = entity.risk_score;
  const entityTypeKey = (entity.entity_type || 'organization').toLowerCase();
  const typeColor = ENTITY_TYPE_COLORS[entityTypeKey] || ENTITY_TYPE_COLORS.organization;

  return (
    <GlobalLayout>
      <PageSEO title={`${entity.canonical_name} — Contractor Profile`} description={`360° intelligence on ${entity.canonical_name}. Contracts, grants, competitors, and risk analysis.`} path={`/entity/${entity.id}`} />
      <div className="min-h-screen bg-background">
        {/* Breadcrumb */}
        <div className="container pt-4">
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/entities" className="hover:text-foreground">Entities</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground truncate max-w-[200px]">{entity.canonical_name}</span>
          </nav>
        </div>

        {/* ═══ HERO HEADER ═══ */}
        <div className="border-b border-border bg-gradient-to-br from-card via-card to-primary/5">
          <div className="container py-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex-1 min-w-0">
                {/* Entity name + type badge */}
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">{entity.canonical_name}</h1>
                  <Badge className={typeColor + ' font-semibold'}>
                    {entity.entity_type || 'Organization'}
                  </Badge>
                  {entity.uei && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />SAM Verified
                    </Badge>
                  )}
                </div>

                {/* Location + identifiers */}
                <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-3">
                  {(entity.city || entity.state) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />{[entity.city, entity.state].filter(Boolean).join(', ')}
                    </span>
                  )}
                  {entity.uei && <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded">UEI: {entity.uei}</span>}
                  {entity.cage_code && <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded">CAGE: {entity.cage_code}</span>}
                  {entity.duns && <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded">DUNS: {entity.duns}</span>}
                </div>

                {/* NAICS codes */}
                {entity.naics_codes?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {entity.naics_codes.slice(0, 6).map((c: string) => (
                      <Badge key={c} variant="secondary" className="font-mono text-xs">{c}</Badge>
                    ))}
                    {entity.naics_codes.length > 6 && <Badge variant="secondary">+{entity.naics_codes.length - 6}</Badge>}
                  </div>
                )}
              </div>

              {/* Health Gauge + Actions */}
              <div className="flex items-center gap-5">
                {/* Health gauge */}
                <div className="text-center">
                  <div className="relative w-20 h-20">
                    <svg viewBox="0 0 100 100" className="w-20 h-20 -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                      <circle
                        cx="50" cy="50" r="42" fill="none"
                        stroke={!healthScore ? 'hsl(var(--muted-foreground))' : healthScore > 50 ? 'hsl(var(--success))' : 'hsl(var(--warning))'}
                        strokeWidth="8"
                        strokeDasharray={String((healthScore || 0) * 2.64) + " 264"}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
                      {healthScore || '—'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {!healthScore ? 'Unscored' : healthScore > 50 ? 'Healthy' : 'Limited'}
                  </p>
                </div>

                {/* Quick actions */}
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={saveToWatchlist}>
                    <BookmarkPlus className="h-4 w-4" />Track Entity
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={exportProfile}>
                    <Download className="h-4 w-4" />Export Profile
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/compare?entities=" + id)}>
                    <GitCompare className="h-4 w-4" />Compare
                  </Button>
                </div>
              </div>
            </div>

            {/* ═══ KEY STATS ROW ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
              <StatCard label="Contract Value" value={fmt(stats?.contractValue || entity.total_contract_value)} />
              <StatCard label="Contracts" value={String(stats?.contractCount || 0)} />
              <StatCard label="Grants" value={String(stats?.grantCount || 0)} />
              <StatCard label="Relationships" value={String(stats?.relationshipCount || 0)} />
              <StatCard
                label="Risk Score"
                value={riskScore ? String(riskScore) + '/100' : '—'}
                className={riskScore && riskScore > 60 ? 'border-destructive/30 bg-destructive/5' : ''}
              />
            </div>
          </div>
        </div>

        {/* ═══ TABS + SIDEBAR ═══ */}
        <div className="container py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main content */}
            <div className="flex-1 min-w-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent flex-wrap">
                  {TABS.map(t => (
                    <TabsTrigger
                      key={t.value}
                      value={t.value}
                      className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none gap-1.5 text-sm"
                    >
                      <t.icon className="h-4 w-4" />{t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                  <EntityOverviewTab entityId={id!} entityName={entity.canonical_name} stats={stats} />
                </TabsContent>
                <TabsContent value="contracts" className="mt-6">
                  <EntityContractsTabV2 entityId={id!} />
                </TabsContent>
                <TabsContent value="grants" className="mt-6">
                  <EntityGrantsTabV2 entityId={id!} />
                </TabsContent>
                <TabsContent value="opportunities" className="mt-6">
                  <EntityOpportunitiesTab entityId={id!} entityName={entity.canonical_name} naicsCodes={entity.naics_codes} />
                </TabsContent>
                <TabsContent value="relationships" className="mt-6">
                  <EntityRelationshipsTabV2 entityId={id!} />
                </TabsContent>
                <TabsContent value="competitive" className="mt-6">
                  <EntityCompetitiveTab entityId={id!} entityName={entity.canonical_name} />
                </TabsContent>
                <TabsContent value="risk" className="mt-6">
                  <EntityRiskTabV2 entityId={id!} entityName={entity.canonical_name} />
                </TabsContent>
                <TabsContent value="documents" className="mt-6">
                  <EntityDocumentsTab entityId={id!} entityName={entity.canonical_name} />
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="w-full lg:w-80 shrink-0 space-y-6">
              <InsightsSidebar entityId={id!} />
              <EntityDataQuality entityId={id!} entityName={entity.canonical_name} />
            </div>
          </div>
        </div>
      </div>
    </GlobalLayout>
  );
}

// ── Stat Card ──
function StatCard({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={`metric-card ${className}`}>
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="metric-value">{value}</p>
    </div>
  );
}

// ── INSIGHTS SIDEBAR ──
function InsightsSidebar({ entityId }: { entityId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['entity-insights', entityId],
    queryFn: async () => {
      const { data } = await supabase
        .from('core_derived_insights')
        .select('*')
        .contains('related_entities', [entityId])
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const SEVERITY_STYLES: Record<string, { icon: typeof Info; color: string }> = {
    info: { icon: Info, color: 'bg-primary/5 border-primary/20 text-primary' },
    warning: { icon: AlertTriangle, color: 'bg-warning/10 border-warning/20 text-warning' },
    opportunity: { icon: TrendingUp, color: 'bg-success/10 border-success/20 text-success' },
    threat: { icon: Shield, color: 'bg-destructive/10 border-destructive/20 text-destructive' },
  };

  return (
    <Card className="sticky top-24">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        {!isLoading && !data?.length && (
          <div className="text-center py-6 text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No insights generated yet</p>
          </div>
        )}
        {data?.map(insight => {
          const style = SEVERITY_STYLES[insight.severity || 'info'] || SEVERITY_STYLES.info;
          const Icon = style.icon;
          return (
            <div key={insight.id} className={"rounded-lg border p-3 " + style.color}>
              <div className="flex items-start gap-2">
                <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{insight.title}</p>
                  <p className="text-xs mt-1 opacity-80">{insight.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
