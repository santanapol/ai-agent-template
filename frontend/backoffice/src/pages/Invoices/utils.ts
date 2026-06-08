import type { InvoiceStatus } from '../../types/invoice';

export function formatMoney(val: number | null | undefined): string {
  if (val == null || Number.isNaN(val)) return '-';
  return val.toLocaleString(undefined, { minimumFractionDigits: 2 });
}

export function formatFee(fee: number | 'N/A'): string {
  if (fee === 'N/A') return 'N/A';
  return `${fee}%`;
}

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  PENDING: 'processing',
  VOID: 'default',
  CAL: 'processing',
  MISSING_FEE: 'orange',
  READY: 'warning',
  ERROR: 'error',
  PAID: 'success',
};

export function statusTagColor(status: string): string {
  return STATUS_COLORS[status as InvoiceStatus] ?? 'default';
}

export function ribbonColor(status: string): string {
  if (status === 'PAID') return 'green';
  if (status === 'READY') return 'orange';
  if (status === 'ERROR') return 'red';
  return 'blue';
}
