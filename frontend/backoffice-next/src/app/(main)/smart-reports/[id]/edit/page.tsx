"use client";

import { PermissionGuard } from "@/components/PermissionGuard";
import SmartReportEditorPage from "@/views/SmartReportEditorPage";

export default function SmartReportEditPage() {
  return (
    <PermissionGuard required="reports:smart">
      <SmartReportEditorPage mode="edit" />
    </PermissionGuard>
  );
}
