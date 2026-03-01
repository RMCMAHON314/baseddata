// Data Freshness Indicator — Global footer bar component
import { useState, forwardRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { Activity, Clock, Database, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

function useDataFreshness() {
  return useQuery({
    queryKey: ['data-freshness'],
    queryFn: async () => {
      // Get most recent vacuum run
      const { data: vacuumRuns } = await supabase
        .from('vacuum_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(5);

      // Get most recent scheduler runs
      const { data: schedulerRuns } = await supabase
        .from('scheduler_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);

      // Get table counts for quick health
      const { data: stats } = await supabase.rpc('get_platform_stats' as any);
      const s = Array.isArray(stats) ? stats[0]?.get_platform_stats || stats[0] : stats?.get_platform_stats || stats;

      const latestVacuum = vacuumRuns?.[0];
      const latestTimestamp = latestVacuum?.started_at || null;

      return { latestTimestamp, vacuumRuns: vacuumRuns || [], schedulerRuns: schedulerRuns || [], stats: s };
    },
    staleTime: 60_000,
  });
}

function getFreshnessColor(timestamp: string | null): string {
  if (!timestamp) return 'text-amber-500';
  const hoursAgo = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 4) return 'text-emerald-500';
  if (hoursAgo <= 12) return 'text-amber-500';
  return 'text-rose-500';
}

function getFreshnessDot(timestamp: string | null): string {
  if (!timestamp) return 'bg-amber-500';
  const hoursAgo = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 4) return 'bg-emerald-500';
  if (hoursAgo <= 12) return 'bg-amber-500';
  return 'bg-rose-500';
}

export function DataFreshnessIndicator() {
  const { data, isLoading } = useDataFreshness();
  const { user } = useAuth();

  if (isLoading || !data) return null;

  const { latestTimestamp, vacuumRuns, schedulerRuns, stats } = data;
  const color = getFreshnessColor(latestTimestamp);
  const dot = getFreshnessDot(latestTimestamp);
  const label = latestTimestamp
    ? `Data updated ${formatDistanceToNow(new Date(latestTimestamp), { addSuffix: true })}`
    : 'Data freshness unknown';

  const isInitializing = vacuumRuns.length <= 3 && (!latestTimestamp || (Date.now() - new Date(latestTimestamp).getTime()) > 12 * 60 * 60 * 1000);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={`flex items-center gap-1.5 text-xs ${color} hover:opacity-80 transition-opacity`}>
          <span className={`w-2 h-2 rounded-full ${dot} animate-pulse`} />
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-primary" />
            Data Pipeline Health
          </div>

          {isInitializing && (
            <div className="text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded p-2">
              ⚠️ Automated data collection is initializing. Data updates every 4 hours once active.
            </div>
          )}

          {/* Last vacuum */}
          <div className="text-xs space-y-1">
            <p className="font-medium text-foreground">Last Vacuum Run</p>
            {vacuumRuns[0] ? (
              <div className="text-muted-foreground">
                <p>{formatDistanceToNow(new Date(vacuumRuns[0].started_at), { addSuffix: true })}</p>
                <p>Status: <Badge variant="outline" className="text-[10px] py-0">{vacuumRuns[0].status || 'completed'}</Badge></p>
              </div>
            ) : (
              <p className="text-muted-foreground">No vacuum runs recorded</p>
            )}
          </div>

          {/* Recent scheduler runs */}
          {schedulerRuns.length > 0 && (
            <div className="text-xs space-y-1">
              <p className="font-medium text-foreground">Recent Scheduler Runs</p>
              <div className="space-y-0.5 max-h-24 overflow-y-auto">
                {schedulerRuns.slice(0, 5).map((run: any, i: number) => (
                  <div key={i} className="flex justify-between text-muted-foreground">
                    <span className="truncate">{run.task_name || run.function_name || 'task'}</span>
                    <span>{formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick table counts */}
          {stats && (
            <div className="text-xs space-y-1">
              <p className="font-medium text-foreground">Record Counts</p>
              <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                {stats.entity_count != null && <span>Entities: {Number(stats.entity_count).toLocaleString()}</span>}
                {stats.contract_count != null && <span>Contracts: {Number(stats.contract_count).toLocaleString()}</span>}
                {stats.grant_count != null && <span>Grants: {Number(stats.grant_count).toLocaleString()}</span>}
                {stats.opportunity_count != null && <span>Opportunities: {Number(stats.opportunity_count).toLocaleString()}</span>}
              </div>
            </div>
          )}

          {user && (
            <Link to="/ocean" className="flex items-center gap-1 text-xs text-primary hover:underline">
              <ExternalLink className="h-3 w-3" /> View Pipeline Dashboard
            </Link>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
