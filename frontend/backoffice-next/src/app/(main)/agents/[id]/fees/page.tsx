"use client";

import { PermissionGuard } from "@/components/PermissionGuard";
import AgentFeesPage from "@/views/agent-fees/AgentFeesPage";

export default function AgentFeesRoutePage() {
  return (
    <PermissionGuard required="agents:fees">
      <AgentFeesPage />
    </PermissionGuard>
  );
}
