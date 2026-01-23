// ============================================================================
// BASED DATA v10.0 - History Sidebar
// Grouped search history with quality indicators
// ============================================================================

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Clock,
  ChevronLeft,
  ChevronRight,
  Star,
  StarOff,
  Trash2,
  MoreHorizontal,
  MapPin,
  Database,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSearchHistory, type HistoryItem, type GroupedHistory } from '@/hooks/useSearchHistory';
import { cn } from '@/lib/utils';

interface HistorySidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onSelectQuery?: (queryId: string) => void;
}

export function HistorySidebar({
  isCollapsed = false,
  onToggleCollapse,
  onSelectQuery,
}: HistorySidebarProps) {
  const navigate = useNavigate();
  const { queryId: activeQueryId } = useParams();
  const { groupedHistory, loading, toggleSaved, deleteQuery } = useSearchHistory();

  const handleSelectQuery = (queryId: string) => {
    if (onSelectQuery) {
      onSelectQuery(queryId);
    } else {
      navigate(`/results/${queryId}`);
    }
  };

  if (isCollapsed) {
    return (
      <motion.div
        initial={{ width: 64 }}
        animate={{ width: 64 }}
        className="h-full bg-white border-r border-slate-200 flex flex-col items-center py-4"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="mb-4"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Clock className="w-5 h-5 text-slate-400" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ width: 280 }}
      animate={{ width: 280 }}
      className="h-full bg-white border-r border-slate-200 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-600" />
          <span className="font-semibold text-slate-900">History</span>
        </div>
        {onToggleCollapse && (
          <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* History List */}
      <ScrollArea className="flex-1 p-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedHistory).map(([period, items]) =>
              items.length > 0 ? (
                <HistoryGroup
                  key={period}
                  period={period as keyof GroupedHistory}
                  items={items}
                  activeQueryId={activeQueryId}
                  onSelect={handleSelectQuery}
                  onToggleSaved={toggleSaved}
                  onDelete={deleteQuery}
                />
              ) : null
            )}

            {Object.values(groupedHistory).every(arr => arr.length === 0) && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Search className="w-10 h-10 text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-500">No search history</p>
                <p className="text-xs text-slate-400 mt-1">
                  Your queries will appear here
                </p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* New Search Button */}
      <div className="p-3 border-t border-slate-200">
        <Button
          onClick={() => navigate('/')}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white"
        >
          <Search className="w-4 h-4 mr-2" />
          New Search
        </Button>
      </div>
    </motion.div>
  );
}

interface HistoryGroupProps {
  period: keyof GroupedHistory;
  items: HistoryItem[];
  activeQueryId?: string;
  onSelect: (id: string) => void;
  onToggleSaved: (id: string) => void;
  onDelete: (id: string) => void;
}

function HistoryGroup({
  period,
  items,
  activeQueryId,
  onSelect,
  onToggleSaved,
  onDelete,
}: HistoryGroupProps) {
  const periodLabels: Record<keyof GroupedHistory, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    older: 'Older',
  };

  return (
    <div>
      <div className="px-2 py-1.5 mb-1">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {periodLabels[period]}
        </span>
      </div>
      <div className="space-y-1">
        {items.map(item => (
          <HistoryItemCard
            key={item.id}
            item={item}
            isActive={item.id === activeQueryId}
            onSelect={() => onSelect(item.id)}
            onToggleSaved={() => onToggleSaved(item.id)}
            onDelete={() => onDelete(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface HistoryItemCardProps {
  item: HistoryItem;
  isActive: boolean;
  onSelect: () => void;
  onToggleSaved: () => void;
  onDelete: () => void;
}

function HistoryItemCard({
  item,
  isActive,
  onSelect,
  onToggleSaved,
  onDelete,
}: HistoryItemCardProps) {
  const [showActions, setShowActions] = useState(false);
  const stats = item.snapshot?.stats;
  const isFailed = item.status === 'failed';
  const isPending = item.status === 'pending';

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'group relative p-2.5 rounded-lg cursor-pointer transition-all',
        isActive
          ? 'bg-blue-50 border border-blue-200'
          : 'hover:bg-slate-50 border border-transparent'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={onSelect}
    >
      <div className="flex flex-col gap-1.5">
        {/* Title Row */}
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 mt-0.5">
            {isPending ? (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            ) : isFailed ? (
              <AlertCircle className="w-4 h-4 text-red-500" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            )}
          </div>
          <span
            className={cn(
              'text-sm font-medium line-clamp-2 flex-1',
              isActive ? 'text-blue-900' : 'text-slate-700'
            )}
          >
            {item.title || item.prompt?.slice(0, 50)}
          </span>
          {item.is_saved && (
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
          )}
        </div>

        {/* Stats Row */}
        {stats && !isFailed && !isPending && (
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3" />
              {stats.unique_records}
            </span>
            {stats.high_relevance > 0 && (
              <span className="flex items-center gap-1 text-emerald-600">
                <Sparkles className="w-3 h-3" />
                {stats.high_relevance} high
              </span>
            )}
            {stats.geo_percent > 0 && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {stats.geo_percent}%
              </span>
            )}
          </div>
        )}

        {/* Quick stats for non-snapshot items */}
        {!stats && item.result_count > 0 && !isFailed && !isPending && (
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3" />
              {item.result_count} results
            </span>
            {item.avg_relevance_score && (
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {Math.round(item.avg_relevance_score * 100)}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action Menu */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute right-2 top-2"
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={e => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={e => {
                    e.stopPropagation();
                    onToggleSaved();
                  }}
                >
                  {item.is_saved ? (
                    <>
                      <StarOff className="w-4 h-4 mr-2" />
                      Unsave
                    </>
                  ) : (
                    <>
                      <Star className="w-4 h-4 mr-2" />
                      Save
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={e => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
