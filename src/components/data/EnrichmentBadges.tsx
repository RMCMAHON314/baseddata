// BASED DATA v6.0 - Enrichment Badges
// Visual indicators showing what data was auto-enriched/expanded

import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Layers, Globe, Zap, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnrichmentBadgesProps {
  enrichments: string[];
  className?: string;
}

const ENRICHMENT_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  weather: { icon: <span>🌤️</span>, label: 'Weather Added', color: 'bg-sky-500/10 text-sky-500 border-sky-500/20' },
  wildlife: { icon: <span>🦅</span>, label: 'Wildlife Enriched', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  marine: { icon: <span>🌊</span>, label: 'Marine Data', color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' },
  government: { icon: <span>🏛️</span>, label: 'Gov Sources', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  infrastructure: { icon: <span>🏗️</span>, label: 'Infrastructure', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  economics: { icon: <span>📈</span>, label: 'Economic Data', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  ai_expanded: { icon: <Brain className="w-3.5 h-3.5" />, label: 'AI Expanded', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  cross_referenced: { icon: <Layers className="w-3.5 h-3.5" />, label: 'Cross-Referenced', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
  geo_enriched: { icon: <Globe className="w-3.5 h-3.5" />, label: 'Geo-Enriched', color: 'bg-teal-500/10 text-teal-500 border-teal-500/20' },
  real_time: { icon: <Zap className="w-3.5 h-3.5" />, label: 'Real-Time', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
};

export function EnrichmentBadges({ enrichments, className }: EnrichmentBadgesProps) {
  if (enrichments.length === 0) return null;
  
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Sparkles className="w-3.5 h-3.5" />
        Auto-enriched:
      </span>
      {enrichments.map((enrichment, idx) => {
        const config = ENRICHMENT_CONFIG[enrichment] || { 
          icon: <TrendingUp className="w-3.5 h-3.5" />, 
          label: enrichment, 
          color: 'bg-primary/10 text-primary border-primary/20' 
        };
        
        return (
          <motion.span
            key={enrichment}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
              config.color
            )}
          >
            {config.icon}
            {config.label}
          </motion.span>
        );
      })}
    </div>
  );
}

// Compact version for inline use
export function EnrichmentBadge({ type }: { type: string }) {
  const config = ENRICHMENT_CONFIG[type] || { 
    icon: <TrendingUp className="w-3 h-3" />, 
    label: type, 
    color: 'bg-primary/10 text-primary' 
  };
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
      config.color
    )}>
      {config.icon}
      {config.label}
    </span>
  );
}
