"use client";

import { PermissionGuard } from "@/components/PermissionGuard";
import SmartReport from "@/views/SmartReport";

export default function SmartReportsPage() {
  return (
    <PermissionGuard required="reports:smart">
      <SmartReport />
    </PermissionGuard>
  );
}
