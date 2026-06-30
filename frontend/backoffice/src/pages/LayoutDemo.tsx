import React, { useState } from 'react';
import { Table, Input, Select, DatePicker, Button, Space, Descriptions, Tag, Typography } from 'antd';
import { PageContainer, DetailContainer, PageContentCard, FiltersContainer } from '../components/layout';

const { Text } = Typography;

const mockData = [
  { id: 1, code: 'EMP-001', name: 'John Doe', role: 'Platform Admin', email: 'john@example.com', status: 'Active' },
  { id: 2, code: 'EMP-002', name: 'Jane Smith', role: 'Branch Admin', email: 'jane@example.com', status: 'Active' },
  { id: 3, code: 'EMP-003', name: 'Bob Johnson', role: 'Support Agent', email: 'bob@example.com', status: 'Inactive' },
];

const mockColumns = [
  { title: 'Code', dataIndex: 'code', key: 'code' },
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Role', dataIndex: 'role', key: 'role' },
  { title: 'Email', dataIndex: 'email', key: 'email' },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (status: string) => (
      <Tag color={status === 'Active' ? 'green' : 'red'}>{status}</Tag>
    ),
  },
];

const LayoutDemo: React.FC = () => {
  const [demoMode, setDemoMode] = useState<'list' | 'detail'>('list');

  if (demoMode === 'list') {
    return (
      <PageContainer
        title="UI Layout Showcase: List View Template"
        description="Interactive live demo of the standard directory list layout. It demonstrates spacing, search filters, and table wrappers."
        extra={
          <Space>
            <Button onClick={() => setDemoMode('detail')}>Switch to Detail View Demo</Button>
            <Button type="primary">Mock Action</Button>
          </Space>
        }
      >
        <PageContentCard>
          <FiltersContainer>
            <Input.Search placeholder="Search name..." style={{ width: 300 }} allowClear />
            <Select
              placeholder="Select Status"
              style={{ width: 180 }}
              allowClear
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
            <DatePicker placeholder="Filter Date" style={{ width: 180 }} />
          </FiltersContainer>
          <Table
            dataSource={mockData}
            columns={mockColumns}
            rowKey="id"
            pagination={{ pageSize: 5 }}
            scroll={{ x: 'max-content' }}
          />
        </PageContentCard>
      </PageContainer>
    );
  }

  return (
    <DetailContainer
      title="UI Layout Showcase: Detail View Template"
      onBack={() => setDemoMode('list')}
      extra={
        <Space>
          <Button onClick={() => setDemoMode('list')}>Back to List View Demo</Button>
          <Button type="primary">Save Changes</Button>
        </Space>
      }
    >
      <PageContentCard style={{ maxWidth: 720 }}>
        <Descriptions title="Entity Core Metadata" bordered column={{ xs: 1, sm: 2 }} style={{ marginBottom: 24 }}>
          <Descriptions.Item label="Code">DEMO-001</Descriptions.Item>
          <Descriptions.Item label="Name">John Doe</Descriptions.Item>
          <Descriptions.Item label="Role">Platform Admin</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color="green">Active</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Email" span={2}>
            john.doe@example.com
          </Descriptions.Item>
        </Descriptions>

        <Text type="secondary">
          * This card container is restricted to 720px max-width to ensure optimal readability for forms and descriptions.
        </Text>
      </PageContentCard>
    </DetailContainer>
  );
};

export default LayoutDemo;
