import type { InvoiceStatus } from '../../types/invoice';

export function formatMoney(val: number | null | undefined): string {
  if (val == null || Number.isNaN(val)) return '-';
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(val: string | null | undefined): string {
  if (!val) return '-';
  const date = new Date(val);
  if (Number.isNaN(date.getTime())) return '-';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatFee(fee: number | 'N/A'): string {
  if (fee === 'N/A') return 'N/A';
  return `${fee}%`;
}

export function formatCategoryName(name: string | null | undefined): string {
  if (!name) return '-';
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  PENDING: 'warning',
  VOID: 'default',
  CAL: 'processing',
  MISSING_FEE: 'orange',
  READY: 'processing',
  ERROR: 'error',
  PAID: 'success',
};

export function statusTagColor(status: string): string {
  return STATUS_COLORS[status as InvoiceStatus] ?? 'default';
}

export function ribbonColor(status: string): string {
  if (status === 'PAID') return 'green';
  if (status === 'READY') return 'blue';
  if (status === 'PENDING') return 'orange';
  if (status === 'ERROR') return 'red';
  return 'blue';
}
