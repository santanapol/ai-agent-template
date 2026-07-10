import type { RefObject } from "react";

import { CheckCircle2, Code2, FileText, FlaskConical, Inbox, RotateCcw, Square } from "lucide-react";

import { DescriptionList } from "@/components/DescriptionList";
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
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import type { Report, ScriptValidationError } from "@/types/smartReport";

import type { ScheduleOption } from "./smart-report/formatters";

type EditorTab = "script" | "compiled";

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

function GateSteps({
  current,
  validateStatus,
}: {
  current: number;
  validateStatus?: "wait" | "process" | "finish" | "error";
}) {
  const steps = ["Edit script", "Validate", "Test run", "Save"];
  return (
    <ol className="mb-6 flex flex-wrap gap-2 text-sm">
      {steps.map((label, index) => {
        const isCurrent = index === current;
        const isPast = index < current;
        const isValidate = index === 1 && validateStatus === "error";
        return (
          <li
            key={label}
            aria-current={isCurrent ? "step" : undefined}
            className={cn(
              "rounded-full border px-3 py-1",
              isCurrent && "border-primary bg-primary/10 font-medium",
              isPast && "text-muted-foreground",
              isValidate && "border-destructive text-destructive",
            )}
          >
            {label}
          </li>
        );
      })}
    </ol>
  );
}

export interface SmartReportEditorProps {
  editingReport: Report | null;
  form: ReportFormValues;
  formErrors: Partial<Record<keyof ReportFormValues, string>>;
  onFieldChange: <K extends keyof ReportFormValues>(key: K, value: ReportFormValues[K]) => void;
  showGateAlert: boolean;
  saveGateHint: string | null | undefined;
  scriptGateStep: { current: number; validateStatus?: "wait" | "process" | "finish" | "error" };
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
  canSaveScript: boolean;
  saveButtonTooltip: string | null | undefined;
  isSaving: boolean;
  onCancelEdit: () => void;
  onSaveReport: () => void;
  onResetToExample: () => void;
  onValidateScript: () => void;
  onTestRunScript: () => void;
  onCancelTestRun: () => void;
  onQueryScriptChange: (value: string) => void;
}

