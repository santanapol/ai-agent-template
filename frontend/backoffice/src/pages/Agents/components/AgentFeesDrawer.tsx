import React, { useEffect, useState } from 'react';
import { Drawer, Table, Button, Typography, Tag } from 'antd';
import type { TablePaginationConfig } from 'antd/es/table';
import { useAgentFees } from '../hooks/useAgentFees';
import type { Agent } from '../../../types/agents';


const { Title } = Typography;

interface AgentFeesDrawerProps {
  agent: Agent | null;
  open: boolean;
  onClose: () => void;
}

const AgentFeesDrawer: React.FC<AgentFeesDrawerProps> = ({ agent, open, onClose }) => {
  const { fees, companies, categories, loading, total, fetchFees, fetchMasterData } = useAgentFees(agent?._id || '');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
        <Button type="primary">
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
    </Drawer>
  );
};

export default AgentFeesDrawer;
