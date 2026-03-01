// Protected Route wrapper — redirects unauthenticated users
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md px-8">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location.pathname, authRequired: true }} replace />;
  }

  return <>{children}</>;
}
