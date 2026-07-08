"use client";

import { PermissionGuard } from "@/components/PermissionGuard";
import InvoiceDetail from "@/views/invoices/InvoiceDetail";

export default function InvoiceDetailPage() {
  return (
    <PermissionGuard required="invoices:read">
      <InvoiceDetail />
    </PermissionGuard>
  );
}
