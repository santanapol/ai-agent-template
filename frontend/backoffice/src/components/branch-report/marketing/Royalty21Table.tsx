import React from 'react';
import { Empty, Table } from 'antd';
import type { Royalty21Row } from '../../../types/branchReport';
import { royalty21Columns } from './royalty21Columns';

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
  return (
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
      scroll={{ x: 'max-content', y: 'calc(100vh - 320px)' }}
      sticky
      locale={{
        emptyText: hasSearched ? (
          <Empty description="No members found for selected channel" />
        ) : (
          <Empty description="Select channel and click Search" />
        ),
      }}
      onChange={(pagination) => {
        onTableChange(pagination.current ?? 1, pagination.pageSize ?? pageSize);
      }}
      style={{ marginTop: 24 }}
    />
  );
};

export default Royalty21Table;
