// Based Data v15.0 - Data Sources Manager
// Comprehensive API source management for 500+ government databases

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Logo } from '@/components/Logo';
import { supabase } from '@/integrations/supabase/client';
import { GOVERNMENT_API_SOURCES, getApiStats, getApiCategories, type GovernmentApiSource } from '@/lib/governmentApis';
import { formatCompactNumber } from '@/lib/formatters';
import {
  Server, Database, Globe, Zap, RefreshCw, Play, Pause,
  CheckCircle, XCircle, AlertTriangle, Clock, TrendingUp,
  Plus, Search, Filter, Settings, ExternalLink, ArrowLeft
} from 'lucide-react';

export default function DataSources() {
  const [sources, setSources] = useState(GOVERNMENT_API_SOURCES);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dbStats, setDbStats] = useState({
    activeSources: 0,
    totalRecords: 0,
    totalEntities: 0,
    recordsToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);

  const stats = getApiStats();
  const categories = getApiCategories();

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    
    const [sourcesRes, recordsRes, entitiesRes] = await Promise.all([
      supabase.from('api_sources').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('records').select('*', { count: 'exact', head: true }),
      supabase.from('core_entities').select('*', { count: 'exact', head: true })
    ]);

    setDbStats({
      activeSources: sourcesRes.count || 0,
      totalRecords: recordsRes.count || 0,
      totalEntities: entitiesRes.count || 0,
      recordsToday: 0 // Would need a date filter
    });
    
    setLoading(false);
  }

  async function activateSource(source: GovernmentApiSource) {
    setActivating(source.slug);
    
    // Insert into api_sources table
    await supabase.from('api_sources').upsert({
      slug: source.slug,
      name: source.name,
      categories: [source.category],
      priority: source.priority,
      status: 'active',
      health_status: 'unknown',
      base_url: source.baseUrl || ''
    });

    // Update local state
    setSources(prev => prev.map(s => 
      s.slug === source.slug ? { ...s, status: 'active' as const } : s
    ));
    
    setActivating(null);
    loadStats();
  }

  async function triggerFetch(slug: string) {
    await supabase.functions.invoke('kraken', {
      body: { mode: 'fetch', source: slug }
    });
  }

  const filteredSources = sources.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (s.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = 
      activeTab === 'all' || 
      (activeTab === 'active' && s.status === 'active') ||
      (activeTab === 'pending' && s.status === 'pending') ||
      (activeTab === 'federal' && s.category.includes('Federal') || s.category.includes('Healthcare') || s.category.includes('Defense')) ||
      (activeTab === 'state' && s.category.includes('State')) ||
      (activeTab === 'local' && s.category.includes('Local'));
    
    return matchesSearch && matchesTab;
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
            </Link>
            <Logo />
          </div>
          <Button className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
            <Plus className="w-4 h-4 mr-2" /> Add Custom Source
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold">Data Sources</h1>
          <p className="text-muted-foreground">Manage API connections to government databases</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard 
            icon={<Database className="w-4 h-4" />}
            label="Available APIs"
            value={stats.total}
            color="text-primary"
          />
          <StatCard 
            icon={<CheckCircle className="w-4 h-4" />}
            label="Active"
            value={stats.active}
            color="text-success"
          />
          <StatCard 
            icon={<Clock className="w-4 h-4" />}
            label="Pending"
            value={stats.pending}
            color="text-warning"
          />
          <StatCard 
            icon={<Globe className="w-4 h-4" />}
            label="Total Records"
            value={formatCompactNumber(dbStats.totalRecords)}
            color="text-accent"
          />
          <StatCard 
            icon={<TrendingUp className="w-4 h-4" />}
            label="Entities"
            value={formatCompactNumber(dbStats.totalEntities)}
            color="text-purple-400"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search APIs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All ({sources.length})</TabsTrigger>
              <TabsTrigger value="active">Active ({sources.filter(s => s.status === 'active').length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({sources.filter(s => s.status === 'pending').length})</TabsTrigger>
              <TabsTrigger value="federal">Federal</TabsTrigger>
              <TabsTrigger value="state">State</TabsTrigger>
              <TabsTrigger value="local">Local</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Source Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSources.map(source => (
            <SourceCard 
              key={source.slug}
              source={source}
              activating={activating === source.slug}
              onActivate={() => activateSource(source)}
              onFetch={() => triggerFetch(source.slug)}
            />
          ))}
        </div>

        {filteredSources.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Database className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No sources match your search criteria</p>
          </div>
        )}

        {/* Bulk Actions */}
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Activate All Pending Sources</h3>
                <p className="text-muted-foreground">
                  Enable {sources.filter(s => s.status === 'pending').length} additional APIs to maximize data coverage
                </p>
              </div>
              <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
                <Zap className="w-5 h-5 mr-2" /> 
                Activate All ({sources.filter(s => s.status === 'pending').length})
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number; 
  color: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className={`flex items-center gap-2 mb-1 ${color}`}>
          {icon}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function SourceCard({ source, activating, onActivate, onFetch }: {
  source: GovernmentApiSource;
  activating: boolean;
  onActivate: () => void;
  onFetch: () => void;
}) {
  const isActive = source.status === 'active';
  
  return (
    <Card className={`bg-card border-border hover:border-primary/50 transition-all ${
      isActive ? 'border-l-4 border-l-success' : ''
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isActive ? 'bg-success/10' : 'bg-muted'}`}>
              <Server className={`w-5 h-5 ${isActive ? 'text-success' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <h3 className="font-semibold">{source.name}</h3>
              <p className="text-xs text-muted-foreground">{source.category}</p>
            </div>
          </div>
          <Badge className={
            source.status === 'active' ? 'bg-success/10 text-success border-success/30' :
            source.status === 'pending' ? 'bg-warning/10 text-warning border-warning/30' :
            'bg-muted text-muted-foreground'
          }>
            {source.status}
          </Badge>
        </div>

        {source.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{source.description}</p>
        )}

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Priority:</span>
            <Progress value={source.priority} className="w-16 h-2" />
            <span className="text-xs font-mono">{source.priority}</span>
          </div>
          
          {isActive ? (
            <Button size="sm" variant="outline" onClick={onFetch}>
              <RefreshCw className="w-3 h-3 mr-1" /> Fetch
            </Button>
          ) : (
            <Button size="sm" onClick={onActivate} disabled={activating}>
              {activating ? (
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Play className="w-3 h-3 mr-1" />
              )}
              Activate
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
