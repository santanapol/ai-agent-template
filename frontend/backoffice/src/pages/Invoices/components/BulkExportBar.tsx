import { FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { Button, Space } from 'antd';

interface BulkExportBarProps {
  selectedCount: number;
  canExport: boolean;
  exporting: boolean;
  onExportPdf: () => void;
  onExportExcel: () => void;
  onClear: () => void;
}

export function BulkExportBar({
  selectedCount,
  canExport,
  exporting,
  onExportPdf,
  onExportExcel,
  onClear,
}: BulkExportBarProps) {
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
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
    >
      <Space wrap>
        <span>Selected {selectedCount}</span>
        {canExport && (
          <>
            <Button
              icon={<FilePdfOutlined />}
              onClick={onExportPdf}
              disabled={exporting}
            >
              Export PDF
            </Button>
            <Button
              icon={<FileExcelOutlined />}
              onClick={onExportExcel}
              disabled={exporting}
            >
              Export Excel
            </Button>
          </>
        )}
        <Button onClick={onClear} disabled={exporting}>
          Clear
        </Button>
      </Space>
    </div>
  );
}
