// BOMB-02 — Risk & Compliance Tab V2: SAM exclusions, contract expiry timeline, risk breakdown
import { useQuery } from '@tanstack/react-query';
import { Shield, AlertTriangle, CheckCircle2, Clock, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { fmt, fmtDate } from '@/pages/EntityIntelligenceHub';

interface Props { entityId: string; entityName: string; }

export function EntityRiskTabV2({ entityId, entityName }: Props) {
  // Risk RPC
  const { data: risk, isLoading: riskLoading } = useQuery({
    queryKey: ['entity-risk-v2', entityName],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('compute_entity_risk', { p_entity_name: entityName });
      if (error) return null;
      return (data as any)?.[0] || null;
    },
    enabled: !!entityName,
  });

  // SAM Exclusions check
  const { data: exclusions } = useQuery({
    queryKey: ['entity-exclusions', entityName],
    queryFn: async () => {
      const { data } = await supabase
        .from('sam_exclusions')
        .select('*')
        .ilike('name', `%${entityName}%`)
        .limit(5);
      return data || [];
    },
  });

  // Expiring contracts
  const { data: expiringContracts } = useQuery({
    queryKey: ['entity-expiring', entityId],
    queryFn: async () => {
      const futureDate = new Date(Date.now() + 365 * 86400000).toISOString();
      const { data } = await supabase
        .from('contracts')
        .select('id, awarding_agency, award_amount, end_date, description')
        .eq('recipient_entity_id', entityId)
        .gte('end_date', new Date().toISOString())
        .lte('end_date', futureDate)
        .order('end_date', { ascending: true })
        .limit(10);
      return data || [];
    },
  });

  if (riskLoading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;

  const RISK_COLORS: Record<string, string> = {
    LOW: 'bg-success/10 text-success border-success/20',
    MEDIUM: 'bg-warning/10 text-warning border-warning/20',
    HIGH: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  return (
    <div className="space-y-6">
      {/* Risk Overview */}
      {risk ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-2">Risk Level</p>
            <Badge className={RISK_COLORS[risk.risk_level] || ''}>{risk.risk_level}</Badge>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-2">Risk Score</p>
            <p className="text-3xl font-bold">{risk.risk_score}<span className="text-sm text-muted-foreground">/100</span></p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-2">SAM Registration</p>
            <p className="font-semibold text-sm">{risk.registration_status}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-2">Agency Concentration</p>
            <p className="font-semibold">{Number(risk.top_agency_pct).toFixed(1)}%</p>
          </Card>
        </div>
      ) : (
        <Card className="p-6 text-center">
          <Shield className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Risk analysis unavailable — requires SAM registration data</p>
        </Card>
      )}

      {/* SAM Exclusion Status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />SAM Exclusion Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {exclusions && exclusions.length > 0 ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="font-medium text-destructive">Exclusion Records Found ({exclusions.length})</span>
                </div>
                <p className="text-sm text-muted-foreground">This entity has exclusion records in SAM.gov. Review before contracting.</p>
              </div>
              {exclusions.map((ex: any, i: number) => (
                <div key={i} className="p-3 rounded-lg border bg-secondary/30 text-sm">
                  <p className="font-medium">{ex.classification || 'Exclusion'}</p>
                  <p className="text-muted-foreground mt-1">{ex.exclusion_type || 'N/A'} · {fmtDate(ex.action_date)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-success/5 border border-success/20 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm text-success font-medium">No exclusion records found — entity is clear</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contract Expiration Timeline */}
      {expiringContracts && expiringContracts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />Contract Expiration Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiringContracts.map((c: any) => {
                const days = Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000);
                const urgency = days <= 90 ? 'bg-destructive/10 text-destructive' : days <= 180 ? 'bg-orange-100 text-orange-700' : 'bg-warning/10 text-warning';
                return (
                  <div key={c.id} className="flex items-center justify-between text-sm p-3 rounded-lg bg-secondary/30">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{c.awarding_agency || 'Unknown Agency'}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.description?.slice(0, 60)}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-primary">{fmt(Number(c.award_amount))}</span>
                      <Badge className={urgency + ' text-xs'}>{days}d</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk breakdown */}
      {risk && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Risk Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RiskItem
                label="Exclusion Status"
                value={risk.exclusion_status || 'CLEAR'}
                good={risk.exclusion_status !== 'EXCLUDED'}
                detail={risk.exclusion_status === 'EXCLUDED' ? 'Entity is currently excluded from federal contracting' : 'No exclusion records found'}
              />
              <RiskItem
                label="SAM Registration"
                value={risk.registration_status || 'Unknown'}
                good={risk.registration_status === 'Active'}
                detail={risk.registration_status !== 'Active' ? 'Not actively registered — may not be eligible for new awards' : 'Active SAM registration confirmed'}
              />
              <RiskItem
                label="Agency Concentration"
                value={`${Number(risk.top_agency_pct).toFixed(0)}%`}
                good={Number(risk.top_agency_pct) < 60}
                detail={Number(risk.top_agency_pct) > 60 ? 'High concentration — vulnerable to agency budget changes' : 'Well-diversified agency portfolio'}
              />
              <RiskItem
                label="Recompete Exposure"
                value={fmt(Number(risk.recompete_exposure))}
                good={Number(risk.recompete_exposure) < 1000000}
                detail="Value of contracts expiring within 12 months"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RiskItem({ label, value, good, detail }: { label: string; value: string; good: boolean; detail: string }) {
  return (
    <div className={`p-4 rounded-lg border ${good ? 'bg-success/5 border-success/20' : 'bg-warning/5 border-warning/20'}`}>
      <div className="flex items-center gap-2 mb-1">
        {good ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-warning" />}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{detail}</p>
    </div>
  );
}
