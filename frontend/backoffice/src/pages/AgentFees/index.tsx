import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Button, Typography, Space, Tag, Spin,
  Breadcrumb, message, InputNumber, Divider, Row, Col
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useAgentFees } from '../Agents/hooks/useAgentFees';
import { getAgentById, updateAgent } from '../../lib/agentsApiClient';
import type { Agent } from '../../types/agents';
import type { AgentFee } from '../../types/agentFees';

const { Title, Text } = Typography;

// ─── Matrix Cell — pure DOM updates for zero lag ──────────────────────────────
interface MatrixCellProps {
  rowKey: string;
  defaultRate: number;
  setRateRef: (key: string, el: HTMLInputElement | null) => void;
  setCheckboxRef: (key: string, el: HTMLInputElement | null) => void;
}

const MatrixCell = React.memo(({ rowKey, defaultRate, setRateRef, setCheckboxRef }: MatrixCellProps) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
      <input
        type="checkbox"
        ref={el => setCheckboxRef(rowKey, el)}
        style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#2563EB' }}
        onChange={(e) => {
          const isEnabled = e.target.checked;
          const inputEl = document.getElementById(`input-${rowKey}`) as HTMLInputElement | null;
          if (inputEl) {
            inputEl.disabled = !isEnabled;
            inputEl.style.borderColor = isEnabled ? '#d9d9d9' : '#f0f0f0';
            inputEl.style.color = isEnabled ? '#000000d9' : '#00000040';
            inputEl.style.background = isEnabled ? '#fff' : '#f5f5f5';
            inputEl.style.cursor = isEnabled ? 'text' : 'not-allowed';
            if (!isEnabled) {
              inputEl.value = String(defaultRate); // Reset to default visually when disabled
            }
          }
        }}
      />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          id={`input-${rowKey}`}
          type="number"
          min={0}
          max={100}
          step={1}
          defaultValue={defaultRate}
          disabled={true}
          ref={el => setRateRef(rowKey, el)}
          style={{
            width: 50,
            padding: '2px 14px 2px 6px',
            border: '1px solid #f0f0f0',
            borderRadius: 4,
            fontSize: 13,
            color: '#00000040',
            background: '#f5f5f5',
            cursor: 'not-allowed',
            outline: 'none',
            transition: 'border-color 0.2s, color 0.2s',
            textAlign: 'right'
          }}
          onFocus={e => { if (!e.currentTarget.disabled) e.currentTarget.style.borderColor = '#2563EB'; }}
          onBlur={e => { if (!e.currentTarget.disabled) e.currentTarget.style.borderColor = '#d9d9d9'; }}
        />
        <span style={{ position: 'absolute', right: 4, fontSize: 10, color: '#aaa', pointerEvents: 'none' }}>%</span>
      </div>
    </div>
  );
});

