import { motion } from "framer-motion";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const textSizeClasses = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
};

export function Logo({ size = "md", showText = true }: LogoProps) {
  return (
    <motion.div 
      className="flex items-center gap-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {showText && (
        <span className={`font-display font-bold ${textSizeClasses[size]} tracking-tight uppercase`}>
          <span className="text-primary">BASED DATA</span>
        </span>
      )}
    </motion.div>
  );
}
