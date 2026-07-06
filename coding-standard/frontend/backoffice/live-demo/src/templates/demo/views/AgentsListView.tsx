import React, { useMemo, useState } from 'react';
import { Table, Input, Select, Button, Space, Tag } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import { PageContainer, PageContentCard, FiltersContainer } from '../../index';
import { mockAgents } from '../mockData';
import { listBreadcrumb } from '../breadcrumbs';
import { getAgentStatusColor } from '../helpers';
import { TABLE_SCROLL, tableLocale, useDemoTableLoading } from '../tableConfig';
import type { DemoViewProps } from '../types';
import { openDetail } from '../types';

const AgentsListView: React.FC<DemoViewProps> = (props) => {
  const { setDemoMode, setDetailReturnMode, setSelectedAgentId } = props;
  const loading = useDemoTableLoading();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>();

  const filteredData = useMemo(() => {
    return mockAgents.filter((row) => {
      const q = search.toLowerCase();
      if (q) {
        const haystack = `${row.agent_code} ${row.agent_name} ${row.contact_name}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (status && row.status !== status) return false;
      return true;
    });
  }, [search, status]);

  const columns = [
    { title: 'Agent Code', dataIndex: 'agent_code', key: 'agent_code' },
    { title: 'Agent Name', dataIndex: 'agent_name', key: 'agent_name', ellipsis: true },
    { title: 'Contact Name', dataIndex: 'contact_name', key: 'contact_name' },
    { title: 'Email', dataIndex: 'email', key: 'email', ellipsis: true },
    { title: 'Telephone', dataIndex: 'tel', key: 'tel' },
    { title: 'Branches', dataIndex: 'branch_count', key: 'branch_count', align: 'right' as const },
    {
      title: 'Commission %',
      dataIndex: 'commission_rate',
      key: 'commission_rate',
      align: 'right' as const,
      render: (val: number) => `${val.toFixed(1)}%`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={getAgentStatusColor(s)}>{s}</Tag>,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: (typeof mockAgents)[number]) => (
        <Button
          type="link"
          onClick={() => {
            setSelectedAgentId(record.id);
            openDetail({ setDemoMode, setDetailReturnMode }, 'agent-detail', 'agents');
          }}
        >
          View Details
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title="Agents List"
      description="Manage partner agent organizations, commission rates, and branch assignments."
      breadcrumbItems={listBreadcrumb('Agents List')}
      extra={
        <Space>
          <Button type="primary" icon={<TeamOutlined />}>Add Agent</Button>
        </Space>
      }
    >
      <PageContentCard>
        <FiltersContainer>
          <Input.Search
            placeholder="Search agent name or code..."
            style={{ width: '100%', maxWidth: 300 }}
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={setSearch}
          />
          <Select
            placeholder="Filter by Status"
            style={{ width: 150 }}
            allowClear
            value={status}
            onChange={setStatus}
            options={[
              { value: 'ACTIVE', label: 'ACTIVE' },
              { value: 'SUSPENDED', label: 'SUSPENDED' },
              { value: 'INACTIVE', label: 'INACTIVE' },
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

export default AgentsListView;
