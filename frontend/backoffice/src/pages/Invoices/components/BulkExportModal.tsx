import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, List, Modal, Progress, Space, Typography } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { formatBulkExportZipFilename, runBulkExport } from '../export/bulkExport';
import { triggerBlobDownload } from '../export/downloadBlob';
import type { BulkExportFormat, BulkExportProgress } from '../export/types';

interface BulkExportModalProps {
  open: boolean;
  invoiceIds: string[];
  format: BulkExportFormat;
  onClose: (shouldClearSelection: boolean) => void;
}

export function BulkExportModal({ open, invoiceIds, format, onClose }: BulkExportModalProps) {
  const [progress, setProgress] = useState<BulkExportProgress>({ done: 0, total: 0, results: [] });
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const activeFormatRef = useRef<BulkExportFormat>(format);

  const runExport = useCallback(async (ids: string[], exportFormat: BulkExportFormat) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    activeFormatRef.current = exportFormat;
    setRunning(true);
    setFinished(false);
    setProgress({ done: 0, total: ids.length, results: [] });

    const zipBlob = await runBulkExport({
      invoiceIds: ids,
      format: exportFormat,
      signal: controller.signal,
      onProgress: setProgress,
    });

    if (zipBlob) {
      triggerBlobDownload(zipBlob, formatBulkExportZipFilename());
    }

    setRunning(false);
    setFinished(true);
  }, []);

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

  const handleCancel = () => {
    abortRef.current?.abort();
    setRunning(false);
    setFinished(true);
  };

  const retryIds = progress.results
    .filter((item) => item.status === 'failed' || item.status === 'cancelled')
    .map((item) => item.id);

  const handleRetry = () => {
    if (retryIds.length === 0) {
      return;
    }
    void runExport(retryIds, activeFormatRef.current);
  };

  const handleClose = () => {
    abortRef.current?.abort();
    const shouldClearSelection =
      finished &&
      progress.results.length > 0 &&
      progress.results.every((item) => item.status === 'success');
    onClose(shouldClearSelection);
  };

  const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Modal
      title={`Export ${format.toUpperCase()}`}
      open={open}
      onCancel={handleClose}
      footer={(
        <Space>
          {running && <Button onClick={handleCancel}>Cancel</Button>}
          {finished && retryIds.length > 0 && (
            <Button onClick={handleRetry} disabled={running}>
              Retry failed
            </Button>
          )}
          <Button type="primary" onClick={handleClose} disabled={running}>
            Close
          </Button>
        </Space>
      )}
      closable={!running}
      maskClosable={false}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Progress percent={percent} status={running ? 'active' : 'normal'} />
        <Typography.Text type="secondary">
          {progress.done} / {progress.total}
          {progress.currentIvNo ? ` — ${progress.currentIvNo}` : ''}
        </Typography.Text>
        <List
          size="small"
          dataSource={progress.results}
          locale={{ emptyText: 'Waiting to start…' }}
          renderItem={(item) => (
            <List.Item>
              <Space>
                {item.status === 'success' ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                )}
                <span>{item.ivNo}</span>
                {item.error && <Typography.Text type="danger">{item.error}</Typography.Text>}
                {item.status === 'cancelled' && !item.error && (
                  <Typography.Text type="secondary">Cancelled</Typography.Text>
                )}
              </Space>
            </List.Item>
          )}
        />
      </Space>
    </Modal>
  );
}
