import React, { useEffect, useState } from 'react';
import { Drawer, Table, Button, Typography, Switch, InputNumber, Collapse, Space, Tag, Spin } from 'antd';
import { useAgentFees } from '../hooks/useAgentFees';
import type { Agent } from '../../../types/agents';
import type { AgentFee } from '../../../types/agentFees';

const { Title, Text } = Typography;

interface AgentFeesDrawerProps {
  agent: Agent | null;
  open: boolean;
  onClose: () => void;
}

interface DraftFee {
  enabled: boolean;
  rate: number;
}

const AgentFeesDrawer: React.FC<AgentFeesDrawerProps> = ({ agent, open, onClose }) => {
  const { fees, companies, categories, loading, fetchFees, fetchMasterData, bulkSave } = useAgentFees(agent?._id || '');
  
  // Key format: `${companyId}_${categoryId}`
  const [draftFees, setDraftFees] = useState<Record<string, DraftFee>>({});

  useEffect(() => {
    if (open) {
      fetchMasterData();
      fetchFees({ page: 1, limit: 1000 });
    }
  }, [open, fetchMasterData, fetchFees]);

  useEffect(() => {
    if (!loading) {
      const initial: Record<string, DraftFee> = {};
      fees.forEach(f => {
        initial[`${f.company_id}_${f.main_cate_id}`] = { enabled: true, rate: f.fee_rate };
      });
      setDraftFees(initial);
    }
  }, [fees, loading]);

  const handleToggle = (companyId: string, categoryId: string, checked: boolean) => {
    const key = `${companyId}_${categoryId}`;
    setDraftFees(prev => ({
      ...prev,
      [key]: {
        enabled: checked,
        rate: prev[key]?.rate || agent?.default_fee_rate || 0
      }
    }));
  };

  const handleRateChange = (companyId: string, categoryId: string, val: number | null) => {
    if (val === null) return;
    const key = `${companyId}_${categoryId}`;
    setDraftFees(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        rate: val
      }
    }));
  };

  const handleSaveAll = async () => {
    if (!agent) return;
    
    const creates: any[] = [];
    const updates: any[] = [];
    const deletes: any[] = [];

    const originalMap = new Map<string, AgentFee>();
    fees.forEach(f => originalMap.set(`${f.company_id}_${f.main_cate_id}`, f));

    companies.forEach(company => {
      categories.forEach(category => {
        const key = `${company._id}_${category._id}`;
        const draft = draftFees[key];
        const original = originalMap.get(key);

        if (draft?.enabled) {
          if (!original) {
            creates.push({
              company_id: company._id,
              main_cate_id: category._id,
              fee_rate: draft.rate
            });
          } else if (original.fee_rate !== draft.rate) {
            updates.push({
              id: original._id,
              payload: { fee_rate: draft.rate },
              etag: original.upd_date
            });
          }
        } else {
          if (original) {
            deletes.push({
              id: original._id,
              etag: original.upd_date
            });
          }
        }
      });
    });

    if (creates.length === 0 && updates.length === 0 && deletes.length === 0) {
      onClose(); // Nothing changed
      return;
    }

    const success = await bulkSave(creates, updates, deletes);
    if (success) {
      fetchFees({ page: 1, limit: 1000 });
      onClose();
    }
  };

  const columns = (companyId: string) => [
    {
      title: 'Category',
      dataIndex: 'name',
      key: 'name',
      render: (name: any) => <Tag color="purple">{name.en}</Tag>,
    },
    {
      title: 'Override Fee',
      key: 'override',
      width: 120,
      render: (_: any, record: any) => {
        const key = `${companyId}_${record._id}`;
        const draft = draftFees[key];
        return (
          <Switch 
            checked={draft?.enabled || false}
            onChange={(checked) => handleToggle(companyId, record._id, checked)}
            checkedChildren="ON"
            unCheckedChildren="OFF"
          />
        );
      }
    },
    {
      title: 'Fee Rate (%)',
      key: 'fee_rate',
      width: 200,
      render: (_: any, record: any) => {
        const key = `${companyId}_${record._id}`;
        const draft = draftFees[key];
        const isEnabled = draft?.enabled || false;
        return (
          <InputNumber
            min={0}
            max={100}
            formatter={(value) => `${value}%`}
            parser={(value) => (value ? Number(value.replace('%', '')) : 0) as any}
            value={isEnabled ? draft?.rate : agent?.default_fee_rate}
            onChange={(val) => handleRateChange(companyId, record._id, val)}
            disabled={!isEnabled}
            style={{ width: '100%' }}
          />
        );
      }
    }
  ];

  return (
    <Drawer
      title={
        <Space direction="vertical" size={0}>
          <Title level={4} style={{ margin: 0 }}>Agent Fees: {agent?.branch_name}</Title>
          <Text type="secondary">Default Rate: {agent?.default_fee_rate}%</Text>
        </Space>
      }
      placement="right"
      width={700}
      onClose={onClose}
      open={open}
      footer={
        <div style={{ textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Cancel
          </Button>
          <Button type="primary" onClick={handleSaveAll} loading={loading}>
            Save Changes
          </Button>
        </div>
      }
    >
      <Spin spinning={loading && companies.length === 0}>
        <Collapse accordion>
          {companies.map(company => (
            <Collapse.Panel header={<strong style={{ fontSize: 16 }}>{company.name.en}</strong>} key={company._id}>
              <Table 
                columns={columns(company._id)} 
                dataSource={categories} 
                rowKey="_id"
                pagination={false}
                size="small"
              />
            </Collapse.Panel>
          ))}
        </Collapse>
      </Spin>
    </Drawer>
  );
};

export default AgentFeesDrawer;
