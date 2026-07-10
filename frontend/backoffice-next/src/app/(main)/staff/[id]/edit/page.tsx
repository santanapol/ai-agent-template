"use client";

import { PermissionGuard } from "@/components/PermissionGuard";
import StaffProfilePage from "@/views/StaffProfilePage";

export default function StaffEditPage() {
  return (
    <PermissionGuard required="profiles:edit">
      <StaffProfilePage mode="edit" />
    </PermissionGuard>
  );
}
