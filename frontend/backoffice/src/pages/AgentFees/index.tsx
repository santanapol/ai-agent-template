import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Typography, Switch, Space, Tag, Spin, Breadcrumb, message } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useAgentFees } from '../Agents/hooks/useAgentFees';
import { getAgentById } from '../../lib/agentsApiClient';
import type { Agent } from '../../types/agents';
import type { AgentFee } from '../../types/agentFees';

const { Title, Text } = Typography;

// ─── Column Header ──────────────────────────────────────────────────────────
const ROW_GRID = '1fr 120px 200px';

const FeeTableHeader: React.FC = React.memo(() => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: ROW_GRID,
    padding: '8px 16px',
    background: '#fafafa',
    borderBottom: '2px solid #e8e8e8',
    fontWeight: 600,
    fontSize: 12,
    color: '#8c8c8c',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }}>
    <span>Category</span>
    <span>Override</span>
    <span>Fee Rate (%)</span>
  </div>
));

// ─── Single Row — React.memo prevents all other rows from re-rendering ────
interface FeeRowProps {
  rowKey: string;
  categoryName: string;
  isEnabled: boolean;
  defaultRate: number;
  onToggle: (key: string, enabled: boolean) => void;
  setRef: (key: string, el: HTMLInputElement | null) => void;
}

const FeeRow = React.memo(({ rowKey, categoryName, isEnabled, defaultRate, onToggle, setRef }: FeeRowProps) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: ROW_GRID,
    alignItems: 'center',
    padding: '10px 16px',
    borderBottom: '1px solid #f0f0f0',
    transition: 'background 0.15s',
  }}
    onMouseEnter={e => (e.currentTarget.style.background = '#fafffe')}
    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
  >
    <div>
      <Tag color="purple" style={{ margin: 0 }}>{categoryName}</Tag>
    </div>
    <div>
      <Switch
        checked={isEnabled}
        onChange={checked => onToggle(rowKey, checked)}
        checkedChildren="ON"
        unCheckedChildren="OFF"
        size="small"
      />
    </div>
    <div>
      {/* Uncontrolled native input — zero re-render on keystroke */}
      <input
        ref={el => setRef(rowKey, el)}
        type="number"
        min={0}
        max={100}
        step={1}
        defaultValue={defaultRate}
        disabled={!isEnabled}
        style={{
          width: '100%',
          padding: '5px 10px',
          border: `1px solid ${isEnabled ? '#d9d9d9' : '#f0f0f0'}`,
          borderRadius: 6,
          fontSize: 14,
          color: isEnabled ? '#000000d9' : '#00000040',
          background: isEnabled ? '#fff' : '#f5f5f5',
          cursor: isEnabled ? 'text' : 'not-allowed',
          outline: 'none',
          transition: 'border-color 0.2s, color 0.2s',
          boxSizing: 'border-box',
        }}
        onFocus={e => { if (isEnabled) e.currentTarget.style.borderColor = '#2563EB'; }}
        onBlur={e => { e.currentTarget.style.borderColor = isEnabled ? '#d9d9d9' : '#f0f0f0'; }}
      />
    </div>
  </div>
));

// ─── Main Page ───────────────────────────────────────────────────────────────
const AgentFeesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [agentLoading, setAgentLoading] = useState(true);

  const { fees, companies, categories, loading, fetchFees, fetchMasterData, bulkSave } = useAgentFees(id || '');

  // Only React state needed — drives Switch disabled/enabled visual
  const [enabledKeys, setEnabledKeys] = useState<Set<string>>(new Set());

  // DOM refs for rate inputs — reading values on Save, zero re-renders
  const rateRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const originalFeesRef = useRef<Map<string, AgentFee>>(new Map());

  // ── Load agent ─────────────────────────────────────────────────────────
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

  // ── Load master data + fees ────────────────────────────────────────────
  useEffect(() => {
    if (id) {
      fetchMasterData();
      fetchFees({ page: 1, limit: 1000 });
    }
  }, [id, fetchMasterData, fetchFees]);

  // ── When fees arrive: update enabled set + imperatively set input values
  useEffect(() => {
    if (loading) return;

    const enabled = new Set<string>();
    originalFeesRef.current = new Map();

    fees.forEach(f => {
      const key = `${f.company_id}_${f.main_cate_id}`;
      enabled.add(key);
      originalFeesRef.current.set(key, f);
      // Imperatively set input value — no React re-render needed
      const el = rateRefs.current[key];
      if (el) el.value = String(f.fee_rate);
    });

    setEnabledKeys(enabled);
  }, [fees, loading]);

  // ── Toggle handler — stable reference, only re-renders the toggled row
  const handleToggle = useCallback((key: string, checked: boolean) => {
    setEnabledKeys(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(key);
        // Restore previous rate or keep current
        const el = rateRefs.current[key];
        const original = originalFeesRef.current.get(key);
        if (el && original && el.value === String(agent?.default_fee_rate ?? 0)) {
          el.value = String(original.fee_rate);
        }
      } else {
        next.delete(key);
      }
      return next;
    });
  }, [agent?.default_fee_rate]);

  // ── Stable ref setter — avoids re-creating callback per row
  const setRef = useCallback((key: string, el: HTMLInputElement | null) => {
    rateRefs.current[key] = el;
  }, []);

  // ── Save — reads DOM values directly, zero state reads
  const handleSaveAll = useCallback(async () => {
    if (!agent) return;

    const creates: any[] = [];
    const updates: any[] = [];
    const deletes: any[] = [];

    companies.forEach(company => {
      categories.forEach(category => {
        const key = `${company._id}_${category._id}`;
        const isEnabled = enabledKeys.has(key);
        const original = originalFeesRef.current.get(key);
        const rawRate = rateRefs.current[key]?.value;
        const rate = rawRate !== undefined ? Number(rawRate) : agent.default_fee_rate;

        if (isEnabled) {
          if (!original) {
            creates.push({ company_id: company._id, main_cate_id: category._id, fee_rate: rate });
          } else if (original.fee_rate !== rate) {
            updates.push({ id: original._id, payload: { fee_rate: rate }, etag: original.upd_date });
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
  }, [agent, companies, categories, enabledKeys, bulkSave, fetchFees]);

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
              Fees: {agent?.branch_name}{' '}
              <Text type="secondary" style={{ fontSize: 16 }}>({agent?.branch_code})</Text>
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

      <Spin spinning={loading && companies.length === 0}>
        {companies.map((company, idx) => (
          <Card
            key={company._id}
            bordered={false}
            style={{
              borderRadius: 12,
              marginBottom: idx === companies.length - 1 ? 0 : 16,
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.08)',
              overflow: 'hidden',
            }}
            styles={{ body: { padding: 0 } }}
          >
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0' }}>
              <Title level={5} style={{ margin: 0 }}>{company.name}</Title>
            </div>
            <FeeTableHeader />
            {categories.map(cat => {
              const key = `${company._id}_${cat._id}`;
              return (
                <FeeRow
                  key={key}
                  rowKey={key}
                  categoryName={cat.name}
                  isEnabled={enabledKeys.has(key)}
                  defaultRate={agent?.default_fee_rate ?? 0}
                  onToggle={handleToggle}
                  setRef={setRef}
                />
              );
            })}
          </Card>
        ))}
      </Spin>
    </Space>
  );
};

export default AgentFeesPage;
