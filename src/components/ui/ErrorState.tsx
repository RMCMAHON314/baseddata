import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="h-10 w-10 text-destructive mb-3" />
      <div className="text-destructive text-lg font-semibold mb-2">Something went wrong</div>
      <div className="text-muted-foreground text-sm mb-4">{message || "Failed to load data. Please try again."}</div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>
      )}
    </div>
  );
}
