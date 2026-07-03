import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Typography, Tag, Select,
  InputNumber, Row, Col, Alert,
  Card, Statistic, Table, Affix, Checkbox, theme, Skeleton, Empty
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SaveOutlined, EditOutlined, CheckOutlined, CloseOutlined, LinkOutlined } from '@ant-design/icons';
import { useAgentFees } from '../Agents/hooks/useAgentFees';
import { DetailContainer } from '../../components/layout';
import { useAppFeedback } from '../../hooks/useAppFeedback';
import { getAgentById, listAgents, updateAgent } from '../../lib/agentsApiClient';
import { listAgentFees, deleteAgentFee } from '../../lib/agentFeesApiClient';
import type { Agent } from '../../types/agents';
import type { AgentFee, GameCompany, CreateFeePayload } from '../../types/agentFees';
import { MatrixCell, type MatrixCellRef } from '../../components/AgentFees/MatrixCell';

const { Text } = Typography;

// ─── Main Page ────────────────────────────────────────────────────────────────
const AgentFeesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message, modal } = useAppFeedback();
  const { token } = theme.useToken();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [agentLoading, setAgentLoading] = useState(true);
  const [hideEmptyProviders, setHideEmptyProviders] = useState(true);
  const agentEtagRef = useRef<string | null>(null);

  const [editingRate, setEditingRate] = useState(false);
  const [draftRate, setDraftRate] = useState<number>(0);
  const [savingAgent, setSavingAgent] = useState(false);

  // Reference agent state
  const [allAgents, setAllAgents] = useState<Agent[]>([]);
  const [refFees, setRefFees] = useState<AgentFee[]>([]);
  const [refFeesLoading, setRefFeesLoading] = useState(false);
  const [savingRef, setSavingRef] = useState(false);

  const { fees, companies, categories, loading, fetchFees, fetchMasterData, bulkSave } = useAgentFees(id || '');

  const matrixCellRefs = useRef<Record<string, MatrixCellRef | null>>({});
  const originalFeesRef = useRef<Map<string, AgentFee>>(new Map());

  // Computed: is reference mode active?
  const isRefMode = !!agent?.ref_fee_branch_id;
  const refAgentName = isRefMode
    ? allAgents.find(a => a.branch_id === agent.ref_fee_branch_id)?.branch_name ?? agent.ref_fee_branch_id
    : null;

  // ── Load agent ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    (async () => {
      try {
        setAgentLoading(true);
        const data = await getAgentById(id, controller.signal);
        if (controller.signal.aborted) return;
        setAgent(data.agent);
        agentEtagRef.current = data.etag;
        setDraftRate(data.agent.default_fee_rate);
      } catch (err: unknown) {
        if (err instanceof Error && (err.name === 'CanceledError' || err.name === 'AbortError')) return;
        message.error('Failed to load agent details');
        navigate('/agents');
      } finally {
        if (!controller.signal.aborted) setAgentLoading(false);
      }
    })();
    return () => controller.abort();
  }, [id, navigate, message]);

  // ── Load all agents for reference dropdown ────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    listAgents({ page: 1, limit: 100 }, controller.signal)
      .then(data => {
        if (!controller.signal.aborted) setAllAgents(data.data || []);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // ── Load own fees ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    fetchFees({ page: 1, limit: 100 }, controller.signal);
    return () => controller.abort();
  }, [id, fetchFees]);

  // ── Load master data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!agent?.ou_id) return;
    const controller = new AbortController();
    fetchMasterData(agent.ou_id, controller.signal);
    return () => controller.abort();
  }, [agent?.ou_id, fetchMasterData]);

  // ── Load reference agent fees when ref_fee_branch_id or allAgents changes ─────
  // ref_fee_branch_id stores branch_id → resolve to agent._id for the fees endpoint
  useEffect(() => {
    if (!agent?.ref_fee_branch_id || allAgents.length === 0) {
      return;
    }
    const refAgent = allAgents.find(a => a.branch_id === agent.ref_fee_branch_id);
    if (!refAgent) {
      message.error('Reference agent not found');
      return;
    }
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRefFeesLoading(true);
    listAgentFees(refAgent._id, { page: 1, limit: 100 }, controller.signal)
      .then(data => {
        if (!controller.signal.aborted) setRefFees(data.data || []);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && (err.name === 'CanceledError' || err.name === 'AbortError')) return;
        message.error('Failed to load reference agent fees');
      })
      .finally(() => {
        if (!controller.signal.aborted) setRefFeesLoading(false);
      });
    return () => controller.abort();
  }, [agent?.ref_fee_branch_id, allAgents, message]);

  // ── Sync fees to matrix DOM refs ──────────────────────────────────────────
  useEffect(() => {
    const displayLoading = loading || refFeesLoading;
    if (displayLoading) return;

    const displayFees = isRefMode ? refFees : fees;
    originalFeesRef.current = new Map();

    // Reset all cells
    Object.values(matrixCellRefs.current).forEach(cell => {
      cell?.reset(agent?.default_fee_rate ?? 0);
    });

    // Apply fees
    displayFees.forEach(f => {
      const key = `${f.game_company_id}_${f.game_main_cate_id}`;
      if (!isRefMode) originalFeesRef.current.set(key, f);

      matrixCellRefs.current[key]?.setValues(f.gcomp_cost, f.agent_known_fee, f.agent_fee);
    });
  }, [fees, refFees, isRefMode, loading, refFeesLoading, companies.length, categories.length, agent?.default_fee_rate]);

  // ── Save agent default_fee_rate ───────────────────────────────────────────
  const handleSaveAgentInfo = useCallback(async () => {
    if (!agent || !agent.upd_date) return;
    setSavingAgent(true);
    try {
      const result = await updateAgent(agent._id, { default_fee_rate: draftRate }, agent.upd_date);
      const newUpdDate = result.etag ? atob(result.etag.replace(/^W\/"|"/g, '')) : agent.upd_date;
      setAgent(prev => prev ? { ...prev, default_fee_rate: draftRate, upd_date: newUpdDate } : prev);
      agentEtagRef.current = result.etag;
      setEditingRate(false);
      Object.values(matrixCellRefs.current).forEach(cell => {
        const vals = cell?.getValues();
        if (vals && !vals.enabled) {
          cell?.reset(draftRate);
        }
      });
      message.success('Agent updated successfully');
    } catch (err: unknown) {
      message.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update agent');
    } finally {
      setSavingAgent(false);
    }
  }, [agent, draftRate, message]);

  // ── Set / clear reference agent ───────────────────────────────────────────
  const handleRefChange = useCallback((newRefId: string | undefined) => {
    if (!agent || !id) return;
    const normalized = newRefId || null;
    // normalized is a branch_id value — find the agent that owns it
    const refAgent = normalized ? allAgents.find(a => a.branch_id === normalized) : null;

    modal.confirm({
      title: normalized ? 'Set Reference Agent' : 'Remove Reference',
      content: normalized
        ? `Fee configuration will reference "${refAgent?.branch_name ?? normalized}". Your ${fees.length} own fee override(s) will be deleted. Continue?`
        : 'Remove reference and manage fee overrides independently?',
      okText: 'Confirm',
      okButtonProps: { danger: true },
      onOk: async () => {
        setSavingRef(true);
        try {
          // 1. Persist ref_fee_branch_id on the agent record
          const result = await updateAgent(agent._id, { ref_fee_branch_id: normalized }, agent.upd_date);
          const newUpdDate = result.etag ? atob(result.etag.replace(/^W\/"|"/g, '')) : agent.upd_date;
          setAgent(prev => prev ? { ...prev, ref_fee_branch_id: normalized, upd_date: newUpdDate } : prev);
          agentEtagRef.current = result.etag;

          // 2. Delete all own fee overrides when a reference is being set
          if (normalized && fees.length > 0) {
            await Promise.allSettled(
              fees.map(f => deleteAgentFee(id, f._id, f.upd_date))
            );
            await fetchFees({ page: 1, limit: 100 });
          }

          // 3. Reload own fees (setAgent above triggers the ref-fees effect automatically)
          if (!normalized) {
            await fetchFees({ page: 1, limit: 100 });
          }

          message.success(normalized
            ? `Now referencing ${refAgent?.branch_name ?? normalized}`
            : 'Reference removed — you can now configure fees independently');
        } catch (err: unknown) {
          message.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update reference');
        } finally {
          setSavingRef(false);
        }
      },
    });
  }, [agent, id, allAgents, fees, fetchFees, message, modal]);

  const setMatrixCellRef = useCallback((key: string, el: MatrixCellRef | null) => {
    matrixCellRefs.current[key] = el;
  }, []);

  // ── Collect and validate pending changes ──────────────────────────────────
  const collectChanges = useCallback(() => {
    const creates: CreateFeePayload[] = [];
    const updates: { id: string; payload: Partial<AgentFee>; etag: string }[] = [];
    const deletes: { id: string; etag: string }[] = [];
    const errors: string[] = [];

    companies.forEach(company => {
      categories.forEach(category => {
        const key = `${company._id}_${category._id}`;
        const cell = matrixCellRefs.current[key];
        const vals = cell?.getValues() ?? { enabled: false, gc: 0, ak: 0, af: 0 };
        const original = originalFeesRef.current.get(key);

        if (!vals.enabled && !original) return;

        if (!vals.enabled && original) {
          deletes.push({ id: original._id, etag: original.upd_date });
          return;
        }

        const { gc: gcompCost, ak: agentKnownFee, af: agentFee } = vals;
        const isValid = (r: number) => r >= 0 && r <= 100;

        if (!isValid(gcompCost) || !isValid(agentKnownFee) || !isValid(agentFee)) {
          errors.push(`${company.provider_name?.en || company.name} / ${category.main_cate_name?.en || category.manin_cate_name?.en || category.name}: must be 0–100`);
          return;
        }

        if (!original) {
          creates.push({
            game_company_id: company._id,
            game_main_cate_id: category._id,
            gcomp_cost: gcompCost,
            agent_known_fee: agentKnownFee,
            agent_fee: agentFee
          });
          return;
        }

        const changed: Partial<AgentFee> = {};
        if (original.gcomp_cost !== gcompCost) changed.gcomp_cost = gcompCost;
        if (original.agent_known_fee !== agentKnownFee) changed.agent_known_fee = agentKnownFee;
        if (original.agent_fee !== agentFee) changed.agent_fee = agentFee;

        if (Object.keys(changed).length > 0) {
          updates.push({ id: original._id, payload: changed, etag: original.upd_date });
        }
      });
    });

    return { creates, updates, deletes, errors };
  }, [companies, categories]);

  // ── Save all fees ─────────────────────────────────────────────────────────
  const handleSaveFees = useCallback(async () => {
    if (!agent || isRefMode) return;
    const { creates, updates, deletes, errors } = collectChanges();

    if (errors.length > 0) {
      message.error(`Invalid values:\n${errors.join('\n')}`);
      return;
    }
    if (!creates.length && !updates.length && !deletes.length) {
      message.info('No changes to save');
      return;
    }

    const doSave = async () => {
      const success = await bulkSave(creates, updates, deletes);
      if (success) fetchFees({ page: 1, limit: 100 });
    };

    if (deletes.length > 0) {
      modal.confirm({
        title: 'Remove fee overrides?',
        content: `${deletes.length} fee override${deletes.length > 1 ? 's' : ''} will be deleted. Continue?`,
        okText: 'Delete',
        okButtonProps: { danger: true },
        onOk: doSave,
      });
      return;
    }
    await doSave();
  }, [agent, isRefMode, collectChanges, bulkSave, fetchFees, message, modal]);

  const displayFees = useMemo(() => (isRefMode ? refFees : fees), [isRefMode, refFees, fees]);

  const feesByCompany = useMemo(() => new Set(displayFees.map(f => f.game_company_id)), [displayFees]);

  const filteredCompanies = useMemo(() => {
    const sorted = [...companies].sort((a, b) => {
      const nameA = a.provider_name?.en || a.name || '';
      const nameB = b.provider_name?.en || b.name || '';
      return nameA.localeCompare(nameB);
    });

    return hideEmptyProviders 
      ? sorted.filter(company => feesByCompany.has(company._id)) 
      : sorted;
  }, [companies, feesByCompany, hideEmptyProviders]);

  const usedCompaniesCount = useMemo(() => {
    return companies.filter(company => feesByCompany.has(company._id)).length;
  }, [companies, feesByCompany]);

  if (agentLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} aria-busy="true" aria-label="Loading agent fees">
        <Skeleton active paragraph={{ rows: 1 }} />
        <Card variant="borderless" style={{ borderRadius: token.borderRadiusLG }}>
          <Skeleton active paragraph={{ rows: 2 }} />
        </Card>
        <Card variant="borderless" style={{ borderRadius: token.borderRadiusLG }}>
          <Skeleton active paragraph={{ rows: 10 }} />
        </Card>
      </div>
    );
  }

  const dropdownOptions = allAgents
    .filter(a => a._id !== id)
    .map(a => ({ value: a.branch_id, label: `${a.branch_code} · ${a.branch_name}` }));

  const tableColumns: ColumnsType<GameCompany> = [
    {
      title: 'Provider Name',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 180,
      render: (_, record) => <Text strong>{record.provider_name?.en || record.name}</Text>,
    },
    ...categories.map(cat => ({
      title: cat.main_cate_name?.en || cat.manin_cate_name?.en || cat.name,
      dataIndex: cat._id,
      key: cat._id,
      align: 'center' as const,
      width: 150,
      render: (_: unknown, company: GameCompany) => {
        const key = `${company._id}_${cat._id}`;
        return (
          <div style={{ background: isRefMode ? token.colorFillAlter : 'transparent', margin: `-${token.marginXS}px -${token.marginXS}px`, padding: token.paddingXS }}>
            <MatrixCell
              key={key}
              defaultRate={agent?.default_fee_rate ?? 0}
              readOnly={isRefMode}
              ref={(el: MatrixCellRef | null) => setMatrixCellRef(key, el)}
            />
          </div>
        );
      }
    }))
  ];

  const headerTitle = (
    <div>
      <span style={{ fontSize: 24, fontWeight: 'bold' }}>{agent?.branch_name}</span>
      <div style={{ fontSize: 14, color: token.colorTextSecondary, fontWeight: 'normal', marginTop: 4 }}>
        {agent?.branch_code} · {agent?.branch_type}
      </div>
    </div>
  );

  const headerStatus = (
    <Tag color={agent?.active ? 'success' : 'error'} style={{ fontSize: 13, margin: 0 }}>
      {agent?.active ? 'Active' : 'Inactive'}
    </Tag>
  );

  const headerActions = !isRefMode && (
    <Affix offsetTop={20}>
      <Button
        type="primary"
        icon={<SaveOutlined />}
        onClick={handleSaveFees}
        loading={loading}
        size="large"
        style={{ borderRadius: token.borderRadius, boxShadow: token.boxShadowTertiary }}
      >
        Save Fees
      </Button>
    </Affix>
  );

  return (
    <DetailContainer
      title={headerTitle}
      status={headerStatus}
      backUrl="/agents"
      extra={headerActions}
      maxWidth={1200}
    >

      {/* ── Agent Info Card ───────────────────────────────────────────────── */}
      <Card variant="borderless" style={{ borderRadius: token.borderRadiusLG, boxShadow: token.boxShadowSecondary }}>
        <Row gutter={[32, 24]} align="middle">
          {/* Default fee rate */}
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Default Fee Rate"
              value={agent?.default_fee_rate ?? 0}
              suffix="%"
              formatter={(val) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {editingRate ? (
                    <>
                      <InputNumber
                        value={draftRate}
                        min={0}
                        max={100}
                        step={0.01}
                        precision={2}
                        onChange={v => setDraftRate(v ?? 0)}
                        size="small"
                        style={{ width: 100 }}
                        autoFocus
                      />
                      <Button type="primary" size="small" icon={<CheckOutlined />} loading={savingAgent} onClick={handleSaveAgentInfo} />
                      <Button size="small" icon={<CloseOutlined />} onClick={() => { setEditingRate(false); setDraftRate(agent?.default_fee_rate ?? 0); }} />
                    </>
                  ) : (
                    <>
                      <Text strong style={{ fontSize: 24 }}>{val}</Text>
                      <Button
                        type="text" size="small" icon={<EditOutlined />}
                        onClick={() => { setEditingRate(true); setDraftRate(agent?.default_fee_rate ?? 0); }}
                        style={{ color: token.colorPrimary }}
                      />
                    </>
                  )}
                </div>
              )}
            />
          </Col>

          {/* Currency */}
          <Col xs={24} sm={12} md={4}>
            <Statistic title="Currency" value={(agent?.currency || '—').toUpperCase()} />
          </Col>

          {/* Companies counts */}
          <Col xs={24} sm={12} md={6}>
            <Statistic title="Companies" value={`${usedCompaniesCount} / ${companies.length}`} />
          </Col>

          {/* Reference agent selector */}
          <Col xs={24} sm={12} md={8}>
            <Text type="secondary" style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>
              <LinkOutlined style={{ marginRight: 4 }} />Reference Fees
            </Text>
            <Select
              style={{ width: '100%' }}
              placeholder="None — use own fee overrides"
              allowClear
              value={agent?.ref_fee_branch_id ?? undefined}
              onChange={handleRefChange}
              loading={savingRef}
              disabled={savingRef}
              options={dropdownOptions}
              showSearch
              filterOption={(input, opt) =>
                (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
              }
              optionFilterProp="label"
            />
          </Col>
        </Row>
      </Card>

      {/* ── Read-only banner when referencing another agent ───────────────── */}
      {isRefMode && (
        <Alert
          type="info"
          showIcon
          title={
            <span>
              Fee configuration is referenced from <Text strong>{refAgentName}</Text>.
              To edit fees independently, clear the reference above.
            </span>
          }
        />
      )}

      {/* ── Fee Matrix Table ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: token.marginSM }}>
        <Checkbox
          checked={hideEmptyProviders}
          onChange={e => setHideEmptyProviders(e.target.checked)}
        >
          Hide providers without fees
        </Checkbox>
      </div>
      <Card variant="borderless" style={{ borderRadius: token.borderRadiusLG, boxShadow: token.boxShadowSecondary }} styles={{ body: { padding: 0, overflow: 'hidden' } }}>
        <Table
          columns={tableColumns}
          dataSource={filteredCompanies}
          rowKey="_id"
          pagination={false}
          scroll={{ x: 'max-content', y: 600 }}
          loading={(loading || refFeesLoading) && companies.length === 0}
          bordered
          size="middle"
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  isRefMode
                    ? `${refAgentName} has no fee overrides configured — providers will use the default fee rate.`
                    : hideEmptyProviders
                      ? "No providers have fee overrides yet. Uncheck \"Hide providers without fees\" to see all providers."
                      : 'No providers found.'
                }
              />
            ),
          }}
        />
      </Card>
    </DetailContainer>
  );
};

export default AgentFeesPage;
