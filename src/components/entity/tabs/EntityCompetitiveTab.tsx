// BOMB-02 — Competitive Intelligence Tab V2: Win/loss by agency, market share, head-to-head
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, GitCompare, Trophy, TrendingUp, TrendingDown, Minus, Target, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { fmt } from '@/pages/EntityIntelligenceHub';

interface Props { entityId: string; entityName: string; }

const COLORS = ['hsl(var(--primary))', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981'];

export function EntityCompetitiveTab({ entityId, entityName }: Props) {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['entity-competitive-v2', entityId],
    queryFn: async () => {
      const [{ data: entity }, { data: myContracts }] = await Promise.all([
        supabase.from('core_entities').select('total_contract_value, contract_count, naics_codes').eq('id', entityId).single(),
        supabase.from('contracts').select('awarding_agency, award_amount, naics_code, award_date, competition_type, set_aside_type').eq('recipient_entity_id', entityId).not('awarding_agency', 'is', null).limit(500),
      ]);

      const myValue = entity?.total_contract_value || 0;
      const myAgencies = [...new Set((myContracts || []).map(c => c.awarding_agency).filter(Boolean))];
      const myNaics = [...new Set((myContracts || []).map(c => c.naics_code).filter(Boolean))];

      if (!myAgencies.length) return { competitors: [], myValue, myContractCount: entity?.contract_count || 0, naicsMarketShare: [], winLossByAgency: [], competitionBreakdown: [], setAsideBreakdown: [] };

      // Find competitors by shared agencies
      const { data: competitorContracts } = await supabase
        .from('contracts')
        .select('recipient_entity_id, recipient_name, awarding_agency, award_amount, naics_code')
        .in('awarding_agency', myAgencies.slice(0, 10))
        .neq('recipient_entity_id', entityId)
        .not('recipient_entity_id', 'is', null)
        .limit(500);

      const map = new Map<string, { id: string; name: string; total: number; count: number; agencies: Set<string>; naics: Set<string> }>();
      for (const c of competitorContracts || []) {
        if (!c.recipient_entity_id) continue;
        const existing = map.get(c.recipient_entity_id) || { id: c.recipient_entity_id, name: c.recipient_name || 'Unknown', total: 0, count: 0, agencies: new Set(), naics: new Set() };
        existing.total += Number(c.award_amount) || 0;
        existing.count++;
        if (c.awarding_agency) existing.agencies.add(c.awarding_agency);
        if (c.naics_code) existing.naics.add(c.naics_code);
        map.set(c.recipient_entity_id, existing);
      }

      const competitors = [...map.values()]
        .sort((a, b) => b.total - a.total)
        .slice(0, 15)
        .map(c => ({ ...c, agencies: [...c.agencies], naics: [...c.naics], sharedNaics: [...c.naics].filter(n => myNaics.includes(n)).length }));

      // Win/Loss by Agency — how entity compares to top competitor at each agency
      const winLossByAgency = myAgencies.slice(0, 8).map(agency => {
        const mySpend = (myContracts || []).filter(c => c.awarding_agency === agency).reduce((s, c) => s + (Number(c.award_amount) || 0), 0);
        const myCount = (myContracts || []).filter(c => c.awarding_agency === agency).length;
        const compSpend = (competitorContracts || []).filter(c => c.awarding_agency === agency).reduce((s, c) => s + (Number(c.award_amount) || 0), 0);
        const compCount = (competitorContracts || []).filter(c => c.awarding_agency === agency).length;
        const totalSpend = mySpend + compSpend;
        const share = totalSpend > 0 ? (mySpend / totalSpend) * 100 : 50;
        return { agency: agency!.length > 28 ? agency!.slice(0, 28) + '…' : agency!, mySpend, myCount, compSpend, compCount, share, winning: share > 50 };
      }).sort((a, b) => b.mySpend - a.mySpend);

      // Competition type breakdown
      const compMap = new Map<string, number>();
      for (const c of myContracts || []) {
        const ct = c.competition_type || 'Unknown';
        compMap.set(ct, (compMap.get(ct) || 0) + 1);
      }
      const competitionBreakdown = [...compMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name: name.length > 25 ? name.slice(0, 25) + '…' : name, value }));

      // Set-aside breakdown
      const saMap = new Map<string, number>();
      for (const c of myContracts || []) {
        if (c.set_aside_type) saMap.set(c.set_aside_type, (saMap.get(c.set_aside_type) || 0) + 1);
      }
      const setAsideBreakdown = [...saMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));

      // NAICS market share
      const naicsMarketShare = myNaics.slice(0, 5).map(code => {
        const mySpend = (myContracts || []).filter(c => c.naics_code === code).reduce((s, c) => s + (Number(c.award_amount) || 0), 0);
        const totalSpend = (competitorContracts || []).filter(c => c.naics_code === code).reduce((s, c) => s + (Number(c.award_amount) || 0), 0) + mySpend;
        return { code, mySpend, totalSpend, share: totalSpend > 0 ? (mySpend / totalSpend) * 100 : 0 };
      }).filter(n => n.totalSpend > 0);

      return { competitors, myValue, myContractCount: entity?.contract_count || 0, naicsMarketShare, winLossByAgency, competitionBreakdown, setAsideBreakdown };
    },
  });

  if (isLoading) return <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;

  if (!data?.competitors?.length) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-semibold mb-1">No competitors identified</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">Competitors are identified by shared agency relationships and NAICS codes.</p>
      </div>
    );
  }

  // Chart data
  const chartData = [
    { name: entityName.slice(0, 18), value: data.myValue, isEntity: true },
    ...data.competitors.slice(0, 5).map(c => ({ name: c.name.slice(0, 18), value: c.total, isEntity: false })),
  ].sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      {/* Win/Loss by Agency */}
      {data.winLossByAgency.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />Win Rate by Agency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.winLossByAgency.map(a => (
              <div key={a.agency} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium truncate max-w-[50%]">{a.agency}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{a.myCount} awards · {fmt(a.mySpend)}</span>
                    <Badge variant={a.winning ? 'default' : 'secondary'} className="text-xs">
                      {a.share.toFixed(0)}% share
                    </Badge>
                  </div>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                  <div className="bg-primary rounded-l-full transition-all" style={{ width: `${a.share}%` }} />
                  <div className="bg-muted-foreground/20 rounded-r-full flex-1" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Competition Type + Set-Aside Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data.competitionBreakdown.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" />Competition Type</CardTitle></CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.competitionBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name} (${value})`}>
                      {data.competitionBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
        {data.setAsideBreakdown.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Set-Aside Distribution</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.setAsideBreakdown.map(sa => (
                  <div key={sa.name} className="flex justify-between items-center text-sm p-2 rounded bg-secondary/30">
                    <span className="truncate max-w-[70%]">{sa.name}</span>
                    <Badge variant="outline">{sa.value} awards</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Comparison Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Contract Value Comparison</CardTitle>
            {data.competitors.length >= 2 && (
              <Button variant="outline" size="sm" onClick={() => navigate("/compare?entities=" + entityId + "," + data.competitors.slice(0, 2).map(c => c.id).join(","))}>
                <GitCompare className="h-4 w-4 mr-1.5" />Compare Top 3
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.isEntity ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.3)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* NAICS Market Share */}
      {data.naicsMarketShare.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Market Share by NAICS</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.naicsMarketShare.map(n => (
              <div key={n.code} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-mono">{n.code}</span>
                  <span className="text-muted-foreground">{n.share.toFixed(1)}% share · {fmt(n.mySpend)} of {fmt(n.totalSpend)}</span>
                </div>
                <Progress value={n.share} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Competitor Cards */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{data.competitors.length} competitors by shared agencies</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.competitors.map((c, i) => {
          const compIcon = c.total > data.myValue * 1.1 ? <TrendingDown className="h-4 w-4 text-destructive" /> :
            c.total < data.myValue * 0.9 ? <TrendingUp className="h-4 w-4 text-success" /> :
            <Minus className="h-4 w-4 text-muted-foreground" />;

          return (
            <Card key={c.id} className="p-4 hover:border-primary/30 cursor-pointer transition-all" onClick={() => navigate("/entity/" + c.id)}>
              <div className="flex justify-between items-start mb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold truncate">{c.name}</h4>
                    {i === 0 && <Badge className="bg-amber-100 text-amber-700 text-xs"><Trophy className="h-3 w-3 mr-1" />Top</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{c.count} contracts · {c.agencies.length} shared agencies</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-mono font-semibold text-primary">{fmt(c.total)}</p>
                  {compIcon}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {c.agencies.slice(0, 3).map(a => <Badge key={a} variant="outline" className="text-xs truncate max-w-[130px]">{a}</Badge>)}
                {c.agencies.length > 3 && <Badge variant="outline" className="text-xs">+{c.agencies.length - 3}</Badge>}
              </div>
              {c.sharedNaics > 0 && (
                <p className="text-xs text-muted-foreground mt-2">{c.sharedNaics} shared NAICS codes</p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
