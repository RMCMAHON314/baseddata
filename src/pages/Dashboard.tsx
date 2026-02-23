import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataFloodPanel } from '@/components/admin/DataFloodPanel';
import { supabase } from '@/integrations/supabase/client';
import { useLastRefresh, formatRefreshTime } from '@/hooks/useLastRefresh';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, Bell, Star, Target, TrendingUp, FileText,
  Plus, Eye, Clock, DollarSign, Users, Zap, Settings, Home
} from 'lucide-react';

interface DashboardData {
  profile: {
    full_name: string;
    company: string;
    subscription_tier: string;
    searches_this_month: number;
    searches_limit: number;
  } | null;
  saved_searches: number;
  watchlist_count: number;
  pipeline_count: number;
  pipeline_value: number;
  unread_notifications: number;
  recent_searches: Array<{ query: string; result_count: number; created_at: string }>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: lastRefreshTime } = useLastRefresh();
  const refreshLabel = formatRefreshTime(lastRefreshTime ?? null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }
      setUser(user);

      // Load dashboard data via RPC
      const { data: dashboard } = await supabase.rpc('get_user_dashboard', {
        p_user_id: user.id
      });
      setDashboardData(dashboard as unknown as DashboardData);

      // Load watchlist
      const { data: watchlistData } = await supabase
        .from('entity_watchlist')
        .select(`
          *,
          entity:core_entities(id, canonical_name, entity_type, opportunity_score)
        `)
        .eq('user_id', user.id)
        .order('added_at', { ascending: false })
        .limit(10);
      setWatchlist(watchlistData || []);

      // Load pipeline
      const { data: pipelineData } = await supabase
        .from('opportunity_pipeline')
        .select(`
          *,
          entity:core_entities(id, canonical_name)
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(10);
      setPipeline(pipelineData || []);

      // Load notifications
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(10);
      setNotifications(notifs || []);

    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Zap className="w-12 h-12 text-primary animate-pulse" />
      </div>
    );
  }

  const profile = dashboardData?.profile || {
    full_name: 'User',
    company: 'Based Data Intelligence',
    subscription_tier: 'free',
    searches_this_month: 0,
    searches_limit: 10
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {profile.full_name || 'User'}</h1>
            <p className="text-muted-foreground">
              {profile.company || 'Based Data Intelligence'}
              {refreshLabel && <span className="ml-3 text-xs">{refreshLabel}</span>}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className={`
              ${profile.subscription_tier === 'enterprise' ? 'border-purple-500 text-purple-400' :
                profile.subscription_tier === 'professional' ? 'border-blue-500 text-blue-400' :
                profile.subscription_tier === 'starter' ? 'border-green-500 text-green-400' :
                'border-muted-foreground text-muted-foreground'}
            `}>
              {profile.subscription_tier?.toUpperCase() || 'FREE'}
            </Badge>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full text-xs flex items-center justify-center text-destructive-foreground">
                  {notifications.length}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <Home className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Data Flood Admin Controls */}
        <DataFloodPanel />

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard
            icon={<Search />}
            label="Searches This Month"
            value={`${profile.searches_this_month || 0} / ${profile.searches_limit === -1 ? '∞' : profile.searches_limit}`}
            color="blue"
          />
          <StatCard
            icon={<Star />}
            label="Watchlist"
            value={dashboardData?.watchlist_count || 0}
            color="yellow"
          />
          <StatCard
            icon={<Target />}
            label="Pipeline Opps"
            value={dashboardData?.pipeline_count || 0}
            color="green"
          />
          <StatCard
            icon={<DollarSign />}
            label="Pipeline Value"
            value={`$${((dashboardData?.pipeline_value || 0) / 1000000).toFixed(1)}M`}
            color="emerald"
          />
          <StatCard
            icon={<Bell />}
            label="Unread Alerts"
            value={dashboardData?.unread_notifications || 0}
            color="red"
          />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="watchlist" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="searches">Saved Searches</TabsTrigger>
          </TabsList>

          <TabsContent value="watchlist">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Entity Watchlist</CardTitle>
                <Button size="sm" onClick={() => navigate('/')}>
                  <Plus className="w-4 h-4 mr-2" /> Add Entity
                </Button>
              </CardHeader>
              <CardContent>
                {watchlist.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No entities in your watchlist. Search for entities and add them here.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {watchlist.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${
                            item.priority === 'critical' ? 'bg-red-500' :
                            item.priority === 'high' ? 'bg-orange-500' :
                            item.priority === 'medium' ? 'bg-yellow-500' :
                            'bg-muted-foreground'
                          }`} />
                          <div>
                            <p className="font-medium">{item.entity?.canonical_name}</p>
                            <p className="text-sm text-muted-foreground">{item.entity?.entity_type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">
                            Score: {item.entity?.opportunity_score || 'N/A'}
                          </Badge>
                          <Badge className={`
                            ${item.status === 'won' ? 'bg-green-500' :
                              item.status === 'pursuing' ? 'bg-blue-500' :
                              item.status === 'engaged' ? 'bg-purple-500' :
                              'bg-muted-foreground'}
                          `}>
                            {item.status}
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pipeline">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Opportunity Pipeline</CardTitle>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" /> Add Opportunity
                </Button>
              </CardHeader>
              <CardContent>
                {pipeline.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No opportunities in your pipeline. Add entities to your watchlist and convert them to opportunities.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pipeline.map((opp) => (
                      <div key={opp.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{opp.title}</p>
                          <p className="text-sm text-muted-foreground">{opp.entity?.canonical_name}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-green-400 font-mono">
                            ${((opp.estimated_value || 0) / 1000).toFixed(0)}K
                          </span>
                          <Badge>{opp.probability}%</Badge>
                          <Badge variant="outline">{opp.stage}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Active Alerts</CardTitle>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" /> Create Alert
                </Button>
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No active alerts. Create alerts to get notified when things change.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notif) => (
                      <div key={notif.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border-l-4 border-primary">
                        <div>
                          <p className="font-medium">{notif.title}</p>
                          <p className="text-sm text-muted-foreground">{notif.message}</p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {new Date(notif.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="searches">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Saved Searches</CardTitle>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" /> Save Search
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  No saved searches yet. Run a search and save it to monitor automatically.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Recent Searches */}
        <Card className="bg-card border-border mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Searches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(dashboardData?.recent_searches || []).map((search, i) => (
                <Badge 
                  key={i} 
                  variant="outline" 
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => navigate(`/?q=${encodeURIComponent(search.query)}`)}
                >
                  {search.query} ({search.result_count} results)
                </Badge>
              ))}
              {(!dashboardData?.recent_searches || dashboardData.recent_searches.length === 0) && (
                <p className="text-muted-foreground">No recent searches</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactElement;
  label: string;
  value: string | number;
  color: 'blue' | 'yellow' | 'green' | 'emerald' | 'red';
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/30 text-blue-400',
    yellow: 'from-yellow-500/20 to-yellow-600/5 border-yellow-500/30 text-yellow-400',
    green: 'from-green-500/20 to-green-600/5 border-green-500/30 text-green-400',
    emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400',
    red: 'from-red-500/20 to-red-600/5 border-red-500/30 text-red-400',
  };

  return (
    <Card className={`bg-gradient-to-br ${colors[color]} border`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {React.cloneElement(icon, { className: 'w-4 h-4' })}
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold font-mono">{value}</p>
      </CardContent>
    </Card>
  );
}
