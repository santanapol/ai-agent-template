import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Button, Typography, Switch, InputNumber, Collapse, Space, Tag, Spin, Breadcrumb, message } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useAgentFees } from '../Agents/hooks/useAgentFees';
import { getAgentById } from '../../lib/agentsApiClient';
import type { Agent } from '../../types/agents';
import type { AgentFee } from '../../types/agentFees';

const { Title, Text } = Typography;

interface DraftFee {
  enabled: boolean;
  rate: number;
}

const AgentFeesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [agent, setAgent] = useState<Agent | null>(null);
  const [agentLoading, setAgentLoading] = useState(true);

  const { fees, companies, categories, loading, fetchFees, fetchMasterData, bulkSave } = useAgentFees(id || '');
  
  // Key format: `${companyId}_${categoryId}`
  const [draftFees, setDraftFees] = useState<Record<string, DraftFee>>({});

  useEffect(() => {
    if (!id) return;
    const fetchAgentData = async () => {
      try {
        setAgentLoading(true);
        const data = await getAgentById(id);
        setAgent(data.agent);
      } catch (err) {
        message.error('Failed to load agent details');
        navigate('/agents');
      } finally {
        setAgentLoading(false);
      }
    };
    fetchAgentData();
  }, [id, navigate]);

  useEffect(() => {
    if (id) {
      fetchMasterData();
      fetchFees({ page: 1, limit: 1000 });
    }
  }, [id, fetchMasterData, fetchFees]);

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
      message.info('No changes to save');
      return;
    }

    const success = await bulkSave(creates, updates, deletes);
    if (success) {
      fetchFees({ page: 1, limit: 1000 });
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

  if (agentLoading) {
    return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;
  }

  return (
    <Space direction="vertical" size="large" style={{ display: 'flex' }}>
      <Breadcrumb
        items={[
          { title: <a onClick={() => navigate('/agents')}>Agents</a> },
          { title: 'Manage Fees' },
        ]}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space align="center" size="middle">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/agents')} />
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Fees: {agent?.branch_name} <Text type="secondary" style={{ fontSize: 16 }}>({agent?.branch_code})</Text>
            </Title>
            <Text type="secondary">Default Rate: {agent?.default_fee_rate}%</Text>
          </div>
        </Space>
        
        <Button 
          type="primary" 
          icon={<SaveOutlined />} 
          onClick={handleSaveAll} 
          loading={loading}
          size="large"
          style={{ borderRadius: 6 }}
        >
          Save All Changes
        </Button>
      </div>

      <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}>
        <Spin spinning={loading && companies.length === 0}>
          <Collapse defaultActiveKey={companies.length > 0 ? [companies[0]._id] : []}>
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
      </Card>
    </Space>
  );
};

export default AgentFeesPage;
