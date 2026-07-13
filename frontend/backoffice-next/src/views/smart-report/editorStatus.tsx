import { Badge } from "@/components/ui/badge";
import type { ScriptGateStatus } from "@/lib/smartReportScriptGate";

import { getEditorGateBadgeLabel } from "./editorCopy";

export function EditorStatusBadges({
  gateStatus,
  scriptRequiresGate,
}: {
  gateStatus: ScriptGateStatus;
  scriptRequiresGate: boolean;
}) {
  const gateLabel = getEditorGateBadgeLabel(gateStatus, scriptRequiresGate);

  return <Badge variant={gateLabel === "Ready to save" ? "default" : "secondary"}>{gateLabel}</Badge>;
}
