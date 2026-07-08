"use client";

import { PermissionGuard } from "@/components/PermissionGuard";
import PermissionAdmin from "@/views/permission-admin/PermissionAdmin";

export default function PermissionsPage() {
  return (
    <PermissionGuard required="permissions:manage">
      <PermissionAdmin />
    </PermissionGuard>
  );
}
