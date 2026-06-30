export type ScriptGateStatus = 'pending' | 'validated' | 'tested';

export function scriptRequiresGate(
  editingReport: unknown | null,
  baselineScript: string | null,
  queryValue: string | undefined,
): boolean {
  return (
    editingReport === null ||
    (baselineScript !== null && (queryValue ?? '') !== baselineScript)
  );
}

export function canSaveScript(
  requiresGate: boolean,
  gateStatus: ScriptGateStatus,
  testRunToken: string | null,
  compiledScript: string | null,
): boolean {
  return (
    !requiresGate ||
    (gateStatus === 'tested' && !!testRunToken && !!compiledScript)
  );
}
