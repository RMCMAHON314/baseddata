import { Logo } from "./Logo";
import { CreditBadge } from "./CreditBadge";
import { Button } from "./ui/button";
import { motion } from "framer-motion";
import { User } from "lucide-react";

interface HeaderProps {
  credits?: number;
  isLoggedIn?: boolean;
}

export function Header({ credits = 100, isLoggedIn = false }: HeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50"
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Logo size="sm" />
        
        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <>
              <CreditBadge credits={credits} />
              <Button variant="glass" size="icon">
                <User className="w-5 h-5" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" className="hidden sm:inline-flex">
                Sign In
              </Button>
              <Button variant="hero" size="sm">
                Get Started
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}
