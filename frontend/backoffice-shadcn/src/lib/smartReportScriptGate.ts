export type ScriptGateStatus = 'pending' | 'validated' | 'tested';

export type TestRunPreviewRow = Record<string, unknown> & { key: number };

export type TestRunRunParams = {
  startDate: string;
  endDate: string;
};

export type EditorSnapshot = {
  formValues: Record<string, unknown>;
  script: string;
};

export type ScriptGateStepState = {
  current: number;
  validateStatus?: 'error';
};

function formatUtcClock(date: Date): string {
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatUtcDateTime(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day} ${formatUtcClock(date)}`;
}

function isSameUtcDay(start: Date, end: Date): boolean {
  return start.toISOString().slice(0, 10) === end.toISOString().slice(0, 10);
}

export function formatTestRunPreviewCount(recordCount: number, sampleLength: number): string {
  const shown = Math.min(sampleLength, recordCount);
  if (recordCount === 0) return '0 record(s)';
  if (shown >= recordCount) return `${recordCount} record(s)`;
  return `Preview ${shown} of ${recordCount} record(s)`;
}

export function scriptUsesRunDateParams(script: string): boolean {
  return /\bparams\.(startDate|endDate)\b/.test(script);
}

export function formatTestRunParamsRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'invalid date range';
  }

  const startLabel = formatUtcDateTime(start);
  if (isSameUtcDay(start, end)) {
    return `${startLabel} – ${formatUtcClock(end)} UTC`;
  }

  return `${startLabel} – ${formatUtcDateTime(end)} UTC`;
}

export function getTestRunDateTagLabel(
  script: string | undefined,
  runParams?: TestRunRunParams,
): string | null {
  if (!runParams || !script?.trim() || !scriptUsesRunDateParams(script)) {
    return null;
  }
  return formatTestRunParamsRange(runParams.startDate, runParams.endDate);
}

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

/** Hint shown when Save is disabled due to the script gate. */
export function getSaveGateHint(
  requiresGate: boolean,
  gateStatus: ScriptGateStatus,
): string | null {
  if (!requiresGate) return null;
  if (gateStatus === 'pending') return 'Validate script first';
  if (gateStatus === 'validated') return 'Run test before saving';
  return null;
}

/** Maps gate status to antd Steps `current` (0 = Edit script … 3 = Save). */
export function getScriptGateStep(
  gateStatus: ScriptGateStatus,
  hasValidationErrors: boolean,
  requiresGate = true,
): ScriptGateStepState {
  if (!requiresGate) {
    return { current: 3 };
  }
  if (hasValidationErrors) {
    return { current: 1, validateStatus: 'error' };
  }
  if (gateStatus === 'pending') return { current: 0 };
  if (gateStatus === 'validated') return { current: 2 };
  return { current: 3 };
}

function normalizeFormValuesForCompare(values: Record<string, unknown>): string {
  const normalized = { ...values };
  const scheduleTime = normalized.scheduleTime;
  if (
    scheduleTime &&
    typeof scheduleTime === 'object' &&
    'hour' in scheduleTime &&
    typeof (scheduleTime as { hour: () => number }).hour === 'function'
  ) {
    const time = scheduleTime as { hour: () => number; minute: () => number };
    normalized.scheduleTime = `${time.hour()}:${time.minute()}`;
  }
  return JSON.stringify(normalized);
}

/** True when form fields or script differ from the editor open snapshot. */
export function isEditorDirty(current: EditorSnapshot, baseline: EditorSnapshot | null): boolean {
  if (!baseline) return false;
  if ((current.script ?? '') !== (baseline.script ?? '')) return true;
  return (
    normalizeFormValuesForCompare(current.formValues) !==
    normalizeFormValuesForCompare(baseline.formValues)
  );
}

export function renderPreviewCell(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function normalizeTestRunSample(
  sample: Record<string, unknown>[],
): { columns: string[]; rows: TestRunPreviewRow[] } {
  if (sample.length === 0) {
    return { columns: [], rows: [] };
  }

  const first = sample[0];
  if (first === null || first === undefined || typeof first !== 'object' || Array.isArray(first)) {
    return {
      columns: ['value'],
      rows: sample.map((row, index) => ({ key: index, value: row })),
    };
  }

  const columns = Object.keys(first);
  if (columns.length === 0) {
    return { columns: [], rows: [] };
  }

  return {
    columns,
    rows: sample.map((row, index) => ({ ...row, key: index })),
  };
}

export function buildPreviewTable(sample: Record<string, unknown>[] = []) {
  const { columns, rows } = normalizeTestRunSample(sample);
  return {
    rows,
    columns: columns.map((key) => ({
      title: key,
      dataIndex: key,
      key,
      ellipsis: true,
      render: renderPreviewCell,
    })),
  };
}
