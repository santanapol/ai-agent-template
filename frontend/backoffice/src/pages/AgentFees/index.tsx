import React, { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Button, Typography, Switch, InputNumber,
  Space, Tag, Spin, Breadcrumb, message, Form, Divider
} from 'antd';
import type { FormInstance } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useAgentFees } from '../Agents/hooks/useAgentFees';
import { getAgentById } from '../../lib/agentsApiClient';
import type { Agent } from '../../types/agents';
import type { AgentFee, GameCategory } from '../../types/agentFees';

const { Title, Text } = Typography;

// ─── Memoized Row ──────────────────────────────────────────────────────────────
// Each row watches only its OWN form field via Form.useWatch.
// Toggling one Switch re-renders ONLY that row — zero cascade to other rows.
interface FeeRowProps {
  record: GameCategory;
  companyId: string;
  form: FormInstance;
  defaultRate: number;
}

const FeeRow = React.memo(({ record, companyId, form, defaultRate }: FeeRowProps) => {
  const key = `${companyId}_${record._id}`;
  const isEnabled = Form.useWatch([key, 'enabled'], form);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 130px 200px',
      alignItems: 'center',
      padding: '10px 12px',
      borderBottom: '1px solid #f0f0f0',
      gap: 8,
    }}>
      <div><Tag color="purple">{record.name.en}</Tag></div>
      <div>
        <Form.Item name={[key, 'enabled']} valuePropName="checked" style={{ margin: 0 }}>
          <Switch checkedChildren="ON" unCheckedChildren="OFF" />
        </Form.Item>
      </div>
      <div>
        <Form.Item name={[key, 'rate']} style={{ margin: 0 }}>
          <InputNumber
            min={0}
            max={100}
            formatter={(v) => `${v}%`}
            parser={(v) => (v ? Number(v.replace('%', '')) : 0) as any}
            disabled={!isEnabled}
            placeholder={!isEnabled ? `${defaultRate}% (default)` : ''}
            style={{ width: '100%' }}
          />
        </Form.Item>
      </div>
    </div>
  );
});

// ─── Table Header ──────────────────────────────────────────────────────────────
const FeeTableHeader: React.FC = () => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: '1fr 130px 200px',
    padding: '8px 12px',
    background: '#fafafa',
    borderBottom: '1px solid #f0f0f0',
    fontWeight: 600,
    fontSize: 13,
    color: '#595959',
    gap: 8,
  }}>
    <span>Category</span>
    <span>Override</span>
    <span>Fee Rate (%)</span>
  </div>
);

// ─── Main Page ─────────────────────────────────────────────────────────────────
const AgentFeesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [agent, setAgent] = React.useState<Agent | null>(null);
  const [agentLoading, setAgentLoading] = React.useState(true);

  const { fees, companies, categories, loading, fetchFees, fetchMasterData, bulkSave } = useAgentFees(id || '');

  const [form] = Form.useForm();

  // ── Load agent details ────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setAgentLoading(true);
        const data = await getAgentById(id);
        setAgent(data.agent);
      } catch {
        message.error('Failed to load agent details');
        navigate('/agents');
      } finally {
        setAgentLoading(false);
      }
    })();
  }, [id, navigate]);

  // ── Load master data + fees ───────────────────────────────────────────────
  useEffect(() => {
    if (id) {
      fetchMasterData();
      fetchFees({ page: 1, limit: 1000 });
    }
  }, [id, fetchMasterData, fetchFees]);

  // ── Populate form when fees arrive ───────────────────────────────────────
  useEffect(() => {
    if (loading) return;
    const initial: Record<string, { enabled: boolean; rate: number }> = {};
    fees.forEach(f => {
      initial[`${f.company_id}_${f.main_cate_id}`] = { enabled: true, rate: f.fee_rate };
    });
    form.setFieldsValue(initial);
  }, [fees, loading, form]);

  // ── Bulk Save ─────────────────────────────────────────────────────────────
  const handleSaveAll = useCallback(async () => {
    if (!agent) return;
    try {
      const values = await form.getFieldsValue(true);

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
              creates.push({ company_id: company._id, main_cate_id: category._id, fee_rate: draft.rate });
            } else if (original.fee_rate !== draft.rate) {
              updates.push({ id: original._id, payload: { fee_rate: draft.rate }, etag: original.upd_date });
            }
          } else if (original) {
            deletes.push({ id: original._id, etag: original.upd_date });
          }
        });
      });

      if (!creates.length && !updates.length && !deletes.length) {
        message.info('No changes to save');
        return;
      }

      const success = await bulkSave(creates, updates, deletes);
      if (success) fetchFees({ page: 1, limit: 1000 });
    } catch {
      message.error('Please check all input values');
    }
  }, [agent, form, fees, companies, categories, bulkSave, fetchFees]);

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
        <Spin spinning={loading && companies.length === 0}>
          {companies.map((company, index) => (
            <Card
              key={company._id}
              bordered={false}
              style={{
                borderRadius: 12,
                marginBottom: index === companies.length - 1 ? 0 : 16,
                boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
              }}
            >
              <Title level={4} style={{ marginBottom: 12 }}>{company.name.en}</Title>
              <Divider style={{ margin: '0 0 0 0' }} />
              <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden' }}>
                <FeeTableHeader />
                {categories.map(cat => (
                  <FeeRow
                    key={cat._id}
                    record={cat}
                    companyId={company._id}
                    form={form}
                    defaultRate={agent?.default_fee_rate ?? 0}
                  />
                ))}
              </div>
            </Card>
          ))}
        </Spin>
      </Form>
    </Space>
  );
};

export default AgentFeesPage;
