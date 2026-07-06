import type { DataTableColumn } from '@/components/data-table';
import type { Royalty21Row } from '@/types/branchReport';
import {
  formatDeposit,
  formatPromotion,
  formatSummary,
} from '@/lib/branch-report/royalty21Formatters';
import { cn } from '@/lib/utils';

export function buildRoyalty21Columns(): DataTableColumn<Royalty21Row>[] {
  const depositCols: DataTableColumn<Royalty21Row>[] = Array.from({ length: 21 }, (_, i) => ({
    key: `deposit_${i + 1}`,
    title: String(i + 1),
    align: 'right' as const,
    render: (row) => formatDeposit(row.deposits?.[i] ?? 0),
  }));

  return [
    { key: 'username', title: 'Username', accessor: 'username' },
    { key: 'register', title: 'Register', accessor: 'register' },
    {
      key: 'billin',
      title: 'Billin',
      align: 'right',
      render: (row) => formatSummary(row.billin),
    },
    {
      key: 'withdraw',
      title: 'Withdraw',
      align: 'right',
      render: (row) => formatSummary(row.withdraw),
    },
    {
      key: 'promotion',
      title: 'Promotion',
      align: 'right',
      render: () => formatPromotion(),
    },
    {
      key: 'revenue',
      title: 'Revenue',
      align: 'right',
      render: (row) => (
        <span className={cn(row.revenue < 0 && 'text-destructive')}>{formatSummary(row.revenue)}</span>
      ),
    },
    ...depositCols,
  ];
}
