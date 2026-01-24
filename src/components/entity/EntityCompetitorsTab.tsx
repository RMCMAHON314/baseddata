// Entity Competitors Tab - Side-by-side competitor comparison
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Users, TrendingUp, TrendingDown, Minus, Building2, DollarSign, Trophy, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Competitor {
  id: string;
  canonical_name: string;
  entity_type: string | null;
  state: string | null;
  total_contract_value: number | null;
  contract_count: number | null;
  opportunity_score: number | null;
  strength: number | null;
}

interface EntityCompetitorsTabProps {
  entityId: string;
  entityName: string;
}

export function EntityCompetitorsTab({ entityId, entityName }: EntityCompetitorsTabProps) {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityValue, setEntityValue] = useState(0);

  useEffect(() => {
    loadCompetitors();
  }, [entityId]);

  const loadCompetitors = async () => {
    setLoading(true);

    // Get entity's contract value
    const { data: entity } = await supabase
      .from('core_entities')
      .select('total_contract_value')
      .eq('id', entityId)
      .single();
    
    setEntityValue(entity?.total_contract_value || 0);

    // Get competitors from relationships
    const { data: relationships, error } = await supabase
      .from('core_relationships')
      .select(`
        id,
        confidence,
        to_entity:core_entities!to_entity_id(
          id, canonical_name, entity_type, state, 
          total_contract_value, contract_count, opportunity_score
        )
      `)
      .eq('from_entity_id', entityId)
      .eq('relationship_type', 'competes_with')
      .limit(10);

    if (!error && relationships) {
      const comps = (relationships as any[])
        .map(r => ({
          ...r.to_entity,
          strength: r.confidence,
        }))
        .filter(Boolean)
        .sort((a, b) => (b.total_contract_value || 0) - (a.total_contract_value || 0));
      
      setCompetitors(comps);
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

  const getComparisonIcon = (competitorValue: number) => {
    if (competitorValue > entityValue * 1.1) return <TrendingDown className="h-4 w-4 text-destructive" />;
    if (competitorValue < entityValue * 0.9) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  // Chart data
  const chartData = [
    { name: entityName.slice(0, 15), value: entityValue, isEntity: true },
    ...competitors.slice(0, 5).map(c => ({
      name: c.canonical_name.slice(0, 15),
      value: c.total_contract_value || 0,
      isEntity: false,
    }))
  ].sort((a, b) => b.value - a.value);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  if (competitors.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Competitors Identified</h3>
        <p className="text-muted-foreground">We haven't identified competitors for this entity yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contract Value Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                <YAxis type="category" dataKey="name" width={120} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.isEntity ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.3)'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Competitor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {competitors.map((competitor, index) => (
          <motion.div
            key={competitor.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link to={`/entity/${competitor.id}`}>
              <Card className="p-4 hover:border-primary/30 transition-all hover:shadow-lg cursor-pointer h-full">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{competitor.canonical_name}</h4>
                      {index === 0 && <Badge className="bg-amber-100 text-amber-700">Top Competitor</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {competitor.entity_type} • {competitor.state || 'Unknown'}
                    </p>
                  </div>
                  {getComparisonIcon(competitor.total_contract_value || 0)}
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Contract Value</p>
                    <p className="font-mono font-semibold text-primary">
                      {formatCurrency(competitor.total_contract_value)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Contracts</p>
                    <p className="font-semibold">{competitor.contract_count || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Opp. Score</p>
                    <p className="font-semibold">{competitor.opportunity_score || 'N/A'}</p>
                  </div>
                </div>

                {competitor.strength && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Competition Intensity</span>
                      <span>{Math.round(competitor.strength * 100)}%</span>
                    </div>
                    <Progress value={competitor.strength * 100} className="h-2" />
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
