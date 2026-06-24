import { useCallback, useEffect, useRef, useState } from 'react';
import { bulkStatusActionLabel, runBulkStatusUpdate } from '../status/bulkStatusUpdate';
import type { BulkStatusAction } from '../status/types';
import type { BulkProgress } from '../bulk/types';
import { BulkProgressModal } from './BulkProgressModal';

interface BulkStatusModalProps {
  open: boolean;
  invoiceIds: string[];
  action: BulkStatusAction;
  onClose: (shouldClearSelection: boolean, hadSuccess: boolean) => void;
  onRunningChange?: (running: boolean) => void;
}

export function BulkStatusModal({
  open,
  invoiceIds,
  action,
  onClose,
  onRunningChange,
}: BulkStatusModalProps) {
  const [progress, setProgress] = useState<BulkProgress>({ done: 0, total: 0, results: [] });
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const activeActionRef = useRef<BulkStatusAction>(action);

  const setRunningState = useCallback((value: boolean) => {
    setRunning(value);
    onRunningChange?.(value);
  }, [onRunningChange]);

  const runUpdate = useCallback(async (ids: string[], statusAction: BulkStatusAction) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    activeActionRef.current = statusAction;
    setRunningState(true);
    setFinished(false);
    setProgress({ done: 0, total: ids.length, results: [] });

    try {
      await runBulkStatusUpdate({
        invoiceIds: ids,
        action: statusAction,
        signal: controller.signal,
        onProgress: setProgress,
      });
    } finally {
      setRunningState(false);
      setFinished(true);
    }
  }, [setRunningState]);

  useEffect(() => {
    if (!open || invoiceIds.length === 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      void runUpdate(invoiceIds, action);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      abortRef.current?.abort();
    };
  }, [open, invoiceIds, action, runUpdate]);

  const handleClose = () => {
    abortRef.current?.abort();
    const hadSuccess = progress.results.some((item) => item.status === 'success');
    const shouldClearSelection =
      finished &&
      progress.results.length > 0 &&
      progress.results.every((item) => item.status === 'success');
    onClose(shouldClearSelection, hadSuccess);
  };

  const successCount = progress.results.filter((item) => item.status === 'success').length;

  return (
    <BulkProgressModal
      title={bulkStatusActionLabel(action)}
      open={open}
      running={running}
      finished={finished}
      progress={progress}
      summaryText={`${successCount} updated successfully`}
      onCancelRun={() => abortRef.current?.abort()}
      onRetry={(ids) => void runUpdate(ids, activeActionRef.current)}
      onClose={handleClose}
    />
  );
}
