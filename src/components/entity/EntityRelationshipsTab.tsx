// Entity Relationships Tab - Network visualization
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Network, Filter, Building2, ArrowRight, Users, Handshake, MapPin, Factory } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface Relationship {
  id: string;
  relationship_type: string;
  confidence: number | null;
  to_entity: {
    id: string;
    canonical_name: string;
    entity_type: string | null;
    state: string | null;
    total_contract_value: number | null;
  };
}

interface EntityRelationshipsTabProps {
  entityId: string;
}

const RELATIONSHIP_TYPES = [
  { value: 'all', label: 'All Types', icon: Network },
  { value: 'competes_with', label: 'Competitors', icon: Users },
  { value: 'teaming_partner', label: 'Teaming Partners', icon: Handshake },
  { value: 'same_industry', label: 'Same Industry', icon: Factory },
  { value: 'co_located', label: 'Co-located', icon: MapPin },
];

const RELATIONSHIP_COLORS: Record<string, string> = {
  competes_with: 'bg-rose-100 text-rose-700 border-rose-200',
  teaming_partner: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  same_industry: 'bg-blue-100 text-blue-700 border-blue-200',
  co_located: 'bg-purple-100 text-purple-700 border-purple-200',
  default: 'bg-secondary text-secondary-foreground border-border',
};

export function EntityRelationshipsTab({ entityId }: EntityRelationshipsTabProps) {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadRelationships();
  }, [entityId]);

  const loadRelationships = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('core_relationships')
      .select(`
        id,
        relationship_type,
        confidence,
        to_entity:core_entities!to_entity_id(
          id, canonical_name, entity_type, state, total_contract_value
        )
      `)
      .eq('from_entity_id', entityId)
      .limit(50);

    if (!error && data) {
      setRelationships((data as any[]).filter(r => r.to_entity) as Relationship[]);
    }
    setLoading(false);
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '$0';
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const filteredRelationships = filterType === 'all' 
    ? relationships 
    : relationships.filter(r => r.relationship_type === filterType);

  // Group by type for summary
  const typeCounts = relationships.reduce((acc, r) => {
    acc[r.relationship_type] = (acc[r.relationship_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  if (relationships.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Network className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Relationships Found</h3>
        <p className="text-muted-foreground">We haven't mapped relationships for this entity yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Type Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {RELATIONSHIP_TYPES.slice(1).map(type => {
          const count = typeCounts[type.value] || 0;
          const Icon = type.icon;
          return (
            <Card 
              key={type.value} 
              className={`p-4 cursor-pointer transition-all ${filterType === type.value ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setFilterType(filterType === type.value ? 'all' : type.value)}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{type.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            {RELATIONSHIP_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          Showing {filteredRelationships.length} of {relationships.length} relationships
        </span>
      </div>

      {/* Relationships Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRelationships.map((rel, index) => (
          <motion.div
            key={rel.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
          >
            <Link to={`/entity/${rel.to_entity.id}`}>
              <Card className="p-4 hover:border-primary/30 transition-all hover:shadow-lg cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{rel.to_entity.canonical_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {rel.to_entity.entity_type} • {rel.to_entity.state || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex items-center justify-between mt-4">
                  <Badge 
                    variant="outline" 
                    className={RELATIONSHIP_COLORS[rel.relationship_type] || RELATIONSHIP_COLORS.default}
                  >
                    {rel.relationship_type.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-sm font-mono text-muted-foreground">
                    {formatCurrency(rel.to_entity.total_contract_value)}
                  </span>
                </div>

                {rel.confidence && (
                  <div className="mt-3">
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${rel.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
