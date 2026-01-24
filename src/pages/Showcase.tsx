import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Search, Building2, FileText, Award, Briefcase, TrendingUp,
  Zap, Globe, Database, GitBranch, Sparkles, ArrowRight,
  Play, ChevronRight, Star, Shield, Lightbulb, Waves
} from 'lucide-react';

// Animated counter hook with easing
function useAnimatedCounter(target: number, duration: number = 2000) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) return;
    startTimeRef.current = null;
    
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      countRef.current = Math.floor(easeOutQuart * target);
      setCount(countRef.current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [target, duration]);

  return count;
}

// Live stat component with animation
function LiveStat({ value, label, icon: Icon, colorClass }: {
  value: number;
  label: string;
  icon: React.ElementType;
  colorClass: string;
}) {
  const animatedValue = useAnimatedCounter(value);
  
  const formatValue = (n: number) => {
    if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return n.toLocaleString();
  };

  return (
    <div className="text-center group">
      <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${colorClass} 
                      flex items-center justify-center group-hover:scale-110 transition-transform duration-300
                      border border-white/10`}>
        <Icon className="w-8 h-8 text-white" />
      </div>
      <p className={`text-4xl md:text-5xl font-black font-mono tracking-tight text-white`}>
        {formatValue(animatedValue)}
      </p>
      <p className="text-muted-foreground mt-2 text-sm font-medium">{label}</p>
    </div>
  );
}

// Floating particle background
function ParticleBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-primary/30 rounded-full animate-pulse"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`
          }}
        />
      ))}
    </div>
  );
}

