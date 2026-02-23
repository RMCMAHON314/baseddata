// BASED DATA - Entity Intelligence Hub - FINAL FORM
// Complete 360° entity dossier with real data queries
import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Building2, MapPin, Award, FileText, Users, TrendingUp, Shield,
  ChevronLeft, ChevronRight, Star, Target, DollarSign, Heart,
  Download, GitCompare, Clock, ExternalLink, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, Info, Zap, BookmarkPlus, Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { toast } from 'sonner';

// ── Helpers ──
function fmt(value: number | null) {
  if (!value) return '$0';
  if (value >= 1e9) return '$' + (value / 1e9).toFixed(2) + 'B';
  if (value >= 1e6) return '$' + (value / 1e6).toFixed(2) + 'M';
  if (value >= 1e3) return '$' + (value / 1e3).toFixed(0) + 'K';
  return '$' + value.toFixed(0);
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function EntityIntelligenceHub() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('contracts');

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

  // ── Stats (parallel) ──
  const { data: stats } = useQuery({
    queryKey: ['entity-stats', id],
    queryFn: async () => {
      const [contracts, grants, rels] = await Promise.all([
        supabase.from('contracts').select('id, award_amount', { count: 'exact' }).eq('recipient_entity_id', id!),
        supabase.from('grants').select('id, award_amount', { count: 'exact' }).eq('recipient_entity_id', id!),
        supabase.from('core_relationships').select('id', { count: 'exact' }).or("from_entity_id.eq." + id + ",to_entity_id.eq." + id),
      ]);
      const contractVal = (contracts.data || []).reduce((s, c) => s + (Number(c.award_amount) || 0), 0);
      const grantVal = (grants.data || []).reduce((s, g) => s + (Number(g.award_amount) || 0), 0);
      return {
        contractCount: contracts.count || 0,
        contractValue: contractVal,
        grantCount: grants.count || 0,
        grantValue: grantVal,
        relationshipCount: rels.count || 0,
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
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
  const healthColor = !healthScore ? 'text-muted-foreground' : healthScore > 50 ? 'text-emerald-600' : 'text-amber-600';
  const healthLabel = !healthScore ? 'Unscored' : healthScore > 50 ? 'Healthy' : 'Limited Data';

  return (
    <GlobalLayout>
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

        {/* Hero */}
        <div className="border-b border-border bg-gradient-to-br from-card via-card to-primary/5">
          <div className="container py-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-3xl lg:text-4xl font-bold">{entity.canonical_name}</h1>
                  {entity.uei && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-3">
                  <span className="flex items-center gap-1"><Building2 className="h-4 w-4" />{entity.entity_type || 'Organization'}</span>
                  {(entity.city || entity.state) && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{[entity.city, entity.state].filter(Boolean).join(', ')}</span>}
                  {entity.uei && <span className="font-mono text-xs">UEI: {entity.uei}</span>}
                  {entity.cage_code && <span className="font-mono text-xs">CAGE: {entity.cage_code}</span>}
                </div>
                {entity.naics_codes?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {entity.naics_codes.slice(0, 5).map((c: string) => <Badge key={c} variant="secondary" className="font-mono text-xs">{c}</Badge>)}
                    {entity.naics_codes.length > 5 && <Badge variant="secondary">+{entity.naics_codes.length - 5}</Badge>}
                  </div>
                )}
              </div>

              {/* Health Gauge + Actions */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="relative w-20 h-20">
                    <svg viewBox="0 0 100 100" className="w-20 h-20 -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                      <circle cx="50" cy="50" r="42" fill="none" stroke={!healthScore ? 'hsl(var(--muted-foreground))' : healthScore > 50 ? 'hsl(var(--success))' : 'hsl(var(--warning))'} strokeWidth="8" strokeDasharray={String((healthScore || 0) * 2.64) + " 264"} strokeLinecap="round" />
                    </svg>
                    <span className={"absolute inset-0 flex items-center justify-center text-lg font-bold " + healthColor}>
                      {healthScore || '—'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{healthLabel}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/compare?entities=" + id)}>
                    <GitCompare className="h-4 w-4" />Compare
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={saveToWatchlist}>
                    <BookmarkPlus className="h-4 w-4" />Watch
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={exportProfile}>
                    <Download className="h-4 w-4" />Export
                  </Button>
                </div>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="metric-card"><p className="text-xs text-muted-foreground uppercase tracking-wider">Contract Value</p><p className="metric-value">{fmt(stats?.contractValue || entity.total_contract_value)}</p></div>
              <div className="metric-card"><p className="text-xs text-muted-foreground uppercase tracking-wider">Contracts</p><p className="metric-value">{stats?.contractCount?.toLocaleString() || '0'}</p></div>
              <div className="metric-card"><p className="text-xs text-muted-foreground uppercase tracking-wider">Grants</p><p className="metric-value">{stats?.grantCount?.toLocaleString() || '0'}</p></div>
              <div className="metric-card"><p className="text-xs text-muted-foreground uppercase tracking-wider">Relationships</p><p className="metric-value">{stats?.relationshipCount?.toLocaleString() || '0'}</p></div>
            </div>
          </div>
        </div>

        {/* Tabs + Sidebar */}
        <div className="container py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 min-w-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent flex-wrap">
                  {[
                    { value: 'contracts', icon: FileText, label: 'Contracts' },
                    { value: 'grants', icon: Award, label: 'Grants' },
                    { value: 'competitors', icon: Users, label: 'Competitors' },
                    { value: 'relationships', icon: Target, label: 'Relationships' },
                    { value: 'timeline', icon: Clock, label: 'Timeline' },
                    { value: 'intelligence', icon: Brain, label: 'Intelligence' },
                    { value: 'risk', icon: Shield, label: 'Risk' },
                  ].map(t => (
                    <TabsTrigger key={t.value} value={t.value} className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none gap-1.5">
                      <t.icon className="h-4 w-4" />{t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="contracts" className="mt-6"><ContractsTab entityId={id!} /></TabsContent>
                <TabsContent value="grants" className="mt-6"><GrantsTab entityId={id!} /></TabsContent>
                <TabsContent value="competitors" className="mt-6"><CompetitorsTab entityId={id!} /></TabsContent>
                <TabsContent value="relationships" className="mt-6"><RelationshipsTab entityId={id!} /></TabsContent>
                <TabsContent value="timeline" className="mt-6"><TimelineTab entityId={id!} /></TabsContent>
                <TabsContent value="intelligence" className="mt-6"><IntelligenceTab entityName={entity.canonical_name} /></TabsContent>
                <TabsContent value="risk" className="mt-6"><RiskTab entityName={entity.canonical_name} /></TabsContent>
              </Tabs>
            </div>

            {/* Insights Sidebar */}
            <div className="w-full lg:w-80 shrink-0">
              <InsightsSidebar entityId={id!} />
            </div>
          </div>
        </div>
      </div>
    </GlobalLayout>
  );
}

// ── CONTRACTS TAB ──
function ContractsTab({ entityId }: { entityId: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['entity-contracts', entityId, page],
    queryFn: async () => {
      const { data, count } = await supabase
        .from('contracts')
        .select('*', { count: 'exact' })
        .eq('recipient_entity_id', entityId)
        .order('award_amount', { ascending: false, nullsFirst: false })
        .range(page * PAGE, (page + 1) * PAGE - 1);
      return { rows: data || [], total: count || 0 };
    },
  });

  const exportCSV = () => {
    if (!data?.rows.length) return;
    const csv = [
      ['Date', 'Agency', 'Description', 'Value', 'NAICS'].join(','),
      ...data.rows.map(c => [fmtDate(c.award_date), c.awarding_agency, '"' + (c.description || '').slice(0, 80).replace(/"/g, "'") + '"', c.award_amount, c.naics_code].join(','))
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'contracts.csv';
    a.click();
  };

  if (isLoading) return <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;
  if (!data?.rows.length) return <EmptyState icon={FileText} title="No contracts found" desc="This entity may not have federal contract records, or try checking the name spelling." />;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{data.total} contracts</p>
        <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1.5" />Export CSV</Button>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-muted/50 text-left">
            <th className="p-3 font-medium">Date</th>
            <th className="p-3 font-medium">Agency</th>
            <th className="p-3 font-medium hidden md:table-cell">Description</th>
            <th className="p-3 font-medium text-right">Value</th>
            <th className="p-3 font-medium hidden lg:table-cell">NAICS</th>
          </tr></thead>
          <tbody>
            {data.rows.map(c => (
              <React.Fragment key={c.id}>
                <tr className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                  <td className="p-3 whitespace-nowrap">{fmtDate(c.award_date)}</td>
                  <td className="p-3 max-w-[200px] truncate">
                    <Link
                      to={"/agency/" + encodeURIComponent(c.awarding_agency || "")}
                      className="hover:text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {c.awarding_agency || "—"}
                    </Link>
                  </td>
                  <td className="p-3 max-w-[300px] truncate hidden md:table-cell text-muted-foreground">{(c.description || '').slice(0, 80)}</td>
                  <td className="p-3 text-right font-mono font-semibold text-primary">{fmt(Number(c.award_amount))}</td>
                  <td className="p-3 hidden lg:table-cell"><Badge variant="secondary" className="font-mono text-xs">{c.naics_code || '—'}</Badge></td>
                </tr>
                {expanded === c.id && (
                  <tr><td colSpan={5} className="p-4 bg-muted/20 border-t">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div><span className="text-muted-foreground">Full Description</span><p className="mt-1">{c.description || 'N/A'}</p></div>
                      <div><span className="text-muted-foreground">Period</span><p className="mt-1">{fmtDate(c.start_date)} — {fmtDate(c.end_date)}</p></div>
                      <div><span className="text-muted-foreground">Set-Aside</span><p className="mt-1">{c.set_aside_type || 'None'}</p></div>
                      <div><span className="text-muted-foreground">PSC</span><p className="mt-1">{c.psc_code || 'N/A'}</p></div>
                    </div>
                  </td></tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} setPage={setPage} total={data.total} pageSize={PAGE} />
    </div>
  );
}

// ── GRANTS TAB ──
function GrantsTab({ entityId }: { entityId: string }) {
  const [page, setPage] = useState(0);
  const PAGE = 25;
  const { data, isLoading } = useQuery({
    queryKey: ['entity-grants', entityId, page],
    queryFn: async () => {
      const { data, count } = await supabase
        .from('grants')
        .select('*', { count: 'exact' })
        .eq('recipient_entity_id', entityId)
        .order('award_amount', { ascending: false, nullsFirst: false })
        .range(page * PAGE, (page + 1) * PAGE - 1);
      return { rows: data || [], total: count || 0 };
    },
  });

  if (isLoading) return <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;
  if (!data?.rows.length) return <EmptyState icon={Award} title="No grants found" desc="This entity may not have federal grant records." />;

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">{data.total} grants</p>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-muted/50 text-left">
            <th className="p-3 font-medium">Date</th>
            <th className="p-3 font-medium">Agency</th>
            <th className="p-3 font-medium hidden md:table-cell">Project</th>
            <th className="p-3 font-medium text-right">Value</th>
          </tr></thead>
          <tbody>
            {data.rows.map(g => (
              <tr key={g.id} className="border-t hover:bg-muted/30">
                <td className="p-3 whitespace-nowrap">{fmtDate(g.award_date)}</td>
                <td className="p-3 max-w-[200px] truncate">{g.awarding_agency || '—'}</td>
                <td className="p-3 max-w-[300px] truncate hidden md:table-cell text-muted-foreground">{g.project_title || g.description || '—'}</td>
                <td className="p-3 text-right font-mono font-semibold text-primary">{fmt(Number(g.award_amount))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} setPage={setPage} total={data.total} pageSize={PAGE} />
    </div>
  );
}

// ── COMPETITORS TAB ──
function CompetitorsTab({ entityId }: { entityId: string }) {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['entity-competitors', entityId],
    queryFn: async () => {
      // Get this entity's agencies
      const { data: myContracts } = await supabase
        .from('contracts')
        .select('awarding_agency')
        .eq('recipient_entity_id', entityId)
        .not('awarding_agency', 'is', null)
        .limit(100);
      
      const myAgencies = [...new Set((myContracts || []).map(c => c.awarding_agency).filter(Boolean))];
      if (!myAgencies.length) return [];

      // Find competitors who share agencies
      const { data: competitors } = await supabase
        .from('contracts')
        .select('recipient_entity_id, recipient_name, awarding_agency, award_amount')
        .in('awarding_agency', myAgencies.slice(0, 10))
        .neq('recipient_entity_id', entityId)
        .not('recipient_entity_id', 'is', null)
        .limit(500);

      // Aggregate
      const map = new Map<string, { id: string; name: string; total: number; count: number; agencies: Set<string> }>();
      for (const c of competitors || []) {
        const key = c.recipient_entity_id;
        if (!key) continue;
        const existing = map.get(key) || { id: key, name: c.recipient_name || 'Unknown', total: 0, count: 0, agencies: new Set() };
        existing.total += Number(c.award_amount) || 0;
        existing.count++;
        if (c.awarding_agency) existing.agencies.add(c.awarding_agency);
        map.set(key, existing);
      }
      return [...map.values()]
        .sort((a, b) => b.total - a.total)
        .slice(0, 20)
        .map(c => ({ ...c, agencies: [...c.agencies] }));
    },
  });

  if (isLoading) return <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  if (!data?.length) return <EmptyState icon={Users} title="No competitors found" desc="This entity may have unique agency relationships." />;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{data.length} competitors by shared agencies</p>
        {data.length >= 3 && (
          <Button variant="outline" size="sm" onClick={() => navigate("/compare?entities=" + entityId + "," + data.slice(0, 2).map(c => c.id).join(","))}>
            <GitCompare className="h-4 w-4 mr-1.5" />Compare Top 3
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.map(c => (
          <Card key={c.id} className="p-4 hover:border-primary/30 cursor-pointer transition-all" onClick={() => navigate("/entity/" + c.id)}>
            <div className="flex justify-between items-start">
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold truncate">{c.name}</h4>
                <p className="text-xs text-muted-foreground mt-1">{c.count} contracts · {c.agencies.length} shared agencies</p>
              </div>
              <p className="font-mono font-semibold text-primary ml-3">{fmt(c.total)}</p>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {c.agencies.slice(0, 3).map(a => <Badge key={a} variant="outline" className="text-xs truncate max-w-[140px]">{a}</Badge>)}
              {c.agencies.length > 3 && <Badge variant="outline" className="text-xs">+{c.agencies.length - 3}</Badge>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── RELATIONSHIPS TAB ──
function RelationshipsTab({ entityId }: { entityId: string }) {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['entity-relationships', entityId],
    queryFn: async () => {
      const { data } = await supabase
        .from('core_relationships')
        .select('*, from:core_entities!core_relationships_from_entity_id_fkey(id, canonical_name), to:core_entities!core_relationships_to_entity_id_fkey(id, canonical_name)')
        .or("from_entity_id.eq." + entityId + ",to_entity_id.eq." + entityId)
        .order('confidence', { ascending: false, nullsFirst: false })
        .limit(50);
      return data || [];
    },
  });

  if (isLoading) return <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>;
  if (!data?.length) return <EmptyState icon={Target} title="No relationships found" desc="Relationships are discovered from shared contracts, grants, and organizational data." />;

  // Group by type
  const grouped = data.reduce((acc, r) => {
    const type = r.relationship_type || 'unknown';
    if (!acc[type]) acc[type] = [];
    acc[type].push(r);
    return acc;
  }, {} as Record<string, typeof data>);

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([type, rels]) => (
        <Card key={type}>
          <CardHeader className="py-3 px-4"><CardTitle className="text-sm capitalize">{type.replace(/_/g, ' ')} ({rels.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            {rels.map(r => {
              const other = r.from_entity_id === entityId ? r.to : r.from;
              return (
                <button key={r.id} onClick={() => navigate("/entity/" + (other as any)?.id)} className="w-full flex items-center justify-between px-4 py-3 border-t hover:bg-muted/30 transition-colors text-left">
                  <span className="font-medium truncate">{(other as any)?.canonical_name || 'Unknown'}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: String((r.confidence || 0) * 100) + "%" }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-8">{Math.round((r.confidence || 0) * 100)}%</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── TIMELINE TAB ──
function TimelineTab({ entityId }: { entityId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['entity-timeline', entityId],
    queryFn: async () => {
      // Try summary first
      const { data: summary } = await supabase
        .from('core_facts_summary')
        .select('*')
        .eq('entity_id', entityId)
        .order('latest_date', { ascending: false, nullsFirst: false });
      
      if (summary?.length) return { type: 'summary' as const, rows: summary };

      // Fallback to core_facts
      const { data: facts } = await supabase
        .from('core_facts')
        .select('fact_type, fact_value, fact_date')
        .eq('entity_id', entityId)
        .order('fact_date', { ascending: false, nullsFirst: false })
        .limit(20);
      
      return { type: 'facts' as const, rows: facts || [] };
    },
  });

  if (isLoading) return <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;
  if (!data?.rows.length) return <EmptyState icon={Clock} title="No timeline data" desc="Timeline events are generated from contract awards, grants, and other entity activity." />;

  const FACT_COLORS: Record<string, string> = {
    contract_award: 'bg-blue-100 text-blue-700',
    grant_received: 'bg-emerald-100 text-emerald-700',
    compliance_violation: 'bg-red-100 text-red-700',
    payment_received: 'bg-amber-100 text-amber-700',
    default: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="relative pl-6 space-y-4">
      <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border" />
      {data.rows.map((item: any, i: number) => {
        const factType = item.fact_type || 'event';
        const colorClass = FACT_COLORS[factType] || FACT_COLORS.default;
        const date = data.type === 'summary' ? item.latest_date : item.fact_date;
        const value = data.type === 'summary' ? item.latest_value : item.fact_value;
        const count = data.type === 'summary' ? item.fact_count : undefined;

        return (
          <div key={i} className="relative flex gap-4">
            <div className="absolute -left-3.5 top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={"text-xs " + colorClass}>{factType.replace(/_/g, ' ')}</Badge>
                {count && <span className="text-xs text-muted-foreground">×{count}</span>}
              </div>
              <p className="text-sm">{String(value || '')}</p>
              <p className="text-xs text-muted-foreground mt-1">{fmtDate(date)}</p>
            </div>
          </div>
        );
      })}
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
    info: { icon: Info, color: 'bg-blue-50 border-blue-200 text-blue-700' },
    warning: { icon: AlertTriangle, color: 'bg-amber-50 border-amber-200 text-amber-700' },
    opportunity: { icon: TrendingUp, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    threat: { icon: Shield, color: 'bg-red-50 border-red-200 text-red-700' },
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-primary" />AI Insights</CardTitle>
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

// ── INTELLIGENCE TAB ──
function IntelligenceTab({ entityName }: { entityName: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['entity-intelligence', entityName],
    queryFn: async () => {
      const { data: contracts } = await supabase
        .from('contracts')
        .select('naics_code, awarding_agency, award_amount, award_date, end_date, set_aside_type, pop_state')
        .ilike('recipient_name', `%${entityName}%`)
        .order('award_amount', { ascending: false });

      if (!contracts?.length) return null;

      const totalValue = contracts.reduce((sum, c) => sum + (Number(c.award_amount) || 0), 0);
      const topNaics = contracts.reduce((acc, c) => {
        if (c.naics_code) acc[c.naics_code] = (acc[c.naics_code] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const topAgencies = contracts.reduce((acc, c) => {
        if (c.awarding_agency) acc[c.awarding_agency] = (acc[c.awarding_agency] || 0) + (Number(c.award_amount) || 0);
        return acc;
      }, {} as Record<string, number>);
      
      const expiringContracts = contracts.filter(c => {
        if (!c.end_date) return false;
        const end = new Date(c.end_date);
        const monthsAway = (end.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);
        return monthsAway > 0 && monthsAway <= 12;
      });

      return {
        totalValue,
        contractCount: contracts.length,
        topNaics: Object.entries(topNaics).sort((a, b) => b[1] - a[1]).slice(0, 5),
        topAgencies: Object.entries(topAgencies).sort((a, b) => b[1] - a[1]).slice(0, 5),
        expiringContracts,
        expiringValue: expiringContracts.reduce((sum, c) => sum + (Number(c.award_amount) || 0), 0),
        states: [...new Set(contracts.map(c => c.pop_state).filter(Boolean))],
        setAsides: [...new Set(contracts.map(c => c.set_aside_type).filter(Boolean))],
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!entityName,
  });

  if (isLoading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  if (!data) return <EmptyState icon={Brain} title="No intelligence data" desc="This entity needs contract data to generate intelligence." />;

  const URGENCY_COLORS: Record<string, string> = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Portfolio Value</p><p className="text-xl font-bold text-primary">{fmt(data.totalValue)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Contracts</p><p className="text-xl font-bold">{data.contractCount}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Agencies</p><p className="text-xl font-bold">{data.topAgencies.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">NAICS Codes</p><p className="text-xl font-bold">{data.topNaics.length}</p></Card>
      </div>

      {/* Recompete Exposure */}
      {data.expiringContracts.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" />Recompete Exposure ({data.expiringContracts.length} contracts, {fmt(data.expiringValue)})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.expiringContracts.slice(0, 5).map((c, i) => {
                const daysLeft = Math.ceil((new Date(c.end_date!).getTime() - Date.now()) / 86400000);
                const urgency = daysLeft <= 90 ? 'critical' : daysLeft <= 180 ? 'high' : 'medium';
                return (
                  <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                    <span className="truncate max-w-[200px]">{c.awarding_agency}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-primary">{fmt(Number(c.award_amount))}</span>
                      <Badge className={URGENCY_COLORS[urgency]}>{daysLeft}d</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agency Portfolio */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Agency Portfolio</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.topAgencies.map(([agency, value], i) => {
              const pct = data.totalValue > 0 ? (value / data.totalValue) * 100 : 0;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm"><span className="truncate max-w-[250px]">{agency}</span><span className="font-mono text-primary">{fmt(value)}</span></div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* NAICS Concentration */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">NAICS Concentration</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data.topNaics.map(([code, count], i) => (
              <Badge key={i} variant="secondary" className="font-mono">{code} ({count})</Badge>
            ))}
          </div>
          {data.setAsides.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-1.5">Set-Asides Used</p>
              <div className="flex flex-wrap gap-1.5">
                {data.setAsides.map((sa, i) => <Badge key={i} variant="outline" className="text-xs">{sa}</Badge>)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── RISK TAB ──
function RiskTab({ entityName }: { entityName: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['entity-risk', entityName],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('compute_entity_risk', { p_entity_name: entityName });
      if (error) throw error;
      return (data as any)?.[0] || null;
    },
    enabled: !!entityName,
  });

  if (isLoading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  if (!data) return <EmptyState icon={Shield} title="No risk data" desc="Risk analysis requires SAM entity and exclusion data to be loaded." />;

  const riskColors: Record<string, string> = {
    LOW: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
    HIGH: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-2">Risk Level</p>
          <Badge className={riskColors[data.risk_level] || ''} >{data.risk_level}</Badge>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-2">Risk Score</p>
          <p className="text-3xl font-bold">{data.risk_score}<span className="text-sm text-muted-foreground">/100</span></p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-2">Exclusion Status</p>
          <Badge className={data.exclusion_status === 'EXCLUDED' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}>{data.exclusion_status}</Badge>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">SAM Registration</p>
          <p className="font-semibold">{data.registration_status}</p>
          {data.registration_status !== 'Active' && (
            <p className="text-xs text-amber-600 mt-1">⚠️ Not actively registered — may not be eligible for new awards</p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Agency Concentration</p>
          <p className="font-semibold">{Number(data.top_agency_pct).toFixed(1)}%</p>
          {Number(data.top_agency_pct) > 60 && (
            <p className="text-xs text-amber-600 mt-1">⚠️ High concentration — vulnerable to agency budget changes</p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Recompete Exposure (12mo)</p>
          <p className="font-semibold">{fmt(Number(data.recompete_exposure))}</p>
        </Card>
      </div>
    </div>
  );
}

// ── SHARED COMPONENTS ──
function EmptyState({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="text-center py-12">
      <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">{desc}</p>
    </div>
  );
}

function Pagination({ page, setPage, total, pageSize }: { page: number; setPage: (p: number) => void; total: number; pageSize: number }) {
  if (total <= pageSize) return null;
  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-muted-foreground">
        {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>Previous</Button>
        <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={(page + 1) * pageSize >= total}>Next</Button>
      </div>
    </div>
  );
}

