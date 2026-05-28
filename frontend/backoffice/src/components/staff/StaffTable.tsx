import React, { useMemo } from 'react';
import { Table, Button, Badge, Typography, Space, theme } from 'antd';
import { EyeOutlined, EditOutlined, InboxOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { StaffProfile } from '../../types/staff';

const { Text } = Typography;

export interface StaffTablePagination {
  current: number;
  pageSize: number;
  total: number;
}

interface StaffTableProps {
  profiles: StaffProfile[];
  loading: boolean;
  pagination: StaffTablePagination;
  onView: (record: StaffProfile) => void;
  onEdit: (record: StaffProfile) => void;
  onArchive: (record: StaffProfile) => void;
  onRestore: (record: StaffProfile) => void;
  onTableChange: (cfg: TablePaginationConfig) => void;
}

const StaffTable: React.FC<StaffTableProps> = ({
  profiles,
  loading,
  pagination,
  onView,
  onEdit,
  onArchive,
  onRestore,
  onTableChange,
}) => {
  const { token } = theme.useToken();

  const columns = useMemo<ColumnsType<StaffProfile>>(
    () => [
      { title: 'Code', dataIndex: 'code', key: 'code' },
      {
        title: 'Name',
        key: 'name',
        render: (_, record) => (
          <Text strong>
            {record.firstname} {record.lastname}
          </Text>
        ),
      },
      {
        title: 'Username',
        key: 'username',
        render: (_, record) => <Text type="secondary">{record.user?.username ?? '—'}</Text>,
      },
      { title: 'Email', dataIndex: 'email', key: 'email' },
      { title: 'Tel', dataIndex: 'tel', key: 'tel' },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (status: StaffProfile['status']) => (
          <Badge
            status={status === 'active' ? 'success' : 'error'}
            text={
              <span
                style={{
                  textTransform: 'capitalize',
                  color: status === 'active' ? token.colorSuccess : token.colorError,
                }}
              >
                {status}
              </span>
            }
          />
        ),
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_, record) => (
          <Space>
            <Button
              type="text"
              icon={<EyeOutlined />}
              aria-label="View profile"
              onClick={() => onView(record)}
            />
            <Button
              type="text"
              icon={<EditOutlined />}
              aria-label="Edit profile"
              onClick={() => onEdit(record)}
            />
            {record.status === 'active' ? (
              <Button
                type="text"
                danger
                icon={<InboxOutlined />}
                aria-label="Archive profile"
                onClick={() => onArchive(record)}
              />
            ) : (
              <Button
                type="text"
                style={{ color: token.colorSuccess }}
                icon={<ReloadOutlined />}
                aria-label="Restore profile"
                onClick={() => onRestore(record)}
              />
            )}
          </Space>
        ),
      },
    ],
    [onView, onEdit, onArchive, onRestore, token],
  );

  return (
    <Table
      columns={columns}
      dataSource={profiles}
      rowKey="id"
      loading={loading}
      pagination={{
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        showSizeChanger: true,
        pageSizeOptions: [10, 20, 50],
      }}
      onChange={onTableChange}
    />
  );
};

export default StaffTable;
