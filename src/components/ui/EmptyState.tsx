import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({ title, description, actionLabel, onAction, icon: Icon = Inbox }: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="h-10 w-10 text-muted-foreground/50 mb-3" />
      <div className="text-foreground text-lg font-semibold mb-2">{title}</div>
      <div className="text-muted-foreground text-sm max-w-md mb-4">{description}</div>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}
