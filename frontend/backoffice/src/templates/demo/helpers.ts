import type { VariantProps } from 'class-variance-authority';
import type { badgeVariants } from '@/components/ui/badge';

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

export const getInvoiceStatusVariant = (status: string): BadgeVariant => {
  if (status === 'PAID') return 'default';
  if (status === 'PENDING') return 'secondary';
  if (status === 'ERROR') return 'destructive';
  if (status === 'READY') return 'outline';
  return 'secondary';
};

export const getAgentStatusVariant = (status: string): BadgeVariant => {
  if (status === 'ACTIVE') return 'default';
  if (status === 'SUSPENDED') return 'secondary';
  return 'outline';
};

export const getReportStatusVariant = (status: string): BadgeVariant => {
  if (status === 'COMPLETED') return 'default';
  if (status === 'PROCESSING') return 'secondary';
  if (status === 'FAILED') return 'destructive';
  return 'outline';
};

export const formatCurrency = (val: number | null | undefined) => {
  if (val == null) return '-';
  return `฿${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatNumber = (val: number | null | undefined) => {
  if (val == null) return '-';
  return val.toLocaleString('en-US');
};

export const statisticNumberFormatter = (value: number | string) =>
  Number(value).toLocaleString('en-US');

export const statisticRateFormatter = (value: number | string) =>
  Number(value).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const simulateSave = (delayMs = 600) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
