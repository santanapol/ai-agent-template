"use client";

import { PermissionGuard } from "@/components/PermissionGuard";
import StaffManagement from "@/views/StaffManagement";

export default function StaffPage() {
  return (
    <PermissionGuard required="profiles:list">
      <StaffManagement />
    </PermissionGuard>
  );
}
