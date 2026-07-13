import type React from "react";

import { LoadingButton } from "@/components/LoadingButton";
import { DetailContainer } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { SmartReportEditor } from "./SmartReportEditor";
import { EditorStatusBadges } from "./smart-report/editorStatus";
import { type SmartReportEditorMode, useSmartReportEditor } from "./smart-report/useSmartReportEditor";

interface SmartReportEditorPageProps {
  mode: SmartReportEditorMode;
}

const SmartReportEditorPage: React.FC<SmartReportEditorPageProps> = ({ mode }) => {
  const editor = useSmartReportEditor(mode);

  if (editor.pageLoading) {
    return (
      <DetailContainer
        title="Loading report…"
        description="Configure report script, validation, and schedule."
        onBack={editor.handleLeave}
        maxWidth={null}
        className="gap-4"
      >
        <div className="flex flex-col gap-4" role="status" aria-busy="true" aria-label="Loading smart report editor">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </DetailContainer>
    );
  }

  return (
    <DetailContainer
      title={editor.pageTitle}
      description={editor.pageDescription}
      onBack={editor.handleLeave}
      stickyChrome
      status={
        <EditorStatusBadges gateStatus={editor.scriptGateStatus} scriptRequiresGate={editor.scriptRequiresGate} />
      }
      maxWidth={null}
      className="gap-4"
      extra={
        <Tooltip>
          <TooltipTrigger
            render={
              <span>
                <LoadingButton
                  loading={editor.isSaving}
                  disabled={!editor.canSaveReport}
                  onClick={() => void editor.handleSaveReport()}
                >
                  {editor.saveButtonLabel}
                </LoadingButton>
              </span>
            }
          />
          {editor.saveButtonTooltip ? <TooltipContent>{editor.saveButtonTooltip}</TooltipContent> : null}
        </Tooltip>
      }
    >
      <SmartReportEditor
        form={editor.form}
        formErrors={editor.formErrors}
        onFieldChange={editor.setField}
        editorTab={editor.editorTab}
        onEditorTabChange={editor.handleEditorTabChange}
        compiledScript={editor.compiledScript}
        validationErrors={editor.validationErrors}
        isValidating={editor.isValidating}
        isTestRunning={editor.isTestRunning}
        scriptGateStatus={editor.scriptGateStatus}
        testRunPreview={editor.testRunPreview}
        testRunPreviewTable={editor.testRunPreviewTable}
        testRunDateTagLabel={editor.testRunDateTagLabel}
        scriptEditorScrollRef={editor.scriptEditorScrollRef}
        validationAlertRef={editor.validationAlertRef}
        testRunPreviewRef={editor.testRunPreviewRef}
        onResetToExample={editor.handleResetToExample}
        onValidateScript={() => void editor.handleValidateScript()}
        onTestRunScript={() => void editor.handleTestRunScript()}
        onCancelTestRun={editor.handleCancelTestRun}
        onQueryScriptChange={editor.handleQueryScriptChange}
      />
    </DetailContainer>
  );
};

export default SmartReportEditorPage;
