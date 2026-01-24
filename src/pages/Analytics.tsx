import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { TrendingUp, Users, Search, Database, Zap, Target, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface ChartDataPoint {
  date: string;
  count: number;
}

interface CategoryDataPoint {
  name: string;
  value: number;
}

interface QueryDataPoint {
  query: string;
  count: number;
}

interface AnalyticsData {
  searchesByDay: ChartDataPoint[];
  entitiesByDay: ChartDataPoint[];
  factsByDay: ChartDataPoint[];
  categoryDist: CategoryDataPoint[];
  topQueries: QueryDataPoint[];
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [searches, entities, facts, categories, topQueries] = await Promise.all([
        supabase.from('search_history').select('created_at').gte('created_at', sevenDaysAgo),
        supabase.from('core_entities').select('created_at').gte('created_at', thirtyDaysAgo),
        supabase.from('core_facts').select('created_at').gte('created_at', thirtyDaysAgo),
        supabase.from('records').select('category'),
        supabase.from('search_history').select('query').order('created_at', { ascending: false }).limit(100)
      ]);

      setData({
        searchesByDay: groupByDay(searches.data || []),
        entitiesByDay: groupByDay(entities.data || []),
        factsByDay: groupByDay(facts.data || []),
        categoryDist: groupByCategory(categories.data || []),
        topQueries: getQueryFrequency(topQueries.data || []).slice(0, 10)
      });
    } catch (error) {
      console.error('Analytics error:', error);
    } finally {
      setLoading(false);
    }
  }

  function groupByDay(items: Array<{ created_at: string | null }>): ChartDataPoint[] {
    const grouped: Record<string, number> = {};
    items.forEach(item => {
      if (item.created_at) {
        const day = new Date(item.created_at).toLocaleDateString();
        grouped[day] = (grouped[day] || 0) + 1;
      }
    });
    return Object.entries(grouped).map(([date, count]) => ({ date, count }));
  }

  function groupByCategory(items: Array<{ category: string | null }>): CategoryDataPoint[] {
    const grouped: Record<string, number> = {};
    items.forEach(item => {
      const cat = item.category || 'Unknown';
      grouped[cat] = (grouped[cat] || 0) + 1;
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }

  function getQueryFrequency(items: Array<{ query: string | null }>): QueryDataPoint[] {
    const freq: Record<string, number> = {};
    items.forEach(item => {
      const q = item.query?.toLowerCase().trim();
      if (q) freq[q] = (freq[q] || 0) + 1;
    });
    return Object.entries(freq)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count);
  }

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', '#6366F1', '#EC4899', '#14B8A6'];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Zap className="w-12 h-12 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="w-8 h-8 text-green-500" />
              Analytics
            </h1>
            <p className="text-muted-foreground">Platform growth and usage metrics</p>
          </div>
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </Link>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Search Trends */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                Search Trends (7 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data?.searchesByDay || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Entity Growth */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-green-400" />
                Entity Growth (30 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data?.entitiesByDay || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#10B981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-400" />
                Category Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data?.categoryDist || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {(data?.categoryDist || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-4">
                {(data?.categoryDist || []).map((cat, i) => (
                  <Badge key={cat.name} style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                    {cat.name}: {cat.value}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Queries */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-yellow-400" />
                Top Queries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data?.topQueries || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="query" type="category" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} width={150} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Fact Growth */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              Fact Growth (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data?.factsByDay || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="count" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
