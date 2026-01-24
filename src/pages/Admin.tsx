import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Users, Database, Activity, TrendingUp, AlertTriangle,
  Shield, Search, RefreshCw, Download, Settings,
  Zap, Server, Globe, Clock, CheckCircle, XCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';

interface AdminStats {
  totalUsers: number;
  totalEntities: number;
  totalFacts: number;
  totalRelationships: number;
  totalSearches: number;
  apiRequests: number;
  activeAlerts: number;
  healthySources: number;
  degradedSources: number;
}

interface RecentUser {
  id: string;
  full_name: string | null;
  subscription_tier: string | null;
  created_at: string;
  credits_balance: number | null;
}

interface ApiSource {
  id: string;
  name: string;
  health_status: string | null;
  last_health_check: string | null;
  avg_response_time_ms: number | null;
}

export default function Admin() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<RecentUser[]>([]);
  const [sources, setSources] = useState<ApiSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/');
      return;
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      navigate('/');
      return;
    }

    setIsAdmin(true);
    await loadAdminData();
  };

  const loadAdminData = async () => {
    setLoading(true);

    const [
      usersRes, entitiesRes, factsRes, relsRes, 
      searchesRes, apiRes, alertsRes, sourcesRes
    ] = await Promise.all([
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('core_entities').select('*', { count: 'exact', head: true }),
      supabase.from('core_facts').select('*', { count: 'exact', head: true }),
      supabase.from('core_relationships').select('*', { count: 'exact', head: true }),
      supabase.from('search_history').select('*', { count: 'exact', head: true }),
      supabase.from('api_usage').select('*', { count: 'exact', head: true }),
      supabase.from('user_alerts').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('api_sources').select('id, name, health_status, last_health_check, avg_response_time_ms').order('name')
    ]);

    const healthySources = sourcesRes.data?.filter(s => s.health_status === 'healthy').length || 0;
    const degradedSources = sourcesRes.data?.filter(s => s.health_status !== 'healthy').length || 0;

    setStats({
      totalUsers: usersRes.count || 0,
      totalEntities: entitiesRes.count || 0,
      totalFacts: factsRes.count || 0,
      totalRelationships: relsRes.count || 0,
      totalSearches: searchesRes.count || 0,
      apiRequests: apiRes.count || 0,
      activeAlerts: alertsRes.count || 0,
      healthySources,
      degradedSources
    });

    const { data: recentUsers } = await supabase
      .from('user_profiles')
      .select('id, full_name, subscription_tier, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentUsers) setUsers(recentUsers.map(u => ({
      ...u,
      credits_balance: 0 // Not in schema yet, default to 0
    })));
    if (sourcesRes.data) setSources(sourcesRes.data);

    setLoading(false);
  };

  const triggerHealthCheck = async () => {
    await supabase.functions.invoke('health-check');
    loadAdminData();
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Checking permissions...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/"><Logo /></Link>
            <Badge className="bg-red-500/20 text-red-400 border-red-500">Admin Panel</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={triggerHealthCheck}>
              <RefreshCw className="w-4 h-4 mr-2" /> Health Check
            </Button>
            <Link to="/health">
              <Button variant="outline" size="sm">
                <Activity className="w-4 h-4 mr-2" /> System Health
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Users />} label="Total Users" value={stats?.totalUsers || 0} color="text-blue-400" />
          <StatCard icon={<Database />} label="Entities" value={stats?.totalEntities || 0} color="text-primary" />
          <StatCard icon={<Zap />} label="Facts" value={stats?.totalFacts || 0} color="text-yellow-400" />
          <StatCard icon={<Globe />} label="Relationships" value={stats?.totalRelationships || 0} color="text-purple-400" />
          <StatCard icon={<Search />} label="Searches" value={stats?.totalSearches || 0} color="text-green-400" />
          <StatCard icon={<Server />} label="API Requests" value={stats?.apiRequests || 0} color="text-orange-400" />
          <StatCard icon={<CheckCircle />} label="Healthy Sources" value={stats?.healthySources || 0} color="text-green-400" />
          <StatCard icon={<AlertTriangle />} label="Degraded Sources" value={stats?.degradedSources || 0} color="text-red-400" />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="sources">Data Sources</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Recent Users
                  </CardTitle>
                  <Input 
                    placeholder="Search users..." 
                    className="w-64 bg-muted/50"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {users.filter(u => 
                    !searchQuery || 
                    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map(user => (
                    <div key={user.id} className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{user.full_name || 'Anonymous'}</p>
                          <p className="text-sm text-muted-foreground">
                            Joined {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className={
                          user.subscription_tier === 'enterprise' ? 'text-purple-400 border-purple-500' :
                          user.subscription_tier === 'professional' ? 'text-yellow-400 border-yellow-500' :
                          user.subscription_tier === 'starter' ? 'text-blue-400 border-blue-500' :
                          'text-muted-foreground'
                        }>
                          {user.subscription_tier || 'free'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {user.credits_balance || 0} credits
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sources">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-primary" />
                  Data Sources Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {sources.map(source => (
                    <div key={source.id} className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${
                          source.health_status === 'healthy' ? 'bg-green-400' :
                          source.health_status === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'
                        }`} />
                        <div>
                          <p className="font-medium">{source.name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {source.last_health_check 
                              ? new Date(source.last_health_check).toLocaleString() 
                              : 'Never checked'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className={
                          source.health_status === 'healthy' ? 'text-green-400 border-green-500' :
                          source.health_status === 'degraded' ? 'text-yellow-400 border-yellow-500' :
                          'text-red-400 border-red-500'
                        }>
                          {source.health_status || 'unknown'}
                        </Badge>
                        {source.avg_response_time_ms && (
                          <span className="text-sm text-muted-foreground">
                            {source.avg_response_time_ms}ms
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center py-12 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Activity log coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  System Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium">Auto Confirm Signups</p>
                    <p className="text-sm text-muted-foreground">Skip email verification for new users</p>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium">Flywheel Auto-Run</p>
                    <p className="text-sm text-muted-foreground">Automatic data expansion every hour</p>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium">Kraken Hunters</p>
                    <p className="text-sm text-muted-foreground">Aggressive source discovery</p>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400">Active</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { 
  icon: React.ReactNode; 
  label: string; 
  value: number; 
  color: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-muted-foreground text-sm">{label}</span>
          <span className={color}>{icon}</span>
        </div>
        <p className={`text-2xl font-bold ${color}`}>
          {value.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}
