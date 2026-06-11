import React, { useEffect, useState } from 'react';
import { Card, Table, Input, Button, Space, Typography, Tag, Modal, Form, Select, Checkbox } from 'antd';
import { SearchOutlined, SyncOutlined, SettingOutlined, DeleteOutlined, LinkOutlined } from '@ant-design/icons';
import type { TablePaginationConfig } from 'antd/es/table';
import { useAgents } from './hooks/useAgents';
import { useNavigate } from 'react-router-dom';
import type { Agent } from '../../types/agents';

const { Title } = Typography;

const AgentsList: React.FC = () => {
  const { agents, unsyncedBranches, total, loading, loadingUnsynced, fetchAgents, fetchUnsyncedBranches, syncData, deleteData } = useAgents();
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const navigate = useNavigate();
  const [syncForm] = Form.useForm();

  useEffect(() => {
    fetchAgents({ page, limit: pageSize, search: searchText });
  }, [fetchAgents, page, pageSize, searchText]);

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setPage(pagination.current || 1);
    setPageSize(pagination.pageSize || 10);
  };

  const onSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handleOpenSyncModal = () => {
    setIsSyncModalOpen(true);
    fetchUnsyncedBranches(showInactive);
  };

  const handleSync = async () => {
    try {
      const values = await syncForm.validateFields();
      const success = await syncData(values.branch_id);
      if (success) {
        setIsSyncModalOpen(false);
        syncForm.resetFields();
        fetchAgents({ page, limit: pageSize, search: searchText });
      }
    } catch {
      // Form validation failed
    }
  };

  const handleDelete = async (record: Agent) => {
    const success = await deleteData(record._id, record.upd_date);
    if (success) {
      fetchAgents({ page, limit: pageSize, search: searchText });
    }
  };

  const columns = [
    {
      title: 'Branch Code',
      dataIndex: 'branch_code',
      key: 'branch_code',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'Branch Name',
      dataIndex: 'branch_name',
      key: 'branch_name',
    },
    {
      title: 'Type',
      dataIndex: 'branch_type',
      key: 'branch_type',
      render: (text: string) => (
        <Tag color={text === 'MA' ? 'purple' : 'default'}>{text}</Tag>
      ),
    },
    {
      title: 'Ref Fee Branch',
      dataIndex: 'ref_fee_branch_id',
      key: 'ref_fee_branch_id',
      render: (refId: unknown, record: Agent) => {
        if (!refId) return <Typography.Text type="secondary">—</Typography.Text>;
        const normalizedRefId = typeof refId === 'object' && refId !== null && (refId as { $oid?: string }).$oid ? (refId as { $oid?: string }).$oid : String(refId);
        return record.ref_fee_branch_name ? <Tag icon={<LinkOutlined />}>{record.ref_fee_branch_name}</Tag> : <Typography.Text type="secondary">{normalizedRefId}</Typography.Text>;
      },
    },
    {
      title: 'Default Fee (%)',
      dataIndex: 'default_fee_rate',
      key: 'default_fee_rate',
      render: (rate?: number) => <strong>{rate ?? 0}%</strong>,
    },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'error'}>{active ? 'Active' : 'Inactive'}</Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: Agent) => (
        <Space size="middle">
          <Button
            type="primary"
            icon={<SettingOutlined />}
            onClick={() => navigate(`/agents/${record._id}/fees`)}
            size="small"
          >
            Manage
          </Button>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={() => {
              Modal.confirm({
                title: 'Delete this agent?',
                content: `Are you sure you want to delete "${record.branch_name}"?`,
                okText: 'Delete',
                okButtonProps: { danger: true },
                cancelText: 'Cancel',
                onOk: () => handleDelete(record),
              });
            }}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Space orientation="vertical" size="large" style={{ display: 'flex' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Agent Fee Management</Title>
          <Typography.Text type="secondary">
            View and configure specific game fee overrides or reference fees across agent branches.
          </Typography.Text>
        </div>
        <Button
          type="primary"
          icon={<SyncOutlined />}
          onClick={handleOpenSyncModal}
          style={{ borderRadius: 6 }}
        >
          Sync Branch
        </Button>
      </div>

      <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}>
        <div style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="Search by branch code or name..."
            allowClear
            onSearch={onSearch}
            style={{ maxWidth: 400 }}
            size="large"
            enterButton={<Button type="primary" icon={<SearchOutlined />}>Search</Button>}
          />
        </div>

        <Table
          columns={columns}
          dataSource={agents}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
          }}
          onChange={handleTableChange}
        />
      </Card>

      {/* Sync Modal */}
      <Modal
        title="Sync Agent Branch"
        open={isSyncModalOpen}
        onOk={handleSync}
        onCancel={() => { setIsSyncModalOpen(false); syncForm.resetFields(); }}
        confirmLoading={loading}
        okText="Sync"
      >
        <Form form={syncForm} layout="vertical">
          <Form.Item
            name="branch_id"
            label="Branch"
            rules={[{ required: true, message: 'Please select a branch!' }]}
          >
            <Select
              showSearch
              loading={loadingUnsynced}
              placeholder="Select a branch to sync"
              size="large"
              options={unsyncedBranches.map(b => ({
                value: b.branch_id,
                label: `${b.branch_code} - ${b.branch_name}${b.active === false ? ' [Inactive]' : ''}`
              }))}
              filterOption={(input, option) =>
                ((option?.label as string) ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item>
            <Checkbox
              checked={showInactive}
              onChange={(e) => {
                const checked = e.target.checked;
                setShowInactive(checked);
                fetchUnsyncedBranches(checked);
              }}
            >
              Show Inactive branches
            </Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

export default AgentsList;
