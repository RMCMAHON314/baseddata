import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Play, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle,
  Loader2, Zap, Calendar
} from 'lucide-react';
import { toast } from 'sonner';

interface TaskStatus {
  name: string;
  edge_function: string;
  description: string;
  interval_hours: number;
  last_run: {
    status: string;
    started_at: string;
    completed_at: string;
    rows_affected: number;
    duration_ms: number;
    error: string | null;
  } | null;
  next_due: string;
  is_overdue: boolean;
}

export default function SchedulerDashboard() {
  const [tasks, setTasks] = useState<TaskStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningTask, setRunningTask] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('flywheel-scheduler', {
        body: { action: 'status' }
      });
      if (data?.tasks) setTasks(data.tasks);
    } catch (e) {
      console.error('Failed to load scheduler status:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  const runTask = async (taskName: string) => {
    setRunningTask(taskName);
    toast.info(`Running ${taskName}...`);
    try {
      const { data, error } = await supabase.functions.invoke('flywheel-scheduler', {
        body: { action: 'run_task', task_name: taskName }
      });
      if (error) throw error;
      const result = data?.result;
      if (result?.status === 'success') {
        toast.success(`${taskName}: ${result.rows_affected} rows in ${(result.duration_ms / 1000).toFixed(1)}s`);
      } else {
        toast.error(`${taskName} failed: ${result?.error || 'Unknown error'}`);
      }
      setTimeout(loadStatus, 2000);
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
    } finally {
      setRunningTask(null);
    }
  };

  const runAll = async () => {
    setRunningAll(true);
    toast.info('Running ALL scheduled tasks...');
    try {
      const { data, error } = await supabase.functions.invoke('flywheel-scheduler', {
        body: { action: 'run_all' }
      });
      if (error) throw error;
      const successes = data?.results?.filter((r: any) => r.status === 'success').length || 0;
      const failures = data?.results?.filter((r: any) => r.status === 'failed').length || 0;
      toast.success(`Completed: ${successes} succeeded, ${failures} failed`);
      setTimeout(loadStatus, 2000);
    } catch (e: any) {
      toast.error(`Run All failed: ${e.message}`);
    } finally {
      setRunningAll(false);
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 24) return `${Math.floor(hours / 24)}d ago`;
    if (hours > 0) return `${hours}h ${mins}m ago`;
    return `${mins}m ago`;
  };

  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (task: TaskStatus) => {
    if (!task.last_run) return <Badge variant="outline" className="text-muted-foreground">Never Run</Badge>;
    if (task.last_run.status === 'success') return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Success</Badge>;
    if (task.last_run.status === 'failed') return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Failed</Badge>;
    return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">Running</Badge>;
  };

  const overdueTasks = tasks.filter(t => t.is_overdue);
  const healthyTasks = tasks.filter(t => t.last_run?.status === 'success');

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-2" />
          <p className="text-muted-foreground text-sm">Loading scheduler status...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold text-foreground">Scheduler Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              {tasks.length} tasks • {healthyTasks.length} healthy • {overdueTasks.length} overdue
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadStatus}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
          <Button 
            onClick={runAll}
            disabled={runningAll}
            className="bg-primary hover:bg-primary/90"
            size="sm"
          >
            {runningAll ? (
              <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Running All...</>
            ) : (
              <><Zap className="w-4 h-4 mr-1" />Run All</>
            )}
          </Button>
        </div>
      </div>

      {/* Overdue Alert */}
      {overdueTasks.length > 0 && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {overdueTasks.length} task{overdueTasks.length > 1 ? 's' : ''} overdue
              </p>
              <p className="text-xs text-muted-foreground">
                {overdueTasks.map(t => t.name).join(', ')}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="ml-auto border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
              onClick={runAll}
              disabled={runningAll}
            >
              Run Overdue
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Task Grid */}
      <ScrollArea className="h-[600px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((task) => (
            <Card 
              key={task.name} 
              className={`bg-card border-border transition-colors ${
                task.is_overdue ? 'border-amber-500/30' : 
                task.last_run?.status === 'failed' ? 'border-red-500/20' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(task.last_run?.status)}
                    <div>
                      <p className="font-medium text-sm text-foreground">{task.name}</p>
                      <p className="text-xs text-muted-foreground">{task.description}</p>
                    </div>
                  </div>
                  {getStatusBadge(task)}
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Interval</p>
                    <p className="font-mono text-foreground">{task.interval_hours}h</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Run</p>
                    <p className="font-mono text-foreground">
                      {task.last_run?.completed_at ? formatTimeAgo(task.last_run.completed_at) : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Rows</p>
                    <p className="font-mono text-foreground">
                      {task.last_run?.rows_affected?.toLocaleString() || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-mono text-foreground">
                      {task.last_run?.duration_ms ? formatDuration(task.last_run.duration_ms) : '—'}
                    </p>
                  </div>
                </div>

                {task.last_run?.error && (
                  <p className="text-xs text-red-400 bg-red-500/10 rounded px-2 py-1 mb-3 truncate">
                    {task.last_run.error}
                  </p>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => runTask(task.name)}
                  disabled={runningTask === task.name || runningAll}
                >
                  {runningTask === task.name ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Running...</>
                  ) : (
                    <><Play className="w-3 h-3 mr-1" />Run Now</>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
