// BASED DATA v7.0 - Source Card Component
// Beautiful clickable source cards with links to original data

import { motion } from 'framer-motion';
import { ExternalLink, Database, Zap, Globe, FileText, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import type { CollectedData } from '@/types/omniscient';
import { findSourceInfo } from '@/types/omniscient';

interface SourceCardProps {
  source: CollectedData;
  index: number;
}

export function SourceCard({ source, index }: SourceCardProps) {
  const sourceInfo = findSourceInfo(source.source);
  
  const websiteUrl = source.source_url || sourceInfo?.website_url;
  const docsUrl = source.api_documentation_url || sourceInfo?.documentation_url;
  const emoji = sourceInfo?.logo_emoji || '📊';
  const reliability = sourceInfo?.reliability ? Math.round(sourceInfo.reliability * 100) : null;

  const statusConfig = {
    success: {
      icon: CheckCircle2,
      bg: 'bg-success/5',
      border: 'border-success/20 hover:border-success/40',
      badge: 'bg-success/10 text-success',
      text: 'Success',
    },
    error: {
      icon: XCircle,
      bg: 'bg-destructive/5',
      border: 'border-destructive/20',
      badge: 'bg-destructive/10 text-destructive',
      text: 'Failed',
    },
    partial: {
      icon: AlertCircle,
      bg: 'bg-warning/5',
      border: 'border-warning/20',
      badge: 'bg-warning/10 text-warning',
      text: 'Partial',
    },
    empty: {
      icon: AlertCircle,
      bg: 'bg-secondary',
      border: 'border-border/50',
      badge: 'bg-secondary text-muted-foreground',
      text: 'Empty',
    },
  };

  const config = statusConfig[source.status] || statusConfig.empty;
  const StatusIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`p-4 rounded-xl border transition-all ${config.bg} ${config.border} group`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl flex-shrink-0">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-foreground truncate">
              {sourceInfo?.name || source.source}
            </span>
            {reliability !== null && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                {reliability}% reliable
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {sourceInfo?.description || 'Data source'}
          </p>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${config.badge} flex items-center gap-1`}>
          <StatusIcon className="w-3 h-3" />
          {config.text}
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-primary" />
          <span className="font-medium text-foreground">{source.record_count}</span> records
        </span>
        <span className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-warning" />
          <span className="font-medium text-foreground">{source.collection_time_ms}</span>ms
        </span>
      </div>

      {/* Error Message */}
      {source.error && (
        <p className="text-xs text-destructive bg-destructive/5 rounded-lg p-2 mb-3 line-clamp-2">
          {source.error}
        </p>
      )}

      {/* Links */}
      <div className="flex flex-wrap gap-2">
        {websiteUrl && (
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-all hover:scale-[1.02]"
          >
            <Globe className="w-3.5 h-3.5" />
            Visit Source
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
        {docsUrl && (
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground text-xs font-medium transition-all hover:scale-[1.02]"
          >
            <FileText className="w-3.5 h-3.5" />
            API Docs
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </motion.div>
  );
}