// ─── Main Page ────────────────────────────────────────────────────────────────
const AgentFeesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [agentLoading, setAgentLoading] = useState(true);
  const agentEtagRef = useRef<string | null>(null);

  // Agent info inline edit state
  const [editingRate, setEditingRate] = useState(false);
  const [draftRate, setDraftRate] = useState<number>(0);
  const [savingAgent, setSavingAgent] = useState(false);

  const { fees, companies, categories, loading, fetchFees, fetchMasterData, bulkSave } = useAgentFees(id || '');

  // DOM refs for matrix inputs and checkboxes
  const rateRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const checkboxRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const originalFeesRef = useRef<Map<string, AgentFee>>(new Map());

  // ── Load agent ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setAgentLoading(true);
        const data = await getAgentById(id);
        setAgent(data.agent);
        agentEtagRef.current = data.etag;
        setDraftRate(data.agent.default_fee_rate);
      } catch {
        message.error('Failed to load agent details');
        navigate('/agents');
      } finally {
        setAgentLoading(false);
      }
    })();
  }, [id, navigate]);

  // ── Load fees ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (id) fetchFees({ page: 1, limit: 1000 });
  }, [id, fetchFees]);

  // ── Load master data after agent (for ou_id) ─────────────────────────────
  useEffect(() => {
    if (agent?.ou_id) fetchMasterData(agent.ou_id);
  }, [agent?.ou_id, fetchMasterData]);

  // ── Sync fees to input refs (Imperative updates to avoid lag) ───────────
  useEffect(() => {
    if (loading) return;
    originalFeesRef.current = new Map();

    // Reset all to unchecked first
    Object.keys(checkboxRefs.current).forEach(key => {
      const cbEl = checkboxRefs.current[key];
      const rateEl = rateRefs.current[key];
      if (cbEl && rateEl) {
        cbEl.checked = false;
        rateEl.disabled = true;
        rateEl.style.borderColor = '#f0f0f0';
        rateEl.style.color = '#00000040';
        rateEl.style.background = '#f5f5f5';
        rateEl.style.cursor = 'not-allowed';
      }
    });

    // Apply fetched fees
    fees.forEach(f => {
      const key = `${f.company_id}_${f.main_cate_id}`;
      originalFeesRef.current.set(key, f);
      
      const cbEl = checkboxRefs.current[key];
      const rateEl = rateRefs.current[key];
      
      if (cbEl && rateEl) {
        cbEl.checked = true;
        rateEl.disabled = false;
        rateEl.style.borderColor = '#d9d9d9';
        rateEl.style.color = '#000000d9';
        rateEl.style.background = '#fff';
        rateEl.style.cursor = 'text';
        rateEl.value = String(f.fee_rate);
      }
    });
  }, [fees, loading, companies.length, categories.length]);

  // ── Save agent info (default_fee_rate) ────────────────────────────────────
  const handleSaveAgentInfo = useCallback(async () => {
    if (!agent || !agent.upd_date) return;
    setSavingAgent(true);
    try {
      const result = await updateAgent(agent._id, { default_fee_rate: draftRate }, agent.upd_date);
      
      const newUpdDate = result.etag ? atob(result.etag.replace(/^W\/"|"/g, '')) : agent.upd_date;
      const updatedAgent = { ...agent, default_fee_rate: draftRate, upd_date: newUpdDate };
      
      setAgent(updatedAgent);
      agentEtagRef.current = result.etag;
      setDraftRate(draftRate);
      setEditingRate(false);
      
      // Update unchecked default visual values
      Object.entries(checkboxRefs.current).forEach(([key, cb]) => {
        if (cb && !cb.checked) {
          const rateEl = rateRefs.current[key];
          if (rateEl) rateEl.value = String(draftRate);
        }
      });
      message.success('Agent updated successfully');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update agent');
    } finally {
      setSavingAgent(false);
    }
  }, [agent, draftRate]);

  const setRateRef = useCallback((key: string, el: HTMLInputElement | null) => {
    rateRefs.current[key] = el;
  }, []);

  const setCheckboxRef = useCallback((key: string, el: HTMLInputElement | null) => {
    checkboxRefs.current[key] = el;
  }, []);

  // ── Save all fees ─────────────────────────────────────────────────────────
  const handleSaveFees = useCallback(async () => {
    if (!agent) return;

    const creates: any[] = [];
    const updates: any[] = [];
    const deletes: any[] = [];

    companies.forEach(company => {
      categories.forEach(category => {
        const key = `${company._id}_${category._id}`;
        
        const cbEl = checkboxRefs.current[key];
        const isEnabled = cbEl ? cbEl.checked : false;
        
        const original = originalFeesRef.current.get(key);
        const rawRate = rateRefs.current[key]?.value;
        const rate = rawRate !== undefined && rawRate !== '' ? Number(rawRate) : agent.default_fee_rate;

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
  }, [agent, companies, categories, bulkSave, fetchFees]);

  if (agentLoading) {
    return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;
  }

  return (
    <Space direction="vertical" size="large" style={{ display: 'flex' }}>
      <Breadcrumb
        items={[
          { title: <a onClick={() => navigate('/agents')}>Agents</a> },
          { title: agent?.branch_name || 'Manage' },
        ]}
      />

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space align="center" size="middle">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/agents')} />
          <div>
            <Title level={3} style={{ margin: 0 }}>
              {agent?.branch_name}
              <Tag color={agent?.active ? 'success' : 'error'} style={{ marginLeft: 12, fontSize: 13 }}>
                {agent?.active ? 'Active' : 'Inactive'}
              </Tag>
            </Title>
            <Text type="secondary">{agent?.branch_code} · {agent?.branch_type}</Text>
          </div>
        </Space>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSaveFees}
          loading={loading}
          size="large"
          style={{ borderRadius: 6 }}
        >
          Save Fees
        </Button>
      </div>

      {/* ── Agent Info Card (editable) ───────────────────────────────────── */}
      <Card
        bordered={false}
        style={{ borderRadius: 12, boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.08)' }}
      >
        <Row gutter={[32, 0]} align="middle">
          <Col>
            <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Default Fee Rate
            </Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              {editingRate ? (
                <>
                  <InputNumber
                    value={draftRate}
                    min={0}
                    max={100}
                    formatter={v => `${v}%`}
                    parser={v => (v ? Number(v.replace('%', '')) : 0) as any}
                    onChange={v => setDraftRate(v ?? 0)}
                    size="small"
                    style={{ width: 100 }}
                    autoFocus
                  />
                  <Button
                    type="primary"
                    size="small"
                    icon={<CheckOutlined />}
                    loading={savingAgent}
                    onClick={handleSaveAgentInfo}
                  />
                  <Button
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={() => { setEditingRate(false); setDraftRate(agent?.default_fee_rate ?? 0); }}
                  />
                </>
              ) : (
                <>
                  <Text strong style={{ fontSize: 20 }}>{agent?.default_fee_rate}%</Text>
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => { setEditingRate(true); setDraftRate(agent?.default_fee_rate ?? 0); }}
                    style={{ color: '#2563EB' }}
                  />
                </>
              )}
            </div>
          </Col>
          <Col>
            <Divider type="vertical" style={{ height: 40 }} />
          </Col>
          <Col>
            <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Currency
            </Text>
            <div style={{ marginTop: 4 }}>
              <Text strong style={{ fontSize: 16 }}>{agent?.currency || '—'}</Text>
            </div>
          </Col>
          <Col>
            <Divider type="vertical" style={{ height: 40 }} />
          </Col>
          <Col>
            <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Companies
            </Text>
            <div style={{ marginTop: 4 }}>
              <Text strong style={{ fontSize: 16 }}>{companies.length}</Text>
            </div>
          </Col>
          <Col>
            <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Categories
            </Text>
            <div style={{ marginTop: 4 }}>
              <Text strong style={{ fontSize: 16 }}>{categories.length}</Text>
            </div>
          </Col>
        </Row>
      </Card>

      {/* ── Fee Matrix Table ───────────────────────────────────────────────── */}
      <Spin spinning={loading && companies.length === 0}>
        <div style={{ 
          background: '#fff', 
          borderRadius: 12, 
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.08)',
          overflowX: 'auto' 
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr>
                <th style={{ 
                  position: 'sticky', left: 0, zIndex: 1,
                  background: '#fafafa',
                  padding: '12px 16px', 
                  textAlign: 'left', 
                  borderBottom: '2px solid #e8e8e8',
                  borderRight: '1px solid #e8e8e8',
                  fontWeight: 600, fontSize: 12, color: '#8c8c8c', textTransform: 'uppercase',
                  minWidth: 150
                }}>
                  Provider Name
                </th>
                {categories.map(cat => (
                  <th key={cat._id} style={{
                    background: '#fafafa',
                    padding: '12px 16px',
                    textAlign: 'center',
                    borderBottom: '2px solid #e8e8e8',
                    borderRight: '1px solid #f0f0f0',
                    fontWeight: 600, fontSize: 12, color: '#8c8c8c', textTransform: 'uppercase'
                  }}>
                    {cat.manin_cate_name?.en || cat.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {companies.map((company, index) => (
                <tr key={company._id} style={{ 
                  borderBottom: index === companies.length - 1 ? 'none' : '1px solid #f0f0f0',
                }}>
                  <td style={{ 
                    position: 'sticky', left: 0, zIndex: 1,
                    background: '#fff', // Solid background so text doesn't overlap when scrolling
                    padding: '12px 16px',
                    fontWeight: 500,
                    borderRight: '1px solid #e8e8e8',
                  }}>
                    {company.provider_name?.en || company.name}
                  </td>
                  {categories.map(cat => {
                    const key = `${company._id}_${cat._id}`;
                    return (
                      <td key={cat._id} style={{ 
                        padding: '8px 16px',
                        borderRight: '1px solid #f0f0f0',
                        background: '#fafafa'
                      }}>
                        <MatrixCell
                          rowKey={key}
                          defaultRate={agent?.default_fee_rate ?? 0}
                          setRateRef={setRateRef}
                          setCheckboxRef={setCheckboxRef}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Spin>
    </Space>
  );
};

export default AgentFeesPage;
