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
  const onValidateScript = vi.fn();
  const onTestRunScript = vi.fn();
  const onCancelTestRun = vi.fn();
  const onResetToExample = vi.fn();

  render(
    <SmartReportEditor
      form={baseForm}
      formErrors={{}}
      onFieldChange={vi.fn()}
      editorTab="script"
      onEditorTabChange={vi.fn()}
      compiledScript="compiled sql"
      validationErrors={[]}
      isValidating={false}
      isTestRunning={false}
      scriptGateStatus="validated"
      testRunPreview={null}
      testRunPreviewTable={{ columns: [], rows: [] }}
      testRunDateTagLabel={null}
      scriptEditorScrollRef={createRef()}
      validationAlertRef={createRef()}
      testRunPreviewRef={createRef()}
      onResetToExample={onResetToExample}
      onValidateScript={onValidateScript}
      onTestRunScript={onTestRunScript}
      onCancelTestRun={onCancelTestRun}
      onQueryScriptChange={vi.fn()}
      {...overrides}
    />,
  );

  return {
    onValidateScript,
    onTestRunScript,
    onCancelTestRun,
    onResetToExample: overrides.onResetToExample ?? onResetToExample,
  };
}

describe("SmartReportEditor", () => {
  it("calls onValidateScript when Validate is clicked", async () => {
    const user = userEvent.setup();
    const { onValidateScript } = renderEditor({ scriptGateStatus: "pending", compiledScript: null });

    await user.click(screen.getByRole("button", { name: /validate script/i }));
    expect(onValidateScript).toHaveBeenCalledTimes(1);
  });

  it("calls onTestRunScript when Test run is enabled", async () => {
    const user = userEvent.setup();
    const { onTestRunScript } = renderEditor({ scriptGateStatus: "validated" });

    await user.click(screen.getByRole("button", { name: /test/i }));
    expect(onTestRunScript).toHaveBeenCalledTimes(1);
  });

  it("disables Test run when compiled script is missing", () => {
    renderEditor({ compiledScript: null, scriptGateStatus: "pending" });
    expect(screen.getByRole("button", { name: /test/i })).toBeDisabled();
  });

  it("calls onCancelTestRun when Cancel is shown during test run", async () => {
    const user = userEvent.setup();
    const { onCancelTestRun } = renderEditor({ isTestRunning: true });

    await user.click(screen.getByRole("button", { name: /cancel test run/i }));
    expect(onCancelTestRun).toHaveBeenCalledTimes(1);
  });

  it("shows passed state on validate and test buttons", () => {
    renderEditor({ scriptGateStatus: "tested" });
    expect(screen.getByRole("button", { name: /validation passed/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /test passed/i })).toBeInTheDocument();
  });

  it("shows destructive validate button when validation fails", () => {
    renderEditor({
      scriptGateStatus: "pending",
      compiledScript: null,
      validationErrors: [{ message: "Syntax error" }],
    });
    expect(screen.getByRole("button", { name: /validate/i })).toBeInTheDocument();
  });

  it("shows report name in general info on create", () => {
    renderEditor({ mode: "create" });
    expect(screen.getAllByLabelText(/report name/i)).toHaveLength(1);
  });

  it("shows schedule frequency label instead of raw value", () => {
    renderEditor();
    expect(screen.getByRole("combobox", { name: /schedule frequency/i })).toHaveTextContent("Manual");
  });

  it("closes reset dialog and loads example when Reset is confirmed", async () => {
    const user = userEvent.setup();
    const { onResetToExample } = renderEditor({ form: { ...baseForm, query: "" } });

    await user.click(screen.getByRole("button", { name: /reset script to example/i }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^reset$/i }));
    expect(onResetToExample).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("renders test preview card", () => {
    renderEditor({
      scriptGateStatus: "tested",
      testRunPreview: {
        recordCount: 9,
        durationMs: 49,
        sample: [{ id: 1, name: "Alice" }],
      },
      testRunPreviewTable: {
        columns: [
          { key: "id", title: "id", dataIndex: "id" },
          { key: "name", title: "name", dataIndex: "name" },
        ],
        rows: [{ id: 1, name: "Alice" }],
      },
    });

    expect(screen.getByText("Test preview")).toBeInTheDocument();
    expect(screen.getByText(/Preview 1 of 9 record\(s\) · 49ms/)).toBeInTheDocument();
    expect(screen.queryByText(/test run succeeded/i)).not.toBeInTheDocument();
  });
});
