import { CheckCircle, FileSpreadsheet, FileText, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BulkInvoiceActionBarProps {
  selectedCount: number;
  canExport: boolean;
  canWrite: boolean;
  busy: boolean;
  onExportPdf: () => void;
  onExportExcel: () => void;
  onMarkPaid: () => void;
  onCancelInvoices: () => void;
  onClear: () => void;
}

export function BulkInvoiceActionBar({
  selectedCount,
  canExport,
  canWrite,
  busy,
  onExportPdf,
  onExportExcel,
  onMarkPaid,
  onCancelInvoices,
  onClear,
}: BulkInvoiceActionBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border bg-background px-5 py-3 shadow-lg">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Selected {selectedCount}</span>
        {canWrite ? (
          <>
            <Button size="sm" onClick={onMarkPaid} disabled={busy}>
              <CheckCircle data-icon="inline-start" />
              Mark as PAID
            </Button>
            <Button size="sm" variant="destructive" onClick={onCancelInvoices} disabled={busy}>
              <XCircle data-icon="inline-start" />
              Cancel
            </Button>
          </>
        ) : null}
        {canExport ? (
          <>
            <Button size="sm" variant="outline" onClick={onExportPdf} disabled={busy}>
              <FileText data-icon="inline-start" />
              Export PDF
            </Button>
            <Button size="sm" variant="outline" onClick={onExportExcel} disabled={busy}>
              <FileSpreadsheet data-icon="inline-start" />
              Export Excel
            </Button>
          </>
        ) : null}
        <Button size="sm" variant="ghost" onClick={onClear} disabled={busy}>
          Clear
        </Button>
      </div>
    </div>
  );
}
