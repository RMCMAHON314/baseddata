// Based Data - Clickable Entity Link Component
// Use this throughout the app to make entity names clickable

import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface EntityLinkProps {
  id: string;
  name: string;
  className?: string;
  children?: React.ReactNode;
}

export function EntityLink({ id, name, className, children }: EntityLinkProps) {
  return (
    <Link 
      to={`/entity/${id}`}
      className={cn(
        "hover:text-primary hover:underline transition-colors",
        className
      )}
    >
      {children || name}
    </Link>
  );
}

// For use in tables or lists where you want the full row clickable
export function EntityLinkRow({ 
  id, 
  children, 
  className 
}: { 
  id: string; 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <Link 
      to={`/entity/${id}`}
      className={cn(
        "block hover:bg-muted/50 transition-colors cursor-pointer",
        className
      )}
    >
      {children}
    </Link>
  );
}
