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
      className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border"
    >
      <div className="container mx-auto px-8 h-16 flex items-center justify-between">
        <Logo size="sm" />
        
        <div className="flex items-center gap-4">
          {user && profile ? (
            <>
              <CreditBadge credits={profile.credits_balance} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <User className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background border-border">
                  <DropdownMenuItem className="text-muted-foreground">
                    {profile.full_name || user.email}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={signOut}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
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
