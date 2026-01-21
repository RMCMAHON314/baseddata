import { motion } from "framer-motion";
import { Database } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  variant?: "light" | "dark"; // For different backgrounds
}

const sizeClasses = {
  sm: "w-7 h-7",
  md: "w-9 h-9",
  lg: "w-12 h-12",
};

const textSizeClasses = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
};

export function Logo({ size = "md", showText = true, variant = "dark" }: LogoProps) {
  return (
    <motion.div 
      className="flex items-center gap-2.5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className={`${sizeClasses[size]} relative`}>
        {/* Subtle glow behind icon */}
        <div className="absolute inset-0 bg-electric rounded-lg blur-lg opacity-40" />
        
        {/* Icon container with gradient */}
        <div className="relative w-full h-full bg-gradient-to-br from-electric via-electric-glow to-purple rounded-lg flex items-center justify-center shadow-lg">
          <Database className="w-1/2 h-1/2 text-white" />
        </div>
      </div>
      
      {showText && (
        <span className={`font-display font-bold ${textSizeClasses[size]} tracking-tight lowercase`}>
          <span className="text-gradient">based</span>
          <span className={variant === "dark" ? "text-white" : "text-navy-deep"}>data</span>
        </span>
      )}
    </motion.div>
  );
}
