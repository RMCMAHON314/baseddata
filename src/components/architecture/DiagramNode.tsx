import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiagramNodeProps {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  variant: 'primary' | 'secondary' | 'accent' | 'muted';
  stats?: { label: string; value: string | number }[];
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
  position: { x: number; y: number };
}

const variantStyles = {
  primary: 'bg-primary/20 border-primary text-primary-foreground hover:bg-primary/30',
  secondary: 'bg-secondary/20 border-secondary text-secondary-foreground hover:bg-secondary/30',
  accent: 'bg-accent/20 border-accent text-accent-foreground hover:bg-accent/30',
  muted: 'bg-muted/20 border-muted-foreground/30 text-muted-foreground hover:bg-muted/30',
};

export function DiagramNode({
  id,
  label,
  description,
  icon: Icon,
  variant,
  stats,
  isActive,
  onClick,
  className,
  position,
}: DiagramNodeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.3, delay: Math.random() * 0.3 }}
      onClick={onClick}
      className={cn(
        'absolute cursor-pointer rounded-xl border-2 p-4 backdrop-blur-sm transition-all duration-300',
        variantStyles[variant],
        isActive && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        className
      )}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'rounded-lg p-2',
          variant === 'primary' && 'bg-primary/30',
          variant === 'secondary' && 'bg-secondary/30',
          variant === 'accent' && 'bg-accent/30',
          variant === 'muted' && 'bg-muted/30',
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">{label}</h3>
          {description && (
            <p className="text-xs opacity-70 max-w-[120px] truncate">{description}</p>
          )}
        </div>
      </div>
      
      {stats && stats.length > 0 && (
        <div className="mt-3 flex gap-3 text-xs">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="font-bold">{stat.value}</div>
              <div className="opacity-60">{stat.label}</div>
            </div>
          ))}
        </div>
      )}
      
      {isActive && (
        <motion.div
          className="absolute -inset-1 rounded-xl border-2 border-primary/50"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}
