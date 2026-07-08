import {
  Clock,
  Code2,
  History,
  Pencil,
  Play,
  Plus,
  Trash2,
} from 'lucide-react';
import { PageContainer, PageContentCard } from '@/components/layout';
import { DataTable } from '@/components/DataTable';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { DownloadHistoryRecord, Report } from '@/types/smartReport';
import {
  formatScheduleLabel,
  formatValidationStatusLabel,
  type ReportRow,
  type ReportStatus,
} from './smart-report/formatters';
import { buildDownloadHistoryColumns } from './smart-report/downloadHistoryColumns';

function validationBadgeVariant(status: Report['validationStatus'] | undefined) {
  if (status === 'valid') return 'default' as const;
  if (status === 'invalid') return 'destructive' as const;
  return 'secondary' as const;
}

function derivedStatusBadge(status: ReportStatus) {
  if (status === 'running') return <Badge variant="secondary">Running</Badge>;
  if (status === 'completed') return <Badge>Completed</Badge>;
  if (status === 'failed') return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="outline">Idle</Badge>;
}

export interface SmartReportListProps {
  isMobile: boolean;
  activeTab: string;
  onActiveTabChange: (tab: string) => void;
  reportRows: ReportRow[];
  history: DownloadHistoryRecord[];
  loading: boolean;
  runningId: string | null;
  loadingEditId: string | null;
  isDrawerOpen: boolean;
  onDrawerOpenChange: (open: boolean) => void;
  selectedReportName: string;
  selectedReportDownloads: DownloadHistoryRecord[];
  onCreateNew: () => void;
  onRunReport: (report: Report) => void;
  onEditReport: (report: Report) => void;
  onViewFiles: (reportId: string) => void;
  onDeleteReport: (report: Report) => void;
  onDownload: (record: DownloadHistoryRecord) => void;
}

export function SmartReportList({
  isMobile,
  activeTab,
  onActiveTabChange,
  reportRows,
  history,
  loading,
  runningId,
  loadingEditId,
  isDrawerOpen,
  onDrawerOpenChange,
  selectedReportName,
  selectedReportDownloads,
  onCreateNew,
  onRunReport,
  onEditReport,
  onViewFiles,
  onDeleteReport,
  onDownload,
}: SmartReportListProps) {
  const downloadColumns = buildDownloadHistoryColumns(onDownload, { includeReportName: true });
  const drawerColumns = buildDownloadHistoryColumns(onDownload);

  const reportColumns = [
    {
      key: 'name',
      title: 'Report',
      render: (record: ReportRow) => (
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1">
            <span className="font-medium">{record.name}</span>
            {record.enabled === false ? <Badge variant="outline">Disabled</Badge> : null}
            <Badge variant={validationBadgeVariant(record.validationStatus)}>
              {formatValidationStatusLabel(record.validationStatus)}
            </Badge>
            {record.lastTestRunMeta?.recordCount != null ? (
              <Badge variant="secondary">Test: {record.lastTestRunMeta.recordCount}</Badge>
            ) : null}
          </div>
          {record.description ? (
            <p className="truncate text-xs text-muted-foreground">{record.description}</p>
          ) : null}
          {isMobile ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" />
              {formatScheduleLabel(record.schedule)}
            </p>
          ) : null}
        </div>
      ),
    },
    ...(!isMobile
      ? [
          {
            key: 'schedule',
            title: 'Schedule',
            render: (record: ReportRow) => (
              <span className="flex items-center gap-1 text-sm">
                <Clock className="size-3.5 text-muted-foreground" />
                {formatScheduleLabel(record.schedule)}
              </span>
            ),
          },
        ]
      : []),
    {
      key: 'outputFormat',
      title: 'Output Format',
      render: (record: ReportRow) => (
        <Badge variant={record.outputFormat === 'csv' ? 'secondary' : 'default'}>
          {record.outputFormat.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (record: ReportRow) => derivedStatusBadge(record.derivedStatus),
    },
    {
      key: 'lastRun',
      title: 'Last Run',
      render: (record: ReportRow) => (
        <span className="text-xs text-muted-foreground">{record.lastRun}</span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (record: ReportRow) => (
        <div className="flex flex-wrap gap-1">
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger
                render={
                  <AlertDialogTrigger
                    render={
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label="Run report"
                        disabled={
                          record.derivedStatus === 'running' || runningId === record.id
                        }
                      />
                    }
                  />
                }
              >
                {runningId === record.id ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Play data-icon="inline-start" aria-hidden="true" />
                )}
              </TooltipTrigger>
              <TooltipContent>Run report</TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Run this report now?</AlertDialogTitle>
                <AlertDialogDescription>
                  Heavy queries may take several minutes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => void onRunReport(record)}>
                  Run
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Edit report"
                  disabled={
                    record.derivedStatus === 'running' ||
                    (loadingEditId !== null && loadingEditId !== record.id)
                  }
                  onClick={() => void onEditReport(record)}
                />
              }
            >
              {loadingEditId === record.id ? (
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Pencil data-icon="inline-start" aria-hidden="true" />
              )}
            </TooltipTrigger>
            <TooltipContent>Edit report</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="View download history"
                  onClick={() => onViewFiles(record.id)}
                />
              }
            >
              <History data-icon="inline-start" aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>View download history</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Delete report"
                  disabled={record.derivedStatus === 'running'}
                  onClick={() => onDeleteReport(record)}
                />
              }
            >
              <Trash2 data-icon="inline-start" className="text-destructive" aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>Delete report</TooltipContent>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      title="Smart Report"
      description="Automated reporting and scheduling system. Fetches data directly via a read-only database replica."
      extra={
        <Button size="lg" onClick={onCreateNew}>
          <Plus data-icon="inline-start" />
          Create report
        </Button>
      }
    >
      <Alert className="mb-6">
        <Code2 data-icon="inline-start" aria-hidden="true" />
        <AlertTitle>Secure Read-Only Access</AlertTitle>
        <AlertDescription>
          All reports run on secondary database replicas in read-only mode. Heavy queries or
          aggregation pipelines can be executed safely without affecting the main transactional
          server performance.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={onActiveTabChange}>
        <TabsList>
          <TabsTrigger value="reports">
            <Code2 data-icon="inline-start" />
            Report Scripts
          </TabsTrigger>
          <TabsTrigger value="history">
            <History data-icon="inline-start" />
            Download History
          </TabsTrigger>
        </TabsList>
        <TabsContent value="reports" className="mt-4">
          <PageContentCard>
            <DataTable
              columns={reportColumns}
              data={reportRows}
              loading={loading}
              rowKey="id"
              pageSize={10}
            />
          </PageContentCard>
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <PageContentCard>
            <DataTable
              columns={downloadColumns}
              data={history}
              loading={loading}
              rowKey="id"
              pageSize={10}
            />
          </PageContentCard>
        </TabsContent>
      </Tabs>

      <Sheet open={isDrawerOpen} onOpenChange={onDrawerOpenChange}>
        <SheetContent className={isMobile ? 'w-full' : 'sm:max-w-xl'}>
          <SheetHeader>
            <SheetTitle>Download History: {selectedReportName}</SheetTitle>
          </SheetHeader>
          {selectedReportDownloads.length > 0 ? (
            <div className="mt-4">
              <DataTable
                columns={drawerColumns}
                data={selectedReportDownloads}
                rowKey="id"
                pageSize={8}
              />
            </div>
          ) : (
            <Empty className="mt-8">
              <EmptyHeader>
                <EmptyTitle>No history</EmptyTitle>
                <EmptyDescription>
                  No execution history or saved files for this script.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
}
