import { Download, FileText } from 'lucide-react';
import { type DataTableColumn } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DownloadHistoryRecord } from '@/types/smartReport';
import { formatDateTime } from './formatters';

export function buildDownloadHistoryColumns(
  onDownload: (record: DownloadHistoryRecord) => void,
  options?: { includeReportName?: boolean },
): DataTableColumn<DownloadHistoryRecord>[] {
  const columns: DataTableColumn<DownloadHistoryRecord>[] = [];

  if (options?.includeReportName) {
    columns.push({
      key: 'reportName',
      title: 'Report Name',
      render: (record) => (
        <span className="flex items-center gap-2 font-medium">
          <FileText data-icon="inline-start" aria-hidden="true" />
          {record.reportName}
        </span>
      ),
    });
  }

  columns.push(
    {
      key: 'startedAt',
      title: options?.includeReportName ? 'Generated At' : 'Run Date',
      render: (record) => formatDateTime(record.finishedAt ?? record.startedAt),
    },
    {
      key: 'format',
      title: 'File Type',
      render: (record) => (
        <Badge variant={record.format === 'csv' ? 'secondary' : 'default'}>
          {record.format.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (record) => {
        if (record.status === 'success') return <Badge>Success</Badge>;
        if (record.status === 'failed') return <Badge variant="destructive">Failed</Badge>;
        return <Badge variant="secondary">Running</Badge>;
      },
    },
    {
      key: 'download',
      title: 'Download',
      render: (record) => (
        <Button
          size="sm"
          disabled={record.status !== 'success' || !record.fileName}
          onClick={() => onDownload(record)}
        >
          <Download data-icon="inline-start" />
          Download
        </Button>
      ),
    },
  );

  return columns;
}
