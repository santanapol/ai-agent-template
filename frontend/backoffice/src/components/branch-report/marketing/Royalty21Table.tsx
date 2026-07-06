import React, { useRef } from 'react';
import { DataTable } from '@/components/data-table';
import type { Royalty21Row } from '@/types/branchReport';
import { buildRoyalty21Columns } from './royalty21Columns';

interface Royalty21TableProps {
  rows: Royalty21Row[];
  loading: boolean;
  hasSearched: boolean;
  page: number;
  pageSize: number;
  total: number;
  onTableChange: (page: number, pageSize: number) => void;
}

const Royalty21Table: React.FC<Royalty21TableProps> = ({
  rows,
  loading,
  hasSearched,
  page,
  pageSize,
  total,
  onTableChange,
}) => {
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const columns = buildRoyalty21Columns();

  return (
    <div ref={tableWrapRef} className="overflow-x-auto">
      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        rowKey={(row) => `${row.username}::${row.register}`}
        emptyTitle={hasSearched ? 'No members found for selected channel' : 'Select channel and click Search'}
        emptyDescription=""
        pagination={{
          page,
          pageSize,
          total,
          pageSizeOptions: [20, 50, 100],
          showTotal: (count) => `Total ${count} members`,
          onChange: (nextPage, nextSize) => {
            onTableChange(nextPage, nextSize);
            tableWrapRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
          },
        }}
      />
    </div>
  );
};

export default Royalty21Table;
