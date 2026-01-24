// Entity Grants Tab - Grant portfolio display
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Download, PieChart, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface Grant {
  id: string;
  award_amount: number | null;
  award_date: string | null;
  awarding_agency: string | null;
  description: string | null;
  cfda_number: string | null;
  cfda_title: string | null;
}

interface EntityGrantsTabProps {
  entityId: string;
}

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899'];

export function EntityGrantsTab({ entityId }: EntityGrantsTabProps) {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadGrants();
  }, [entityId]);

  const loadGrants = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('grants')
      .select('*')
      .eq('recipient_entity_id', entityId)
      .order('award_date', { ascending: false })
      .limit(100);

    if (!error && data) {
      setGrants(data);
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const filteredGrants = grants.filter(g => 
    !searchQuery || 
    g.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.awarding_agency?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalValue = filteredGrants.reduce((sum, g) => sum + (g.award_amount || 0), 0);

  // Agency breakdown for chart
  const agencyBreakdown = grants.reduce((acc, g) => {
    const agency = g.awarding_agency || 'Unknown';
    acc[agency] = (acc[agency] || 0) + (g.award_amount || 0);
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(agencyBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([name, value]) => ({ name, value }));

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  if (grants.length === 0) {
    return (
      <Card className="p-12 text-center">
        <PieChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Grants Found</h3>
        <p className="text-muted-foreground">This entity hasn't received any grants in our database.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Funding by Agency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name.slice(0, 15)}... (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)} 
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Grant Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-secondary/50">
              <p className="text-sm text-muted-foreground">Total Grant Value</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalValue)}</p>
            </div>
            <div className="p-4 rounded-xl bg-secondary/50">
              <p className="text-sm text-muted-foreground">Grant Count</p>
              <p className="text-2xl font-bold">{grants.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-secondary/50">
              <p className="text-sm text-muted-foreground">Avg Grant Size</p>
              <p className="text-2xl font-bold">{formatCurrency(totalValue / grants.length)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & List */}
      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search grants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Grants List */}
      <div className="space-y-3">
        {filteredGrants.map((grant, index) => (
          <motion.div
            key={grant.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
          >
            <Card className="p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm text-muted-foreground">{grant.award_id || '-'}</span>
                    <Badge variant="secondary">{grant.awarding_agency || 'Unknown'}</Badge>
                  </div>
                  <p className="font-medium line-clamp-2 mb-2">{grant.description || grant.cfda_title || 'No description'}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{formatDate(grant.award_date)}</span>
                    {grant.cfda_number && <span className="font-mono">CFDA: {grant.cfda_number}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold font-mono text-primary">{formatCurrency(grant.award_amount)}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
