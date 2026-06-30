import React, { useRef } from 'react';
import { Empty, Table } from 'antd';
import type { Royalty21Row } from '../../../types/branchReport';
import { royalty21Columns } from './royalty21Columns';

/** AdminLayout header + card chrome — keeps sticky header below the navbar. */
const STICKY_OFFSET_HEADER = 64;

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

  return (
    <div ref={tableWrapRef}>
      <Table<Royalty21Row>
        rowKey={(row) => `${row.username}::${row.register}`}
        size="small"
        bordered
        loading={loading}
        columns={royalty21Columns}
        dataSource={rows}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: ['20', '50', '100'],
          showTotal: (count) => `Total ${count} members`,
        }}
        scroll={{ x: 'max-content' }}
        sticky={{ offsetHeader: STICKY_OFFSET_HEADER }}
        locale={{
          emptyText: hasSearched ? (
            <Empty description="No members found for selected channel" />
          ) : (
            <Empty description="Select channel and click Search" />
          ),
        }}
        onChange={(pagination) => {
          onTableChange(pagination.current ?? 1, pagination.pageSize ?? pageSize);
          tableWrapRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }}
      />
    </div>
  );
};

export default Royalty21Table;