export function SmartReportEditor({
  editingReport,
  form,
  formErrors,
  onFieldChange,
  showGateAlert,
  saveGateHint,
  scriptGateStep,
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
  canSaveScript,
  saveButtonTooltip,
  isSaving,
  onCancelEdit,
  onSaveReport,
  onResetToExample,
  onValidateScript,
  onTestRunScript,
  onCancelTestRun,
  onQueryScriptChange,
}: SmartReportEditorProps) {
  const editActions = (
    <div className="flex gap-2">
      <Button variant="outline" onClick={onCancelEdit}>
        Cancel
      </Button>
      <Tooltip>
        <TooltipTrigger
          render={
            <span>
              <LoadingButton loading={isSaving} disabled={!canSaveScript} onClick={() => void onSaveReport()}>
                Save Report Script
              </LoadingButton>
            </span>
          }
        />
        {saveButtonTooltip ? <TooltipContent>{saveButtonTooltip}</TooltipContent> : null}
      </Tooltip>
    </div>
  );

  const nameA11y = formErrors.name ? fieldErrorIds("report-name") : undefined;
  const scheduleTimeA11y = formErrors.scheduleTime ? fieldErrorIds("schedule-time") : undefined;
  const queryA11y = formErrors.query ? fieldErrorIds("report-query") : undefined;

  return (
    <Card>
      <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <CardTitle className="text-xl leading-none">{editingReport?.name ?? "New report"}</CardTitle>
        <CardDescription className="max-w-sm leading-snug">
          Configure report script, validation, and schedule.
        </CardDescription>
        <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap items-end justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
          {editActions}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 pt-6">
        {showGateAlert ? (
          <Alert variant="default">
            <AlertTitle>Save blocked</AlertTitle>
            <AlertDescription>{saveGateHint}</AlertDescription>
          </Alert>
        ) : null}

        <GateSteps current={scriptGateStep.current} validateStatus={scriptGateStep.validateStatus} />

        <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText data-icon="inline-start" className="text-primary" aria-hidden="true" />
                General Info & Scheduler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
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
                <Field>
                  <FieldLabel htmlFor="report-description">Description</FieldLabel>
                  <Input
                    id="report-description"
                    value={form.description}
                    placeholder="Specify report purpose and data schema"
                    onChange={(e) => onFieldChange("description", e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Output Format</FieldLabel>
                  <ToggleGroup
                    value={[form.outputFormat]}
                    onValueChange={(value) => {
                      const next = value[0];
                      if (!next) return;
                      onFieldChange("outputFormat", next as ReportFormValues["outputFormat"]);
                    }}
                    className="flex w-full flex-wrap"
                  >
                    <ToggleGroupItem value="csv" variant="outline" size="sm">
                      CSV (.csv)
                    </ToggleGroupItem>
                    <ToggleGroupItem value="excel" variant="outline" size="sm">
                      Excel (.xlsx)
                    </ToggleGroupItem>
                  </ToggleGroup>
                </Field>
                <Field>
                  <FieldLabel htmlFor="schedule">Schedule Frequency</FieldLabel>
                  <Select
                    value={form.schedule}
                    onValueChange={(value) => onFieldChange("schedule", value as ScheduleOption)}
                  >
                    <SelectTrigger id="schedule" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
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
                          onValueChange={(value) => onFieldChange("scheduleDayOfWeek", Number(value))}
                        >
                          <SelectTrigger id="schedule-dow" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="1">Monday</SelectItem>
                              <SelectItem value="2">Tuesday</SelectItem>
                              <SelectItem value="3">Wednesday</SelectItem>
                              <SelectItem value="4">Thursday</SelectItem>
                              <SelectItem value="5">Friday</SelectItem>
                              <SelectItem value="6">Saturday</SelectItem>
                              <SelectItem value="0">Sunday</SelectItem>
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
                          onValueChange={(value) =>
                            onFieldChange("scheduleDayOfMonth", value === "last" ? "last" : Number(value))
                          }
                        >
                          <SelectTrigger id="schedule-dom" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="last">Last day of month</SelectItem>
                              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                <SelectItem key={day} value={String(day)}>
                                  Day {day}
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Code2 data-icon="inline-start" className="text-primary" aria-hidden="true" />
                Query Script
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-t-lg border border-b-0 bg-muted/30 px-3 py-2">
                <Tabs value={editorTab} onValueChange={(value) => onEditorTabChange(value as EditorTab)}>
                  <TabsList>
                    <TabsTrigger value="script">Script</TabsTrigger>
                    <TabsTrigger value="compiled" disabled={!compiledScript}>
                      Compiled
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="flex flex-wrap gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>
                      <RotateCcw data-icon="inline-start" />
                      Reset to Example
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
                  <LoadingButton
                    size="sm"
                    variant="outline"
                    loading={isValidating}
                    onClick={() => void onValidateScript()}
                  >
                    <CheckCircle2 data-icon="inline-start" />
                    Validate
                  </LoadingButton>
                  <LoadingButton
                    size="sm"
                    variant="outline"
                    loading={isTestRunning}
                    disabled={scriptGateStatus === "pending" || !compiledScript || isTestRunning}
                    onClick={() => void onTestRunScript()}
                  >
                    <FlaskConical data-icon="inline-start" />
                    Test Run
                  </LoadingButton>
                  {isTestRunning ? (
                    <Button size="sm" variant="destructive" onClick={onCancelTestRun}>
                      <Square data-icon="inline-start" />
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </div>

              {editorTab === "script" ? (
                <div ref={scriptEditorScrollRef}>
                  <Field data-invalid={!!formErrors.query}>
                    <FieldLabel htmlFor="report-query">Query Script</FieldLabel>
                    <Textarea
                      id="report-query"
                      value={form.query}
                      onChange={(e) => onQueryScriptChange(e.target.value)}
                      className="min-h-[280px] rounded-t-none font-mono text-xs"
                      placeholder="// Query example…"
                      aria-invalid={!!formErrors.query}
                      aria-describedby={queryA11y?.describedBy}
                    />
                    {formErrors.query ? (
                      <FieldDescription id={queryA11y?.errorId} className="text-destructive">
                        {formErrors.query}
                      </FieldDescription>
                    ) : null}
                  </Field>
                </div>
              ) : (
                <Textarea
                  readOnly
                  value={compiledScript ?? ""}
                  className="min-h-[280px] rounded-t-none font-mono text-xs"
                />
              )}

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

              <Collapsible className="mt-4">
                <CollapsibleTrigger className="font-medium text-primary text-sm">Script workflow</CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-muted-foreground text-sm">
                    <li>Validate compiles without querying the database.</li>
                    <li>Test run uses yesterday&apos;s params.startDate / params.endDate when referenced.</li>
                    <li>Save unlocks after a successful test run when the script changed.</li>
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </div>

        {testRunPreview ? (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FlaskConical data-icon="inline-start" className="text-primary" aria-hidden="true" />
                Test run preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scriptGateStatus === "tested" ? (
                <Alert className="mb-4">
                  <AlertTitle>Test run succeeded</AlertTitle>
                </Alert>
              ) : null}
              <DescriptionList
                items={[
                  ...(testRunDateTagLabel ? [{ label: "Date range", value: testRunDateTagLabel }] : []),
                  {
                    label: "Records",
                    value: formatTestRunPreviewCount(testRunPreview.recordCount, testRunPreview.sample.length),
                  },
                  { label: "Duration", value: `${testRunPreview.durationMs}ms` },
                ]}
              />
              {testRunPreviewTable.rows.length > 0 ? (
                <div className="mt-4 overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {testRunPreviewTable.columns.map((col) => (
                          <TableHead key={col.key}>{col.title}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {testRunPreviewTable.rows.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {testRunPreviewTable.columns.map((col) => (
                            <TableCell key={col.key}>{String(row[col.dataIndex as string] ?? "-")}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : testRunPreview.recordCount > 0 ? (
                <p className="mt-4 text-muted-foreground text-sm">
                  {testRunPreview.recordCount} record(s) returned — preview rows could not be displayed.
                </p>
              ) : (
                <Empty className="mt-4">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Inbox aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>No rows</EmptyTitle>
                    <EmptyDescription>
                      {testRunDateTagLabel
                        ? `Query returned no rows for ${testRunDateTagLabel}`
                        : "Query returned no rows"}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <p className="text-muted-foreground text-sm">Adjust the query or date range and run again.</p>
                  </EmptyContent>
                </Empty>
              )}
            </CardContent>
          </Card>
        ) : null}
      </CardContent>
    </Card>
  );
}
