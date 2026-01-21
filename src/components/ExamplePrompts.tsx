import { motion } from "framer-motion";

interface ExamplePromptsProps {
  onSelect: (prompt: string) => void;
}

const examples = [
  "SaaS companies in SF",
  "NBA player stats",
  "AI patents 2024",
  "Crypto exchanges",
];

export function ExamplePrompts({ onSelect }: ExamplePromptsProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground"
    >
      <span className="hidden sm:inline">Try:</span>
      {examples.map((example, index) => (
        <motion.button
          key={example}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
          onClick={() => onSelect(example)}
          className="px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50 text-muted-foreground hover:text-foreground hover:border-electric/30 hover:bg-secondary transition-all duration-300"
        >
          '{example}'
        </motion.button>
      ))}
    </motion.div>
  );
}
