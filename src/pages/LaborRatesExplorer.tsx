import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, DollarSign, TrendingUp, Building2, GraduationCap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function fmt(v: number | null | undefined) {
  if (!v) return '$0';
  return '$' + v.toFixed(0);
}

const POPULAR = ['software engineer', 'project manager', 'cybersecurity', 'data scientist', 'cloud architect', 'business analyst', 'help desk', 'network engineer'];

export default function LaborRatesExplorer() {
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['labor-rate-stats', search],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_labor_rate_stats' as any, { p_keyword: search });
      if (error) throw error;
      return (data as any)?.[0] || null;
    },
    enabled: search.length > 2,
  });

  const { data: rates, isLoading: ratesLoading } = useQuery({
    queryKey: ['labor-rates-detail', search],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_labor_rates' as any, { p_keyword: search });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: search.length > 2,
  });

  const doSearch = (kw?: string) => {
    const q = kw || keyword;
    if (q.length > 2) setSearch(q);
  };

  const eduData = stats?.education_breakdown ? [
    { level: 'HS', rate: Number(stats.education_breakdown.HS) || 0 },
    { level: 'AA', rate: Number(stats.education_breakdown.AA) || 0 },
    { level: 'BA', rate: Number(stats.education_breakdown.BA) || 0 },
    { level: 'MA', rate: Number(stats.education_breakdown.MA) || 0 },
    { level: 'PHD', rate: Number(stats.education_breakdown.PHD) || 0 },
  ].filter(d => d.rate > 0) : [];

  return (
    <GlobalLayout>
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-primary" />
            GSA Labor Rate Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">Awarded ceiling rates from 10,000+ GSA Schedule contracts — the $25K feature, free.</p>
        </div>

        {/* Search */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              placeholder='Search labor categories (e.g., "software engineer", "project manager")'
              className="pl-9"
            />
          </div>
          <Button onClick={() => doSearch()} disabled={keyword.length < 3}>Search Rates</Button>
        </div>

        {/* Popular searches */}
        {!search && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Popular searches:</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR.map(p => (
                <Badge key={p} variant="secondary" className="cursor-pointer hover:bg-primary/10"
                  onClick={() => { setKeyword(p); doSearch(p); }}>
                  {p}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {statsLoading && search && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="p-4"><p className="text-xs text-muted-foreground">Average Rate</p><p className="text-2xl font-bold text-primary font-mono">{fmt(Number(stats.avg_rate))}/hr</p></Card>
              <Card className="p-4"><p className="text-xs text-muted-foreground">Min Rate</p><p className="text-2xl font-bold font-mono">{fmt(Number(stats.min_rate))}/hr</p></Card>
              <Card className="p-4"><p className="text-xs text-muted-foreground">Max Rate</p><p className="text-2xl font-bold font-mono">{fmt(Number(stats.max_rate))}/hr</p></Card>
              <Card className="p-4"><p className="text-xs text-muted-foreground">Median Rate</p><p className="text-2xl font-bold font-mono">{fmt(Number(stats.median_rate))}/hr</p></Card>
              <Card className="p-4"><p className="text-xs text-muted-foreground">Vendors</p><p className="text-2xl font-bold font-mono">{Number(stats.vendors_count).toLocaleString()}</p></Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Small Business Avg</p>
                <p className="text-xl font-bold text-emerald-600 font-mono">{fmt(Number(stats.small_biz_avg))}/hr</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Large Business Avg</p>
                <p className="text-xl font-bold text-blue-600 font-mono">{fmt(Number(stats.large_biz_avg))}/hr</p>
              </Card>
            </div>

            {/* Education chart */}
            {eduData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Average Rate by Education Level</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={eduData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="level" className="text-xs" />
                      <YAxis tickFormatter={v => `$${v}`} className="text-xs" />
                      <Tooltip formatter={(v: number) => [`$${v.toFixed(0)}/hr`, 'Avg Rate']} />
                      <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Detailed table */}
        {rates && rates.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{rates.length} Rate Records for "{search}"</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-auto max-h-[500px]">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/50 text-left sticky top-0">
                    <th className="p-3 font-medium">Vendor</th>
                    <th className="p-3 font-medium hidden md:table-cell">Contract</th>
                    <th className="p-3 font-medium">Labor Category</th>
                    <th className="p-3 font-medium text-right">Rate</th>
                    <th className="p-3 font-medium hidden lg:table-cell">Education</th>
                    <th className="p-3 font-medium hidden lg:table-cell">Exp</th>
                    <th className="p-3 font-medium hidden md:table-cell">Size</th>
                    <th className="p-3 font-medium hidden xl:table-cell">Clearance</th>
                  </tr></thead>
                  <tbody>
                    {rates.slice(0, 100).map((r: any, i: number) => (
                      <tr key={i} className="border-t hover:bg-muted/30">
                        <td className="p-3 max-w-[200px] truncate">{r.vendor_name}</td>
                        <td className="p-3 hidden md:table-cell font-mono text-xs">{r.contract_number || '—'}</td>
                        <td className="p-3 max-w-[200px] truncate">{r.labor_category}</td>
                        <td className="p-3 text-right font-mono font-semibold text-primary">{fmt(Number(r.hourly_rate))}/hr</td>
                        <td className="p-3 hidden lg:table-cell">{r.education || '—'}</td>
                        <td className="p-3 hidden lg:table-cell">{r.min_experience ? `${r.min_experience}yr` : '—'}</td>
                        <td className="p-3 hidden md:table-cell">
                          <Badge variant={r.business_size === 'S' ? 'default' : 'secondary'} className="text-xs">
                            {r.business_size === 'S' ? 'Small' : r.business_size || '—'}
                          </Badge>
                        </td>
                        <td className="p-3 hidden xl:table-cell text-xs">{r.clearance || 'None'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No results */}
        {search && !statsLoading && !stats && (
          <div className="text-center py-12">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">No labor rates found</h3>
            <p className="text-sm text-muted-foreground">Run the vacuum to load GSA CALC+ data, or try a different keyword.</p>
          </div>
        )}
      </div>
    </GlobalLayout>
  );
}
