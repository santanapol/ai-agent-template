import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Button, Typography, Switch, InputNumber, Space, Tag, Spin, Breadcrumb, message, Form } from 'antd';
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
  
  const [form] = Form.useForm();
  
  // Track which ones are currently enabled to handle disabled state of InputNumber
  // This will cause a re-render but only when a switch is toggled, not on every keystroke.
  const [enabledKeys, setEnabledKeys] = useState<Set<string>>(new Set());

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
    if (!loading && fees.length >= 0) {
      const initial: Record<string, DraftFee> = {};
      const enabled = new Set<string>();
      
      fees.forEach(f => {
        const key = `${f.company_id}_${f.main_cate_id}`;
        initial[key] = { enabled: true, rate: f.fee_rate };
        enabled.add(key);
      });
      form.setFieldsValue(initial);
      setEnabledKeys(enabled);
    }
  }, [fees, loading, form]);

  const handleToggle = (key: string, checked: boolean) => {
    setEnabledKeys(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(key);
        // Set default rate if it was undefined
        const currentRate = form.getFieldValue([key, 'rate']);
        if (currentRate === undefined || currentRate === null) {
          form.setFieldValue([key, 'rate'], agent?.default_fee_rate || 0);
        }
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const handleSaveAll = async () => {
    if (!agent) return;
    
    try {
      const values = await form.validateFields();
      
      const creates: any[] = [];
      const updates: any[] = [];
      const deletes: any[] = [];

      const originalMap = new Map<string, AgentFee>();
      fees.forEach(f => originalMap.set(`${f.company_id}_${f.main_cate_id}`, f));

      companies.forEach(company => {
        categories.forEach(category => {
          const key = `${company._id}_${category._id}`;
          const draft = values[key];
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
    } catch (err) {
      message.error('Please check all input values');
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
        return (
          <Form.Item name={[key, 'enabled']} valuePropName="checked" style={{ margin: 0 }}>
            <Switch 
              checkedChildren="ON"
              unCheckedChildren="OFF"
              onChange={(checked) => handleToggle(key, checked)}
            />
          </Form.Item>
        );
      }
    },
    {
      title: 'Fee Rate (%)',
      key: 'fee_rate',
      width: 200,
      render: (_: any, record: any) => {
        const key = `${companyId}_${record._id}`;
        const isEnabled = enabledKeys.has(key);
        return (
          <Form.Item name={[key, 'rate']} style={{ margin: 0 }}>
            <InputNumber
              min={0}
              max={100}
              formatter={(value) => `${value}%`}
              parser={(value) => (value ? Number(value.replace('%', '')) : 0) as any}
              disabled={!isEnabled}
              style={{ width: '100%' }}
              placeholder={!isEnabled ? `${agent?.default_fee_rate}%` : ''}
            />
          </Form.Item>
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

      <Form form={form} component={false}>
        <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}>
          <Spin spinning={loading && companies.length === 0}>
            {companies.map((company, index) => (
              <div key={company._id} style={{ marginBottom: index === companies.length - 1 ? 0 : 32 }}>
                <Title level={4} style={{ marginBottom: 16 }}>{company.name.en}</Title>
                <Table 
                  columns={columns(company._id)} 
                  dataSource={categories} 
                  rowKey="_id"
                  pagination={false}
                  size="small"
                  bordered
                />
              </div>
            ))}
          </Spin>
        </Card>
      </Form>
    </Space>
  );
};

export default AgentFeesPage;
