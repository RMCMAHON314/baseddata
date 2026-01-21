import { motion } from "framer-motion";
import { TrendingUp, Building2, Users, Lightbulb } from "lucide-react";

interface InsightsPanelProps {
  insights: {
    totalRecords: number;
    medianRaise: string;
    topSectors: string[];
    employeeRange: string;
  };
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  const insightItems = [
    {
      icon: Building2,
      label: "Companies found",
      value: insights.totalRecords.toString(),
      detail: `Median raise: ${insights.medianRaise}`,
    },
    {
      icon: TrendingUp,
      label: "Top sectors",
      value: insights.topSectors[0],
      detail: insights.topSectors.slice(1).join(", "),
    },
    {
      icon: Users,
      label: "Company size",
      value: insights.employeeRange,
      detail: "Most common range",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass rounded-xl p-5 border border-border/50"
    >
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-4 h-4 text-electric" />
        <h3 className="font-display font-semibold text-foreground">AI Insights</h3>
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
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="font-display font-semibold text-foreground">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.detail}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
