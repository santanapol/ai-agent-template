import { Info } from 'lucide-react';
import { type DataTableColumn } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { InvoiceTransaction } from '@/types/invoice';
import { formatCategoryName, formatFee, formatMoney } from './utils';

export const invoiceTransactionColumns: DataTableColumn<InvoiceTransaction>[] = [
  {
    key: 'company_name',
    title: 'Game Provider',
    render: (record) => record.company_name || '-',
  },
  {
    key: 'main_category_name',
    title: 'Game Category',
    render: (record) => formatCategoryName(record.main_category_name),
  },
  {
    key: 'bet',
    title: 'Bet',
    align: 'right',
    render: (record) => formatMoney(record.bet || 0),
  },
  {
    key: 'net_win',
    title: 'Net Win',
    align: 'right',
    render: (record) => formatMoney(record.net_win),
  },
  {
    key: 'fee',
    title: (
      <span className="inline-flex items-center gap-1">
        Fee (%)
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="icon-sm" type="button" aria-label="Fee info">
                <Info aria-hidden="true" />
              </Button>
            }
          />
          <TooltipContent>Fee is calculated based on Net Win</TooltipContent>
        </Tooltip>
      </span>
    ),
    align: 'right',
    render: (record) => formatFee(record.fee),
  },
  {
    key: 'amount',
    title: 'Amount',
    align: 'right',
    render: (record) => formatMoney(record.amount),
  },
];
