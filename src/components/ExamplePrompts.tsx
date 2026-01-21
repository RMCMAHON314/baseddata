import { motion } from "framer-motion";

interface ExamplePromptsProps {
  onSelect: (prompt: string) => void;
}

const examples = [
  "saas companies in sf",
  "nba player stats",
  "ai patents 2024",
  "crypto exchanges",
];

export function ExamplePrompts({ onSelect }: ExamplePromptsProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="flex flex-wrap items-center justify-center gap-2 text-sm"
    >
      <span className="hidden sm:inline text-white/40">try:</span>
      {examples.map((example, index) => (
        <motion.button
          key={example}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
          onClick={() => onSelect(example)}
          className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-electric/40 hover:bg-white/10 transition-all duration-300"
        >
          '{example}'
        </motion.button>
      ))}
    </motion.div>
  );
}
