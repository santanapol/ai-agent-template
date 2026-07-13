import type { ReactNode, RefObject } from "react";

import {
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Code2,
  FileText,
  FlaskConical,
  Inbox,
  RotateCcw,
  Square,
} from "lucide-react";

import { LoadingButton } from "@/components/LoadingButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { fieldErrorIds } from "@/lib/fieldA11y";
import type { ScriptGateStatus } from "@/lib/smartReportScriptGate";
import { formatTestRunPreviewCount } from "@/lib/smartReportScriptGate";
import { cn } from "@/lib/utils";
import type { ScriptValidationError } from "@/types/smartReport";

import type { ScheduleOption } from "./smart-report/formatters";
import { MONTHLY_DAY_ITEMS, SCHEDULE_FREQUENCY_ITEMS, WEEKLY_DAY_ITEMS } from "./smart-report/formatters";

type EditorTab = "script" | "compiled";

const TEST_PREVIEW_MAX_COLUMNS = 8;

function formatTestPreviewMeta(
  recordCount: number,
  sampleLength: number,
  durationMs: number,
  dateRangeLabel: string | null | undefined,
): string {
  const parts = [formatTestRunPreviewCount(recordCount, sampleLength), `${durationMs}ms`];
  if (dateRangeLabel) parts.unshift(dateRangeLabel);
  return parts.join(" · ");
}

const scriptEditorTextareaClass =
  "field-sizing-fixed min-h-[280px] flex-1 resize-none overflow-y-auto rounded-none border-0 font-mono text-xs shadow-none focus-visible:ring-0 lg:min-h-0 lg:h-full";

export type ReportFormValues = {
  name: string;
  description: string;
  schedule: ScheduleOption;
  scheduleTime: string;
  scheduleDayOfWeek: number;
  scheduleDayOfMonth: number | "last";
  outputFormat: "csv" | "excel";
  query: string;
};

export interface SmartReportEditorProps {
  form: ReportFormValues;
  formErrors: Partial<Record<keyof ReportFormValues, string>>;
  onFieldChange: <K extends keyof ReportFormValues>(key: K, value: ReportFormValues[K]) => void;
  editorTab: EditorTab;
  onEditorTabChange: (tab: EditorTab) => void;
  compiledScript: string | null;
  validationErrors: ScriptValidationError[];
  isValidating: boolean;
  isTestRunning: boolean;
  scriptGateStatus: ScriptGateStatus;
  testRunPreview: {
    recordCount: number;
    durationMs: number;
    sample: Record<string, unknown>[];
    runParams?: { startDate: string; endDate: string };
  } | null;
  testRunPreviewTable: {
    columns: { key: string; title: string; dataIndex?: string }[];
    rows: Record<string, unknown>[];
  };
  testRunDateTagLabel: string | null | undefined;
  scriptEditorScrollRef: RefObject<HTMLDivElement | null>;
  validationAlertRef: RefObject<HTMLDivElement | null>;
  testRunPreviewRef: RefObject<HTMLDivElement | null>;
  onResetToExample: () => void;
  onValidateScript: () => void;
  onTestRunScript: () => void;
  onCancelTestRun: () => void;
  onQueryScriptChange: (value: string) => void;
}

