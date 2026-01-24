import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface AgencyData {
  agency: string;
  value: number;
  count: number;
}

const COLORS = ['#22d3ee', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#ef4444', '#6366f1', '#14b8a6', '#f97316'];

export function AgencySpendingChart() {
  const [data, setData] = useState<AgencyData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: contracts } = await supabase
      .from('contracts')
      .select('awarding_agency, award_amount')
      .not('awarding_agency', 'is', null)
      .limit(5000);

    if (!contracts) {
      setLoading(false);
      return;
    }

    // Aggregate by agency
    const agencyMap = new Map<string, { value: number; count: number }>();
    let totalValue = 0;
    
    contracts.forEach(c => {
      const agency = c.awarding_agency;
      const existing = agencyMap.get(agency) || { value: 0, count: 0 };
      const amount = c.award_amount || 0;
      agencyMap.set(agency, {
        value: existing.value + amount,
        count: existing.count + 1
      });
      totalValue += amount;
    });

    const sorted = Array.from(agencyMap.entries())
      .map(([agency, data]) => ({ 
        agency: agency.length > 35 ? agency.slice(0, 35) + '...' : agency, 
        ...data 
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);

    setData(sorted);
    setTotal(totalValue);
    setLoading(false);
  }

  const formatValue = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
    return `$${(value / 1000).toFixed(0)}K`;
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Top Agencies by Contract Value</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Top Agencies by Spending</span>
          <Badge variant="outline" className="text-lg font-mono">
            {formatValue(total)} Total
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis 
              type="number" 
              tickFormatter={formatValue}
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
            />
            <YAxis 
              type="category" 
              dataKey="agency" 
              width={180}
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              formatter={(value: number, name: string) => [formatValue(value), 'Value']}
              labelFormatter={(label) => <span className="font-bold">{label}</span>}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
