import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import { Button, Space, theme } from 'antd';

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
  const { token } = theme.useToken();

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        padding: '12px 20px',
        background: token.colorBgElevated,
        borderRadius: token.borderRadiusLG,
        boxShadow: token.boxShadowSecondary,
      }}
    >
      <Space wrap>
        <span>Selected {selectedCount}</span>
        {canWrite && (
          <>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={onMarkPaid}
              disabled={busy}
            >
              Mark as PAID
            </Button>
            <Button
              danger
              icon={<CloseCircleOutlined />}
              onClick={onCancelInvoices}
              disabled={busy}
            >
              Cancel
            </Button>
          </>
        )}
        {canExport && (
          <>
            <Button
              icon={<FilePdfOutlined />}
              onClick={onExportPdf}
              disabled={busy}
            >
              Export PDF
            </Button>
            <Button
              icon={<FileExcelOutlined />}
              onClick={onExportExcel}
              disabled={busy}
            >
              Export Excel
            </Button>
          </>
        )}
        <Button onClick={onClear} disabled={busy}>
          Clear
        </Button>
      </Space>
    </div>
  );
}
