import { CheckCircle, ChevronDown, FileSpreadsheet, FileText, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

/** Horizontal offset that keeps the bar centered over the content pane, not the viewport. */
function getContentOffsetClass(isMobile: boolean, sidebarState: "expanded" | "collapsed"): string {
  if (isMobile) return "left-1/2";
  if (sidebarState === "collapsed") return "left-[calc(50%+var(--sidebar-width-icon)/2)]";
  return "left-[calc(50%+var(--sidebar-width)/2)]";
}

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
  const { isMobile, state } = useSidebar();

  if (selectedCount === 0) {
    return null;
  }

  // Center within the main content pane (SidebarInset), not the full viewport.
  const contentOffsetClass = getContentOffsetClass(isMobile, state);

  return (
    <div
      className={cn(
        "fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-[var(--z-sticky)] -translate-x-1/2 rounded-xl border bg-background px-4 py-2.5 shadow-lg",
        contentOffsetClass,
      )}
    >
      <div className="flex flex-nowrap items-center gap-2">
        <span className="shrink-0 font-medium text-sm tabular-nums">Selected {selectedCount}</span>
        {canWrite ? (
          <>
            <Button size="sm" onClick={onMarkPaid} disabled={busy}>
              <CheckCircle data-icon="inline-start" aria-hidden="true" />
              Mark as PAID
            </Button>
            <Button size="sm" variant="destructive" onClick={onCancelInvoices} disabled={busy}>
              <XCircle data-icon="inline-start" aria-hidden="true" />
              Cancel
            </Button>
          </>
        ) : null}
        {canExport ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button size="sm" variant="outline" aria-label="Export selected invoices" disabled={busy} />}
            >
              Export
              <ChevronDown data-icon="inline-end" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onExportPdf} disabled={busy}>
                <FileText aria-hidden="true" />
                Export PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportExcel} disabled={busy}>
                <FileSpreadsheet aria-hidden="true" />
                Export Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        <Button size="sm" variant="ghost" onClick={onClear} disabled={busy}>
          Clear
        </Button>
      </div>
    </div>
  );
}
