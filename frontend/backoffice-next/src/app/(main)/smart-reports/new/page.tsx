"use client";

import { PermissionGuard } from "@/components/PermissionGuard";
import SmartReportEditorPage from "@/views/SmartReportEditorPage";

export default function SmartReportNewPage() {
  return (
    <PermissionGuard required="reports:smart">
      <SmartReportEditorPage mode="create" />
    </PermissionGuard>
  );
}
