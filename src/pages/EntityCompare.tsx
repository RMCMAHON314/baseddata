// BASED DATA - Entity Comparison Page
import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  GitCompare, X, Search, ChevronRight, Building2, Plus,
  DollarSign, FileText, Award, Users, Heart, Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { GlobalLayout } from '@/components/layout/GlobalLayout';

function fmt(v: number | null) {
  if (!v) return '$0';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

interface EntityProfile {
  id: string;
  canonical_name: string;
  entity_type: string | null;
  state: string | null;
  total_contract_value: number | null;
  contract_count: number | null;
  naics_codes: string[] | null;
  contractValue: number;
  contractCount: number;
  grantCount: number;
  relationshipCount: number;
  healthScore: number | null;
  topAgency: string | null;
}

export default function EntityCompare() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [entityIds, setEntityIds] = useState<string[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const ids = searchParams.get('entities')?.split(',').filter(Boolean) || [];
    setEntityIds(ids.slice(0, 4));
  }, [searchParams]);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['compare-profiles', entityIds],
    queryFn: async () => {
      if (!entityIds.length) return [];
      const results: EntityProfile[] = [];
      
      for (const eid of entityIds) {
        const [entityRes, contractsRes, grantsRes, relsRes, healthRes, topAgencyRes] = await Promise.all([
          supabase.from('core_entities').select('*').eq('id', eid).single(),
          supabase.from('contracts').select('base_and_all_options', { count: 'exact' }).eq('recipient_entity_id', eid),
          supabase.from('grants').select('id', { count: 'exact', head: true }).eq('recipient_entity_id', eid),
          supabase.from('core_relationships').select('id', { count: 'exact', head: true }).or(`from_entity_id.eq.${eid},to_entity_id.eq.${eid}`),
          supabase.from('entity_health_scores').select('overall_score').eq('entity_id', eid).order('calculated_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('contracts').select('awarding_agency, base_and_all_options').eq('recipient_entity_id', eid).not('awarding_agency', 'is', null).limit(100),
        ]);

        const e = entityRes.data;
        if (!e) continue;

        const contractValue = (contractsRes.data || []).reduce((s, c) => s + (Number(c.base_and_all_options) || 0), 0);
        
        // Find top agency
        const agencyMap = new Map<string, number>();
        for (const c of topAgencyRes.data || []) {
          agencyMap.set(c.awarding_agency!, (agencyMap.get(c.awarding_agency!) || 0) + (Number(c.base_and_all_options) || 0));
        }
        const topAgency = [...agencyMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;

        results.push({
          ...e,
          contractValue,
          contractCount: contractsRes.count || 0,
          grantCount: grantsRes.count || 0,
          relationshipCount: relsRes.count || 0,
          healthScore: healthRes.data?.overall_score || null,
          topAgency,
        });
      }
      return results;
    },
    enabled: entityIds.length > 0,
  });

  const searchEntities = async (q: string) => {
    setSearchQ(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase
      .from('core_entities')
      .select('id, canonical_name, entity_type, state')
      .ilike('canonical_name', `%${q}%`)
      .limit(5);
    setSearchResults(data || []);
  };

  const addEntity = (id: string) => {
    if (entityIds.includes(id) || entityIds.length >= 4) return;
    const newIds = [...entityIds, id];
    setSearchParams({ entities: newIds.join(',') });
    setSearchQ('');
    setSearchResults([]);
  };

  const removeEntity = (id: string) => {
    const newIds = entityIds.filter(e => e !== id);
    setSearchParams(newIds.length ? { entities: newIds.join(',') } : {});
  };

  const METRICS: Array<{ key: string; label: string; format: (v: any) => string; icon: any; noHighlight?: boolean }> = [
    { key: 'contractValue', label: 'Total Contract Value', format: fmt, icon: DollarSign },
    { key: 'contractCount', label: 'Contracts', format: (v: number) => v?.toLocaleString() || '0', icon: FileText },
    { key: 'grantCount', label: 'Grants', format: (v: number) => v?.toLocaleString() || '0', icon: Award },
    { key: 'relationshipCount', label: 'Relationships', format: (v: number) => v?.toLocaleString() || '0', icon: Users },
    { key: 'healthScore', label: 'Health Score', format: (v: number | null) => v?.toString() || 'N/A', icon: Heart },
    { key: 'topAgency', label: 'Top Agency', format: (v: string | null) => v || 'N/A', icon: Building2, noHighlight: true },
  ];

  return (
    <GlobalLayout>
      <div className="min-h-screen bg-background">
        <div className="container pt-4">
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">Compare</span>
          </nav>
        </div>

        <div className="border-b border-border bg-card">
          <div className="container py-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GitCompare className="h-6 w-6 text-primary" />
              Entity Comparison
            </h1>
            <p className="text-muted-foreground mt-1">Compare up to 4 entities side by side</p>

            {/* Search bar */}
            <div className="relative mt-4 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQ}
                onChange={e => searchEntities(e.target.value)}
                placeholder="Add entity to compare..."
                className="pl-9"
                disabled={entityIds.length >= 4}
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-50 overflow-hidden">
                  {searchResults.map(e => (
                    <button key={e.id} onClick={() => addEntity(e.id)} className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-muted/50 text-left">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="flex-1 truncate">{e.canonical_name}</span>
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="container py-8">
          {entityIds.length === 0 ? (
            <Card className="p-12 text-center">
              <GitCompare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold mb-1">No entities selected</h3>
              <p className="text-sm text-muted-foreground">Search above to add entities, or navigate here from an entity profile.</p>
            </Card>
          ) : isLoading ? (
            <div className="space-y-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : profiles?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-left w-48 font-medium text-muted-foreground">Metric</th>
                    {profiles.map(p => (
                      <th key={p.id} className="p-3 text-left min-w-[200px]">
                        <div className="flex items-center justify-between">
                          <Link to={`/entity/${p.id}`} className="font-semibold hover:text-primary truncate max-w-[160px]">{p.canonical_name}</Link>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeEntity(p.id)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground font-normal">{p.entity_type} · {p.state}</p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {METRICS.map(m => {
                    const values = profiles.map(p => (p as any)[m.key]);
                    const numericValues = values.filter(v => typeof v === 'number' && v !== null);
                    const maxVal = numericValues.length ? Math.max(...numericValues) : null;

                    return (
                      <tr key={m.key} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-medium text-muted-foreground flex items-center gap-2">
                          <m.icon className="h-4 w-4" />{m.label}
                        </td>
                        {profiles.map(p => {
                          const val = (p as any)[m.key];
                          const isMax = !m.noHighlight && typeof val === 'number' && val === maxVal && numericValues.length > 1;
                          return (
                            <td key={p.id} className={`p-3 font-mono ${isMax ? 'bg-emerald-50 font-semibold text-emerald-700' : ''}`}>
                              {m.format(val as any)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  <tr className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium text-muted-foreground flex items-center gap-2">
                      <Target className="h-4 w-4" />NAICS Codes
                    </td>
                    {profiles.map(p => (
                      <td key={p.id} className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {(p.naics_codes || []).slice(0, 3).map(c => <Badge key={c} variant="secondary" className="font-mono text-xs">{c}</Badge>)}
                          {(p.naics_codes?.length || 0) > 3 && <Badge variant="secondary">+{p.naics_codes!.length - 3}</Badge>}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </GlobalLayout>
  );
}
