import { Navigate, Outlet, useParams } from "react-router-dom";
import { useAuth } from "./use-auth";
import { isOuLevelRole } from "./permissions";
import type { UserRole } from "./auth-context";

export function RoleGuard({ allow }: { allow: UserRole[] }) {
  const { session } = useAuth();
  if (!allow.includes(session.role)) {
    return <Navigate to="/forbidden" replace />;
  }
  return <Outlet />;
}

export function ScopeGuard() {
  const { session } = useAuth();
  const { ouId, branchId } = useParams();

  if (!ouId || !branchId) {
    return <Navigate to="/forbidden" replace />;
  }

  if (session.ouId !== ouId) {
    return <Navigate to="/forbidden" replace />;
  }

  if (isOuLevelRole(session.role)) {
    return <Outlet />;
  }

  if (session.branchId !== branchId) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
}
