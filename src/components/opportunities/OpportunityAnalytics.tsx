import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Treemap, Cell, PieChart, Pie
} from 'recharts';
import { Bell, Plus, Trash2, BarChart3 } from 'lucide-react';

interface Opportunity {
  id: string;
  title: string | null;
  department: string | null;
  naics_code: string | null;
  set_aside: string | null;
  response_deadline: string | null;
  award_ceiling: number | null;
  pop_state: string | null;
}

interface OpportunityAnalyticsProps {
  opportunities: Opportunity[];
}

function fmt(v: number) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

const COLORS = [
  'hsl(217, 91%, 60%)', 'hsl(199, 89%, 48%)', 'hsl(258, 90%, 66%)',
  'hsl(158, 64%, 42%)', 'hsl(38, 92%, 50%)', 'hsl(350, 89%, 60%)',
  'hsl(270, 70%, 55%)', 'hsl(180, 60%, 45%)',
];

export function OpportunityAnalytics({ opportunities }: OpportunityAnalyticsProps) {
  const [alertNaics, setAlertNaics] = useState('');
  const [alertAgency, setAlertAgency] = useState('');

  // By agency
  const byAgency = useMemo(() => {
    const map = new Map<string, number>();
    opportunities.forEach(o => {
      const key = o.department || 'Unknown';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name: name.length > 25 ? name.slice(0, 25) + '…' : name, count }));
  }, [opportunities]);

  // By NAICS
  const byNaics = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    opportunities.forEach(o => {
      const key = o.naics_code || 'Other';
      const existing = map.get(key) || { count: 0, value: 0 };
      existing.count++;
      existing.value += o.award_ceiling || 0;
      map.set(key, existing);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 12)
      .map(([name, { count, value }]) => ({ name, size: count, value }));
  }, [opportunities]);

  // By set-aside avg value
  const bySetAside = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    opportunities.forEach(o => {
      const key = o.set_aside || 'None';
      const existing = map.get(key) || { total: 0, count: 0 };
      existing.total += o.award_ceiling || 0;
      existing.count++;
      map.set(key, existing);
    });
    return Array.from(map.entries())
      .filter(([_, v]) => v.count >= 2)
      .map(([name, { total, count }]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, avg: Math.round(total / count) }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 8);
  }, [opportunities]);

  // Deadline calendar — opportunities per week
  const weeklyDeadlines = useMemo(() => {
    const weeks = new Map<string, number>();
    opportunities.forEach(o => {
      if (!o.response_deadline) return;
      const d = new Date(o.response_deadline);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split('T')[0];
      weeks.set(key, (weeks.get(key) || 0) + 1);
    });
    return Array.from(weeks.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(0, 12)
      .map(([week, count]) => ({
        week: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count,
      }));
  }, [opportunities]);

  const handleCreateAlert = async (type: 'naics' | 'agency') => {
    const value = type === 'naics' ? alertNaics : alertAgency;
    if (!value.trim()) { toast.error('Enter a value'); return; }
    try {
      await supabase.functions.invoke('alert-engine', {
        body: {
          action: 'create',
          alert: {
            type: 'opportunity',
            filter_type: type,
            filter_value: value.trim(),
            channel: 'in_app',
          }
        }
      });
      toast.success(`Alert created for ${type}: ${value}`);
      if (type === 'naics') setAlertNaics(''); else setAlertAgency('');
    } catch {
      toast.error('Failed to create alert');
    }
  };

  return (
    <div className="space-y-6">
      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By Agency */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4" /> Opportunities by Agency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byAgency} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Deadline Calendar */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Response Deadline Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weeklyDeadlines}>
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* NAICS Distribution */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">By NAICS Code</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {byNaics.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="font-mono text-xs text-foreground">{item.name}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${(item.size / Math.max(...byNaics.map(n => n.size))) * 100}%`,
                      backgroundColor: COLORS[i % COLORS.length],
                    }} />
                  </div>
                  <span className="text-xs text-muted-foreground">{item.size}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Average Value by Set-Aside */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Avg Value by Set-Aside</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={bySetAside}>
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => fmt(v)} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="avg" fill="hsl(258, 90%, 66%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alert Configuration */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Bell className="w-4 h-4" /> Alert Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Get notified when new opportunities match your criteria.</p>
          <div className="flex gap-2">
            <Input value={alertNaics} onChange={e => setAlertNaics(e.target.value)}
              placeholder="NAICS code (e.g., 541512)" className="flex-1 h-9 text-sm" />
            <Button size="sm" variant="outline" onClick={() => handleCreateAlert('naics')} className="gap-1">
              <Plus className="w-3 h-3" /> Alert
            </Button>
          </div>
          <div className="flex gap-2">
            <Input value={alertAgency} onChange={e => setAlertAgency(e.target.value)}
              placeholder="Agency name (e.g., Department of Defense)" className="flex-1 h-9 text-sm" />
            <Button size="sm" variant="outline" onClick={() => handleCreateAlert('agency')} className="gap-1">
              <Plus className="w-3 h-3" /> Alert
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
