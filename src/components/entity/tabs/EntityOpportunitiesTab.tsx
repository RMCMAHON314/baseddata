// BOMB-02 — Opportunities Tab: Active SAM.gov opportunities matching entity's profile
import { useQuery } from '@tanstack/react-query';
import { Target, Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { fmt, fmtDate } from '@/pages/EntityIntelligenceHub';

interface Props {
  entityId: string;
  entityName: string;
  naicsCodes?: string[] | null;
}

function getCountdown(deadline: string | null) {
  if (!deadline) return null;
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: 'Closed', color: 'bg-muted text-muted-foreground' };
  if (days <= 3) return { label: `${days}d left`, color: 'bg-destructive/10 text-destructive' };
  if (days <= 7) return { label: `${days}d left`, color: 'bg-orange-100 text-orange-700' };
  if (days <= 30) return { label: `${days}d left`, color: 'bg-warning/10 text-warning' };
  return { label: `${days}d left`, color: 'bg-success/10 text-success' };
}

export function EntityOpportunitiesTab({ entityId, entityName, naicsCodes }: Props) {
  const { data: opportunities, isLoading } = useQuery({
    queryKey: ['entity-opportunities', entityId, naicsCodes],
    queryFn: async () => {
      // Find opportunities matching entity's NAICS codes or agency relationships
      let query = supabase
        .from('opportunities')
        .select('*')
        .gte('response_deadline', new Date().toISOString())
        .order('response_deadline', { ascending: true })
        .limit(50);

      // Filter by NAICS if available
      if (naicsCodes?.length) {
        query = query.overlaps('naics_codes', naicsCodes.slice(0, 10));
      }

      const { data, error } = await query;
      if (error) {
        // Fallback: get any active opportunities
        const { data: fallback } = await supabase
          .from('opportunities')
          .select('*')
          .gte('response_deadline', new Date().toISOString())
          .order('response_deadline', { ascending: true })
          .limit(20);
        return fallback || [];
      }
      return data || [];
    },
  });

  // Get entity's historical agencies for match scoring
  const { data: historicalAgencies } = useQuery({
    queryKey: ['entity-hist-agencies', entityId],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('awarding_agency')
        .eq('recipient_entity_id', entityId)
        .not('awarding_agency', 'is', null);
      return [...new Set((data || []).map(c => c.awarding_agency))];
    },
  });

  const getMatchScore = (opp: any) => {
    let score = 50; // Base score
    // NAICS match
    if (naicsCodes?.length && opp.naics_codes?.length) {
      const overlap = naicsCodes.filter(n => opp.naics_codes.includes(n));
      score += overlap.length * 15;
    }
    // Agency match
    if (historicalAgencies?.length && opp.agency) {
      if (historicalAgencies.includes(opp.agency)) score += 20;
    }
    // Set-aside match
    if (opp.set_aside_type) score += 5;
    return Math.min(99, score);
  };

  if (isLoading) return <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;

  if (!opportunities?.length) {
    return (
      <div className="text-center py-12">
        <Target className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-semibold mb-1">No matching opportunities</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          No active SAM.gov opportunities match this entity's NAICS codes. Check back as new opportunities are posted daily.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{opportunities.length} matching opportunities</p>

      {opportunities.map((opp: any) => {
        const countdown = getCountdown(opp.response_deadline);
        const matchScore = getMatchScore(opp);

        return (
          <Card key={opp.id} className="hover:border-primary/30 transition-all">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold line-clamp-2 mb-2">{opp.title || 'Untitled Opportunity'}</h4>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">{opp.agency || 'Unknown Agency'}</Badge>
                    {opp.set_aside_type && <Badge variant="secondary" className="text-xs">{opp.set_aside_type}</Badge>}
                    {opp.type && <Badge variant="secondary" className="text-xs">{opp.type}</Badge>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Posted: {fmtDate(opp.posted_date)}</span>
                    {opp.estimated_value && <span className="font-mono">Est: {fmt(Number(opp.estimated_value))}</span>}
                    {opp.naics_codes?.length > 0 && <span className="font-mono">NAICS: {opp.naics_codes.slice(0, 3).join(', ')}</span>}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  {/* Match Score */}
                  <div className="text-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${matchScore >= 70 ? 'bg-success/10 text-success' : matchScore >= 50 ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>
                      {matchScore}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Match</p>
                  </div>

                  {/* Countdown */}
                  {countdown && (
                    <Badge className={countdown.color + ' text-xs'}>
                      <Clock className="h-3 w-3 mr-1" />{countdown.label}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
