"use client";

import { PermissionGuard } from "@/components/PermissionGuard";
import InvoiceList from "@/views/invoices/InvoiceList";

export default function InvoicesPage() {
  return (
    <PermissionGuard required="invoices:list">
      <InvoiceList />
    </PermissionGuard>
  );
}
