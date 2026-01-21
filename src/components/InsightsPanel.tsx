import { motion } from "framer-motion";
import { TrendingUp, Building2, Lightbulb, BarChart3 } from "lucide-react";

interface InsightsPanelProps {
  insights: {
    totalRecords: number;
    summary: string;
    topCategories: string[];
    keyMetric: string;
  };
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  const insightItems = [
    {
      icon: Building2,
      label: "records found",
      value: insights.totalRecords?.toString() || "0",
      detail: insights.summary || "",
    },
    {
      icon: TrendingUp,
      label: "top categories",
      value: insights.topCategories?.[0] || "N/A",
      detail: insights.topCategories?.slice(1).join(", ") || "",
    },
    {
      icon: BarChart3,
      label: "key metric",
      value: insights.keyMetric || "N/A",
      detail: "most significant finding",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass rounded-xl p-5 border border-white/10"
    >
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-4 h-4 text-electric" />
        <h3 className="font-display font-semibold text-white lowercase">ai insights</h3>
      </div>
      
      <div className="space-y-4">
        {insightItems.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
            className="flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-electric/10 flex items-center justify-center flex-shrink-0">
              <item.icon className="w-4 h-4 text-electric" />
            </div>
            <div>
              <p className="text-xs text-white/50 lowercase">{item.label}</p>
              <p className="font-display font-semibold text-white lowercase">{item.value}</p>
              {item.detail && <p className="text-xs text-white/40 lowercase">{item.detail}</p>}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
