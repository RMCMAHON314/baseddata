import { motion } from "framer-motion";
import { Coins } from "lucide-react";

interface CreditBadgeProps {
  credits: number;
  onClick?: () => void;
}

export function CreditBadge({ credits, onClick }: CreditBadgeProps) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-full glass border border-border/50 hover:border-electric/30 transition-colors duration-300"
    >
      <Coins className="w-4 h-4 text-electric" />
      <span className="font-display font-semibold text-foreground">{credits}</span>
      <span className="text-muted-foreground text-sm">credits</span>
    </motion.button>
  );
}
