import React, { useMemo, useState } from 'react';
import { Table, Input, Select, Button, Space, Badge, theme } from 'antd';
import { UserAddOutlined } from '@ant-design/icons';
import { PageContainer, PageContentCard, FiltersContainer } from '../../index';
import { mockStaff, ROLE_LABELS, ROLE_OPTIONS } from '../mockData';
import { listBreadcrumb } from '../breadcrumbs';
import { TABLE_SCROLL, tableLocale, useDemoTableLoading } from '../tableConfig';
import type { DemoViewProps } from '../types';
import { openDetail } from '../types';

const StaffListView: React.FC<DemoViewProps> = (props) => {
  const { setDemoMode, setDetailReturnMode, setSelectedStaffId } = props;
  const { token } = theme.useToken();
  const loading = useDemoTableLoading();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<string | undefined>();
  const [activeFilter, setActiveFilter] = useState<string | undefined>();

  const filteredData = useMemo(() => {
    return mockStaff.filter((row) => {
      const q = search.toLowerCase();
      if (q) {
        const haystack = `${row.code} ${row.firstname} ${row.lastname} ${row.username}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (role && row.role !== role) return false;
      if (activeFilter === 'active' && !row.active) return false;
      if (activeFilter === 'inactive' && row.active) return false;
      return true;
    });
  }, [search, role, activeFilter]);

  const columns = [
    { title: 'Staff Code', dataIndex: 'code', key: 'code' },
    { title: 'First Name', dataIndex: 'firstname', key: 'firstname' },
    { title: 'Last Name', dataIndex: 'lastname', key: 'lastname' },
    { title: 'Email', dataIndex: 'email', key: 'email', ellipsis: true },
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
    {
      title: 'System Role',
      dataIndex: 'role',
      key: 'role',
      render: (r: string) => ROLE_LABELS[r] ?? r,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: (typeof mockStaff)[number]) => (
        <Button
          type="link"
          onClick={() => {
            setSelectedStaffId(record.id);
            openDetail({ setDemoMode, setDetailReturnMode }, 'staff-detail', 'staff');
          }}
        >
          View Details
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title="Staff Management"
      description="Manage system staff profiles. Search by name or code, filter by role or status."
      breadcrumbItems={listBreadcrumb('Staff Management')}
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={setSearch}
          />
          <Select
            placeholder="Filter by Role"
            style={{ width: 180 }}
            allowClear
            value={role}
            onChange={setRole}
            options={ROLE_OPTIONS.map(({ value, label }) => ({ value, label }))}
          />
          <Select
            placeholder="Filter by Status"
            style={{ width: 150 }}
            allowClear
            value={activeFilter}
            onChange={setActiveFilter}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </FiltersContainer>
        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="id"
          loading={loading}
          locale={tableLocale}
          pagination={{ pageSize: 5 }}
          scroll={TABLE_SCROLL}
        />
      </PageContentCard>
    </PageContainer>
  );
};

export default StaffListView;
