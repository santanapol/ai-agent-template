import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkStatusModal } from './BulkStatusModal';
import * as bulkStatusUpdate from '../status/bulkStatusUpdate';

vi.mock('../status/bulkStatusUpdate', () => ({
  runBulkStatusUpdate: vi.fn(),
  bulkStatusActionLabel: vi.fn((action: string) => (action === 'PAID' ? 'Mark as PAID' : 'Cancel Invoices')),
}));

describe('BulkStatusModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows progress and clears selection when all updates succeed', async () => {
    vi.mocked(bulkStatusUpdate.runBulkStatusUpdate).mockImplementation(async ({ onProgress }) => {
      onProgress?.({
        done: 1,
        total: 1,
        currentIvNo: 'IV-001',
        results: [{ id: 'inv1', ivNo: 'IV-001', status: 'success' }],
      });
      return { successCount: 1, failedCount: 0, cancelledCount: 0 };
    });

    const onClose = vi.fn();
    render(
      <BulkStatusModal
        open
        invoiceIds={['inv1']}
        action="PAID"
        onClose={onClose}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('IV-001')).toBeInTheDocument();
    });

    const footer = document.querySelector('[data-slot="dialog-footer"]');
    expect(footer).not.toBeNull();
    await userEvent.click(within(footer as HTMLElement).getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledWith(true, true);
  });

  it('keeps running state until update finishes after cancel is clicked', async () => {
    let resolveUpdate: ((value: { successCount: number; failedCount: number; cancelledCount: number }) => void) | undefined;
    const updatePromise = new Promise<{ successCount: number; failedCount: number; cancelledCount: number }>((resolve) => {
      resolveUpdate = resolve;
    });

    vi.mocked(bulkStatusUpdate.runBulkStatusUpdate).mockReturnValue(updatePromise);

    const onRunningChange = vi.fn();
    render(
      <BulkStatusModal
        open
        invoiceIds={['inv1']}
        action="PAID"
        onClose={vi.fn()}
        onRunningChange={onRunningChange}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();

    if (resolveUpdate) {
      resolveUpdate({ successCount: 0, failedCount: 0, cancelledCount: 1 });
    }
    await waitFor(() => {
      expect(onRunningChange).toHaveBeenLastCalledWith(false);
    });
  });

  it('retries only failed items', async () => {
    vi.mocked(bulkStatusUpdate.runBulkStatusUpdate)
      .mockImplementationOnce(async ({ onProgress }) => {
        onProgress?.({
          done: 2,
          total: 2,
          results: [
            { id: 'inv1', ivNo: 'IV-001', status: 'failed', error: 'conflict' },
            { id: 'inv2', ivNo: 'IV-002', status: 'cancelled' },
          ],
        });
        return { successCount: 0, failedCount: 1, cancelledCount: 1 };
      })
      .mockImplementationOnce(async ({ invoiceIds, onProgress }) => {
        expect(invoiceIds).toEqual(['inv1']);
        onProgress?.({
          done: 1,
          total: 1,
          results: [{ id: 'inv1', ivNo: 'IV-001', status: 'success' }],
        });
        return { successCount: 1, failedCount: 0, cancelledCount: 0 };
      });

    render(
      <BulkStatusModal
        open
        invoiceIds={['inv1', 'inv2']}
        action="VOID"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Retry failed' })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Retry failed' }));

    await waitFor(() => {
      expect(bulkStatusUpdate.runBulkStatusUpdate).toHaveBeenCalledTimes(2);
    });
  });

  it('does not clear selection when closing after partial success', async () => {
    vi.mocked(bulkStatusUpdate.runBulkStatusUpdate).mockImplementation(async ({ onProgress }) => {
      onProgress?.({
        done: 2,
        total: 2,
        results: [
          { id: 'inv1', ivNo: 'IV-001', status: 'success' },
          { id: 'inv2', ivNo: 'IV-002', status: 'failed', error: 'conflict' },
        ],
      });
      return { successCount: 1, failedCount: 1, cancelledCount: 0 };
    });

    const onClose = vi.fn();
    render(
      <BulkStatusModal
        open
        invoiceIds={['inv1', 'inv2']}
        action="PAID"
        onClose={onClose}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Retry failed' })).toBeInTheDocument();
    });

    const footer = document.querySelector('[data-slot="dialog-footer"]');
    await userEvent.click(within(footer as HTMLElement).getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledWith(false, true);
  });
});
