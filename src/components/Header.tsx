import { Logo } from "./Logo";
import { CreditBadge } from "./CreditBadge";
import { Button } from "./ui/button";
import { motion } from "framer-motion";
import { User, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { user, profile, signOut } = useAuth();

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5"
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Logo size="sm" />
        
        <div className="flex items-center gap-4">
          {user && profile ? (
            <>
              <CreditBadge credits={profile.credits_balance} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="glass" size="icon">
                    <User className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass border-white/10">
                  <DropdownMenuItem className="text-white/70">
                    {profile.full_name || user.email}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={signOut}
                    className="text-white/70 hover:text-white cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : null}
        </div>
      </div>
    </motion.header>
  );
}
