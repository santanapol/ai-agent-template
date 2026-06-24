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
