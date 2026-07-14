"use client";

import { PermissionGuard } from "@/components/PermissionGuard";
import ChannelPerformancePage from "@/views/branch-report/marketing/ChannelPerformancePage";

export default function ChannelPerformanceRoutePage() {
  return (
    <PermissionGuard required="branch-report:marketing:channel-performance:read">
      <ChannelPerformancePage />
    </PermissionGuard>
  );
}
