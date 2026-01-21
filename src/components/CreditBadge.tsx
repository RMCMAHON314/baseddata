import { motion } from "framer-motion";

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
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent border border-border hover:border-primary/30 transition-colors duration-300"
    >
      <div className="w-2 h-2 rounded-full bg-success" />
      <span className="font-display font-semibold text-accent-foreground">{credits}</span>
      <span className="text-muted-foreground text-sm">credits</span>
    </motion.button>
  );
}
