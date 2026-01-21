import { motion } from "framer-motion";
import { Database } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-14 h-14",
};

const textSizeClasses = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
};

export function Logo({ size = "md", showText = true }: LogoProps) {
  return (
    <motion.div 
      className="flex items-center gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className={`${sizeClasses[size]} relative`}>
        {/* Glow behind icon */}
        <div className="absolute inset-0 bg-electric rounded-lg blur-md opacity-50" />
        
        {/* Icon container */}
        <div className="relative w-full h-full bg-gradient-to-br from-electric to-purple rounded-lg flex items-center justify-center">
          <Database className="w-1/2 h-1/2 text-primary-foreground" />
        </div>
      </div>
      
      {showText && (
        <span className={`font-display font-bold ${textSizeClasses[size]} tracking-tight`}>
          <span className="text-foreground">Based</span>
          <span className="text-gradient"> Data</span>
        </span>
      )}
    </motion.div>
  );
}
