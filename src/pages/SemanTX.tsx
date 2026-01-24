import React, { useState, useEffect } from 'react';
import { SemanTXSearch } from '@/components/semantx/SemanTXSearch';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, FileText, Briefcase, Award, Database, TrendingUp, Zap, RefreshCw, Sparkles } from 'lucide-react';

interface Stats {
  entities: number;
  contracts: number;
  grants: number;
  opportunities: number;
  facts: number;
  relationships: number;
  totalValue: number;
}

export default function SemanTXPage() {
  const [stats, setStats] = useState<Stats>({ 
    entities: 0, contracts: 0, grants: 0, opportunities: 0, facts: 0, relationships: 0, totalValue: 0 
  });
  const [loading, setLoading] = useState(true);
  const [raging, setRaging] = useState(false);

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    setLoading(true);
    const [e, c, g, o, f, r, v] = await Promise.all([
      supabase.from('core_entities').select('*', { count: 'exact', head: true }),
      supabase.from('contracts').select('*', { count: 'exact', head: true }),
      supabase.from('grants').select('*', { count: 'exact', head: true }),
      supabase.from('opportunities').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('core_facts').select('*', { count: 'exact', head: true }),
      supabase.from('core_relationships').select('*', { count: 'exact', head: true }),
      supabase.from('contracts').select('award_amount').limit(1000)
    ]);
    const totalValue = (v.data || []).reduce((s, x) => s + (x.award_amount || 0), 0);
    setStats({ 
      entities: e.count || 0, 
      contracts: c.count || 0, 
      grants: g.count || 0, 
      opportunities: o.count || 0, 
      facts: f.count || 0, 
      relationships: r.count || 0, 
      totalValue 
    });
    setLoading(false);
  }

  async function invokeRage() {
    setRaging(true);
    try {
      await supabase.functions.invoke('kraken-rage');
      setTimeout(loadStats, 2000);
    } catch (e) {
      console.error('Rage failed:', e);
    }
    setRaging(false);
  }

  const fmt = (n: number) => n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(1)}K` : n.toLocaleString();
  const fmtC = (n: number) => n >= 1e12 ? `$${(n/1e12).toFixed(2)}T` : n >= 1e9 ? `$${(n/1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : `$${n.toLocaleString()}`;

  const statCards = [
    { label: 'Entities', value: stats.entities, icon: Building2, color: 'text-blue-400' },
    { label: 'Contracts', value: stats.contracts, icon: FileText, color: 'text-green-400' },
    { label: 'Grants', value: stats.grants, icon: Award, color: 'text-purple-400' },
    { label: 'Opportunities', value: stats.opportunities, icon: Briefcase, color: 'text-orange-400' },
    { label: 'Facts', value: stats.facts, icon: Database, color: 'text-cyan-400' },
    { label: 'Relationships', value: stats.relationships, icon: TrendingUp, color: 'text-pink-400' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="bg-gradient-to-b from-purple-900/30 to-transparent py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-10 h-10 text-purple-400" />
            <h1 className="text-5xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              SEMANTX
            </h1>
          </div>
          <p className="text-center text-xl text-muted-foreground mb-8">The Ultimate Semantic Search Layer</p>
          <SemanTXSearch />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Data Status</h2>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={loadStats} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={invokeRage} disabled={raging} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              {raging ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Raging...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  🦑 Invoke Kraken Rage
                </>
              )}
            </Button>
          </div>
        </div>

        <Card className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 border-green-500/30 mb-6">
          <CardContent className="p-6 text-center">
            <p className="text-green-400 text-sm mb-2">Total Contract Value Indexed</p>
            <p className="text-5xl font-black text-green-400 font-mono">{fmtC(stats.totalValue)}</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((s) => (
            <Card key={s.label} className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <s.icon className={`w-6 h-6 mx-auto mb-2 ${s.color}`} />
                <p className="text-2xl font-bold font-mono">{fmt(s.value)}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
