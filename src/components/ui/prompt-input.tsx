import * as React from "react";
import { cn } from "@/lib/utils";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  isLoading?: boolean;
  className?: string;
}

const PromptInput = React.forwardRef<HTMLInputElement, PromptInputProps>(
  ({ value, onChange, onSubmit, placeholder = "what data do you need?", isLoading, className }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey && value.trim()) {
        e.preventDefault();
        onSubmit();
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className={cn(
          "relative w-full max-w-2xl group",
          className
        )}
      >
        {/* Glow effect behind input */}
        <div className="absolute -inset-1 bg-gradient-to-r from-electric via-purple to-electric rounded-2xl opacity-25 blur-xl group-hover:opacity-40 transition-opacity duration-500" />
        
        {/* Main input container */}
        <div className="relative glass rounded-xl overflow-hidden border border-white/10 group-hover:border-electric/30 transition-all duration-300">
          <div className="flex items-center">
            <div className="pl-4 text-electric">
              <Sparkles className="w-5 h-5" />
            </div>
            <input
              ref={ref}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              className="flex-1 h-14 md:h-16 px-4 bg-transparent text-white text-base md:text-lg font-body placeholder:text-white/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 lowercase"
            />
            <button
              onClick={onSubmit}
              disabled={!value.trim() || isLoading}
              className="m-2 h-10 w-10 md:h-12 md:w-12 rounded-lg bg-gradient-to-r from-electric to-purple text-white flex items-center justify-center transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-electric/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                <ArrowRight className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }
);

PromptInput.displayName = "PromptInput";

export { PromptInput };
