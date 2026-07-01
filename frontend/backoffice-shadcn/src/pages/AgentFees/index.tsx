import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, Link2, Pencil, Save, X } from 'lucide-react';
import { useAgentFees } from '../Agents/hooks/useAgentFees';
import { DetailContainer } from '@/components/layout';
import { useAppFeedback } from '@/hooks/useAppFeedback';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { getAgentById, listAgents, updateAgent } from '@/lib/agentsApiClient';
import { listAgentFees, deleteAgentFee } from '@/lib/agentFeesApiClient';
import type { Agent } from '@/types/agents';
import type { AgentFee, CreateFeePayload } from '@/types/agentFees';
import { MatrixCell, type MatrixCellRef } from '@/components/AgentFees/MatrixCell';
import { ActiveBadge } from '@/components/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { LoadingButton } from '@/components/loading-button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const AgentFeesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = useAppFeedback();
  const { confirm } = useConfirmDialog();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [agentLoading, setAgentLoading] = useState(true);
  const [hideEmptyProviders, setHideEmptyProviders] = useState(true);
  const agentEtagRef = useRef<string | null>(null);

  const [editingRate, setEditingRate] = useState(false);
  const [draftRate, setDraftRate] = useState<number>(0);
  const [savingAgent, setSavingAgent] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [allAgents, setAllAgents] = useState<Agent[]>([]);
  const [refFees, setRefFees] = useState<AgentFee[]>([]);
  const [refFeesLoading, setRefFeesLoading] = useState(false);
  const [savingRef, setSavingRef] = useState(false);

  const { fees, companies, categories, loading, fetchFees, fetchMasterData, bulkSave } =
    useAgentFees(id || '');

  const matrixCellRefs = useRef<Record<string, MatrixCellRef | null>>({});
  const originalFeesRef = useRef<Map<string, AgentFee>>(new Map());

  const isRefMode = !!agent?.ref_fee_branch_id;
  const refAgentName = isRefMode
    ? allAgents.find((a) => a.branch_id === agent.ref_fee_branch_id)?.branch_name ??
      agent.ref_fee_branch_id
    : null;

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
        if (err instanceof Error && (err.name === 'CanceledError' || err.name === 'AbortError'))
          return;
        message.error('Failed to load agent details');
        navigate('/agents');
      } finally {
        if (!controller.signal.aborted) setAgentLoading(false);
      }
    })();
    return () => controller.abort();
  }, [id, navigate, message]);

  useEffect(() => {
    const controller = new AbortController();
    listAgents({ page: 1, limit: 100 }, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setAllAgents(data.data || []);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    fetchFees({ page: 1, limit: 100 }, controller.signal);
    return () => controller.abort();
  }, [id, fetchFees]);

  useEffect(() => {
    if (!agent?.ou_id) return;
    const controller = new AbortController();
    fetchMasterData(agent.ou_id, controller.signal);
    return () => controller.abort();
  }, [agent?.ou_id, fetchMasterData]);

  useEffect(() => {
    if (!agent?.ref_fee_branch_id || allAgents.length === 0) {
      return;
    }
    const refAgent = allAgents.find((a) => a.branch_id === agent.ref_fee_branch_id);
    if (!refAgent) {
      message.error('Reference agent not found');
      return;
    }
    const controller = new AbortController();
    setRefFeesLoading(true);
    listAgentFees(refAgent._id, { page: 1, limit: 100 }, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setRefFees(data.data || []);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && (err.name === 'CanceledError' || err.name === 'AbortError'))
          return;
        message.error('Failed to load reference agent fees');
      })
      .finally(() => {
        if (!controller.signal.aborted) setRefFeesLoading(false);
      });
    return () => controller.abort();
  }, [agent?.ref_fee_branch_id, allAgents, message]);

  useEffect(() => {
    const displayLoading = loading || refFeesLoading;
    if (displayLoading) return;

    const displayFees = isRefMode ? refFees : fees;
    originalFeesRef.current = new Map();

    Object.values(matrixCellRefs.current).forEach((cell) => {
      cell?.reset(agent?.default_fee_rate ?? 0);
    });

    displayFees.forEach((f) => {
      const key = `${f.game_company_id}_${f.game_main_cate_id}`;
      if (!isRefMode) originalFeesRef.current.set(key, f);
      matrixCellRefs.current[key]?.setValues(f.gcomp_cost, f.agent_known_fee, f.agent_fee);
    });
  }, [
    fees,
    refFees,
    isRefMode,
    loading,
    refFeesLoading,
    companies.length,
    categories.length,
    agent?.default_fee_rate,
  ]);

  const handleSaveAgentInfo = useCallback(async () => {
    if (!agent || !agent.upd_date) return;
    setSavingAgent(true);
    try {
      const result = await updateAgent(
        agent._id,
        { default_fee_rate: draftRate },
        agent.upd_date,
      );
      const newUpdDate = result.etag
        ? atob(result.etag.replace(/^W\/"|"/g, ''))
        : agent.upd_date;
      setAgent((prev) =>
        prev ? { ...prev, default_fee_rate: draftRate, upd_date: newUpdDate } : prev,
      );
      agentEtagRef.current = result.etag;
      setEditingRate(false);
      Object.values(matrixCellRefs.current).forEach((cell) => {
        const vals = cell?.getValues();
        if (vals && !vals.enabled) {
          cell?.reset(draftRate);
        }
      });
      message.success('Agent updated successfully');
    } catch (err: unknown) {
      message.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to update agent',
      );
    } finally {
      setSavingAgent(false);
    }
  }, [agent, draftRate, message]);

  const handleRefChange = useCallback(
    (newRefId: string | undefined) => {
      if (!agent || !id) return;
      const normalized = newRefId || null;
      const refAgent = normalized ? allAgents.find((a) => a.branch_id === normalized) : null;

      void confirm({
        title: normalized ? 'Set Reference Agent' : 'Remove Reference',
        content: normalized
          ? `Fee configuration will reference "${refAgent?.branch_name ?? normalized}". Your ${fees.length} own fee override(s) will be deleted. Continue?`
          : 'Remove reference and manage fee overrides independently?',
        okText: 'Confirm',
        danger: true,
        onOk: async () => {
          setSavingRef(true);
          try {
            const result = await updateAgent(
              agent._id,
              { ref_fee_branch_id: normalized },
              agent.upd_date,
            );
            const newUpdDate = result.etag
              ? atob(result.etag.replace(/^W\/"|"/g, ''))
              : agent.upd_date;
            setAgent((prev) =>
              prev ? { ...prev, ref_fee_branch_id: normalized, upd_date: newUpdDate } : prev,
            );
            agentEtagRef.current = result.etag;

            if (normalized && fees.length > 0) {
              await Promise.allSettled(
                fees.map((f) => deleteAgentFee(id, f._id, f.upd_date)),
              );
              await fetchFees({ page: 1, limit: 100 });
            }

            if (!normalized) {
              await fetchFees({ page: 1, limit: 100 });
            }

            message.success(
              normalized
                ? `Now referencing ${refAgent?.branch_name ?? normalized}`
                : 'Reference removed — you can now configure fees independently',
            );
          } catch (err: unknown) {
            message.error(
              (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to update reference',
            );
            throw err;
          } finally {
            setSavingRef(false);
          }
        },
      });
    },
    [agent, id, allAgents, fees, fetchFees, message, confirm],
  );

  const setMatrixCellRef = useCallback((key: string, el: MatrixCellRef | null) => {
    matrixCellRefs.current[key] = el;
  }, []);

  const collectChanges = useCallback(() => {
    const creates: CreateFeePayload[] = [];
    const updates: { id: string; payload: Partial<AgentFee>; etag: string }[] = [];
    const deletes: { id: string; etag: string }[] = [];
    const errors: string[] = [];

    companies.forEach((company) => {
      categories.forEach((category) => {
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
          errors.push(
            `${company.provider_name?.en || company.name} / ${category.main_cate_name?.en || category.manin_cate_name?.en || category.name}: must be 0–100`,
          );
          return;
        }

        if (!original) {
          creates.push({
            game_company_id: company._id,
            game_main_cate_id: category._id,
            gcomp_cost: gcompCost,
            agent_known_fee: agentKnownFee,
            agent_fee: agentFee,
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

  const handleSaveFees = useCallback(async () => {
    if (!agent || isRefMode) return;
    const { creates, updates, deletes, errors } = collectChanges();

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    if (!creates.length && !updates.length && !deletes.length) {
      message.info('No changes to save');
      return;
    }

    const doSave = async () => {
      const success = await bulkSave(creates, updates, deletes);
      if (success) fetchFees({ page: 1, limit: 100 });
    };

    if (deletes.length > 0) {
      void confirm({
        title: 'Remove fee overrides?',
        content: `${deletes.length} fee override${deletes.length > 1 ? 's' : ''} will be deleted. Continue?`,
        okText: 'Delete',
        danger: true,
        onOk: doSave,
      });
      return;
    }
    await doSave();
  }, [agent, isRefMode, collectChanges, bulkSave, fetchFees, message, confirm]);

  const feesByCompany = useMemo(
    () => new Set((isRefMode ? refFees : fees).map((f) => f.game_company_id)),
    [isRefMode, refFees, fees],
  );

  const filteredCompanies = useMemo(() => {
    const sorted = [...companies].sort((a, b) => {
      const nameA = a.provider_name?.en || a.name || '';
      const nameB = b.provider_name?.en || b.name || '';
      return nameA.localeCompare(nameB);
    });
    return hideEmptyProviders
      ? sorted.filter((company) => feesByCompany.has(company._id))
      : sorted;
  }, [companies, feesByCompany, hideEmptyProviders]);

  const usedCompaniesCount = useMemo(
    () => companies.filter((company) => feesByCompany.has(company._id)).length,
    [companies, feesByCompany],
  );

  if (agentLoading) {
    return (
      <DetailContainer title="Agent Fees" backUrl="/agents" description="Loading agent details...">
        <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading agent fees">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </DetailContainer>
    );
  }

  const dropdownOptions = allAgents
    .filter((a) => a._id !== id)
    .map((a) => ({ value: a.branch_id, label: `${a.branch_code} · ${a.branch_name}` }));

  const tableLoading = (loading || refFeesLoading) && companies.length === 0;

  const emptyDescription = isRefMode
    ? `${refAgentName} has no fee overrides configured — providers will use the default fee rate.`
    : hideEmptyProviders
      ? 'No providers have fee overrides yet. Uncheck "Hide providers without fees" to see all providers.'
      : 'No providers found.';

  const headerTitle = (
    <div>
      <span className="text-2xl font-bold">{agent?.branch_name}</span>
      <div className="mt-1 text-sm font-normal text-muted-foreground">
        {agent?.branch_code} · {agent?.branch_type}
      </div>
    </div>
  );

  return (
    <DetailContainer
      title={headerTitle}
      status={<ActiveBadge active={!!agent?.active} />}
      backUrl="/agents"
      extra={
        !isRefMode ? (
          <LoadingButton size="lg" loading={loading} onClick={() => void handleSaveFees()}>
            <Save data-icon="inline-start" />
            Save Fees
          </LoadingButton>
        ) : undefined
      }
      maxWidth={1200}
    >
      <Card>
        <CardContent className="grid gap-6 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Default Fee Rate</p>
            <div className="mt-1 flex items-center gap-2">
              {editingRate ? (
                <>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={draftRate}
                    onChange={(e) => setDraftRate(Number(e.target.value) || 0)}
                    className="w-24 tabular-nums"
                    autoFocus
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <LoadingButton
                    size="icon-sm"
                    loading={savingAgent}
                    onClick={() => void handleSaveAgentInfo()}
                    aria-label="Save rate"
                  >
                    <Check data-icon="inline-start" aria-hidden="true" />
                  </LoadingButton>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingRate(false);
                      setDraftRate(agent?.default_fee_rate ?? 0);
                    }}
                    aria-label="Cancel edit"
                  >
                    <X data-icon="inline-start" aria-hidden="true" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-2xl font-semibold tabular-nums">
                    {agent?.default_fee_rate ?? 0}%
                  </span>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingRate(true);
                      setDraftRate(agent?.default_fee_rate ?? 0);
                    }}
                    aria-label="Edit default fee rate"
                  >
                    <Pencil data-icon="inline-start" aria-hidden="true" />
                  </Button>
                </>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Currency</p>
            <p className="mt-1 text-2xl font-semibold uppercase">{agent?.currency || '—'}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Companies</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {usedCompaniesCount} / {companies.length}
            </p>
          </div>

          <Field>
            <FieldLabel htmlFor="reference-fees" className="mb-1 flex items-center gap-1 text-sm text-muted-foreground">
              <Link2 data-icon="inline-start" aria-hidden="true" />
              Reference Fees
            </FieldLabel>
            <Select
              value={agent?.ref_fee_branch_id ?? '__none__'}
              disabled={savingRef}
              onValueChange={(value) =>
                handleRefChange(
                  value == null || value === '__none__' ? undefined : value,
                )
              }
            >
              <SelectTrigger id="reference-fees" className="w-full">
                <SelectValue placeholder="None — use own fee overrides" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None — use own fee overrides</SelectItem>
                {dropdownOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      {isRefMode ? (
        <Alert>
          <AlertTitle>Referenced fee configuration</AlertTitle>
          <AlertDescription>
            Fee configuration is referenced from <strong>{refAgentName}</strong>. To edit fees
            independently, clear the reference above.
          </AlertDescription>
        </Alert>
      ) : null}

      {validationErrors.length > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>Fix invalid fee values</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 flex flex-col gap-1">
              {validationErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={hideEmptyProviders}
            onCheckedChange={(value) => setHideEmptyProviders(value === true)}
          />
          Hide providers without fees
        </label>
      </div>

      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          {tableLoading ? (
            <Skeleton className="m-4 h-64 w-[calc(100%-2rem)]" aria-busy="true" />
          ) : filteredCompanies.length === 0 ? (
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyTitle>No providers</EmptyTitle>
                <EmptyDescription>{emptyDescription}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="max-h-[600px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 min-w-[180px] bg-card">
                      Provider Name
                    </TableHead>
                    {categories.map((cat) => (
                      <TableHead key={cat._id} className="min-w-[150px] text-center">
                        {cat.main_cate_name?.en || cat.manin_cate_name?.en || cat.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((company) => (
                    <TableRow key={company._id}>
                      <TableCell className="sticky left-0 z-10 bg-card font-medium">
                        {company.provider_name?.en || company.name}
                      </TableCell>
                      {categories.map((cat) => {
                        const key = `${company._id}_${cat._id}`;
                        return (
                          <TableCell
                            key={cat._id}
                            className={cn('text-center', isRefMode && 'bg-muted/30')}
                          >
                            <MatrixCell
                              key={key}
                              defaultRate={agent?.default_fee_rate ?? 0}
                              readOnly={isRefMode}
                              ref={(el) => setMatrixCellRef(key, el)}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </DetailContainer>
  );
};

export default AgentFeesPage;