export function SmartReportEditor({
  form,
  formErrors,
  onFieldChange,
  editorTab,
  onEditorTabChange,
  compiledScript,
  validationErrors,
  isValidating,
  isTestRunning,
  scriptGateStatus,
  testRunPreview,
  testRunPreviewTable,
  testRunDateTagLabel,
  scriptEditorScrollRef,
  validationAlertRef,
  testRunPreviewRef,
  onResetToExample,
  onValidateScript,
  onTestRunScript,
  onCancelTestRun,
  onQueryScriptChange,
}: SmartReportEditorProps) {
  const nameA11y = formErrors.name ? fieldErrorIds("report-name") : undefined;
  const scheduleTimeA11y = formErrors.scheduleTime ? fieldErrorIds("schedule-time") : undefined;
  const queryA11y = formErrors.query ? fieldErrorIds("report-query") : undefined;

  const compiledTab = (
    <TabsTrigger value="compiled" disabled={!compiledScript}>
      Compiled
    </TabsTrigger>
  );

  const reportNameField = (
    <Field data-invalid={!!formErrors.name}>
      <FieldLabel htmlFor="report-name">Report Name</FieldLabel>
      <Input
        id="report-name"
        value={form.name}
        placeholder="e.g. Active Staff Login Analytics Report"
        onChange={(e) => onFieldChange("name", e.target.value)}
        aria-invalid={!!formErrors.name}
        aria-describedby={nameA11y?.describedBy}
      />
      {formErrors.name ? (
        <FieldDescription id={nameA11y?.errorId} className="text-destructive">
          {formErrors.name}
        </FieldDescription>
      ) : null}
    </Field>
  );

  const validatePassed = scriptGateStatus === "validated" || scriptGateStatus === "tested";
  const testPassed = scriptGateStatus === "tested";
  const validateFailed = validationErrors.length > 0;
  const previewColumns = testRunPreviewTable.columns.slice(0, TEST_PREVIEW_MAX_COLUMNS);

  let validateVariant: "destructive" | "secondary" | "outline" = "outline";
  if (validateFailed) validateVariant = "destructive";
  else if (validatePassed) validateVariant = "secondary";

  const ValidateIcon = (() => {
    if (validatePassed) return CheckCircle2;
    if (validateFailed) return CircleAlert;
    return ClipboardCheck;
  })();

  let testPreviewBody: ReactNode = null;
  if (testRunPreviewTable.rows.length > 0) {
    testPreviewBody = (
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {previewColumns.map((col) => (
                <TableHead key={col.key} className="max-w-[160px] truncate text-xs">
                  {col.title}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {testRunPreviewTable.rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {previewColumns.map((col) => (
                  <TableCell key={col.key} className="max-w-[160px] truncate font-mono text-xs tabular-nums">
                    {String(row[col.dataIndex as string] ?? "-")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  } else if (testRunPreview && testRunPreview.recordCount > 0) {
    testPreviewBody = (
      <p className="text-muted-foreground text-pretty text-sm">
        {testRunPreview.recordCount} record(s) returned — preview rows could not be displayed.
      </p>
    );
  } else if (testRunPreview) {
    testPreviewBody = (
      <Empty className="border-none py-6">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Inbox aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No rows</EmptyTitle>
          <EmptyDescription>
            {testRunDateTagLabel ? `Query returned no rows for ${testRunDateTagLabel}` : "Query returned no rows"}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <p className="text-muted-foreground text-pretty text-sm">Adjust the query or date range and run again.</p>
        </EmptyContent>
      </Empty>
    );
  }

  const scriptActionButtons = (
    <>
      <LoadingButton
        size="sm"
        variant={validateVariant}
        loading={isValidating}
        aria-label={validatePassed ? "Validation passed" : "Validate script"}
        onClick={() => void onValidateScript()}
      >
        <ValidateIcon data-icon="inline-start" />
        Validate
      </LoadingButton>
      <LoadingButton
        size="sm"
        variant={testPassed ? "secondary" : "outline"}
        loading={isTestRunning}
        disabled={scriptGateStatus === "pending" || !compiledScript || isTestRunning}
        aria-label={testPassed ? "Test passed" : "Test script"}
        onClick={() => void onTestRunScript()}
      >
        {testPassed ? <CheckCircle2 data-icon="inline-start" /> : <FlaskConical data-icon="inline-start" />}
        Test
      </LoadingButton>
      {isTestRunning ? (
        <Button size="sm" variant="destructive" aria-label="Cancel test run" onClick={onCancelTestRun}>
          <Square data-icon="inline-start" />
          Cancel
        </Button>
      ) : null}
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="outline" size="sm" aria-label="Reset script to example" />}>
          <RotateCcw data-icon="inline-start" />
          Reset
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to example template?</AlertDialogTitle>
            <AlertDialogDescription>
              Your current script will be replaced with the default example.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onResetToExample}>
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className={cn("grid items-stretch gap-6 lg:grid-cols-[2fr_3fr]")}>
        <Card className="order-2 flex h-full flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-balance text-base">
              <Code2 data-icon="inline-start" aria-hidden="true" />
              Query Script
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
                <Tabs value={editorTab} onValueChange={(value) => onEditorTabChange(value as EditorTab)}>
                  <TabsList>
                    <TabsTrigger value="script">Script</TabsTrigger>
                    {!compiledScript ? (
                      <Tooltip>
                        <TooltipTrigger render={compiledTab} />
                        <TooltipContent>Validate script first</TooltipContent>
                      </Tooltip>
                    ) : (
                      compiledTab
                    )}
                  </TabsList>
                </Tabs>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{scriptActionButtons}</div>
              </div>

              {editorTab === "script" ? (
                <div ref={scriptEditorScrollRef} className="flex min-h-0 flex-1 flex-col">
                  <Field className="flex min-h-0 flex-1 flex-col" data-invalid={!!formErrors.query}>
                    <Textarea
                      id="report-query"
                      value={form.query}
                      onChange={(e) => onQueryScriptChange(e.target.value)}
                      className={scriptEditorTextareaClass}
                      placeholder="// Read-only MongoDB script — Reset loads example template"
                      aria-label="Query script"
                      aria-invalid={!!formErrors.query}
                      aria-describedby={queryA11y?.describedBy}
                    />
                    {formErrors.query ? (
                      <FieldDescription id={queryA11y?.errorId} className="px-3 pb-3 text-destructive">
                        {formErrors.query}
                      </FieldDescription>
                    ) : null}
                  </Field>
                </div>
              ) : (
                <Textarea
                  readOnly
                  value={compiledScript ?? ""}
                  className={cn(scriptEditorTextareaClass, "flex-1")}
                  aria-label="Compiled script"
                />
              )}
            </div>

            {validationErrors.length > 0 ? (
              <div ref={validationAlertRef} className="mt-4">
                <Alert variant="destructive">
                  <AlertTitle>Validation errors</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-2 flex flex-col gap-1">
                      {validationErrors.map((err, index) => (
                        <li key={index} className="font-mono text-xs">
                          {err.line != null ? `Line ${err.line}: ` : ""}
                          {err.message}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="order-1 flex h-full flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-balance text-base">
              <FileText data-icon="inline-start" aria-hidden="true" />
              General Info & Scheduler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              {reportNameField}
              <Field>
                <FieldLabel htmlFor="report-description">Description</FieldLabel>
                <Textarea
                  id="report-description"
                  rows={2}
                  value={form.description}
                  placeholder="Specify report purpose and data schema"
                  onChange={(e) => onFieldChange("description", e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Output Format</FieldLabel>
                <ToggleGroup
                  variant="outline"
                  size="sm"
                  spacing={0}
                  value={[form.outputFormat]}
                  onValueChange={(value) => {
                    const next = value[0];
                    if (!next) return;
                    onFieldChange("outputFormat", next as ReportFormValues["outputFormat"]);
                  }}
                  className="flex w-full flex-wrap"
                >
                  <ToggleGroupItem
                    value="csv"
                    className="flex-1 data-[pressed]:border-primary data-[pressed]:bg-primary/10 data-[pressed]:font-medium"
                  >
                    CSV (.csv)
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="excel"
                    className="flex-1 data-[pressed]:border-primary data-[pressed]:bg-primary/10 data-[pressed]:font-medium"
                  >
                    Excel (.xlsx)
                  </ToggleGroupItem>
                </ToggleGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor="schedule">Schedule Frequency</FieldLabel>
                <Select
                  value={form.schedule}
                  items={SCHEDULE_FREQUENCY_ITEMS}
                  onValueChange={(value) => onFieldChange("schedule", value as ScheduleOption)}
                >
                  <SelectTrigger id="schedule" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {SCHEDULE_FREQUENCY_ITEMS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              {form.schedule !== "manual" ? (
                <>
                  {form.schedule === "weekly" ? (
                    <Field>
                      <FieldLabel htmlFor="schedule-dow">Run Day</FieldLabel>
                      <Select
                        value={String(form.scheduleDayOfWeek)}
                        items={WEEKLY_DAY_ITEMS}
                        onValueChange={(value) => onFieldChange("scheduleDayOfWeek", Number(value))}
                      >
                        <SelectTrigger id="schedule-dow" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {WEEKLY_DAY_ITEMS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  ) : null}
                  {form.schedule === "monthly" ? (
                    <Field>
                      <FieldLabel htmlFor="schedule-dom">Run Day</FieldLabel>
                      <Select
                        value={String(form.scheduleDayOfMonth)}
                        items={MONTHLY_DAY_ITEMS}
                        onValueChange={(value) =>
                          onFieldChange("scheduleDayOfMonth", value === "last" ? "last" : Number(value))
                        }
                      >
                        <SelectTrigger id="schedule-dom" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {MONTHLY_DAY_ITEMS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  ) : null}
                  <Field data-invalid={!!formErrors.scheduleTime}>
                    <FieldLabel htmlFor="schedule-time">Run Time</FieldLabel>
                    <Input
                      id="schedule-time"
                      type="time"
                      value={form.scheduleTime}
                      onChange={(e) => onFieldChange("scheduleTime", e.target.value)}
                      aria-invalid={!!formErrors.scheduleTime}
                      aria-describedby={scheduleTimeA11y?.describedBy}
                    />
                    {formErrors.scheduleTime ? (
                      <FieldDescription id={scheduleTimeA11y?.errorId} className="text-destructive">
                        {formErrors.scheduleTime}
                      </FieldDescription>
                    ) : null}
                  </Field>
                </>
              ) : null}
            </FieldGroup>
          </CardContent>
        </Card>
      </div>

      {testRunPreview ? (
        <div ref={testRunPreviewRef}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-balance text-base">
                <FlaskConical data-icon="inline-start" aria-hidden="true" />
                Test preview
              </CardTitle>
              <CardDescription className="text-pretty tabular-nums">
                {formatTestPreviewMeta(
                  testRunPreview.recordCount,
                  testRunPreview.sample.length,
                  testRunPreview.durationMs,
                  testRunDateTagLabel,
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">{testPreviewBody}</CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
