"use client";

import { PermissionGuard } from "@/components/PermissionGuard";
import StaffProfilePage from "@/views/StaffProfilePage";

export default function StaffCreatePage() {
  return (
    <PermissionGuard required="profiles:create">
      <StaffProfilePage mode="create" />
    </PermissionGuard>
  );
}
