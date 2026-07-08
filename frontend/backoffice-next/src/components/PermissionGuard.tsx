import type React from "react";

import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { usePermission } from "@/hooks/usePermission";
import { Navigate } from "@/navigation/compat";

interface PermissionGuardProps {
  required: string;
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({ required, children }) => {
  const { user, loading, menuLoading } = useAuth();
  const hasPermission = usePermission(required);

  if (loading || menuLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!user || !hasPermission) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};
