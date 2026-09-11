import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Require app_metadata.role === "admin" or email in VITE_ADMIN_EMAILS */
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, loading, isAdmin, isGuest, mustOnboard } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020202] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;
  }

  // Finish onboarding before app shell (guests skip)
  if (mustOnboard && !location.pathname.startsWith("/auth/")) {
    return <Navigate to="/auth/onboarding" replace />;
  }

  if (requireAdmin && (isGuest || !isAdmin)) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};
