import { createRef } from "react";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { type ReportFormValues, SmartReportEditor } from "./SmartReportEditor";

const baseForm: ReportFormValues = {
  name: "Test Report",
  description: "Desc",
  schedule: "manual",
  scheduleTime: "09:00",
  scheduleDayOfWeek: 1,
  scheduleDayOfMonth: 1,
  outputFormat: "csv",
  query: "SELECT 1",
};

function renderEditor(overrides: Partial<Parameters<typeof SmartReportEditor>[0]> = {}) {
  const onSaveReport = vi.fn();
  const onValidateScript = vi.fn();
  const onTestRunScript = vi.fn();
  const onCancelTestRun = vi.fn();

  render(
    <SmartReportEditor
      editingReport={null}
      form={baseForm}
      formErrors={{}}
      onFieldChange={vi.fn()}
      showGateAlert={false}
      saveGateHint={null}
      scriptGateStep={{ current: 0 }}
      editorTab="script"
      onEditorTabChange={vi.fn()}
      compiledScript="compiled sql"
      validationErrors={[]}
      isValidating={false}
      isTestRunning={false}
      scriptGateStatus="valid"
      testRunPreview={null}
      testRunPreviewTable={{ columns: [], rows: [] }}
      testRunDateTagLabel={null}
      scriptEditorScrollRef={createRef()}
      validationAlertRef={createRef()}
      canSaveScript
      saveButtonTooltip={null}
      isSaving={false}
      onCancelEdit={vi.fn()}
      onSaveReport={onSaveReport}
      onResetToExample={vi.fn()}
      onValidateScript={onValidateScript}
      onTestRunScript={onTestRunScript}
      onCancelTestRun={onCancelTestRun}
      onQueryScriptChange={vi.fn()}
      {...overrides}
    />,
  );

  return { onSaveReport, onValidateScript, onTestRunScript, onCancelTestRun };
}

describe("SmartReportEditor", () => {
  it("calls onSaveReport when Save Report Script is clicked", async () => {
    const user = userEvent.setup();
    const { onSaveReport } = renderEditor();

    await user.click(screen.getByRole("button", { name: /save report script/i }));
    expect(onSaveReport).toHaveBeenCalledTimes(1);
  });

  it("disables save when canSaveScript is false", () => {
    renderEditor({ canSaveScript: false, saveButtonTooltip: "Validate first" });
    expect(screen.getByRole("button", { name: /save report script/i })).toBeDisabled();
  });

  it("calls onValidateScript when Validate is clicked", async () => {
    const user = userEvent.setup();
    const { onValidateScript } = renderEditor();

    await user.click(screen.getByRole("button", { name: /^validate$/i }));
    expect(onValidateScript).toHaveBeenCalledTimes(1);
  });

  it("calls onTestRunScript when Test Run is enabled", async () => {
    const user = userEvent.setup();
    const { onTestRunScript } = renderEditor({ scriptGateStatus: "valid" });

    await user.click(screen.getByRole("button", { name: /test run/i }));
    expect(onTestRunScript).toHaveBeenCalledTimes(1);
  });

  it("disables Test Run when compiled script is missing", () => {
    renderEditor({ compiledScript: null, scriptGateStatus: "pending" });
    expect(screen.getByRole("button", { name: /test run/i })).toBeDisabled();
  });

  it("calls onCancelTestRun when Cancel is shown during test run", async () => {
    const user = userEvent.setup();
    const { onCancelTestRun } = renderEditor({ isTestRunning: true });

    const cancelButtons = screen.getAllByRole("button", { name: /^cancel$/i });
    await user.click(cancelButtons[cancelButtons.length - 1]!);
    expect(onCancelTestRun).toHaveBeenCalledTimes(1);
  });

  it("shows save gate alert when showGateAlert is true", () => {
    renderEditor({ showGateAlert: true, saveGateHint: "Run validation first" });
    expect(screen.getByText("Save blocked")).toBeInTheDocument();
    expect(screen.getByText("Run validation first")).toBeInTheDocument();
  });
});
