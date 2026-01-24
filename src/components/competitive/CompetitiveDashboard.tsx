// BASED DATA - Competitive Intelligence Dashboard
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell
} from 'recharts';
import { Link } from 'react-router-dom';
import { Swords, TrendingUp, TrendingDown, Minus, Target, Building2, Shield } from 'lucide-react';
import { useCompetitiveIntelligence } from '@/hooks/useCompetitiveIntelligence';

interface CompetitiveDashboardProps {
  entityId: string;
  entityName: string;
}

export function CompetitiveDashboard({ entityId, entityName }: CompetitiveDashboardProps) {
  const { competitors, headToHead, agencyPerformance, loading, error } = useCompetitiveIntelligence(entityId);

  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value}`;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Failed to load competitive data: {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Head-to-Head Matchups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5" />
            Head-to-Head Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {headToHead.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No head-to-head competition data available
            </p>
          ) : (
            <div className="grid gap-4">
              {headToHead.slice(0, 5).map((h2h, idx) => {
                const yourRate = h2h.totalOpportunities > 0 ? (h2h.yourWins / (h2h.yourWins + h2h.theirWins)) * 100 : 50;
                return (
                  <motion.div
                    key={h2h.competitorId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-secondary/20 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Link 
                        to={`/entity/${h2h.competitorId}`}
                        className="font-semibold hover:text-primary transition-colors"
                      >
                        vs {h2h.competitorName}
                      </Link>
                      <Badge variant={yourRate > 50 ? 'default' : yourRate < 50 ? 'destructive' : 'secondary'}>
                        {h2h.yourWins}W - {h2h.theirWins}L
                      </Badge>
                    </div>
                    <Progress value={yourRate} className="h-3" />
                    <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                      <span>{entityName}: {h2h.yourWins} wins</span>
                      <span>{h2h.competitorName}: {h2h.theirWins} wins</span>
                    </div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {h2h.sharedAgencies.slice(0, 3).map(agency => (
                        <Badge key={agency} variant="outline" className="text-xs">
                          {agency.split(' ').slice(0, 2).join(' ')}
                        </Badge>
                      ))}
                      {h2h.sharedAgencies.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{h2h.sharedAgencies.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Competitor Profiles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Competitor Profiles
          </CardTitle>
        </CardHeader>
        <CardContent>
          {competitors.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No competitor data available
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {competitors.slice(0, 6).map((comp, idx) => (
                <motion.div
                  key={comp.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-secondary/20 rounded-lg p-4 border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <Link 
                      to={`/entity/${comp.id}`}
                      className="font-semibold hover:text-primary transition-colors"
                    >
                      {comp.name}
                    </Link>
                    {getTrendIcon(comp.recentTrend)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <div className="text-sm text-muted-foreground">Total Value</div>
                      <div className="font-bold">{formatCurrency(comp.totalValue)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Contracts</div>
                      <div className="font-bold">{comp.contractCount}</div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t">
                    <div className="text-sm text-muted-foreground mb-1">Dominant Categories</div>
                    <div className="flex gap-1 flex-wrap">
                      {comp.dominantCategories.slice(0, 3).map(cat => (
                        <Badge key={cat} variant="secondary" className="text-xs">
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agency Market Share */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Agency Performance vs Competitors
          </CardTitle>
        </CardHeader>
        <CardContent>
          {agencyPerformance.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No agency performance data available
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="yourValue" 
                  name="Your Value" 
                  tickFormatter={(v) => formatCurrency(v)}
                  tick={{ fontSize: 11 }}
                  label={{ value: 'Your Contract Value', position: 'bottom', offset: 40 }}
                />
                <YAxis 
                  dataKey="competitorValue" 
                  name="Competitor Value" 
                  tickFormatter={(v) => formatCurrency(v)}
                  tick={{ fontSize: 11 }}
                  label={{ value: 'Competitor Value', angle: -90, position: 'left', offset: 40 }}
                />
                <ZAxis dataKey="marketShare" range={[100, 500]} />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-card border rounded-lg p-3 shadow-lg">
                        <div className="font-semibold">{data.agency}</div>
                        <div className="text-sm mt-1">
                          <div>Your Value: {formatCurrency(data.yourValue)}</div>
                          <div>Competitor Value: {formatCurrency(data.competitorValue)}</div>
                          <div className="font-medium text-primary">
                            Market Share: {data.marketShare.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Scatter data={agencyPerformance}>
                  {agencyPerformance.map((entry, index) => (
                    <Cell 
                      key={index}
                      fill={entry.marketShare > 50 ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
