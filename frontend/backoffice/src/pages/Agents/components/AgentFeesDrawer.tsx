import React, { useEffect, useState } from 'react';
import { Drawer, Table, Button, Typography, Tag, Space, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { TablePaginationConfig } from 'antd/es/table';
import { useAgentFees } from '../hooks/useAgentFees';
import AgentFeeModal from './AgentFeeModal';
import AgentFeeEditModal from './AgentFeeEditModal';
import type { Agent } from '../../../types/agents';
import type { CreateFeePayload, UpdateFeePayload, AgentFee } from '../../../types/agentFees';


const { Title } = Typography;

interface AgentFeesDrawerProps {
  agent: Agent | null;
  open: boolean;
  onClose: () => void;
}

const AgentFeesDrawer: React.FC<AgentFeesDrawerProps> = ({ agent, open, onClose }) => {
  const { fees, companies, categories, loading, total, fetchFees, fetchMasterData, createFee, updateFee, deleteFee } = useAgentFees(agent?._id || '');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<AgentFee | null>(null);

  useEffect(() => {
    if (open) {
      fetchMasterData();
      fetchFees({ page: 1, limit: pageSize });
      setPage(1);
    }
  }, [open, fetchMasterData, fetchFees, pageSize]);

  const handleTableChange = (pagination: TablePaginationConfig) => {
    const newPage = pagination.current || 1;
    const newPageSize = pagination.pageSize || 10;
    setPage(newPage);
    setPageSize(newPageSize);
    fetchFees({ page: newPage, limit: newPageSize });
  };

  const getCompanyName = (companyId: string) => {
    const comp = companies.find(c => c._id === companyId);
    return comp ? comp.name.en : companyId;
  };

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find(c => c._id === categoryId);
    return cat ? cat.name.en : categoryId;
  };

  const handleCreate = async (values: CreateFeePayload) => {
    const success = await createFee(values);
    if (success) {
      setIsModalOpen(false);
      fetchFees({ page, limit: pageSize });
    }
  };

  const handleUpdate = async (feeId: string, values: UpdateFeePayload, etag: string) => {
    const success = await updateFee(feeId, values, etag);
    if (success) {
      setIsEditModalOpen(false);
      setEditingFee(null);
      fetchFees({ page, limit: pageSize });
    }
  };

  const handleDelete = async (fee: AgentFee) => {
    const success = await deleteFee(fee._id, fee.upd_date);
    if (success) {
      fetchFees({ page, limit: pageSize });
    }
  };

  const columns = [
    {
      title: 'Company',
      dataIndex: 'company_id',
      key: 'company_id',
      render: (id: string) => <Tag color="blue">{getCompanyName(id)}</Tag>,
    },
    {
      title: 'Category',
      dataIndex: 'main_cate_id',
      key: 'main_cate_id',
      render: (id: string) => <Tag color="purple">{getCategoryName(id)}</Tag>,
    },
    {
      title: 'Fee Rate (%)',
      dataIndex: 'fee_rate',
      key: 'fee_rate',
      render: (rate: number) => <strong>{rate}%</strong>,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: AgentFee) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => {
              setEditingFee(record);
              setIsEditModalOpen(true);
            }}
            style={{ color: '#2563EB' }}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this fee?"
            description="Are you sure you want to delete this fee override?"
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
    }
  ];

  return (
    <Drawer
      title={<Title level={4} style={{ margin: 0 }}>Agent Fees: {agent?.branch_name} ({agent?.branch_code})</Title>}
      placement="right"
      width={700}
      onClose={onClose}
      open={open}
    >
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" onClick={() => setIsModalOpen(true)}>
          Add Fee Rate
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={fees}
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

      <AgentFeeModal
        open={isModalOpen}
        loading={loading}
        companies={companies}
        categories={categories}
        currentFees={fees}
        onOk={handleCreate}
        onCancel={() => setIsModalOpen(false)}
      />

      <AgentFeeEditModal
        open={isEditModalOpen}
        loading={loading}
        fee={editingFee}
        onOk={handleUpdate}
        onCancel={() => {
          setIsEditModalOpen(false);
          setEditingFee(null);
        }}
      />
    </Drawer>
  );
};

export default AgentFeesDrawer;
