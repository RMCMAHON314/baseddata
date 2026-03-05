// BASED DATA - Recompete Calendar
// Proactive BD tool showing contracts expiring in 6-18 months
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { PageSEO } from '@/components/layout/PageSEO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarClock, DollarSign, Building2, AlertTriangle, Search, ChevronRight, Timer, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, differenceInDays, addMonths, isBefore, isAfter } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { EntityLink } from '@/components/EntityLink';

interface RecompeteContract {
  id: string;
  recipient_name: string;
  recipient_entity_id: string | null;
  awarding_agency: string | null;
  description: string | null;
  total_obligation: number | null;
  award_amount: number | null;
  end_date: string;
  start_date: string | null;
  naics_code: string | null;
  naics_description: string | null;
  piid: string | null;
}

function formatValue(v: number): string {
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return '$' + (v / 1e3).toFixed(0) + 'K';
  return '$' + v.toFixed(0);
}

function getUrgency(endDate: string): { label: string; color: string; variant: 'destructive' | 'default' | 'secondary' | 'outline' } {
  const days = differenceInDays(new Date(endDate), new Date());
  if (days <= 90) return { label: `${days}d left`, color: 'hsl(var(--destructive))', variant: 'destructive' };
  if (days <= 180) return { label: `${Math.round(days / 30)}mo left`, color: 'hsl(var(--chart-5))', variant: 'default' };
  return { label: `${Math.round(days / 30)}mo left`, color: 'hsl(var(--chart-4))', variant: 'secondary' };
}

export default function RecompeteCalendar() {
  const [timeRange, setTimeRange] = useState<string>('12');
  const [agencyFilter, setAgencyFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const now = new Date();
  const rangeEnd = addMonths(now, parseInt(timeRange));

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['recompetes', timeRange],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('id, recipient_name, recipient_entity_id, awarding_agency, description, total_obligation, award_amount, end_date, start_date, naics_code, naics_description, piid')
        .not('end_date', 'is', null)
        .gte('end_date', now.toISOString())
        .lte('end_date', rangeEnd.toISOString())
        .order('end_date', { ascending: true })
        .limit(500);
      return (data || []) as RecompeteContract[];
    },
  });

  const filtered = useMemo(() => {
    if (!contracts) return [];
    return contracts.filter(c => {
      if (agencyFilter && !c.awarding_agency?.toLowerCase().includes(agencyFilter.toLowerCase())) return false;
      if (searchQuery && !c.recipient_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !c.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [contracts, agencyFilter, searchQuery]);

  // Monthly buckets for chart
  const monthlyData = useMemo(() => {
    if (!filtered) return [];
    const buckets = new Map<string, { month: string; count: number; value: number }>();
    for (const c of filtered) {
      const month = format(new Date(c.end_date), 'MMM yyyy');
      const existing = buckets.get(month);
      const val = c.total_obligation || c.award_amount || 0;
      if (existing) { existing.count++; existing.value += val; }
      else buckets.set(month, { month, count: 1, value: val });
    }
    return Array.from(buckets.values());
  }, [filtered]);

  const totalValue = filtered.reduce((s, c) => s + (c.total_obligation || c.award_amount || 0), 0);
  const urgent = filtered.filter(c => differenceInDays(new Date(c.end_date), now) <= 90).length;

  // Top agencies
  const agencyCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of filtered) {
      const a = c.awarding_agency || 'Unknown';
      map.set(a, (map.get(a) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [filtered]);

  return (
    <GlobalLayout>
      <PageSEO title="Recompete Calendar | Based Data" description="Track expiring federal contracts for proactive business development" />
      <div className="container py-6 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <CalendarClock className="h-8 w-8 text-primary" />
              Recompete Calendar
            </h1>
            <p className="text-muted-foreground mt-1">Contracts expiring soon — your proactive BD pipeline</p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">Next 6 months</SelectItem>
              <SelectItem value="12">Next 12 months</SelectItem>
              <SelectItem value="18">Next 18 months</SelectItem>
              <SelectItem value="24">Next 24 months</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Expiring Contracts', value: isLoading ? null : filtered.length.toLocaleString(), icon: CalendarClock },
            { label: 'Total Value at Stake', value: isLoading ? null : formatValue(totalValue), icon: DollarSign },
            { label: 'Urgent (< 90 days)', value: isLoading ? null : urgent.toString(), icon: AlertTriangle },
            { label: 'Agencies Affected', value: isLoading ? null : agencyCounts.length.toString(), icon: Building2 },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <kpi.icon className="h-3.5 w-3.5" /> {kpi.label}
                  </div>
                  <p className="text-xl font-bold">{kpi.value ?? <Skeleton className="h-6 w-20" />}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by company or description..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <div className="relative max-w-xs">
            <Input placeholder="Filter by agency..." value={agencyFilter} onChange={e => setAgencyFilter(e.target.value)} />
          </div>
        </div>

        {/* Expiry Timeline Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Expiry Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[250px] w-full" /> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyData}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(value: number, name: string) => [name === 'value' ? formatValue(value) : value, name === 'value' ? 'Total Value' : 'Contracts']}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Contracts">
                    {monthlyData.map((entry, i) => (
                      <Cell key={i} fill={i < 3 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'} opacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Contract List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Expiring Contracts ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No contracts found matching your filters.</p>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filtered.map((c, i) => {
                  const urgency = getUrgency(c.end_date);
                  const val = c.total_obligation || c.award_amount || 0;
                  return (
                    <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      className="border rounded-lg p-4 hover:bg-secondary/30 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={urgency.variant} className="text-xs">{urgency.label}</Badge>
                            {c.naics_code && <Badge variant="outline" className="text-xs">{c.naics_code}</Badge>}
                          </div>
                          <p className="font-medium truncate">{c.description || c.piid || 'Contract'}</p>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            {c.recipient_entity_id ? (
                              <EntityLink entityId={c.recipient_entity_id} name={c.recipient_name} />
                            ) : (
                              <span>{c.recipient_name}</span>
                            )}
                            {c.awarding_agency && (
                              <>
                                <ChevronRight className="h-3 w-3" />
                                <span>{c.awarding_agency}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold">{formatValue(val)}</p>
                          <p className="text-xs text-muted-foreground">
                            Expires {format(new Date(c.end_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </GlobalLayout>
  );
}
