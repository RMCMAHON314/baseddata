// Market Shift Indicator - Displays market entry/exit trends
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle, Zap, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface MarketShiftIndicatorProps {
  entityId: string;
}

interface MarketShift {
  newMarkets: string[];
  lostMarkets: string[];
  velocityChange: number;
}

export function MarketShiftIndicator({ entityId }: MarketShiftIndicatorProps) {
  const [shifts, setShifts] = useState<MarketShift | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    detectShifts();
  }, [entityId]);

  async function detectShifts() {
    setLoading(true);
    try {
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const oneEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

      // Recent contracts (last 90 days)
      const { data: recent } = await supabase
        .from('contracts')
        .select('awarding_agency')
        .eq('recipient_entity_id', entityId)
        .gte('award_date', ninetyDaysAgo.toISOString().split('T')[0]);

      // Previous period contracts (90-180 days ago)
      const { data: previous } = await supabase
        .from('contracts')
        .select('awarding_agency')
        .eq('recipient_entity_id', entityId)
        .gte('award_date', oneEightyDaysAgo.toISOString().split('T')[0])
        .lt('award_date', ninetyDaysAgo.toISOString().split('T')[0]);

      const recentAgencies = new Set(recent?.map(c => c.awarding_agency).filter(Boolean) || []);
      const previousAgencies = new Set(previous?.map(c => c.awarding_agency).filter(Boolean) || []);

      const newMarkets = [...recentAgencies].filter(a => !previousAgencies.has(a));
      const lostMarkets = [...previousAgencies].filter(a => !recentAgencies.has(a));
      const velocityChange = (recent?.length || 0) - (previous?.length || 0);

      setShifts({ newMarkets, lostMarkets, velocityChange });
    } catch (error) {
      console.error('Error detecting shifts:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!shifts) return null;

  const hasActivity = shifts.newMarkets.length > 0 || shifts.lostMarkets.length > 0 || shifts.velocityChange !== 0;

  if (!hasActivity) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Market Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-4">
          <p className="text-muted-foreground text-sm">Stable market position</p>
          <p className="text-xs text-muted-foreground">No significant changes in last 90 days</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Market Activity (90 Days)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Velocity Change */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
          <span className="text-sm font-medium">Contract Velocity</span>
          <div className="flex items-center gap-2">
            {shifts.velocityChange > 0 ? (
              <>
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="font-bold text-green-500">+{shifts.velocityChange}</span>
              </>
            ) : shifts.velocityChange < 0 ? (
              <>
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="font-bold text-red-500">{shifts.velocityChange}</span>
              </>
            ) : (
              <span className="text-muted-foreground">No change</span>
            )}
          </div>
        </div>

        {/* New Markets */}
        {shifts.newMarkets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-green-500">
              <TrendingUp className="h-4 w-4" />
              New Markets ({shifts.newMarkets.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {shifts.newMarkets.slice(0, 5).map(market => (
                <Badge key={market} variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-xs">
                  {market}
                </Badge>
              ))}
              {shifts.newMarkets.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{shifts.newMarkets.length - 5} more
                </Badge>
              )}
            </div>
          </motion.div>
        )}

        {/* Lost Markets */}
        {shifts.lostMarkets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-red-500">
              <AlertTriangle className="h-4 w-4" />
              Lost Markets ({shifts.lostMarkets.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {shifts.lostMarkets.slice(0, 5).map(market => (
                <Badge key={market} variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 text-xs">
                  {market}
                </Badge>
              ))}
              {shifts.lostMarkets.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{shifts.lostMarkets.length - 5} more
                </Badge>
              )}
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
