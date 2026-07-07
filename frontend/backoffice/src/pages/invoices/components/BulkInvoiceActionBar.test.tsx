import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkInvoiceActionBar } from './BulkInvoiceActionBar';

const baseProps = {
  selectedCount: 2,
  canExport: true,
  canWrite: true,
  busy: false,
  onExportPdf: vi.fn(),
  onExportExcel: vi.fn(),
  onMarkPaid: vi.fn(),
  onCancelInvoices: vi.fn(),
  onClear: vi.fn(),
};

describe('BulkInvoiceActionBar', () => {
  it('renders nothing when no rows are selected', () => {
    const { container } = render(<BulkInvoiceActionBar {...baseProps} selectedCount={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows export buttons only when canExport is true', () => {
    render(<BulkInvoiceActionBar {...baseProps} canExport={false} />);

    expect(screen.queryByText('Export PDF')).not.toBeInTheDocument();
    expect(screen.queryByText('Export Excel')).not.toBeInTheDocument();
    expect(screen.getByText('Mark as PAID')).toBeInTheDocument();
  });

  it('shows status buttons only when canWrite is true', () => {
    render(<BulkInvoiceActionBar {...baseProps} canWrite={false} />);

    expect(screen.queryByText('Mark as PAID')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    expect(screen.getByText('Export PDF')).toBeInTheDocument();
  });

  it('disables actions while busy', () => {
    render(<BulkInvoiceActionBar {...baseProps} busy />);

    expect(screen.getByText('Mark as PAID').closest('button')).toBeDisabled();
    expect(screen.getByText('Export PDF').closest('button')).toBeDisabled();
    expect(screen.getByText('Clear').closest('button')).toBeDisabled();
  });

  it('calls handlers when buttons are clicked', async () => {
    const onMarkPaid = vi.fn();
    const onExportPdf = vi.fn();

    render(
      <BulkInvoiceActionBar
        {...baseProps}
        onMarkPaid={onMarkPaid}
        onExportPdf={onExportPdf}
      />,
    );

    await userEvent.click(screen.getByText('Mark as PAID'));
    await userEvent.click(screen.getByText('Export PDF'));

    expect(onMarkPaid).toHaveBeenCalledOnce();
    expect(onExportPdf).toHaveBeenCalledOnce();
  });
});
