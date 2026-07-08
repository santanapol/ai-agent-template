"use client";

import { PermissionGuard } from "@/components/PermissionGuard";
import AgentsList from "@/views/agents/AgentsList";

export default function AgentsPage() {
  return (
    <PermissionGuard required="agents:list">
      <AgentsList />
    </PermissionGuard>
  );
}
