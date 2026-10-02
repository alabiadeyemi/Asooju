import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { hasAdminSession } from "@/lib/admin-session";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Require operator admin session (ADMIN_EMAIL / ADMIN_PASSWORD) */
  requireAdmin?: boolean;
  /** When admin gate fails, send to /admin/login instead of /app */
  adminLoginRedirect?: boolean;
}

export const ProtectedRoute = ({
  children,
  requireAdmin = false,
  adminLoginRedirect = false,
}: ProtectedRouteProps) => {
  const { user, loading, mustOnboard } = useAuth();
  const location = useLocation();

  // Admin console is separate from builder Auth
  if (requireAdmin) {
    if (!hasAdminSession()) {
      return <Navigate to="/admin/login" replace />;
    }
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020202] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to={adminLoginRedirect ? "/admin/login" : "/auth/login"}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // Finish onboarding before app shell (guests skip).
  if (mustOnboard && !location.pathname.startsWith("/auth/")) {
    return <Navigate to="/auth/onboarding" replace />;
  }

  return <>{children}</>;
};
