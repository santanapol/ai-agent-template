import type { ScriptGateStatus } from "@/lib/smartReportScriptGate";

export type SmartReportEditorMode = "create" | "edit";

export function getEditorSaveLabel(mode: SmartReportEditorMode): string {
  return mode === "create" ? "Create report" : "Save changes";
}

export function getEditorPageDescription(
  mode: SmartReportEditorMode,
  gateStatus: ScriptGateStatus,
  description: string,
  scriptRequiresGate: boolean,
): string {
  const trimmed = description.trim();
  if (trimmed) return trimmed;

  if (!scriptRequiresGate) {
    return mode === "create"
      ? "Name your report, edit the query, then validate."
      : "Script unchanged — save metadata anytime.";
  }

  switch (gateStatus) {
    case "validated":
      return "Script compiles — run a test before saving.";
    case "tested":
      return mode === "create" ? "Test passed — save to create this report." : "Test passed — save changes.";
    default:
      return mode === "create" ? "Name your report, edit the query, then validate." : "Edit the query, then validate.";
  }
}

export function getEditorGateBadgeLabel(gateStatus: ScriptGateStatus, scriptRequiresGate: boolean): string {
  if (!scriptRequiresGate || gateStatus === "tested") {
    return "Ready to save";
  }
  return "Draft";
}
