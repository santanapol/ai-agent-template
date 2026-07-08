import { useCallback, useEffect, useRef, useState } from "react";

import type { BulkProgress } from "../bulk/types";
import { formatBulkExportZipFilename, runBulkExport } from "../export/bulkExport";
import { triggerBlobDownload } from "../export/downloadBlob";
import type { BulkExportFormat } from "../export/types";
import { BulkProgressModal } from "./BulkProgressModal";

interface BulkExportModalProps {
  open: boolean;
  invoiceIds: string[];
  format: BulkExportFormat;
  onClose: (shouldClearSelection: boolean) => void;
  onRunningChange?: (running: boolean) => void;
}

export function BulkExportModal({ open, invoiceIds, format, onClose, onRunningChange }: BulkExportModalProps) {
  const [progress, setProgress] = useState<BulkProgress>({ done: 0, total: 0, results: [] });
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const activeFormatRef = useRef<BulkExportFormat>(format);

  const setRunningState = useCallback(
    (value: boolean) => {
      setRunning(value);
      onRunningChange?.(value);
    },
    [onRunningChange],
  );

  const runExport = useCallback(
    async (ids: string[], exportFormat: BulkExportFormat) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      activeFormatRef.current = exportFormat;
      setRunningState(true);
      setFinished(false);
      setProgress({ done: 0, total: ids.length, results: [] });

      try {
        const zipBlob = await runBulkExport({
          invoiceIds: ids,
          format: exportFormat,
          signal: controller.signal,
          onProgress: setProgress,
        });

        if (zipBlob) {
          triggerBlobDownload(zipBlob, formatBulkExportZipFilename());
        }
      } finally {
        setRunningState(false);
        setFinished(true);
      }
    },
    [setRunningState],
  );

  useEffect(() => {
    if (!open || invoiceIds.length === 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      void runExport(invoiceIds, format);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      abortRef.current?.abort();
    };
  }, [open, invoiceIds, format, runExport]);

  const handleClose = () => {
    abortRef.current?.abort();
    const shouldClearSelection =
      finished && progress.results.length > 0 && progress.results.every((item) => item.status === "success");
    onClose(shouldClearSelection);
  };

  return (
    <BulkProgressModal
      title={`Export ${format.toUpperCase()}`}
      open={open}
      running={running}
      finished={finished}
      progress={progress}
      onCancelRun={() => abortRef.current?.abort()}
      onRetry={(ids) => void runExport(ids, activeFormatRef.current)}
      onClose={handleClose}
    />
  );
}
