import { Button, List, Modal, Progress, Space, Typography } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
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
    <Modal
      title={title}
      open={open}
      width={560}
      onCancel={onClose}
      footer={(
        <Space>
          {running && <Button onClick={onCancelRun}>Cancel</Button>}
          {finished && retryIds.length > 0 && (
            <Button onClick={() => onRetry(retryIds)} disabled={running}>
              Retry failed
            </Button>
          )}
          <Button type="primary" onClick={onClose} disabled={running}>
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
        {summaryText && finished && (
          <Typography.Text>{summaryText}</Typography.Text>
        )}
        <List
          size="small"
          dataSource={progress.results}
          locale={{ emptyText: 'Waiting to start…' }}
          renderItem={(item) => (
            <List.Item style={{ display: 'block', paddingInline: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', width: '100%' }}>
                <span style={{ flexShrink: 0, lineHeight: '22px' }}>
                  {item.status === 'success' ? (
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  ) : (
                    <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                  )}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Typography.Text strong style={{ whiteSpace: 'nowrap' }}>
                    {item.ivNo}
                  </Typography.Text>
                  {item.error && (
                    <Typography.Text type="danger" style={{ display: 'block', marginTop: 2 }}>
                      {item.error}
                    </Typography.Text>
                  )}
                  {item.status === 'cancelled' && !item.error && (
                    <Typography.Text type="secondary" style={{ display: 'block', marginTop: 2 }}>
                      Cancelled
                    </Typography.Text>
                  )}
                </div>
              </div>
            </List.Item>
          )}
        />
      </Space>
    </Modal>
  );
}
