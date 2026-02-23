import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Target, Clock, Info, Search, DollarSign,
  ChevronRight, CalendarClock, TrendingUp, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { GlobalLayout } from '@/components/layout/GlobalLayout';

function fmt(v: number | null) {
  if (!v) return '$0';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(d: string | null) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

export default function OpportunityCommandCenter() {
  const [search, setSearch] = useState('');

  // Live SAM.gov opportunities
  const { data: opportunities, isLoading: loadingOpps } = useQuery({
    queryKey: ['live-opportunities'],
    queryFn: async () => {
      const { data } = await supabase
        .from('opportunities')
        .select('*')
        .order('posted_date', { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  // Recently awarded contracts
  const { data: recent, isLoading: loadingRecent } = useQuery({
    queryKey: ['recent-awards'],
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
  const { data: expiring, isLoading: loadingExpiring } = useQuery({
    queryKey: ['expiring-contracts'],
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

  const hasOpportunities = (opportunities?.length || 0) > 0;

  const filteredOpps = search
    ? (opportunities || []).filter(o =>
        o.title?.toLowerCase().includes(search.toLowerCase()) ||
        o.department?.toLowerCase().includes(search.toLowerCase()) ||
        o.awardee_name?.toLowerCase().includes(search.toLowerCase())
      )
    : opportunities || [];

  const filteredRecent = search
    ? (recent || []).filter(c =>
        c.awarding_agency?.toLowerCase().includes(search.toLowerCase()) ||
        c.recipient_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase())
      )
    : recent || [];

  return (
    <GlobalLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="container py-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              Opportunity Command Center
            </h1>
            <p className="text-muted-foreground mt-1">
              {hasOpportunities
                ? `${opportunities!.length} live SAM.gov opportunities + contract intelligence`
                : 'Track awarded contracts and upcoming recompetes'}
            </p>
          </div>
        </div>

        <div className="container py-6 space-y-8">
          {/* Info Banner — only when no opportunities */}
          {!hasOpportunities && !loadingOpps && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted border border-border">
              <Info className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
              <div>
                <p className="font-medium">📢 SAM.gov opportunities feed ready</p>
                <p className="text-sm mt-1 text-muted-foreground">
                  Go to Dashboard → Data Flood Controls → "Load SAM Opportunities" to pull live data from SAM.gov.
                </p>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search opportunities & contracts..." className="pl-9" />
          </div>

          {/* === LIVE SAM.GOV OPPORTUNITIES === */}
          {hasOpportunities && (
            <section>
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-primary" />
                Live SAM.gov Opportunities ({filteredOpps.length})
              </h2>
              {loadingOpps ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {filteredOpps.map(opp => {
                    const days = daysUntil(opp.response_deadline);
                    return (
                      <Card key={opp.id} className="hover:border-primary/40 transition-colors">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-sm line-clamp-2">{opp.title || 'Untitled'}</h3>
                            {days !== null && days > 0 && (
                              <Badge variant={days <= 7 ? 'destructive' : days <= 30 ? 'default' : 'secondary'} className="shrink-0 text-xs">
                                {days}d left
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{opp.department}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {opp.notice_type && <Badge variant="outline" className="text-xs">{opp.notice_type}</Badge>}
                            {opp.naics_code && <Badge variant="secondary" className="text-xs font-mono">{opp.naics_code}</Badge>}
                            {opp.set_aside && <Badge variant="secondary" className="text-xs">{opp.set_aside}</Badge>}
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                            <span>Posted: {fmtDate(opp.posted_date)}</span>
                            {opp.response_deadline && <span>Due: {fmtDate(opp.response_deadline)}</span>}
                          </div>
                          {opp.awardee_name && (
                            <div className="text-xs bg-muted rounded px-2 py-1 mt-1">
                              <span className="font-medium">Awardee:</span> {opp.awardee_name}
                              {opp.award_amount && <span className="ml-2 font-mono text-primary">{fmt(Number(opp.award_amount))}</span>}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Recently Awarded */}
          <section>
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              Recently Awarded — Study These to Find Patterns
            </h2>
            {loadingRecent ? (
              <div className="space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : !filteredRecent.length ? (
              <Card className="p-8 text-center text-muted-foreground">No contracts match your search.</Card>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/50 text-left">
                    <th className="p-3 font-medium">Agency</th>
                    <th className="p-3 font-medium">Recipient</th>
                    <th className="p-3 font-medium text-right">Value</th>
                    <th className="p-3 font-medium hidden md:table-cell">Date</th>
                    <th className="p-3 font-medium hidden lg:table-cell">NAICS</th>
                    <th className="p-3 font-medium hidden xl:table-cell">Description</th>
                  </tr></thead>
                  <tbody>
                    {filteredRecent.map(c => (
                      <tr key={c.id} className="border-t hover:bg-muted/30">
                        <td className="p-3 max-w-[180px] truncate">
                          <Link to={`/agency/${encodeURIComponent(c.awarding_agency || '')}`} className="hover:text-primary hover:underline">
                            {c.awarding_agency || '—'}
                          </Link>
                        </td>
                        <td className="p-3 max-w-[180px] truncate">
                          {c.recipient_entity_id ? (
                            <Link to={`/entity/${c.recipient_entity_id}`} className="hover:text-primary hover:underline font-medium">
                              {c.recipient_name || '—'}
                            </Link>
                          ) : c.recipient_name || '—'}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-primary">{fmt(Number(c.award_amount))}</td>
                        <td className="p-3 hidden md:table-cell whitespace-nowrap">{fmtDate(c.award_date)}</td>
                        <td className="p-3 hidden lg:table-cell"><Badge variant="secondary" className="font-mono text-xs">{c.naics_code || '—'}</Badge></td>
                        <td className="p-3 hidden xl:table-cell max-w-[200px] truncate text-muted-foreground">{(c.description || '').slice(0, 60)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Recompete Radar */}
          {(expiring?.length || 0) > 0 && (
            <section>
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                <CalendarClock className="h-5 w-5 text-amber-600" />
                Expiring Within 12 Months — Potential Recompetes
              </h2>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/50 text-left">
                    <th className="p-3 font-medium">Agency</th>
                    <th className="p-3 font-medium">Current Holder</th>
                    <th className="p-3 font-medium text-right">Value</th>
                    <th className="p-3 font-medium">Expires</th>
                    <th className="p-3 font-medium hidden md:table-cell">NAICS</th>
                  </tr></thead>
                  <tbody>
                    {(expiring || []).map(c => {
                      const daysLeft = Math.ceil((new Date(c.end_date!).getTime() - Date.now()) / 86400000);
                      return (
                        <tr key={c.id} className="border-t hover:bg-muted/30">
                          <td className="p-3 max-w-[180px] truncate">{c.awarding_agency || '—'}</td>
                          <td className="p-3 max-w-[180px] truncate">
                            {c.recipient_entity_id ? (
                              <Link to={`/entity/${c.recipient_entity_id}`} className="hover:text-primary hover:underline font-medium">
                                {c.recipient_name || '—'}
                              </Link>
                            ) : c.recipient_name || '—'}
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-primary">{fmt(Number(c.award_amount))}</td>
                          <td className="p-3 whitespace-nowrap">
                            <Badge variant={daysLeft <= 90 ? 'destructive' : daysLeft <= 180 ? 'default' : 'secondary'}>
                              {daysLeft} days
                            </Badge>
                          </td>
                          <td className="p-3 hidden md:table-cell"><Badge variant="secondary" className="font-mono text-xs">{c.naics_code || '—'}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
    </GlobalLayout>
  );
}
