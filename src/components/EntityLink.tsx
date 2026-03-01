// Based Data - Clickable Entity Link Component
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface EntityLinkProps {
  id?: string;
  name: string;
  className?: string;
  children?: React.ReactNode;
}

export function EntityLink({ id, name, className, children }: EntityLinkProps) {
  if (!id) {
    return <span className={cn("", className)}>{children || name}</span>;
  }
  return (
    <Link 
      to={`/entity/${id}`}
      className={cn("hover:text-primary hover:underline transition-colors", className)}
    >
      {children || name}
    </Link>
  );
}

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
      className={cn("block hover:bg-muted/50 transition-colors cursor-pointer", className)}
    >
      {children}
    </Link>
  );
}