// Recent activity ticker
function ActivityTicker({ items }: { items: { type: string; text: string }[] }) {
  if (items.length === 0) return null;
  
  return (
    <div className="overflow-hidden">
      <div className="flex animate-scroll gap-6">
        {[...items, ...items].map((item, i) => (
          <div key={i} className="flex items-center gap-2 px-4 py-2 bg-card/80 rounded-full border border-border whitespace-nowrap">
            {item.type === 'contract' && <FileText className="w-4 h-4 text-green-400" />}
            {item.type === 'entity' && <Building2 className="w-4 h-4 text-primary" />}
            {item.type === 'insight' && <Lightbulb className="w-4 h-4 text-yellow-400" />}
            {item.type === 'relationship' && <GitBranch className="w-4 h-4 text-purple-400" />}
            <span className="text-sm text-muted-foreground">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Showcase() {
  const [stats, setStats] = useState({
    entities: 0,
    contracts: 0,
    grants: 0,
    opportunities: 0,
    relationships: 0,
    totalValue: 0,
    states: 0,
    agencies: 0
  });
  const [recentActivity, setRecentActivity] = useState<{ type: string; text: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [topEntities, setTopEntities] = useState<any[]>([]);
  const [recentInsights, setRecentInsights] = useState<any[]>([]);

  useEffect(() => {
    loadShowcaseData();
    
    // Real-time updates
    const channel = supabase
      .channel('showcase')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contracts' }, loadShowcaseData)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'core_entities' }, loadShowcaseData)
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, []);

  async function loadShowcaseData() {
    try {
      // Load stats
      const [entities, contracts, grants, opps, rels, value, states, agencies] = await Promise.all([
        supabase.from('core_entities').select('*', { count: 'exact', head: true }).eq('is_canonical', true),
        supabase.from('contracts').select('*', { count: 'exact', head: true }),
        supabase.from('grants').select('*', { count: 'exact', head: true }),
        supabase.from('opportunities').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('core_relationships').select('*', { count: 'exact', head: true }),
        supabase.from('contracts').select('award_amount').limit(1000),
        supabase.from('core_entities').select('state').not('state', 'is', null).limit(1000),
        supabase.from('contracts').select('awarding_agency').not('awarding_agency', 'is', null).limit(1000)
      ]);

      const totalValue = (value.data || []).reduce((s, c) => s + (c.award_amount || 0), 0);
      const uniqueStates = new Set((states.data || []).map(e => e.state)).size;
      const uniqueAgencies = new Set((agencies.data || []).map(c => c.awarding_agency)).size;

      setStats({
        entities: entities.count || 0,
        contracts: contracts.count || 0,
        grants: grants.count || 0,
        opportunities: opps.count || 0,
        relationships: rels.count || 0,
        totalValue,
        states: uniqueStates,
        agencies: uniqueAgencies
      });

      // Load top entities
      const { data: top } = await supabase
        .from('core_entities')
        .select('id, canonical_name, total_contract_value, contract_count, state, opportunity_score')
        .eq('is_canonical', true)
        .not('total_contract_value', 'is', null)
        .order('total_contract_value', { ascending: false })
        .limit(6);
      setTopEntities(top || []);

      // Load recent insights
      const { data: insights } = await supabase
        .from('insights')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentInsights(insights || []);

      // Build activity ticker
      const activities: { type: string; text: string }[] = [
        { type: 'contract', text: `$${(totalValue / 1e9).toFixed(1)}B in contracts indexed` },
        { type: 'entity', text: `${(entities.count || 0).toLocaleString()} organizations tracked` },
        { type: 'relationship', text: `${(rels.count || 0).toLocaleString()} relationships discovered` },
        { type: 'contract', text: `${uniqueAgencies} federal agencies covered` },
        { type: 'entity', text: `${uniqueStates} states represented` },
      ];
      setRecentActivity(activities);
    } catch (error) {
      console.error('Error loading showcase data:', error);
    }
  }

  const formatCurrency = (n: number) => {
    if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    return `$${n.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col">
        <ParticleBackground />
        
        {/* Gradient orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/10 rounded-full blur-3xl" />

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center">
              <Waves className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
              BASED DATA
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/semantx">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">Search</Button>
            </Link>
            <Link to="/ocean">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">Ocean</Button>
            </Link>
            <Link to="/graph">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">Graph</Button>
            </Link>
            <Link to="/analytics">
              <Button className="bg-gradient-to-r from-primary to-cyan-600 hover:from-primary/90 hover:to-cyan-700">
                Get Started
              </Button>
            </Link>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
          <Badge className="mb-6 px-4 py-2 bg-primary/20 text-primary border-primary/30">
            <Sparkles className="w-4 h-4 mr-2" />
            The Most Comprehensive Government Data Platform
          </Badge>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-foreground via-muted-foreground to-foreground bg-clip-text text-transparent">
              Intelligence at
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary via-cyan-400 to-teal-400 bg-clip-text text-transparent">
              Your Fingertips
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mb-8">
            Real-time access to federal contracts, grants, opportunities, and entity intelligence.
            Powered by AI. Updated continuously. Always accurate.
          </p>

          {/* Search Bar */}
          <div className="w-full max-w-2xl mb-12">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary via-cyan-500 to-teal-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500" />
              <div className="relative flex items-center bg-card rounded-xl border border-border overflow-hidden">
                <Search className="w-6 h-6 text-muted-foreground ml-4" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search entities, contracts, opportunities..."
                  className="flex-1 bg-transparent border-none text-lg py-6 px-4 focus:ring-0 focus-visible:ring-0"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery) {
                      window.location.href = `/semantx?q=${encodeURIComponent(searchQuery)}`;
                    }
                  }}
                />
                <Link to={searchQuery ? `/semantx?q=${encodeURIComponent(searchQuery)}` : '/semantx'}>
                  <Button className="m-2 bg-gradient-to-r from-primary to-cyan-600">
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Quick searches */}
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {['IT contractors Maryland', 'Healthcare Virginia', 'DoD cybersecurity', 'Small business', 'Construction DC'].map(q => (
                <Badge 
                  key={q} 
                  variant="outline" 
                  className="cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={() => window.location.href = `/semantx?q=${encodeURIComponent(q)}`}
                >
                  {q}
                </Badge>
              ))}
            </div>
          </div>

          {/* Quick Stats Preview */}
          <div className="flex items-center gap-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live Data
            </span>
            <span>{stats.entities.toLocaleString()} Entities</span>
            <span>{stats.contracts.toLocaleString()} Contracts</span>
            <span>{formatCurrency(stats.totalValue)} Indexed</span>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronRight className="w-8 h-8 text-muted-foreground rotate-90" />
        </div>
      </section>

      {/* Live Stats Section */}
      <section className="relative py-24 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              <span className="bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
                Live Intelligence
              </span>
            </h2>
            <p className="text-muted-foreground text-lg">Updated continuously from 50+ government data sources</p>
          </div>

          {/* Big Value Display */}
          <div className="text-center mb-16">
            <p className="text-muted-foreground text-sm uppercase tracking-wider mb-2">Total Contract Value Indexed</p>
            <p className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 font-mono">
              {formatCurrency(stats.totalValue)}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
            <LiveStat value={stats.entities} label="Entities" icon={Building2} colorClass="from-blue-500/20 to-blue-600/30" />
            <LiveStat value={stats.contracts} label="Contracts" icon={FileText} colorClass="from-green-500/20 to-green-600/30" />
            <LiveStat value={stats.grants} label="Grants" icon={Award} colorClass="from-purple-500/20 to-purple-600/30" />
            <LiveStat value={stats.opportunities} label="Opportunities" icon={Briefcase} colorClass="from-orange-500/20 to-orange-600/30" />
            <LiveStat value={stats.relationships} label="Relationships" icon={GitBranch} colorClass="from-pink-500/20 to-pink-600/30" />
            <LiveStat value={stats.agencies} label="Agencies" icon={Shield} colorClass="from-cyan-500/20 to-cyan-600/30" />
          </div>
        </div>
      </section>

      {/* Activity Ticker */}
      {recentActivity.length > 0 && (
        <section className="py-8 border-y border-border bg-card/50">
          <ActivityTicker items={recentActivity} />
        </section>
      )}

      {/* Top Entities Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-black mb-2">Top Contractors</h2>
              <p className="text-muted-foreground">Highest contract value entities in our database</p>
            </div>
            <Link to="/explore">
              <Button variant="outline" className="group">
                View All
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topEntities.map((entity, i) => (
              <Link key={entity.id} to={`/entity/${entity.id}`}>
                <Card className="bg-card border-border hover:border-primary/50 transition-all duration-300 group cursor-pointer overflow-hidden">
                  <CardContent className="p-6 relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${
                          i === 0 ? 'from-yellow-500/20 to-amber-500/20' :
                          i === 1 ? 'from-gray-400/20 to-gray-500/20' :
                          i === 2 ? 'from-orange-600/20 to-orange-700/20' :
                          'from-primary/20 to-primary/30'
                        } flex items-center justify-center`}>
                          {i < 3 ? (
                            <Star className={`w-5 h-5 ${
                              i === 0 ? 'text-yellow-400' :
                              i === 1 ? 'text-gray-400' :
                              'text-orange-500'
                            }`} />
                          ) : (
                            <Building2 className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">#{i + 1}</Badge>
                      </div>
                      {entity.opportunity_score && (
                        <Badge className={`${
                          entity.opportunity_score >= 80 ? 'bg-green-500/20 text-green-400' :
                          entity.opportunity_score >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          Score: {entity.opportunity_score}
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-1">
                      {entity.canonical_name}
                    </h3>
                    
                    <p className="text-3xl font-black text-green-400 font-mono mb-2">
                      {formatCurrency(entity.total_contract_value)}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{entity.contract_count} contracts</span>
                      {entity.state && <Badge variant="outline">{entity.state}</Badge>}
                    </div>

                    {/* Hover effect bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-cyan-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Insights Section */}
      {recentInsights.length > 0 && (
        <section className="py-24 px-6 bg-gradient-to-b from-transparent via-purple-900/10 to-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h2 className="text-3xl md:text-4xl font-black mb-2">Latest Insights</h2>
                <p className="text-muted-foreground">AI-generated intelligence from the data</p>
              </div>
              <Link to="/ocean">
                <Button variant="outline" className="group">
                  View All
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>

            <div className="space-y-4">
              {recentInsights.map((insight) => (
                <Card key={insight.id} className={`bg-card border ${
                  insight.severity === 'critical' ? 'border-destructive/30' :
                  insight.severity === 'high' ? 'border-orange-500/30' :
                  insight.severity === 'medium' ? 'border-yellow-500/30' :
                  'border-border'
                } hover:border-purple-500/50 transition-colors`}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        insight.severity === 'critical' ? 'bg-destructive/20' :
                        insight.severity === 'high' ? 'bg-orange-500/20' :
                        insight.severity === 'medium' ? 'bg-yellow-500/20' :
                        'bg-primary/20'
                      }`}>
                        <Lightbulb className={`w-5 h-5 ${
                          insight.severity === 'critical' ? 'text-destructive' :
                          insight.severity === 'high' ? 'text-orange-400' :
                          insight.severity === 'medium' ? 'text-yellow-400' :
                          'text-primary'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold">{insight.title}</h3>
                          <Badge variant="outline" className="text-xs">{insight.insight_type}</Badge>
                        </div>
                        <p className="text-muted-foreground">{insight.description}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(insight.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Powered by Intelligence
              </span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Built on a foundation of real government data, enhanced with AI-driven insights
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Database,
                title: 'Unified Data',
                description: 'USASpending, SAM.gov, NIH, NSF, CMS, and 50+ more sources unified into one searchable platform.',
                colorClass: 'from-blue-500/20 to-blue-600/20'
              },
              {
                icon: GitBranch,
                title: 'Relationship Graph',
                description: 'Automatically discover competitors, partners, and industry connections between entities.',
                colorClass: 'from-purple-500/20 to-purple-600/20'
              },
              {
                icon: Zap,
                title: 'Real-time Updates',
                description: 'Continuous data ingestion keeps you up-to-date with the latest contracts and opportunities.',
                colorClass: 'from-yellow-500/20 to-yellow-600/20'
              },
              {
                icon: Lightbulb,
                title: 'AI Insights',
                description: 'Anomaly detection, trend analysis, and predictive intelligence powered by machine learning.',
                colorClass: 'from-orange-500/20 to-orange-600/20'
              },
              {
                icon: Search,
                title: 'Semantic Search',
                description: "Natural language search that understands what you're looking for, not just keywords.",
                colorClass: 'from-cyan-500/20 to-cyan-600/20'
              },
              {
                icon: Shield,
                title: 'Verified Data',
                description: 'Smart entity resolution ensures accurate, deduplicated records you can trust.',
                colorClass: 'from-green-500/20 to-green-600/20'
              }
            ].map((feature) => (
              <Card key={feature.title} className="bg-card border-border group hover:border-muted transition-colors">
                <CardContent className="p-8">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.colorClass} flex items-center justify-center mb-6 
                                  group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-7 h-7 text-foreground" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-purple-500/20 to-cyan-500/20 rounded-3xl blur-xl" />
            <Card className="relative bg-gradient-to-br from-card to-muted border-border">
              <CardContent className="p-12">
                <h2 className="text-4xl md:text-5xl font-black mb-6">
                  Ready to dive in?
                </h2>
                <p className="text-xl text-muted-foreground mb-8">
                  Start exploring the most comprehensive government data platform today.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link to="/semantx">
                    <Button size="lg" className="bg-gradient-to-r from-primary to-cyan-600 hover:from-primary/90 hover:to-cyan-700 text-lg px-8">
                      <Search className="w-5 h-5 mr-2" />
                      Start Searching
                    </Button>
                  </Link>
                  <Link to="/ocean">
                    <Button size="lg" variant="outline" className="text-lg px-8">
                      <Play className="w-5 h-5 mr-2" />
                      View Dashboard
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center">
              <Waves className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-muted-foreground">Based Data</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>{stats.entities.toLocaleString()} entities</span>
            <span>•</span>
            <span>{stats.contracts.toLocaleString()} contracts</span>
            <span>•</span>
            <span>{stats.states} states</span>
            <span>•</span>
            <span>Updated in real-time</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 Based Data. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Add custom styles for animations */}
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
