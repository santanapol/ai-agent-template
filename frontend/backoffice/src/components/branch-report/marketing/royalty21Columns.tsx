import { Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Royalty21Row } from '../../../types/branchReport';
import {
  formatDeposit,
  formatPromotion,
  formatSummary,
} from '../../../lib/branch-report/royalty21Formatters';

const depositColumns: ColumnsType<Royalty21Row> = Array.from({ length: 21 }, (_, i) => ({
  title: (
    <Tooltip title={`Deposit #${i + 1} since registration`}>
      <span>{String(i + 1)}</span>
    </Tooltip>
  ),
  dataIndex: ['deposits', i],
  key: `deposit_${i + 1}`,
  width: 80,
  align: 'right' as const,
  render: (value: number | undefined) => formatDeposit(value ?? 0),
}));

export const royalty21Columns: ColumnsType<Royalty21Row> = [
  {
    title: 'Username',
    dataIndex: 'username',
    key: 'username',
    width: 140,
    fixed: 'left',
    ellipsis: true,
  },
  {
    title: 'Register',
    dataIndex: 'register',
    key: 'register',
    width: 110,
    fixed: 'left',
  },
  {
    title: 'Billin',
    dataIndex: 'billin',
    key: 'billin',
    width: 110,
    align: 'right',
    render: (value: number) => formatSummary(value),
  },
  {
    title: 'Withdraw',
    dataIndex: 'withdraw',
    key: 'withdraw',
    width: 110,
    align: 'right',
    render: (value: number) => formatSummary(value),
  },
  {
    title: (
      <Tooltip title="Promotion data coming in phase 2">
        <span>Promotion</span>
      </Tooltip>
    ),
    dataIndex: 'promotion',
    key: 'promotion',
    width: 100,
    align: 'right',
    render: () => formatPromotion(),
  },
  {
    title: 'Revenue',
    dataIndex: 'revenue',
    key: 'revenue',
    width: 110,
    align: 'right',
    render: (value: number) => (
      <Typography.Text type={value < 0 ? 'danger' : undefined}>
        {formatSummary(value)}
      </Typography.Text>
    ),
  },
  {
    title: (
      <Tooltip title="Deposit amounts by sequence since member registration">
        Deposits (1–21)
      </Tooltip>
    ),
    children: depositColumns,
  },
];
