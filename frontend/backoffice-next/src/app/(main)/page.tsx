"use client";

import { PermissionGuard } from "@/components/PermissionGuard";
import Dashboard from "@/views/Dashboard";

export default function DashboardPage() {
  return (
    <PermissionGuard required="dashboard:view">
      <Dashboard />
    </PermissionGuard>
  );
}
