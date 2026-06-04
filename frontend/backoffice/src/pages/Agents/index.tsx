import React, { useEffect, useState } from 'react';
import { Card, Table, Input, Button, Space, Typography, Tag, Modal, Form, InputNumber, Popconfirm, Select, Checkbox } from 'antd';
import { SearchOutlined, SyncOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { TablePaginationConfig } from 'antd/es/table';
import { useAgents } from './hooks/useAgents';
import { useNavigate } from 'react-router-dom';
import type { Agent } from '../../types/agents';

const { Title } = Typography;

const AgentsList: React.FC = () => {
  const { agents, unsyncedBranches, total, loading, loadingUnsynced, fetchAgents, fetchUnsyncedBranches, syncData, updateData, deleteData } = useAgents();
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  
  const navigate = useNavigate();
  
  const [syncForm] = Form.useForm();
  const [editForm] = Form.useForm();

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

  const handleEdit = (record: Agent) => {
    setEditingAgent(record);
    editForm.setFieldsValue({ default_fee_rate: record.default_fee_rate });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    try {
      const values = await editForm.validateFields();
      if (editingAgent) {
        const success = await updateData(editingAgent._id, { default_fee_rate: values.default_fee_rate }, editingAgent.upd_date);
        if (success) {
          setIsEditModalOpen(false);
          setEditingAgent(null);
          fetchAgents({ page, limit: pageSize, search: searchText });
        }
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
        <Tag color={text === 'MAIN' ? 'purple' : 'default'}>{text}</Tag>
      ),
    },
    {
      title: 'Fee Rate (%)',
      dataIndex: 'default_fee_rate',
      key: 'default_fee_rate',
      render: (rate: number) => <strong>{rate}%</strong>,
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
            type="text" 
            onClick={() => navigate(`/agents/${record._id}/fees`)}
            style={{ color: '#10B981' }}
          >
            Manage Fees
          </Button>
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
            style={{ color: '#2563EB' }}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this agent?"
            description="Are you sure you want to delete this agent?"
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ display: 'flex' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>Agent Fee Management</Title>
        <Button 
          type="primary" 
          icon={<SyncOutlined />} 
          onClick={handleOpenSyncModal}
          style={{ borderRadius: 6 }}
        >
          Sync Branch
        </Button>
      </div>

      <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}>
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

      {/* Edit Modal */}
      <Modal
        title="Edit Agent Fee Rate"
        open={isEditModalOpen}
        onOk={handleUpdate}
        onCancel={() => { setIsEditModalOpen(false); setEditingAgent(null); }}
        confirmLoading={loading}
        okText="Update"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="default_fee_rate"
            label="Default Fee Rate (%)"
            rules={[{ required: true, message: 'Fee rate is required' }]}
          >
            <InputNumber 
              min={0} 
              max={100} 
              formatter={(value) => `${value}%`}
              parser={(value) => (value ? value.replace('%', '') : '') as any}
              style={{ width: '100%' }} 
              size="large"
            />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

export default AgentsList;
