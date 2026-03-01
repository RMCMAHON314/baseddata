import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Target, Clock, MapPin, ExternalLink, Bookmark, Share2, Download,
  ChevronDown, Search, AlertCircle
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

interface OpportunityFeedProps {
  opportunities: Opportunity[];
  loading: boolean;
  onSelect: (opp: Opportunity) => void;
  onTrack: (opp: Opportunity) => void;
}

function fmt(v: number | null) {
  if (!v) return null;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function daysUntil(d: string | null) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

function urgencyColor(days: number | null) {
  if (days === null || days < 0) return 'bg-muted text-muted-foreground';
  if (days <= 7) return 'bg-red-500/15 text-red-600 border-red-200';
  if (days <= 30) return 'bg-amber-500/15 text-amber-600 border-amber-200';
  return 'bg-emerald-500/15 text-emerald-600 border-emerald-200';
}

function urgencyDot(days: number | null) {
  if (days === null || days < 0) return 'bg-muted-foreground';
  if (days <= 7) return 'bg-red-500';
  if (days <= 30) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function countdownText(days: number | null) {
  if (days === null) return 'No deadline';
  if (days < 0) return 'Closed';
  if (days === 0) return 'Due today';
  if (days === 1) return '1 day left';
  if (days <= 7) return `${days} days left`;
  if (days <= 30) return `${Math.ceil(days / 7)} weeks left`;
  return `${Math.ceil(days / 30)} months left`;
}

export function OpportunityFeed({ opportunities, loading, onSelect, onTrack }: OpportunityFeedProps) {
  const [search, setSearch] = useState('');
  const [agency, setAgency] = useState('__all__');
  const [setAside, setSetAside] = useState('__all__');
  const [deadline, setDeadline] = useState('__all__');
  const [state, setState] = useState('__all__');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const agencies = useMemo(() => {
    const set = new Set<string>();
    opportunities.forEach(o => { if (o.department) set.add(o.department); });
    return Array.from(set).sort().slice(0, 50);
  }, [opportunities]);

  const setAsides = useMemo(() => {
    const set = new Set<string>();
    opportunities.forEach(o => { if (o.set_aside) set.add(o.set_aside); });
    return Array.from(set).sort();
  }, [opportunities]);

  const states = useMemo(() => {
    const set = new Set<string>();
    opportunities.forEach(o => { if (o.pop_state) set.add(o.pop_state); });
    return Array.from(set).sort();
  }, [opportunities]);

  const filtered = useMemo(() => {
    let list = [...opportunities];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.title?.toLowerCase().includes(q) ||
        o.department?.toLowerCase().includes(q) ||
        o.naics_code?.includes(q) ||
        o.description?.toLowerCase().includes(q)
      );
    }
    if (agency !== '__all__') list = list.filter(o => o.department === agency);
    if (setAside !== '__all__') list = list.filter(o => o.set_aside === setAside);
    if (state !== '__all__') list = list.filter(o => o.pop_state === state);
    if (deadline !== '__all__') {
      const now = Date.now();
      const days = deadline === '7' ? 7 : deadline === '30' ? 30 : deadline === '90' ? 90 : 9999;
      list = list.filter(o => {
        if (!o.response_deadline) return false;
        const d = daysUntil(o.response_deadline);
        return d !== null && d >= 0 && d <= days;
      });
    }
    // Sort by deadline nearest first
    list.sort((a, b) => {
      const da = a.response_deadline ? new Date(a.response_deadline).getTime() : Infinity;
      const db = b.response_deadline ? new Date(b.response_deadline).getTime() : Infinity;
      return da - db;
    });
    return list;
  }, [opportunities, search, agency, setAside, deadline, state]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;

  if (loading) {
    return <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-card border border-border rounded-xl">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search opportunities..." className="pl-9 h-9 text-sm" />
        </div>
        <Select value={agency} onValueChange={v => { setAgency(v); setPage(1); }}>
          <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue placeholder="Agency" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Agencies</SelectItem>
            {agencies.map(a => <SelectItem key={a} value={a}>{a.length > 30 ? a.slice(0, 30) + '…' : a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={setAside} onValueChange={v => { setSetAside(v); setPage(1); }}>
          <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue placeholder="Set-Aside" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Set-Asides</SelectItem>
            {setAsides.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={deadline} onValueChange={v => { setDeadline(v); setPage(1); }}>
          <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Deadline" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Deadlines</SelectItem>
            <SelectItem value="7">Next 7 days</SelectItem>
            <SelectItem value="30">Next 30 days</SelectItem>
            <SelectItem value="90">Next 90 days</SelectItem>
          </SelectContent>
        </Select>
        <Select value={state} onValueChange={v => { setState(v); setPage(1); }}>
          <SelectTrigger className="w-[120px] h-9 text-sm"><SelectValue placeholder="State" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All States</SelectItem>
            {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground ml-auto">{filtered.length} results</div>
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <AlertCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-semibold text-foreground">No opportunities match your filters</h3>
          <p className="text-sm text-muted-foreground mt-1">Try broadening your search criteria</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map(opp => {
            const days = daysUntil(opp.response_deadline);
            const value = fmt(opp.award_ceiling);
            return (
              <Card key={opp.id} className="hover:border-primary/30 transition-all cursor-pointer group"
                onClick={() => onSelect(opp)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Urgency dot */}
                    <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${urgencyDot(days)}`} />

                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Title */}
                      <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {opp.title || 'Untitled Opportunity'}
                      </h3>

                      {/* Agency + Timeline */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-medium">{opp.department || 'Unknown Agency'}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {opp.posted_date ? new Date(opp.posted_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                          {' → '}
                          {opp.response_deadline ? new Date(opp.response_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                        </span>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {days !== null && (
                          <Badge variant="outline" className={`text-[10px] ${urgencyColor(days)}`}>
                            {countdownText(days)}
                          </Badge>
                        )}
                        {opp.notice_type && <Badge variant="outline" className="text-[10px]">{opp.notice_type}</Badge>}
                        {opp.naics_code && <Badge variant="secondary" className="text-[10px] font-mono">{opp.naics_code}</Badge>}
                        {opp.set_aside && <Badge variant="secondary" className="text-[10px]">{opp.set_aside}</Badge>}
                        {opp.pop_state && (
                          <Badge variant="outline" className="text-[10px]">
                            <MapPin className="w-2.5 h-2.5 mr-0.5" />{opp.pop_state}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Right side */}
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      {value && <span className="text-sm font-bold font-mono text-primary">{value}</span>}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={e => { e.stopPropagation(); onTrack(opp); }}>
                          <Bookmark className="w-3 h-3" />
                        </Button>
                        {opp.ui_link && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild onClick={e => e.stopPropagation()}>
                            <a href={opp.ui_link} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {hasMore && (
            <div className="text-center pt-2">
              <Button variant="outline" onClick={() => setPage(p => p + 1)} className="gap-2">
                <ChevronDown className="w-4 h-4" /> Show more ({filtered.length - paginated.length} remaining)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
