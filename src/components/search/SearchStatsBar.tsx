import { DollarSign, Building2, FileText, Award, Briefcase, Zap } from 'lucide-react';

interface SearchStatsBarProps {
  aggregations: {
    total_value: number;
    entity_count: number;
    contract_count: number;
    grant_count: number;
    opportunity_count: number;
  };
  totalCount: number;
  responseTime: number;
}

function fmt(v: number) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export function SearchStatsBar({ aggregations, totalCount, responseTime }: SearchStatsBarProps) {
  const stats = [
    { icon: Building2, label: 'entities', count: aggregations.entity_count, color: 'text-violet-500' },
    { icon: FileText, label: 'contracts', count: aggregations.contract_count, color: 'text-emerald-500' },
    { icon: Award, label: 'grants', count: aggregations.grant_count, color: 'text-amber-500' },
    { icon: Briefcase, label: 'opportunities', count: aggregations.opportunity_count, color: 'text-blue-500' },
  ].filter(s => s.count > 0);

  return (
    <div className="flex items-center gap-4 flex-wrap py-3 px-1 text-sm">
      <span className="font-semibold text-foreground">{totalCount.toLocaleString()} results</span>
      <span className="text-muted-foreground">·</span>
      {stats.map(s => (
        <span key={s.label} className="flex items-center gap-1 text-muted-foreground">
          <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
          <span className="font-medium text-foreground">{s.count}</span> {s.label}
        </span>
      ))}
      {aggregations.total_value > 0 && (
        <>
          <span className="text-muted-foreground">·</span>
          <span className="flex items-center gap-1 text-primary font-semibold">
            <DollarSign className="w-3.5 h-3.5" /> {fmt(aggregations.total_value)} total
          </span>
        </>
      )}
      <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
        <Zap className="w-3 h-3" /> {responseTime}ms
      </span>
    </div>
  );
}
