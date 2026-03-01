import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import {
  Clock, MapPin, DollarSign, ExternalLink, Building2, Target,
  Users, FileText, CalendarDays, Plus, TrendingUp
} from 'lucide-react';

interface Opportunity {
  id: string;
  title: string | null;
  description: string | null;
  department: string | null;
  notice_type: string | null;
  posted_date: string | null;
  response_deadline: string | null;
  award_ceiling: number | null;
  award_floor: number | null;
  naics_code: string | null;
  set_aside: string | null;
  pop_state: string | null;
  ui_link: string | null;
  is_active: boolean | null;
  awardee_name: string | null;
  award_amount: number | null;
}

interface OpportunityDetailProps {
  opportunity: Opportunity | null;
  open: boolean;
  onClose: () => void;
  onAddToPipeline: (opp: Opportunity) => void;
}

function fmt(v: number | null) {
  if (!v) return '—';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function daysUntil(d: string | null) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

export function OpportunityDetail({ opportunity, open, onClose, onAddToPipeline }: OpportunityDetailProps) {
  const opp = opportunity;

  // Fetch likely competitors (entities with same NAICS + same agency history)
  const { data: competitors, isLoading: loadingComp } = useQuery({
    queryKey: ['opp-competitors', opp?.naics_code, opp?.department],
    enabled: !!opp?.naics_code,
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('recipient_name, recipient_entity_id, awarding_agency, award_amount, naics_code')
        .eq('naics_code', opp!.naics_code!)
        .eq('awarding_agency', opp!.department || '')
        .order('award_amount', { ascending: false, nullsFirst: false })
        .limit(20);

      // Deduplicate by recipient
      const map = new Map<string, { name: string; entityId: string | null; total: number; count: number }>();
      (data || []).forEach(c => {
        const key = c.recipient_name?.toLowerCase() || '';
        const existing = map.get(key);
        if (existing) { existing.total += Number(c.award_amount) || 0; existing.count++; }
        else map.set(key, { name: c.recipient_name || '', entityId: c.recipient_entity_id, total: Number(c.award_amount) || 0, count: 1 });
      });
      return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 8);
    },
  });

  // Similar past awards
  const { data: similarAwards } = useQuery({
    queryKey: ['similar-awards', opp?.naics_code, opp?.department],
    enabled: !!opp?.naics_code,
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('id, recipient_name, recipient_entity_id, award_amount, award_date, description')
        .eq('naics_code', opp!.naics_code!)
        .order('award_date', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const avgValue = similarAwards?.length
    ? similarAwards.reduce((s, c) => s + (Number(c.award_amount) || 0), 0) / similarAwards.length
    : null;

  if (!opp) return null;

  const days = daysUntil(opp.response_deadline);

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg leading-snug pr-8">{opp.title || 'Untitled Opportunity'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Meta badges */}
          <div className="flex flex-wrap gap-1.5">
            {opp.notice_type && <Badge variant="outline">{opp.notice_type}</Badge>}
            {opp.set_aside && <Badge variant="secondary">{opp.set_aside}</Badge>}
            {opp.naics_code && <Badge variant="secondary" className="font-mono">{opp.naics_code}</Badge>}
            {opp.pop_state && <Badge variant="outline"><MapPin className="w-3 h-3 mr-1" />{opp.pop_state}</Badge>}
            {days !== null && days >= 0 && (
              <Badge variant={days <= 7 ? 'destructive' : 'default'}>
                <Clock className="w-3 h-3 mr-1" />{days === 0 ? 'Due today' : `${days} days left`}
              </Badge>
            )}
          </div>

          {/* Timeline */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Posted</p>
                <p className="font-medium">{opp.posted_date ? new Date(opp.posted_date).toLocaleDateString() : '—'}</p>
              </div>
            </div>
            <div className="h-px flex-1 bg-border" />
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Response Due</p>
                <p className="font-medium">{opp.response_deadline ? new Date(opp.response_deadline).toLocaleDateString() : '—'}</p>
              </div>
            </div>
          </div>

          {/* Value + Agency */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-border">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground mb-1">Estimated Value</p>
                <p className="text-lg font-bold font-mono text-primary">
                  {opp.award_floor && opp.award_ceiling
                    ? `${fmt(opp.award_floor)} — ${fmt(opp.award_ceiling)}`
                    : fmt(opp.award_ceiling)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground mb-1">Agency</p>
                <p className="text-sm font-semibold">{opp.department || '—'}</p>
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          {opp.description && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</h4>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                {opp.description.slice(0, 1500)}
                {opp.description.length > 1500 && '…'}
              </p>
            </div>
          )}

          <Separator />

          {/* Likely Competitors */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Likely Competitors
            </h4>
            {loadingComp ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
            ) : !competitors?.length ? (
              <p className="text-sm text-muted-foreground">No competitors identified for this NAICS + agency combination.</p>
            ) : (
              <div className="space-y-1.5">
                {competitors.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg hover:bg-muted/50">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    {c.entityId ? (
                      <Link to={`/entity/${c.entityId}`} className="text-primary hover:underline font-medium flex-1 truncate">{c.name}</Link>
                    ) : (
                      <span className="flex-1 truncate text-foreground">{c.name}</span>
                    )}
                    <span className="text-xs text-muted-foreground">{c.count} awards</span>
                    <span className="text-xs font-mono font-semibold text-primary">{fmt(c.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Similar Past Awards */}
          {similarAwards && similarAwards.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Similar Past Awards
                {avgValue && (
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    Avg: {fmt(avgValue)}
                  </Badge>
                )}
              </h4>
              <div className="space-y-1.5">
                {similarAwards.map(c => (
                  <div key={c.id} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg hover:bg-muted/50">
                    <span className="flex-1 truncate text-foreground">
                      {c.recipient_entity_id ? (
                        <Link to={`/entity/${c.recipient_entity_id}`} className="text-primary hover:underline">{c.recipient_name}</Link>
                      ) : c.recipient_name}
                    </span>
                    <span className="text-xs text-muted-foreground">{c.award_date ? new Date(c.award_date).toLocaleDateString() : ''}</span>
                    <span className="text-xs font-mono font-semibold text-primary">{fmt(Number(c.award_amount))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button className="btn-omni flex-1 gap-2" onClick={() => onAddToPipeline(opp)}>
              <Plus className="w-4 h-4" /> Add to Pipeline
            </Button>
            {opp.ui_link && (
              <Button variant="outline" asChild>
                <a href={opp.ui_link} target="_blank" rel="noopener noreferrer" className="gap-2">
                  <ExternalLink className="w-4 h-4" /> View on SAM.gov
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
