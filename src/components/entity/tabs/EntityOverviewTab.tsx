// BOMB-02 — Overview Tab: Executive summary, metrics, timeline chart, SAM registration, recent activity
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, FileText, Award, Activity, Sparkles, Clock, ShieldCheck, Building2, Globe, BadgeCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { fmt, fmtDate } from '@/pages/EntityIntelligenceHub';

interface Props {
  entityId: string;
  entityName: string;
  stats?: {
    contractCount: number;
    contractValue: number;
    grantCount: number;
    grantValue: number;
    relationshipCount: number;
  } | undefined;
}

export function EntityOverviewTab({ entityId, entityName, stats }: Props) {
  // AI insights as executive summary
  const { data: insights } = useQuery({
    queryKey: ['entity-overview-insights', entityId],
    queryFn: async () => {
      const { data } = await supabase
        .from('core_derived_insights')
        .select('title, description')
        .contains('related_entities', [entityId])
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(3);
      return data || [];
    },
  });

  // SAM Registration data
  const { data: samRegistration } = useQuery({
    queryKey: ['entity-sam-registration', entityName],
    queryFn: async () => {
      const { data } = await supabase
        .from('sam_entities')
        .select('*')
        .ilike('legal_business_name', `%${entityName.split(' ').slice(0, 3).join(' ')}%`)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!entityName,
  });

  // Entity core data (for certifications/business types)
  const { data: entityData } = useQuery({
    queryKey: ['entity-core-data', entityId],
    queryFn: async () => {
      const { data } = await supabase
        .from('core_entities')
        .select('business_types, naics_codes, psc_codes, uei, cage_code, duns, website, employee_count, annual_revenue, description')
        .eq('id', entityId)
        .single();
      return data;
    },
  });

  // Quarterly activity chart
  const { data: quarterlyData } = useQuery({
    queryKey: ['entity-quarterly', entityId],
    queryFn: async () => {
      const { data: contracts } = await supabase
        .from('contracts')
        .select('award_date, award_amount')
        .eq('recipient_entity_id', entityId)
        .not('award_date', 'is', null)
        .order('award_date', { ascending: true });

      if (!contracts?.length) return [];

      const quarters: Record<string, { quarter: string; contracts: number; value: number }> = {};
      for (const c of contracts) {
        const d = new Date(c.award_date!);
        const q = `${d.getFullYear()} Q${Math.ceil((d.getMonth() + 1) / 3)}`;
        if (!quarters[q]) quarters[q] = { quarter: q, contracts: 0, value: 0 };
        quarters[q].contracts++;
        quarters[q].value += Number(c.award_amount) || 0;
      }
      return Object.values(quarters).slice(-12);
    },
  });

  // NAICS spending breakdown
  const { data: naicsBreakdown } = useQuery({
    queryKey: ['entity-naics-breakdown', entityId],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('naics_code, award_amount')
        .eq('recipient_entity_id', entityId)
        .not('naics_code', 'is', null);

      if (!data?.length) return [];
      const map: Record<string, number> = {};
      for (const c of data) {
        map[c.naics_code!] = (map[c.naics_code!] || 0) + (Number(c.award_amount) || 0);
      }
      return Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([code, value]) => ({ code, value }));
    },
  });

  // Recent activity feed
  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['entity-recent-activity', entityId],
    queryFn: async () => {
      const [{ data: contracts }, { data: grants }] = await Promise.all([
        supabase.from('contracts')
          .select('id, award_date, awarding_agency, award_amount, description')
          .eq('recipient_entity_id', entityId)
          .order('award_date', { ascending: false })
          .limit(5),
        supabase.from('grants')
          .select('id, award_date, awarding_agency, award_amount, project_title')
          .eq('recipient_entity_id', entityId)
          .order('award_date', { ascending: false })
          .limit(5),
      ]);

      const items = [
        ...(contracts || []).map(c => ({ type: 'contract' as const, date: c.award_date, agency: c.awarding_agency, amount: c.award_amount, title: c.description })),
        ...(grants || []).map(g => ({ type: 'grant' as const, date: g.award_date, agency: g.awarding_agency, amount: g.award_amount, title: g.project_title })),
      ].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 10);
      return items;
    },
  });

  const totalValue = (stats?.contractValue || 0) + (stats?.grantValue || 0);
  const avgDealSize = stats?.contractCount ? (stats.contractValue / stats.contractCount) : 0;

  // Parse SAM business types
  const businessTypes: string[] = (() => {
    if (samRegistration?.business_types) {
      const bt = samRegistration.business_types;
      if (Array.isArray(bt)) return bt as string[];
      if (typeof bt === 'object') return Object.values(bt).filter(Boolean).map(String);
    }
    if (entityData?.business_types) return entityData.business_types;
    return [];
  })();

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      {insights && insights.length > 0 && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights.map((ins, i) => (
                <p key={i} className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{ins.title}:</span> {ins.description}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Awarded</p>
          <p className="text-2xl font-bold text-primary mt-1">{fmt(totalValue)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Deal Size</p>
          <p className="text-2xl font-bold mt-1">{fmt(avgDealSize)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Contracts</p>
          <p className="text-2xl font-bold mt-1">{stats?.contractCount || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Grants</p>
          <p className="text-2xl font-bold mt-1">{stats?.grantCount || 0}</p>
        </Card>
      </div>

      {/* SAM Registration & Company Profile */}
      {(samRegistration || entityData) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />Company Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Identifiers */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Identifiers</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {(samRegistration?.uei || entityData?.uei) && (
                    <div><span className="text-muted-foreground">UEI:</span> <span className="font-mono font-medium">{samRegistration?.uei || entityData?.uei}</span></div>
                  )}
                  {entityData?.cage_code && (
                    <div><span className="text-muted-foreground">CAGE:</span> <span className="font-mono font-medium">{entityData.cage_code}</span></div>
                  )}
                  {entityData?.duns && (
                    <div><span className="text-muted-foreground">DUNS:</span> <span className="font-mono font-medium">{entityData.duns}</span></div>
                  )}
                  {samRegistration?.entity_structure && (
                    <div><span className="text-muted-foreground">Structure:</span> <span className="font-medium">{samRegistration.entity_structure}</span></div>
                  )}
                </div>

                {/* SAM Registration Status */}
                {samRegistration && (
                  <div className="flex items-center gap-2 mt-2">
                    <ShieldCheck className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium">SAM.gov Registered</span>
                    <Badge variant="outline" className="text-xs">
                      {samRegistration.registration_status || 'Active'}
                    </Badge>
                    {samRegistration.expiration_date && (
                      <span className="text-xs text-muted-foreground">Exp: {samRegistration.expiration_date}</span>
                    )}
                  </div>
                )}

                {/* Website */}
                {(samRegistration?.entity_url || entityData?.website) && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a href={samRegistration?.entity_url || entityData?.website || '#'} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate">
                      {(samRegistration?.entity_url || entityData?.website || '').replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}

                {/* Employee count & Revenue */}
                {(entityData?.employee_count || entityData?.annual_revenue) && (
                  <div className="flex gap-4 text-sm">
                    {entityData?.employee_count && (
                      <span><span className="text-muted-foreground">Employees:</span> <span className="font-medium">{entityData.employee_count.toLocaleString()}</span></span>
                    )}
                    {entityData?.annual_revenue && (
                      <span><span className="text-muted-foreground">Revenue:</span> <span className="font-medium">{fmt(entityData.annual_revenue)}</span></span>
                    )}
                  </div>
                )}
              </div>

              {/* Certifications & Business Types */}
              <div className="space-y-3">
                {businessTypes.length > 0 && (
                  <>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Certifications & Business Types</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {businessTypes.slice(0, 12).map((bt, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          <BadgeCheck className="h-3 w-3 mr-1" />{typeof bt === 'string' ? bt : String(bt)}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}

                {/* NAICS & PSC codes */}
                {entityData?.naics_codes && entityData.naics_codes.length > 0 && (
                  <>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-3">NAICS Codes</h4>
                    <div className="flex flex-wrap gap-1">
                      {entityData.naics_codes.slice(0, 8).map(code => (
                        <Badge key={code} variant="outline" className="text-xs font-mono">{code}</Badge>
                      ))}
                      {entityData.naics_codes.length > 8 && <Badge variant="outline" className="text-xs">+{entityData.naics_codes.length - 8}</Badge>}
                    </div>
                  </>
                )}
                {entityData?.psc_codes && entityData.psc_codes.length > 0 && (
                  <>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-3">PSC Codes</h4>
                    <div className="flex flex-wrap gap-1">
                      {entityData.psc_codes.slice(0, 8).map(code => (
                        <Badge key={code} variant="outline" className="text-xs font-mono">{code}</Badge>
                      ))}
                      {entityData.psc_codes.length > 8 && <Badge variant="outline" className="text-xs">+{entityData.psc_codes.length - 8}</Badge>}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Description */}
            {entityData?.description && (
              <p className="text-sm text-muted-foreground mt-4 border-t pt-3">{entityData.description}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timeline Chart */}
      {quarterlyData && quarterlyData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />Activity by Quarter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={quarterlyData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => fmt(value)}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* NAICS Breakdown */}
      {naicsBreakdown && naicsBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spending by NAICS Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={naicsBreakdown} layout="vertical">
                  <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="code" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number) => fmt(value)}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : !recentActivity?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                  {item.type === 'contract' ? (
                    <FileText className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  ) : (
                    <Award className="h-4 w-4 mt-0.5 text-success shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title?.slice(0, 80) || 'Untitled'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{item.type}</Badge>
                      <span className="text-xs text-muted-foreground">{item.agency}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-semibold text-sm text-primary">{fmt(Number(item.amount))}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(item.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
