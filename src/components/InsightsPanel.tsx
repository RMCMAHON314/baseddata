import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Building2, Lightbulb, BarChart3, Sparkles, Target, CheckCircle2, Zap } from "lucide-react";

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
    keyMetric?: string;
  };
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-3 h-3 text-success" />;
      case "down":
        return <TrendingDown className="w-3 h-3 text-destructive" />;
      default:
        return <Minus className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const qualityScore = insights.dataQualityScore || 85;
  const qualityColor = qualityScore >= 80 ? "text-success" : qualityScore >= 60 ? "text-yellow-500" : "text-destructive";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-background rounded-2xl border border-border p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-display font-semibold text-foreground">AI Insights</h3>
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
          className="p-4 rounded-xl bg-card"
        >
          <p className="text-sm text-muted-foreground leading-relaxed">{insights.summary}</p>
        </motion.div>
      )}

      {/* Key Metrics */}
      {insights.keyMetrics && insights.keyMetrics.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {insights.keyMetrics.slice(0, 4).map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.05 }}
              className="text-center"
            >
              <div className="text-xl font-bold text-foreground">{metric.value}</div>
              <div className="text-xs text-muted-foreground">{metric.label}</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                {getTrendIcon(metric.trend)}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Key Findings */}
      {insights.keyFindings && insights.keyFindings.length > 0 && (
        <div className="p-4 rounded-xl bg-card">
          <p className="text-sm text-foreground">
            <strong>Key Findings:</strong>{' '}
            <span className="text-muted-foreground">{insights.keyFindings.join(' ')}</span>
          </p>
        </div>
      )}

      {/* Top Categories */}
      {insights.topCategories && insights.topCategories.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="w-3 h-3" />
            Top categories
          </div>
          <div className="flex flex-wrap gap-1.5">
            {insights.topCategories.slice(0, 5).map((category, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + index * 0.05 }}
                className="px-3 py-1 text-xs rounded-full bg-accent text-accent-foreground"
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
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Target className="w-3 h-3" />
            Recommendations
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
                <CheckCircle2 className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">{rec}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Legacy support for old insights format */}
      {!insights.keyMetrics && insights.keyMetric && (
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Key metric</p>
            <p className="font-display font-semibold text-foreground">{insights.keyMetric}</p>
          </div>
        </div>
      )}

      {/* Records count */}
      <div className="pt-3 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total records</span>
          <span className="font-mono text-primary">{insights.totalRecords || 0}</span>
        </div>
      </div>
    </motion.div>
  );
}
