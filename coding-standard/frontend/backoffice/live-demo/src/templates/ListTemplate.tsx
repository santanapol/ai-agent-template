import React, { useState } from 'react';
import { Table, Input, Select, Button, Space, Badge, theme } from 'antd';
import { UserAddOutlined } from '@ant-design/icons';
import { PageContainer, PageContentCard, FiltersContainer } from './index';

interface StaffItem {
  id: string;
  code: string;
  firstname: string;
  lastname: string;
  email: string;
  tel: string;
  username: string;
  active: boolean;
  role: string;
}

const ROLE_OPTIONS = [
  { value: 'platform_admin', label: 'Platform Admin' },
  { value: 'branch_admin', label: 'Branch Admin' },
  { value: 'support_admin', label: 'Support Admin' },
  { value: 'support', label: 'Support' },
  { value: 'staff', label: 'Staff' },
];

const ListTemplate: React.FC = () => {
  const { token } = theme.useToken();
  const [loading] = useState(false);
  const [data] = useState<StaffItem[]>([]);

  const columns = [
    { title: 'Staff Code', dataIndex: 'code', key: 'code' },
    { title: 'First Name', dataIndex: 'firstname', key: 'firstname' },
    { title: 'Last Name', dataIndex: 'lastname', key: 'lastname' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Telephone', dataIndex: 'tel', key: 'tel' },
    { title: 'Username', dataIndex: 'username', key: 'username' },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      render: (active: boolean) => (
        <Badge
          status={active ? 'success' : 'default'}
          text={
            <span style={{ textTransform: 'capitalize', color: active ? token.colorSuccess : token.colorTextSecondary }}>
              {active ? 'active' : 'inactive'}
            </span>
          }
        />
      ),
    },
    { title: 'System Role', dataIndex: 'role', key: 'role' },
  ];

  return (
    <PageContainer
      title="Staff Management"
      description="Manage system staff profiles."
      extra={
        <Space>
          <Button type="primary" icon={<UserAddOutlined />}>Add Staff</Button>
        </Space>
      }
    >
      <PageContentCard>
        <FiltersContainer>
          <Input.Search
            placeholder="Search name or staff code..."
            style={{ width: '100%', maxWidth: 300 }}
            allowClear
          />
          <Select
            placeholder="Filter by Role"
            style={{ width: 180 }}
            allowClear
            options={ROLE_OPTIONS}
          />
          <Select
            placeholder="Filter by Status"
            style={{ width: 150 }}
            allowClear
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </FiltersContainer>

        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          scroll={{ x: 'max-content' }}
        />
      </PageContentCard>
    </PageContainer>
  );
};

export default ListTemplate;
