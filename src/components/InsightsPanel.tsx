import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Building2, Lightbulb, BarChart3, Sparkles, Target, CheckCircle2 } from "lucide-react";

interface KeyMetric {
  label: string;
  value: string;
  trend: "up" | "down" | "stable";
}

interface InsightsPanelProps {
  insights: {
    totalRecords?: number;
    summary?: string;
    topCategories?: string[];
    keyFindings?: string[];
    keyMetrics?: KeyMetric[];
    recommendations?: string[];
    dataQualityScore?: number;
    // Legacy support
    keyMetric?: string;
  };
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-3 h-3 text-electric" />;
      case "down":
        return <TrendingDown className="w-3 h-3 text-destructive" />;
      default:
        return <Minus className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const qualityScore = insights.dataQualityScore || 85;
  const qualityColor = qualityScore >= 80 ? "text-electric" : qualityScore >= 60 ? "text-yellow-500" : "text-destructive";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass rounded-xl p-5 border border-white/10 space-y-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-electric" />
          <h3 className="font-display font-semibold text-white lowercase">ai insights</h3>
        </div>
        <div className={`text-xs font-mono ${qualityColor}`}>
          {qualityScore}% quality
        </div>
      </div>

      {/* Summary */}
      {insights.summary && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="p-3 rounded-lg bg-electric/5 border border-electric/20"
        >
          <p className="text-sm text-white/80 lowercase leading-relaxed">{insights.summary}</p>
        </motion.div>
      )}

      {/* Key Metrics */}
      {insights.keyMetrics && insights.keyMetrics.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-white/50 lowercase">
            <BarChart3 className="w-3 h-3" />
            key metrics
          </div>
          <div className="grid gap-2">
            {insights.keyMetrics.slice(0, 4).map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.05 }}
                className="flex items-center justify-between p-2 rounded-lg bg-white/5"
              >
                <span className="text-xs text-white/60 lowercase">{metric.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{metric.value}</span>
                  {getTrendIcon(metric.trend)}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Key Findings */}
      {insights.keyFindings && insights.keyFindings.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-white/50 lowercase">
            <Sparkles className="w-3 h-3" />
            key findings
          </div>
          <div className="space-y-1.5">
            {insights.keyFindings.slice(0, 4).map((finding, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.05 }}
                className="flex items-start gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-electric mt-1.5 flex-shrink-0" />
                <p className="text-xs text-white/70 lowercase leading-relaxed">{finding}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Top Categories */}
      {insights.topCategories && insights.topCategories.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-white/50 lowercase">
            <Building2 className="w-3 h-3" />
            top categories
          </div>
          <div className="flex flex-wrap gap-1.5">
            {insights.topCategories.slice(0, 5).map((category, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + index * 0.05 }}
                className="px-2 py-1 text-xs rounded-full bg-purple/20 text-purple-light border border-purple/30 lowercase"
              >
                {category}
              </motion.span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {insights.recommendations && insights.recommendations.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-white/50 lowercase">
            <Target className="w-3 h-3" />
            recommendations
          </div>
          <div className="space-y-1.5">
            {insights.recommendations.slice(0, 3).map((rec, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.05 }}
                className="flex items-start gap-2"
              >
                <CheckCircle2 className="w-3 h-3 text-electric mt-0.5 flex-shrink-0" />
                <p className="text-xs text-white/70 lowercase leading-relaxed">{rec}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Legacy support for old insights format */}
      {!insights.keyMetrics && insights.keyMetric && (
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-electric/10 flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-4 h-4 text-electric" />
          </div>
          <div>
            <p className="text-xs text-white/50 lowercase">key metric</p>
            <p className="font-display font-semibold text-white lowercase">{insights.keyMetric}</p>
          </div>
        </div>
      )}

      {/* Records count */}
      <div className="pt-3 border-t border-white/10">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/50 lowercase">total records</span>
          <span className="font-mono text-electric">{insights.totalRecords || 0}</span>
        </div>
      </div>
    </motion.div>
  );
}
