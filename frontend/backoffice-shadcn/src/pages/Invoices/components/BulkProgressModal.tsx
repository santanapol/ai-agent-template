import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { failedResultIds } from '../bulk/markUnprocessed';
import type { BulkProgress } from '../bulk/types';

interface BulkProgressModalProps {
  title: string;
  open: boolean;
  running: boolean;
  finished: boolean;
  progress: BulkProgress;
  summaryText?: string;
  onCancelRun: () => void;
  onRetry: (ids: string[]) => void;
  onClose: () => void;
}

export function BulkProgressModal({
  title,
  open,
  running,
  finished,
  progress,
  summaryText,
  onCancelRun,
  onRetry,
  onClose,
}: BulkProgressModalProps) {
  const retryIds = failedResultIds(progress.results);
  const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !running && onClose()}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!running}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4" role="status" aria-live="polite">
          <Progress value={percent} aria-label="Bulk operation progress" />
          <p className="text-sm text-muted-foreground">
            {progress.done} / {progress.total}
            {progress.currentIvNo ? ` — ${progress.currentIvNo}` : ''}
          </p>
          {summaryText && finished ? <p className="text-sm">{summaryText}</p> : null}
          <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
            {progress.results.length === 0 ? (
              <li className="text-sm text-muted-foreground">Waiting to start…</li>
            ) : (
              progress.results.map((item) => (
                <li key={item.id} className="flex gap-2 text-sm">
                  <span className="font-medium">
                    {item.status === 'success'
                      ? 'Success'
                      : item.status === 'failed'
                        ? 'Failed'
                        : 'Cancelled'}
                  </span>
                  {item.status === 'success' ? (
                    <CheckCircle className="size-4 shrink-0 text-success" aria-hidden="true" />
                  ) : (
                    <XCircle className="size-4 shrink-0 text-destructive" aria-hidden="true" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.ivNo}</p>
                    {item.error ? <p className="text-destructive">{item.error}</p> : null}
                    {item.status === 'cancelled' && !item.error ? (
                      <p className="text-muted-foreground">Cancelled</p>
                    ) : null}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
        <DialogFooter className="gap-2">
          {running ? <Button variant="outline" onClick={onCancelRun}>Cancel</Button> : null}
          {finished && retryIds.length > 0 ? (
            <Button variant="outline" onClick={() => onRetry(retryIds)} disabled={running}>
              Retry failed
            </Button>
          ) : null}
          <Button onClick={onClose} disabled={running}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
