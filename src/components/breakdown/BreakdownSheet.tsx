// ============================================================================
// BASED DATA v10.0 - GRANULAR BREAKDOWN SHEET
// Click any aggregate number → see EVERY underlying record in a side sheet
// ============================================================================

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChevronDown,
  ChevronUp,
  Search,
  Download,
  Copy,
  Check,
  DollarSign,
  Building2,
  MapPin,
  Calendar,
  ExternalLink,
  Filter,
  List,
  BarChart3,
  TrendingUp,
  FileText,
} from 'lucide-react';
import type { ProcessedRecord } from '@/lib/dataProcessing';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface BreakdownFilter {
  type: 'all' | 'category' | 'agency' | 'state' | 'year' | 'custom';
  value?: string;
  label: string;
  icon?: React.ElementType;
}

interface BreakdownSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  records: ProcessedRecord[];
  filter: BreakdownFilter;
  title?: string;
  onRecordClick?: (record: ProcessedRecord) => void;
}

// Format currency
function formatCurrency(amount: number): string {
  if (!amount || isNaN(amount)) return '—';
  if (amount >= 1e12) return `$${(amount / 1e12).toFixed(2)}T`;
  if (amount >= 1e9) return `$${(amount / 1e9).toFixed(2)}B`;
  if (amount >= 1e6) return `$${(amount / 1e6).toFixed(2)}M`;
  if (amount >= 1e3) return `$${(amount / 1e3).toFixed(1)}K`;
  return `$${amount.toLocaleString()}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
}

// Get property value from nested record
function getProp(record: ProcessedRecord, keys: string[]): unknown {
  const props = record.properties as Record<string, unknown>;
  const attrs = (props?.attributes || {}) as Record<string, unknown>;
  for (const key of keys) {
    if (props?.[key] !== undefined) return props[key];
    if (attrs?.[key] !== undefined) return attrs[key];
  }
  return undefined;
}

export function BreakdownSheet({
  open,
  onOpenChange,
  records,
  filter,
  title,
  onRecordClick,
}: BreakdownSheetProps) {
  const [searchText, setSearchText] = useState('');
  const [sortField, setSortField] = useState<'amount' | 'name' | 'date'>('amount');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [copied, setCopied] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<'list' | 'breakdown'>('list');

  // Filter records based on the breakdown filter
  const filteredRecords = useMemo(() => {
    let filtered = records;

    // Apply filter
    if (filter.type !== 'all' && filter.value) {
      filtered = records.filter((r) => {
        const props = r.properties as Record<string, unknown>;
        switch (filter.type) {
          case 'category':
            return String(props?.category || '').toUpperCase() === filter.value?.toUpperCase();
          case 'agency':
            return (
              String(props?.awarding_agency || '').includes(filter.value!) ||
              String(props?.agency || '').includes(filter.value!)
            );
          case 'state':
            return (
              String(props?.state || '').toUpperCase() === filter.value?.toUpperCase() ||
              String(props?.place_of_performance_state || '').toUpperCase() === filter.value?.toUpperCase()
            );
          case 'year':
            const date = props?.award_date || props?.date;
            return date && new Date(String(date)).getFullYear().toString() === filter.value;
          default:
            return true;
        }
      });
    }

    // Apply search
    if (searchText) {
      const lower = searchText.toLowerCase();
      filtered = filtered.filter((r) => {
        const props = r.properties as Record<string, unknown>;
        return (
          r.displayName?.toLowerCase().includes(lower) ||
          String(props?.recipient_name || '').toLowerCase().includes(lower) ||
          String(props?.awarding_agency || '').toLowerCase().includes(lower) ||
          String(props?.description || '').toLowerCase().includes(lower)
        );
      });
    }

    // Sort
    return [...filtered].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortField) {
        case 'amount':
          aVal = (getProp(a, ['award_amount', 'total_amount', 'value']) as number) || 0;
          bVal = (getProp(b, ['award_amount', 'total_amount', 'value']) as number) || 0;
          break;
        case 'date':
          aVal = String(getProp(a, ['award_date', 'date', 'created_at']) || '');
          bVal = String(getProp(b, ['award_date', 'date', 'created_at']) || '');
          break;
        default:
          aVal = a.displayName || '';
          bVal = b.displayName || '';
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [records, filter, searchText, sortField, sortDir]);

  // Calculate aggregate stats for this filtered set
  const stats = useMemo(() => {
    const amounts = filteredRecords
      .map((r) => (getProp(r, ['award_amount', 'total_amount', 'value']) as number) || 0)
      .filter((v) => v > 0);

    const total = amounts.reduce((sum, v) => sum + v, 0);
    const avg = amounts.length > 0 ? total / amounts.length : 0;
    const sorted = [...amounts].sort((a, b) => a - b);
    const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
    const max = sorted.length > 0 ? sorted[sorted.length - 1] : 0;
    const min = sorted.length > 0 ? sorted[0] : 0;

    // By category breakdown
    const byCategory = new Map<string, { count: number; value: number }>();
    filteredRecords.forEach((r) => {
      const cat = String((r.properties as Record<string, unknown>)?.category || 'OTHER');
      const amt = (getProp(r, ['award_amount', 'total_amount', 'value']) as number) || 0;
      const existing = byCategory.get(cat) || { count: 0, value: 0 };
      byCategory.set(cat, { count: existing.count + 1, value: existing.value + amt });
    });

    return {
      total,
      avg,
      median,
      max,
      min,
      count: filteredRecords.length,
      byCategory: Array.from(byCategory.entries())
        .map(([name, data]) => ({ name, ...data, pct: total > 0 ? (data.value / total) * 100 : 0 }))
        .sort((a, b) => b.value - a.value),
    };
  }, [filteredRecords]);

  function handleSort(field: 'amount' | 'name' | 'date') {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  function copyValue(value: string, id: string) {
    navigator.clipboard.writeText(value);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Copied to clipboard');
  }

  function exportToCSV() {
    const headers = ['Name', 'Amount', 'Agency', 'Category', 'State', 'Date', 'Source'];
    const rows = filteredRecords.map((r) => {
      const props = r.properties as Record<string, unknown>;
      return [
        r.displayName,
        getProp(r, ['award_amount', 'total_amount', 'value']),
        getProp(r, ['awarding_agency', 'agency']),
        props?.category,
        getProp(r, ['state', 'place_of_performance_state']),
        getProp(r, ['award_date', 'date']),
        props?.source,
      ];
    });

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c || ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `breakdown-${filter.label.replace(/\s/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success(`Exported ${filteredRecords.length} records`);
  }

  const FilterIcon = filter.icon || Filter;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl lg:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader className="flex-none">
          <SheetTitle className="flex items-center gap-2">
            <FilterIcon className="w-5 h-5 text-primary" />
            {title || filter.label}
          </SheetTitle>
          <SheetDescription>
            Drill down into {filteredRecords.length.toLocaleString()} records
            {stats.total > 0 && ` • ${formatCurrency(stats.total)} total value`}
          </SheetDescription>
        </SheetHeader>

        {/* Stats Summary */}
        <div className="flex-none grid grid-cols-4 gap-2 py-4 border-b border-border">
          <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
              {formatCurrency(stats.total)}
            </div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <div className="text-lg font-bold text-blue-700 dark:text-blue-400">
              {stats.count.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Records</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-purple-50 dark:bg-purple-950/30">
            <div className="text-lg font-bold text-purple-700 dark:text-purple-400">
              {formatCurrency(stats.avg)}
            </div>
            <div className="text-xs text-muted-foreground">Average</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30">
            <div className="text-lg font-bold text-amber-700 dark:text-amber-400">
              {formatCurrency(stats.max)}
            </div>
            <div className="text-xs text-muted-foreground">Largest</div>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex-none flex items-center gap-2 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search records..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-1" />
            CSV
          </Button>
        </div>

        {/* Tabs: List vs Breakdown */}
        <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as 'list' | 'breakdown')} className="flex-1 flex flex-col min-h-0">
          <TabsList className="flex-none grid w-full grid-cols-2">
            <TabsTrigger value="list" className="flex items-center gap-1">
              <List className="w-4 h-4" />
              All Records
            </TabsTrigger>
            <TabsTrigger value="breakdown" className="flex items-center gap-1">
              <BarChart3 className="w-4 h-4" />
              Breakdown
            </TabsTrigger>
          </TabsList>

          {/* All Records List */}
          <TabsContent value="list" className="flex-1 overflow-hidden flex flex-col m-0">
            {/* Sort Headers */}
            <div className="flex-none flex items-center gap-4 py-2 px-1 border-b border-border text-xs text-muted-foreground">
              <button
                onClick={() => handleSort('name')}
                className={cn('flex items-center gap-1', sortField === 'name' && 'text-foreground font-medium')}
              >
                Name {sortField === 'name' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
              </button>
              <button
                onClick={() => handleSort('amount')}
                className={cn('flex items-center gap-1 ml-auto', sortField === 'amount' && 'text-foreground font-medium')}
              >
                Amount {sortField === 'amount' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
              </button>
              <button
                onClick={() => handleSort('date')}
                className={cn('flex items-center gap-1', sortField === 'date' && 'text-foreground font-medium')}
              >
                Date {sortField === 'date' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
              </button>
            </div>

            {/* Records */}
            <div className="flex-1 overflow-y-auto">
              {filteredRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileText className="w-10 h-10 mb-3 opacity-50" />
                  <p className="font-medium">No records found</p>
                  <p className="text-sm">Try adjusting your search</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredRecords.slice(0, 200).map((record, i) => {
                    const props = record.properties as Record<string, unknown>;
                    const amount = (getProp(record, ['award_amount', 'total_amount', 'value']) as number) || 0;
                    const agency = String(getProp(record, ['awarding_agency', 'agency']) || '');
                    const state = String(getProp(record, ['state', 'place_of_performance_state']) || '');
                    const date = String(getProp(record, ['award_date', 'date']) || '');
                    const category = String(props?.category || '');

                    return (
                      <motion.div
                        key={record.id || i}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.01 }}
                        className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => onRecordClick?.(record)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground truncate">{record.displayName}</div>
                            {agency && (
                              <div className="text-sm text-muted-foreground truncate flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {agency}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {category && (
                                <Badge variant="outline" className="text-xs">
                                  {category}
                                </Badge>
                              )}
                              {state && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {state}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex-none text-right">
                            {amount > 0 && (
                              <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(amount)}
                              </div>
                            )}
                            {date && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                                <Calendar className="w-3 h-3" />
                                {formatDate(date)}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  {filteredRecords.length > 200 && (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      Showing 200 of {filteredRecords.length.toLocaleString()} records.
                      <Button variant="link" size="sm" onClick={exportToCSV}>
                        Export all to CSV
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Breakdown by Category */}
          <TabsContent value="breakdown" className="flex-1 overflow-y-auto m-0">
            <div className="p-2 space-y-3">
              {stats.byCategory.map((cat, i) => (
                <div key={cat.name} className="p-3 rounded-lg border border-border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{cat.name}</div>
                    <div className="text-sm text-muted-foreground">{cat.count} records</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={cat.pct} className="flex-1 h-2" />
                    <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 w-24 text-right">
                      {formatCurrency(cat.value)}
                    </div>
                    <div className="text-xs text-muted-foreground w-12 text-right">{cat.pct.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
