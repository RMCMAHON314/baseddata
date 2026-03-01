// BOMB-02 — Contracts Tab V2: Sortable, filterable, with days-remaining column + pagination
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Search, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fmt, fmtDate } from '@/pages/EntityIntelligenceHub';

interface Props { entityId: string; }

const PAGE_SIZE = 25;

function getDaysRemaining(endDate: string | null): number | null {
  if (!endDate) return null;
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
}

function getDaysRemainingBadge(days: number | null) {
  if (days === null) return <span className="text-xs text-muted-foreground">—</span>;
  if (days <= 0) return <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">Expired</Badge>;
  if (days < 30) return <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">{days}d</Badge>;
  if (days < 90) return <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">{days}d</Badge>;
  if (days < 180) return <Badge className="bg-warning/10 text-warning border-warning/20 text-xs">{days}d</Badge>;
  return <Badge className="bg-success/10 text-success border-success/20 text-xs">{days}d</Badge>;
}

export function EntityContractsTabV2({ entityId }: Props) {
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('all');
  const [sortField, setSortField] = useState<'award_amount' | 'award_date' | 'end_date'>('award_amount');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['entity-contracts-v2', entityId, page, sortField, sortDir],
    queryFn: async () => {
      const { data, count } = await supabase
        .from('contracts')
        .select('*', { count: 'exact' })
        .eq('recipient_entity_id', entityId)
        .order(sortField, { ascending: sortDir === 'asc', nullsFirst: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      return { rows: data || [], total: count || 0 };
    },
  });

  // Agency chart data
  const { data: agencyChart } = useQuery({
    queryKey: ['entity-contracts-agency-chart', entityId],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('awarding_agency, award_amount')
        .eq('recipient_entity_id', entityId);
      if (!data?.length) return [];
      const map: Record<string, number> = {};
      for (const c of data) {
        const agency = c.awarding_agency || 'Unknown';
        map[agency] = (map[agency] || 0) + (Number(c.award_amount) || 0);
      }
      return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name: name.slice(0, 20), value }));
    },
  });

  const agencies = [...new Set((data?.rows || []).map(c => c.awarding_agency).filter(Boolean))] as string[];
  const filtered = (data?.rows || [])
    .filter(c => agencyFilter === 'all' || c.awarding_agency === agencyFilter)
    .filter(c => !search || c.description?.toLowerCase().includes(search.toLowerCase()) || c.awarding_agency?.toLowerCase().includes(search.toLowerCase()));

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const exportCSV = () => {
    if (!filtered.length) return;
    const csv = [
      ['Date', 'Agency', 'Description', 'Value', 'End Date', 'Days Left', 'NAICS'].join(','),
      ...filtered.map(c => {
        const days = getDaysRemaining(c.end_date);
        return [fmtDate(c.award_date), c.awarding_agency, '"' + (c.description || '').slice(0, 80).replace(/"/g, "'") + '"', c.award_amount, fmtDate(c.end_date), days ?? '', c.naics_code].join(',');
      })
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'contracts.csv';
    a.click();
  };

  if (isLoading) return <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;
  if (!data?.total) return <EmptyTab icon={FileText} title="No contracts found" desc="This entity may not have federal contract records." />;

  return (
    <div className="space-y-6">
      {/* Agency value distribution */}
      {agencyChart && agencyChart.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Contract Value by Agency</CardTitle></CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agencyChart} layout="vertical">
                  <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search contracts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-56" />
          </div>
          <Select value={agencyFilter} onValueChange={setAgencyFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Agencies" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agencies</SelectItem>
              {agencies.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{data.total} contracts</span>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1.5" />Export</Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-left">
              <th className="p-3 font-medium cursor-pointer" onClick={() => toggleSort('award_date')}>
                <span className="flex items-center gap-1">Date <ArrowUpDown className="h-3 w-3" /></span>
              </th>
              <th className="p-3 font-medium">Agency</th>
              <th className="p-3 font-medium hidden md:table-cell">Description</th>
              <th className="p-3 font-medium text-right cursor-pointer" onClick={() => toggleSort('award_amount')}>
                <span className="flex items-center gap-1 justify-end">Value <ArrowUpDown className="h-3 w-3" /></span>
              </th>
              <th className="p-3 font-medium text-center cursor-pointer" onClick={() => toggleSort('end_date')}>
                <span className="flex items-center gap-1 justify-center">Days Left <ArrowUpDown className="h-3 w-3" /></span>
              </th>
              <th className="p-3 font-medium hidden lg:table-cell">NAICS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const days = getDaysRemaining(c.end_date);
              return (
                <React.Fragment key={c.id}>
                  <tr className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                    <td className="p-3 whitespace-nowrap">{fmtDate(c.award_date)}</td>
                    <td className="p-3 max-w-[200px] truncate">
                      <Link to={"/agency/" + encodeURIComponent(c.awarding_agency || "")} className="hover:text-primary hover:underline" onClick={e => e.stopPropagation()}>
                        {c.awarding_agency || "—"}
                      </Link>
                    </td>
                    <td className="p-3 max-w-[280px] truncate hidden md:table-cell text-muted-foreground">{(c.description || '').slice(0, 80)}</td>
                    <td className="p-3 text-right font-mono font-semibold text-primary">{fmt(Number(c.award_amount))}</td>
                    <td className="p-3 text-center">{getDaysRemainingBadge(days)}</td>
                    <td className="p-3 hidden lg:table-cell"><Badge variant="secondary" className="font-mono text-xs">{c.naics_code || '—'}</Badge></td>
                  </tr>
                  {expanded === c.id && (
                    <tr><td colSpan={6} className="p-4 bg-muted/20 border-t">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div><span className="text-muted-foreground text-xs">Full Description</span><p className="mt-1">{c.description || 'N/A'}</p></div>
                        <div><span className="text-muted-foreground text-xs">Period</span><p className="mt-1">{fmtDate(c.start_date)} — {fmtDate(c.end_date)}</p></div>
                        <div><span className="text-muted-foreground text-xs">Set-Aside</span><p className="mt-1">{c.set_aside_type || 'None'}</p></div>
                        <div><span className="text-muted-foreground text-xs">PSC Code</span><p className="mt-1">{c.psc_code || 'N/A'}</p></div>
                      </div>
                    </td></tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.total)} of {data.total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= data.total}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyTab({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="text-center py-12">
      <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">{desc}</p>
    </div>
  );
}
