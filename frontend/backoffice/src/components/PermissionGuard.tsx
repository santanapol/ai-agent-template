import React from 'react';
import { Spin } from 'antd';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermission } from '../hooks/usePermission';

interface PermissionGuardProps {
  required: string;
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({ required, children }) => {
  const { user, loading, menuLoading } = useAuth();
  const hasPermission = usePermission(required);

  if (loading || menuLoading) {
    return <Spin size="large" fullscreen />;
  }

  if (!user || !hasPermission) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};
