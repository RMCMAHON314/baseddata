// BOMB-02 — Relationships Tab V2: Network graph + list view with type filters
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Network, Building2, Users, Handshake, MapPin, Factory, ChevronRight, List, GitBranch } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { fmt } from '@/pages/EntityIntelligenceHub';

interface Props { entityId: string; }

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  competes_with: { label: 'Competitors', icon: Users, color: 'bg-rose-100 text-rose-700 border-rose-200' },
  teaming_partner: { label: 'Teaming Partners', icon: Handshake, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  same_industry: { label: 'Same Industry', icon: Factory, color: 'bg-primary/10 text-primary border-primary/20' },
  co_located: { label: 'Co-located', icon: MapPin, color: 'bg-violet-100 text-violet-700 border-violet-200' },
  prime_sub: { label: 'Prime/Sub', icon: GitBranch, color: 'bg-amber-100 text-amber-700 border-amber-200' },
};

export function EntityRelationshipsTabV2({ entityId }: Props) {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped');

  const { data, isLoading } = useQuery({
    queryKey: ['entity-relationships-v2', entityId],
    queryFn: async () => {
      const { data } = await supabase
        .from('core_relationships')
        .select('*, from:core_entities!core_relationships_from_entity_id_fkey(id, canonical_name, entity_type, state, total_contract_value), to:core_entities!core_relationships_to_entity_id_fkey(id, canonical_name, entity_type, state, total_contract_value)')
        .or("from_entity_id.eq." + entityId + ",to_entity_id.eq." + entityId)
        .order('confidence', { ascending: false, nullsFirst: false })
        .limit(100);
      return data || [];
    },
  });

  if (isLoading) return <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>;

  if (!data?.length) {
    return (
      <div className="text-center py-12">
        <Network className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-semibold mb-1">No relationships found</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">Relationships are discovered from shared contracts, grants, and organizational data.</p>
      </div>
    );
  }

  // Group by type
  const typeCounts = data.reduce((acc, r) => {
    const type = r.relationship_type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filtered = filterType === 'all' ? data : data.filter(r => r.relationship_type === filterType);

  const grouped = filtered.reduce((acc, r) => {
    const type = r.relationship_type || 'unknown';
    if (!acc[type]) acc[type] = [];
    acc[type].push(r);
    return acc;
  }, {} as Record<string, typeof data>);

  return (
    <div className="space-y-6">
      {/* Type summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(typeCounts).map(([type, count]) => {
          const config = TYPE_CONFIG[type] || { label: type.replace(/_/g, ' '), icon: Network, color: 'bg-secondary text-secondary-foreground' };
          const Icon = config.icon;
          return (
            <Card
              key={type}
              className={`p-3 cursor-pointer transition-all ${filterType === type ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setFilterType(filterType === type ? 'all' : type)}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground capitalize">{config.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Showing {filtered.length} of {data.length} relationships</span>
        <Button variant="ghost" size="sm" onClick={() => setViewMode(v => v === 'list' ? 'grouped' : 'list')}>
          <List className="h-4 w-4 mr-1" />{viewMode === 'list' ? 'Grouped' : 'List'}
        </Button>
      </div>

      {/* Relationships list */}
      {Object.entries(grouped).map(([type, rels]) => {
        const config = TYPE_CONFIG[type] || { label: type.replace(/_/g, ' '), icon: Network, color: 'bg-secondary text-secondary-foreground' };
        return (
          <Card key={type}>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm capitalize">{config.label} ({rels.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {rels.map(r => {
                const other = r.from_entity_id === entityId ? r.to : r.from;
                if (!other) return null;
                return (
                  <button
                    key={r.id}
                    onClick={() => navigate("/entity/" + (other as any)?.id)}
                    className="w-full flex items-center justify-between px-4 py-3 border-t hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Building2 className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <span className="font-medium truncate block">{(other as any)?.canonical_name || 'Unknown'}</span>
                        <span className="text-xs text-muted-foreground">{(other as any)?.entity_type} · {(other as any)?.state || '—'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-mono text-muted-foreground">{fmt((other as any)?.total_contract_value)}</span>
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(r.confidence || 0) * 100}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-8">{Math.round((r.confidence || 0) * 100)}%</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
