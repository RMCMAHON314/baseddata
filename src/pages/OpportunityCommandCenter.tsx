import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { OpportunityFeed } from '@/components/opportunities/OpportunityFeed';
import { OpportunityDetail } from '@/components/opportunities/OpportunityDetail';
import { OpportunityPipeline, addToPipeline } from '@/components/opportunities/OpportunityPipeline';
import { OpportunityAnalytics } from '@/components/opportunities/OpportunityAnalytics';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Target, Zap, Kanban, BarChart3, CalendarClock, TrendingUp, Info
} from 'lucide-react';
import { Link } from 'react-router-dom';

function fmt(v: number | null) {
  if (!v) return '$0';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export default function OpportunityCommandCenter() {
  const [selectedOpp, setSelectedOpp] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Live opportunities
  const { data: opportunities = [], isLoading: loadingOpps } = useQuery({
    queryKey: ['live-opportunities-v2'],
    queryFn: async () => {
      const { data } = await supabase
        .from('opportunities')
        .select('*')
        .order('response_deadline', { ascending: true })
        .limit(1000);
      return data || [];
    },
  });

  // Recently awarded contracts
  const { data: recentAwards = [], isLoading: loadingRecent } = useQuery({
    queryKey: ['recent-awards-v2'],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('id, awarding_agency, recipient_name, recipient_entity_id, award_amount, award_date, naics_code, description')
        .not('award_date', 'is', null)
        .order('award_date', { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  // Expiring contracts (recompete radar)
  const { data: expiring = [] } = useQuery({
    queryKey: ['expiring-contracts-v2'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const oneYear = new Date(Date.now() + 365 * 86400000).toISOString();
      const { data } = await supabase
        .from('contracts')
        .select('id, awarding_agency, recipient_name, recipient_entity_id, award_amount, end_date, naics_code, description')
        .not('end_date', 'is', null)
        .gt('end_date', now)
        .lt('end_date', oneYear)
        .order('end_date', { ascending: true })
        .limit(30);
      return data || [];
    },
  });

  const activeOpps = opportunities.filter(o => o.is_active);
  const urgentOpps = activeOpps.filter(o => {
    if (!o.response_deadline) return false;
    const days = Math.ceil((new Date(o.response_deadline).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 7;
  });

  const totalValue = activeOpps.reduce((s, o) => s + (Number(o.award_ceiling) || 0), 0);

  const handleSelect = (opp: any) => {
    setSelectedOpp(opp);
    setDetailOpen(true);
  };

  const handleTrack = (opp: any) => {
    const added = addToPipeline(opp);
    if (added) toast.success('Added to pipeline');
    else toast.info('Already in pipeline');
  };

  return (
    <GlobalLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="container py-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
                  <Target className="h-6 w-6 text-primary" />
                  Opportunity Command Center
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  {activeOpps.length} active opportunities · {fmt(totalValue)} total estimated value
                </p>
              </div>
              <div className="flex items-center gap-3">
                {urgentOpps.length > 0 && (
                  <Badge variant="destructive" className="gap-1 animate-pulse">
                    <Zap className="w-3 h-3" /> {urgentOpps.length} due this week
                  </Badge>
                )}
                <Badge variant="secondary" className="gap-1">
                  <CalendarClock className="w-3 h-3" /> {expiring.length} recompetes
                </Badge>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {[
                { label: 'Active Opportunities', value: activeOpps.length.toLocaleString(), icon: Zap },
                { label: 'Due This Week', value: urgentOpps.length.toString(), icon: Target },
                { label: 'Total Est. Value', value: fmt(totalValue), icon: TrendingUp },
                { label: 'Recompete Radar', value: expiring.length.toString(), icon: CalendarClock },
              ].map(stat => (
                <div key={stat.label} className="metric-card">
                  <div className="flex items-center gap-2">
                    <stat.icon className="w-4 h-4 text-primary" />
                    <span className="metric-label">{stat.label}</span>
                  </div>
                  <p className="metric-value mt-1">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="container py-6">
          {/* Info banner */}
          {opportunities.length === 0 && !loadingOpps && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted border border-border mb-6">
              <Info className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
              <div>
                <p className="font-medium text-foreground">📢 SAM.gov opportunities feed ready</p>
                <p className="text-sm mt-1 text-muted-foreground">
                  Go to Dashboard → Data Flood Controls → "Load SAM Opportunities" to pull live data.
                </p>
              </div>
            </div>
          )}

          <Tabs defaultValue="feed">
            <TabsList className="bg-muted/50 mb-6">
              <TabsTrigger value="feed" className="gap-1.5">
                <Zap className="w-4 h-4" /> Feed
                <Badge variant="secondary" className="text-[10px] px-1.5">{activeOpps.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="pipeline" className="gap-1.5">
                <Kanban className="w-4 h-4" /> Pipeline
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1.5">
                <BarChart3 className="w-4 h-4" /> Analytics
              </TabsTrigger>
              <TabsTrigger value="recompetes" className="gap-1.5">
                <CalendarClock className="w-4 h-4" /> Recompetes
                <Badge variant="secondary" className="text-[10px] px-1.5">{expiring.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="awards" className="gap-1.5">
                <TrendingUp className="w-4 h-4" /> Recent Awards
              </TabsTrigger>
            </TabsList>

            <TabsContent value="feed">
              <OpportunityFeed
                opportunities={opportunities}
                loading={loadingOpps}
                onSelect={handleSelect}
                onTrack={handleTrack}
              />
            </TabsContent>

            <TabsContent value="pipeline">
              <OpportunityPipeline />
            </TabsContent>

            <TabsContent value="analytics">
              <OpportunityAnalytics opportunities={opportunities} />
            </TabsContent>

            <TabsContent value="recompetes">
              {expiring.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarClock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No recompetes detected</p>
                  <p className="text-sm mt-1">Contracts expiring within 12 months will appear here.</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 text-left">
                        <th className="p-3 font-medium text-foreground">Agency</th>
                        <th className="p-3 font-medium text-foreground">Current Holder</th>
                        <th className="p-3 font-medium text-right text-foreground">Value</th>
                        <th className="p-3 font-medium text-foreground">Expires</th>
                        <th className="p-3 font-medium hidden md:table-cell text-foreground">NAICS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiring.map(c => {
                        const daysLeft = Math.ceil((new Date(c.end_date!).getTime() - Date.now()) / 86400000);
                        return (
                          <tr key={c.id} className="border-t hover:bg-muted/30">
                            <td className="p-3 max-w-[180px] truncate text-foreground">{c.awarding_agency || '—'}</td>
                            <td className="p-3 max-w-[180px] truncate">
                              {c.recipient_entity_id ? (
                                <Link to={`/entity/${c.recipient_entity_id}`} className="text-primary hover:underline font-medium">{c.recipient_name || '—'}</Link>
                              ) : <span className="text-foreground">{c.recipient_name || '—'}</span>}
                            </td>
                            <td className="p-3 text-right font-mono font-semibold text-primary">{fmt(Number(c.award_amount))}</td>
                            <td className="p-3 whitespace-nowrap">
                              <Badge variant={daysLeft <= 90 ? 'destructive' : daysLeft <= 180 ? 'default' : 'secondary'}>
                                {daysLeft} days
                              </Badge>
                            </td>
                            <td className="p-3 hidden md:table-cell">
                              <Badge variant="secondary" className="font-mono text-xs">{c.naics_code || '—'}</Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="awards">
              {loadingRecent ? (
                <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
              ) : recentAwards.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No recent awards.</div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 text-left">
                        <th className="p-3 font-medium text-foreground">Agency</th>
                        <th className="p-3 font-medium text-foreground">Recipient</th>
                        <th className="p-3 font-medium text-right text-foreground">Value</th>
                        <th className="p-3 font-medium hidden md:table-cell text-foreground">Date</th>
                        <th className="p-3 font-medium hidden lg:table-cell text-foreground">NAICS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentAwards.map(c => (
                        <tr key={c.id} className="border-t hover:bg-muted/30">
                          <td className="p-3 max-w-[180px] truncate">
                            <Link to={`/agency/${encodeURIComponent(c.awarding_agency || '')}`} className="text-primary hover:underline">
                              {c.awarding_agency || '—'}
                            </Link>
                          </td>
                          <td className="p-3 max-w-[180px] truncate">
                            {c.recipient_entity_id ? (
                              <Link to={`/entity/${c.recipient_entity_id}`} className="text-primary hover:underline font-medium">{c.recipient_name || '—'}</Link>
                            ) : <span className="text-foreground">{c.recipient_name || '—'}</span>}
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-primary">{fmt(Number(c.award_amount))}</td>
                          <td className="p-3 hidden md:table-cell text-foreground whitespace-nowrap">
                            {c.award_date ? new Date(c.award_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </td>
                          <td className="p-3 hidden lg:table-cell">
                            <Badge variant="secondary" className="font-mono text-xs">{c.naics_code || '—'}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Detail Modal */}
        <OpportunityDetail
          opportunity={selectedOpp}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          onAddToPipeline={handleTrack}
        />
      </div>
    </GlobalLayout>
  );
}
