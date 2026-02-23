import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { parseSearchQuery } from '@/lib/naics-map';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search, DollarSign, Users, BarChart3, Clock, AlertTriangle,
  Building2, ArrowRight, TrendingUp, Calendar, ChevronRight, Briefcase,
  Lightbulb, Handshake
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface MarketData {
  contracts: any[];
  topPlayers: { name: string; value: number; id?: string }[];
  totalValue: number;
  activeContractors: number;
  hhi: number | null;
  hhiLevel: string;
  recompetes: { count: number; value: number };
  opportunities: any[];
  entities: any[];
  sbirData?: { count: number; value: number; topFirms: any[] };
  teamingData?: { pairs: any[] };
}

const BAR_COLORS = [
  'hsl(var(--primary))', 'hsl(210,80%,55%)', 'hsl(190,70%,50%)',
  'hsl(260,60%,55%)', 'hsl(170,60%,45%)', 'hsl(220,70%,60%)',
  'hsl(200,65%,50%)', 'hsl(240,55%,55%)', 'hsl(180,60%,45%)', 'hsl(230,60%,55%)',
];

function formatCurrency(v: number) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export function MarketIntelligenceSearch({ variant = 'full' }: { variant?: 'full' | 'hero' }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MarketData | null>(null);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();

  const executeSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);

    const parsed = parseSearchQuery(query);

    try {
      // Build contract query
      let contractQ = supabase.from('contracts').select('*').order('award_amount', { ascending: false }).limit(500);
      if (parsed.state) contractQ = contractQ.eq('pop_state', parsed.state);
      if (parsed.naicsCodes.length) contractQ = contractQ.in('naics_code', parsed.naicsCodes);
      if (parsed.setAside) contractQ = contractQ.ilike('set_aside_type', `%${parsed.setAside}%`);
      if (parsed.entityQuery) contractQ = contractQ.ilike('recipient_name', `%${parsed.entityQuery}%`);

      // Build entity query
      let entityQ = supabase.from('core_entities').select('id, canonical_name, entity_type, state, total_contract_value, contract_count')
        .order('total_contract_value', { ascending: false }).limit(20);
      if (parsed.entityQuery) entityQ = entityQ.ilike('canonical_name', `%${parsed.entityQuery}%`);
      if (parsed.state) entityQ = entityQ.eq('state', parsed.state);

      // Build opportunities query
      let oppQ = supabase.from('opportunities').select('*').eq('is_active', true).order('response_deadline', { ascending: true }).limit(10);
      if (parsed.naicsCodes.length) oppQ = oppQ.in('naics_code', parsed.naicsCodes);
      if (parsed.setAside) oppQ = oppQ.ilike('set_aside_type', `%${parsed.setAside}%`);

      // Run HHI if we have filters
      let hhiPromise: Promise<any> = Promise.resolve({ data: null });
      if (parsed.naicsCodes.length || parsed.state) {
        hhiPromise = Promise.resolve(supabase.rpc('compute_market_concentration', {
          p_naics: parsed.naicsCodes[0] || null,
          p_state: parsed.state,
        })).catch(() => ({ data: null }));
      }

      // Recompete pipeline
      let recompetePromise: Promise<any> = Promise.resolve({ data: [] });
      if (parsed.state) {
        recompetePromise = Promise.resolve(supabase.rpc('get_recompete_pipeline', { p_state: parsed.state })).catch(() => ({ data: [] }));
      }

      // SBIR query
      let sbirQ = supabase.from('sbir_awards').select('firm, award_amount, phase, agency').order('award_amount', { ascending: false }).limit(100);
      if (parsed.state) sbirQ = sbirQ.eq('state', parsed.state);
      if (parsed.entityQuery) sbirQ = sbirQ.ilike('firm', `%${parsed.entityQuery}%`);

      // Subawards / teaming query
      let subQ = supabase.from('subawards').select('prime_recipient_name, sub_awardee_name, subaward_amount, awarding_agency').order('subaward_amount', { ascending: false }).limit(50);
      if (parsed.state) subQ = subQ.eq('sub_awardee_state', parsed.state);

      const [contractRes, entityRes, oppRes, hhiRes, recompeteRes, sbirRes, subRes] = await Promise.all([
        contractQ, entityQ, oppQ, hhiPromise, recompetePromise, sbirQ, subQ
      ]);

      const contracts = contractRes.data || [];
      const entities = entityRes.data || [];
      const opportunities = oppRes.data || [];
      const sbirRaw = sbirRes.data || [];
      const subRaw = subRes.data || [];

      // Aggregate top players
      const playerMap = new Map<string, number>();
      contracts.forEach(c => {
        if (c.recipient_name) {
          playerMap.set(c.recipient_name, (playerMap.get(c.recipient_name) || 0) + (Number(c.award_amount) || 0));
        }
      });
      const topPlayers = Array.from(playerMap.entries())
        .map(([name, value]) => {
          const entity = entities.find(e => e.canonical_name?.toLowerCase() === name.toLowerCase());
          return { name, value, id: entity?.id };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      const totalValue = contracts.reduce((s, c) => s + (Number(c.award_amount) || 0), 0);
      const activeContractors = playerMap.size;

      // HHI
      const hhiData = hhiRes?.data;
      let hhi: number | null = null;
      let hhiLevel = 'Unknown';
      if (Array.isArray(hhiData) && hhiData.length > 0) {
        hhi = hhiData[0]?.hhi_score ?? null;
      } else if (hhiData?.hhi_score != null) {
        hhi = hhiData.hhi_score;
      }
      if (hhi !== null) {
        hhiLevel = hhi > 2500 ? 'Highly Concentrated' : hhi > 1500 ? 'Moderately Concentrated' : 'Competitive';
      }

      // Recompetes
      const recompetes = recompeteRes?.data || [];
      const recompeteValue = recompetes.reduce((s: number, r: any) => s + (Number(r.award_amount) || 0), 0);

      // SBIR aggregation
      const sbirValue = sbirRaw.reduce((s: number, a: any) => s + (Number(a.award_amount) || 0), 0);
      const sbirFirmMap = new Map<string, number>();
      sbirRaw.forEach((a: any) => { if (a.firm) sbirFirmMap.set(a.firm, (sbirFirmMap.get(a.firm) || 0) + (Number(a.award_amount) || 0)); });
      const sbirTopFirms = Array.from(sbirFirmMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));

      // Teaming pairs
      const teamingMap = new Map<string, { prime: string; sub: string; value: number; count: number }>();
      subRaw.forEach((s: any) => {
        const key = `${s.prime_recipient_name}→${s.sub_awardee_name}`;
        const existing = teamingMap.get(key) || { prime: s.prime_recipient_name, sub: s.sub_awardee_name, value: 0, count: 0 };
        existing.value += Number(s.subaward_amount) || 0;
        existing.count++;
        teamingMap.set(key, existing);
      });
      const teamingPairs = Array.from(teamingMap.values()).sort((a, b) => b.value - a.value).slice(0, 5);

      setData({
        contracts,
        topPlayers,
        totalValue,
        activeContractors,
        hhi,
        hhiLevel,
        recompetes: { count: recompetes.length, value: recompeteValue },
        opportunities,
        entities,
        sbirData: sbirRaw.length > 0 ? { count: sbirRaw.length, value: sbirValue, topFirms: sbirTopFirms } : undefined,
        teamingData: teamingPairs.length > 0 ? { pairs: teamingPairs } : undefined,
      });
    } catch (err) {
      console.error('Market search error:', err);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') executeSearch();
  };

  // Hero variant: just the search bar
  if (variant === 'hero') {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Try: cybersecurity Maryland, IT services 8a, construction DC...'
            className="pl-12 pr-32 h-14 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl text-base focus:border-cyan-500/50"
          />
          <Button
            onClick={executeSearch}
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 border-0 gap-1.5"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Search <ArrowRight className="w-4 h-4" /></>}
          </Button>
        </div>
        {data && (
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
              {formatCurrency(data.totalValue)} total value
            </Badge>
            <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30">
              {data.activeContractors} contractors
            </Badge>
            {data.hhi !== null && (
              <Badge className={`${data.hhiLevel === 'Competitive' ? 'bg-emerald-500/20 text-emerald-300' : data.hhiLevel === 'Moderately Concentrated' ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'}`}>
                {data.hhiLevel}
              </Badge>
            )}
            <Button variant="link" className="text-cyan-400 text-sm" onClick={() => navigate(`/explore?q=${encodeURIComponent(query)}`)}>
              View full results →
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative max-w-3xl mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Try: cybersecurity Maryland, IT services 8a, construction DC...'
          className="pl-12 pr-32 h-14 text-lg"
        />
        <Button
          onClick={executeSearch}
          disabled={loading || !query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2"
        >
          {loading ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <>Search <ArrowRight className="w-4 h-4 ml-1" /></>}
        </Button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <>
          {/* Row 1: Market Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10"><DollarSign className="w-6 h-6 text-primary" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Addressable Value</p>
                  <p className="text-2xl font-bold font-mono">{formatCurrency(data.totalValue)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-violet-500/10"><Users className="w-6 h-6 text-violet-500" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Contractors</p>
                  <p className="text-2xl font-bold font-mono">{data.activeContractors}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${data.hhiLevel === 'Competitive' ? 'bg-emerald-500/10' : data.hhiLevel === 'Moderately Concentrated' ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
                  <BarChart3 className={`w-6 h-6 ${data.hhiLevel === 'Competitive' ? 'text-emerald-500' : data.hhiLevel === 'Moderately Concentrated' ? 'text-amber-500' : 'text-red-500'}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Market Concentration</p>
                  <p className="text-lg font-bold">{data.hhiLevel}</p>
                  {data.hhi !== null && <p className="text-xs text-muted-foreground">HHI: {Math.round(data.hhi)}</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Top Players */}
          {data.topPlayers.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Top Players</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.topPlayers} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <XAxis type="number" tickFormatter={v => formatCurrency(v)} />
                      <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} cursor="pointer"
                        onClick={(d: any) => d?.id && navigate(`/entity/${d.id}`)}>
                        {data.topPlayers.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Row 3: Intelligence Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-5 flex items-start gap-4">
                <div className="p-3 rounded-xl bg-amber-500/10"><AlertTriangle className="w-6 h-6 text-amber-500" /></div>
                <div>
                  <p className="font-semibold">Recompete Pipeline</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {data.recompetes.count > 0
                      ? `${data.recompetes.count} contracts worth ${formatCurrency(data.recompetes.value)} expire in the next 12 months`
                      : 'No expiring contracts found for this market'}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-start gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10"><Calendar className="w-6 h-6 text-blue-500" /></div>
                <div>
                  <p className="font-semibold">Market Activity</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {data.contracts.length} contracts found · Average value {data.contracts.length > 0 ? formatCurrency(data.totalValue / data.contracts.length) : '$0'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Row 3.5: SBIR Innovation + Teaming Intelligence */}
          {(data.sbirData || data.teamingData) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.sbirData && (
                <Card>
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-violet-500/10"><Lightbulb className="w-6 h-6 text-violet-500" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">SBIR Innovation</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {data.sbirData.count} awards · {formatCurrency(data.sbirData.value)} total
                      </p>
                      {data.sbirData.topFirms.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {data.sbirData.topFirms.slice(0, 3).map((f, i) => (
                            <p key={i} className="text-xs text-muted-foreground truncate">{f.name} — {formatCurrency(f.value)}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              {data.teamingData && (
                <Card>
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-emerald-500/10"><Handshake className="w-6 h-6 text-emerald-500" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">Teaming Intelligence</p>
                      <p className="text-sm text-muted-foreground mt-1">Top prime→sub relationships</p>
                      <div className="mt-2 space-y-1">
                        {data.teamingData.pairs.slice(0, 3).map((p, i) => (
                          <p key={i} className="text-xs text-muted-foreground truncate">
                            {p.prime} → {p.sub} ({formatCurrency(p.value)}, {p.count}×)
                          </p>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}


          {data.opportunities.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5" /> Active Opportunities</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.opportunities.map((opp, i) => {
                    const daysLeft = opp.response_deadline ? Math.ceil((new Date(opp.response_deadline).getTime() - Date.now()) / 86400000) : null;
                    return (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{opp.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{opp.department}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                          {opp.set_aside_type && <Badge variant="secondary" className="text-xs">{opp.set_aside_type}</Badge>}
                          {daysLeft !== null && daysLeft > 0 && (
                            <Badge className={`text-xs ${daysLeft <= 7 ? 'bg-red-500/20 text-red-500' : daysLeft <= 14 ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                              {daysLeft}d left
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Row 5: Full Results Table */}
          {data.contracts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><Building2 className="w-5 h-5" /> All Contracts ({data.contracts.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 font-medium text-muted-foreground">Recipient</th>
                        <th className="pb-2 font-medium text-muted-foreground">Agency</th>
                        <th className="pb-2 font-medium text-muted-foreground text-right">Value</th>
                        <th className="pb-2 font-medium text-muted-foreground">Date</th>
                        <th className="pb-2 font-medium text-muted-foreground">NAICS</th>
                        <th className="pb-2 font-medium text-muted-foreground">State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.contracts.slice(0, 25).map((c, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-2 font-medium truncate max-w-[200px]">{c.recipient_name}</td>
                          <td className="py-2 text-muted-foreground truncate max-w-[200px]">{c.awarding_agency}</td>
                          <td className="py-2 text-right font-mono">{formatCurrency(Number(c.award_amount) || 0)}</td>
                          <td className="py-2 text-muted-foreground">{c.award_date ? new Date(c.award_date).toLocaleDateString() : '—'}</td>
                          <td className="py-2 text-muted-foreground">{c.naics_code || '—'}</td>
                          <td className="py-2 text-muted-foreground">{c.pop_state || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.contracts.length > 25 && (
                    <p className="text-center text-sm text-muted-foreground mt-4">Showing 25 of {data.contracts.length} results</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Empty state */}
      {searched && !loading && data && data.contracts.length === 0 && data.entities.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No contracts match this query</h3>
          <p className="text-muted-foreground mt-1">Try broader terms like "IT services Virginia" or "construction DC"</p>
        </div>
      )}

      {/* Initial state */}
      {!searched && (
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">Enter a market query to get instant intelligence</h3>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {['cybersecurity Maryland', 'IT services small business', 'construction DC', 'healthcare Virginia'].map(s => (
              <Button key={s} variant="outline" size="sm" onClick={() => { setQuery(s); }}>
                <Search className="w-3 h-3 mr-1" /> {s}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
