import type { InvoiceStatus, InvoiceTransaction } from '../../types/invoice';

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

import type { VariantProps } from 'class-variance-authority';
import type { badgeVariants } from '@/components/ui/badge';

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

const STATUS_VARIANTS: Record<InvoiceStatus, BadgeVariant> = {
  PENDING: 'secondary',
  VOID: 'secondary',
  CAL: 'outline',
  MISSING_FEE: 'warning',
  READY: 'warning',
  ERROR: 'destructive',
  PAID: 'success',
};

export function statusTagColor(status: string): BadgeVariant {
  return STATUS_VARIANTS[status as InvoiceStatus] ?? 'secondary';
}

export function ribbonColor(status: string): string {
  if (status === 'PAID') return 'green';
  if (status === 'READY') return 'blue';
  if (status === 'PENDING') return 'orange';
  if (status === 'ERROR') return 'red';
  return 'blue';
}

export function sortInvoiceTransactions(transactions: InvoiceTransaction[]): InvoiceTransaction[] {
  return [...transactions].sort((a, b) => (a.company_name || '').localeCompare(b.company_name || ''));
}
