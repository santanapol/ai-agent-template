"use client";

import { PermissionGuard } from "@/components/PermissionGuard";
import StaffProfilePage from "@/views/StaffProfilePage";

export default function StaffDetailPage() {
  return (
    <PermissionGuard required="profiles:list">
      <StaffProfilePage mode="view" />
    </PermissionGuard>
  );
}
