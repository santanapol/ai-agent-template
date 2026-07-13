import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Inbox, Save } from "lucide-react";

import { MatrixCell, type MatrixCellRef } from "@/components/agent-fees/MatrixCell";
import { FilterSelect } from "@/components/FilterSelect";
import { LoadingButton } from "@/components/LoadingButton";
import { DetailContainer, ListPageCard } from "@/components/layout";
import { ListPageSearch } from "@/components/list-page";
import { ActiveBadge } from "@/components/StatusBadge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppFeedback } from "@/hooks/useAppFeedback";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { deleteAgentFee, listAgentFees } from "@/lib/agentFeesApiClient";
import { getAgentById, listAgents, updateAgent } from "@/lib/agentsApiClient";
import { cn } from "@/lib/utils";
import { useNavigate, useParams } from "@/navigation/compat";
import type { AgentFee, CreateFeePayload, GameCategory, GameCompany } from "@/types/agentFees";
import type { Agent } from "@/types/agents";

import { useAgentFees } from "../agents/hooks/useAgentFees";

const REF_NONE_VALUE = "__none__";
const REF_NONE_LABEL = "None";

function clampFeeRate(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(99, Math.max(0, Math.round(value * 100) / 100));
}

function categoryLabel(cat: GameCategory): string {
  // biome-ignore lint/nursery/useNullishCoalescing: intentionally fall through empty-string labels to the next source
  return cat.main_cate_name?.en || cat.manin_cate_name?.en || cat.name || "";
}

function companyLabel(company: GameCompany): string {
  // biome-ignore lint/nursery/useNullishCoalescing: intentionally fall through empty-string labels to the next source
  return company.provider_name?.en || company.name || "";
}

const AgentFeesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = useAppFeedback();
  const { confirm } = useConfirmDialog();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [agentLoading, setAgentLoading] = useState(true);
  const [hideEmptyProviders, setHideEmptyProviders] = useState(false);
  const [providerSearch, setProviderSearch] = useState("");
  const agentEtagRef = useRef<string | null>(null);

  const [draftRate, setDraftRate] = useState<number>(0);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [changeTick, setChangeTick] = useState(0);

  const [allAgents, setAllAgents] = useState<Agent[]>([]);
  const [refFees, setRefFees] = useState<AgentFee[]>([]);
  const [refFeesLoading, setRefFeesLoading] = useState(false);
  const [draftRefFeeBranchId, setDraftRefFeeBranchId] = useState<string | null>(null);

  const { fees, companies, categories, fetching, masterDataLoading, saving, fetchFees, fetchMasterData, bulkSave } =
    useAgentFees(id || "");

  const matrixCellRefs = useRef<Record<string, MatrixCellRef | null>>({});
  const originalFeesRef = useRef<Map<string, AgentFee>>(new Map());

  const isRefMode = !!agent?.ref_fee_branch_id;
  const refAgentName = isRefMode
    ? (allAgents.find((a) => a.branch_id === agent.ref_fee_branch_id)?.branch_name ?? agent.ref_fee_branch_id)
    : null;

  const isSaving = isSavingChanges || saving;
  const matrixDefaultRate = isRefMode ? (agent?.default_fee_rate ?? 0) : draftRate;

  const markDirty = useCallback(() => {
    setChangeTick((tick) => tick + 1);
  }, []);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    void (async () => {
      try {
        setAgentLoading(true);
        const data = await getAgentById(id, controller.signal);
        if (controller.signal.aborted) return;
        setAgent(data.agent);
        agentEtagRef.current = data.etag;
        setDraftRate(data.agent.default_fee_rate);
        setDraftRefFeeBranchId(data.agent.ref_fee_branch_id ?? null);
      } catch (err: unknown) {
        if (err instanceof Error && (err.name === "CanceledError" || err.name === "AbortError")) return;
        message.error("Failed to load agent details");
        navigate("/agents");
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
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    void fetchFees({ page: 1, limit: 100 }, controller.signal);
    return () => controller.abort();
  }, [id, fetchFees]);

  useEffect(() => {
    if (!agent?.ou_id) return;
    const controller = new AbortController();
    void fetchMasterData(agent.ou_id, controller.signal);
    return () => controller.abort();
  }, [agent?.ou_id, fetchMasterData]);

  useEffect(() => {
    if (!agent?.ref_fee_branch_id || allAgents.length === 0) {
      return;
    }
    const refAgent = allAgents.find((a) => a.branch_id === agent.ref_fee_branch_id);
    if (!refAgent) {
      message.error("Reference agent not found");
      return;
    }
    const controller = new AbortController();
    setRefFeesLoading(true);
    listAgentFees(refAgent._id, { page: 1, limit: 100 }, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setRefFees(data.data || []);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && (err.name === "CanceledError" || err.name === "AbortError")) return;
        message.error("Failed to load reference agent fees");
      })
      .finally(() => {
        if (!controller.signal.aborted) setRefFeesLoading(false);
      });
    return () => controller.abort();
  }, [agent?.ref_fee_branch_id, allAgents, message]);

  useEffect(() => {
    const displayLoading = fetching || refFeesLoading;
    if (displayLoading) return;

    const displayFees = isRefMode ? refFees : fees;
    const resetRate = agent?.default_fee_rate ?? 0;
    originalFeesRef.current = new Map();

    Object.values(matrixCellRefs.current).forEach((cell) => {
      cell?.reset(resetRate);
    });

    displayFees.forEach((f) => {
      const key = `${f.game_company_id}_${f.game_main_cate_id}`;
      if (!isRefMode) originalFeesRef.current.set(key, f);
      matrixCellRefs.current[key]?.setValues(f.gcomp_cost, f.agent_known_fee, f.agent_fee);
    });
  }, [fees, refFees, isRefMode, fetching, refFeesLoading, agent?.default_fee_rate]);

  const applyRateSaveSuccess = useCallback((savedRate: number, newUpdDate: string, etag: string | null) => {
    setAgent((prev) => (prev ? { ...prev, default_fee_rate: savedRate, upd_date: newUpdDate } : prev));
    if (etag) agentEtagRef.current = etag;
    setDraftRate(savedRate);
    Object.values(matrixCellRefs.current).forEach((cell) => {
      const vals = cell?.getValues();
      if (vals && !vals.enabled) {
        cell?.reset(savedRate);
      }
    });
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
          errors.push(`${companyLabel(company)} / ${categoryLabel(category)}: must be 0–100`);
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

  const setMatrixCellRef = useCallback((key: string, el: MatrixCellRef | null) => {
    matrixCellRefs.current[key] = el;
  }, []);

  const savedRefFeeBranchId = agent?.ref_fee_branch_id ?? null;

  const isDirty = useCallback(() => {
    void changeTick;
    if (!agent) return false;
    if (draftRefFeeBranchId !== savedRefFeeBranchId) return true;
    if (isRefMode) return false;
    if (draftRate !== (agent.default_fee_rate ?? 0)) return true;
    const { creates, updates, deletes } = collectChanges();
    return creates.length > 0 || updates.length > 0 || deletes.length > 0;
  }, [agent, isRefMode, draftRate, draftRefFeeBranchId, savedRefFeeBranchId, collectChanges, changeTick]);

  const handleBack = useCallback(() => {
    if (!isDirty()) {
      navigate("/agents");
      return;
    }
    void confirm({
      title: "Discard unsaved changes?",
      content: "You have unsaved fee changes that will be lost.",
      okText: "Discard",
      danger: true,
      onOk: () => navigate("/agents"),
    });
  }, [isDirty, navigate, confirm]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty()) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const handleRefSelectChange = useCallback(
    (value: string | undefined) => {
      const newRefId = value === undefined || value === REF_NONE_VALUE ? null : value;
      setDraftRefFeeBranchId(newRefId);
      markDirty();
    },
    [markDirty],
  );

  const handleSaveChanges = useCallback(async () => {
    if (!agent?.upd_date || !id) return;

    const refChanged = draftRefFeeBranchId !== savedRefFeeBranchId;
    const enteringRefMode = refChanged && draftRefFeeBranchId !== null;
    const { creates, updates, deletes, errors } = collectChanges();
    const rateChanged = !isRefMode && draftRate !== (agent.default_fee_rate ?? 0);
    const matrixChanged =
      !isRefMode && !enteringRefMode && (creates.length > 0 || updates.length > 0 || deletes.length > 0);

    if (!refChanged && !rateChanged && !matrixChanged) {
      message.info("No changes to save");
      return;
    }

    if (!enteringRefMode && errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);

    const refAgent = draftRefFeeBranchId ? allAgents.find((a) => a.branch_id === draftRefFeeBranchId) : null;

    const runSave = async () => {
      setIsSavingChanges(true);
      try {
        let currentUpdDate = agent.upd_date;
        let currentEtag = agentEtagRef.current;

        const agentPayload: { default_fee_rate?: number; ref_fee_branch_id?: string | null } = {};
        if (refChanged) agentPayload.ref_fee_branch_id = draftRefFeeBranchId;
        if (rateChanged) agentPayload.default_fee_rate = draftRate;

        if (Object.keys(agentPayload).length > 0) {
          const result = await updateAgent(agent._id, agentPayload, currentUpdDate);
          currentUpdDate = result.etag ? atob(result.etag.replace(/^W\/"|"/g, "")) : currentUpdDate;
          currentEtag = result.etag;
          setAgent((prev) =>
            prev
              ? {
                  ...prev,
                  ...agentPayload,
                  upd_date: currentUpdDate,
                }
              : prev,
          );
          agentEtagRef.current = currentEtag;
          if (rateChanged) {
            applyRateSaveSuccess(draftRate, currentUpdDate, currentEtag);
          }
        }

        if (refChanged && draftRefFeeBranchId && fees.length > 0) {
          await Promise.allSettled(fees.map((f) => deleteAgentFee(id, f._id, f.upd_date)));
        }

        if (matrixChanged) {
          const success = await bulkSave(creates, updates, deletes);
          if (!success) {
            await fetchFees({ page: 1, limit: 100 });
            return;
          }
        }

        if (refChanged || matrixChanged) {
          await fetchFees({ page: 1, limit: 100 });
        }

        message.success("Changes saved successfully");
      } catch (err: unknown) {
        message.error(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to save changes",
        );
      } finally {
        setIsSavingChanges(false);
      }
    };

    const needsRefConfirm = enteringRefMode && fees.length > 0;
    const needsDeleteConfirm = matrixChanged && deletes.length > 0;

    if (needsRefConfirm) {
      void confirm({
        title: "Set reference agent?",
        content: `Fee configuration will reference "${refAgent?.branch_name ?? draftRefFeeBranchId}". Your ${fees.length} own fee override${fees.length > 1 ? "s" : ""} will be deleted. Continue?`,
        okText: "Confirm",
        danger: true,
        onOk: runSave,
      });
      return;
    }

    if (needsDeleteConfirm) {
      void confirm({
        title: "Remove fee overrides?",
        content: `${deletes.length} fee override${deletes.length > 1 ? "s" : ""} will be deleted. Continue?`,
        okText: "Delete",
        danger: true,
        onOk: runSave,
      });
      return;
    }

    await runSave();
  }, [
    agent,
    id,
    isRefMode,
    draftRate,
    draftRefFeeBranchId,
    savedRefFeeBranchId,
    allAgents,
    fees,
    collectChanges,
    bulkSave,
    fetchFees,
    message,
    confirm,
    applyRateSaveSuccess,
  ]);

  const feesByCompany = useMemo(
    () => new Set((isRefMode ? refFees : fees).map((f) => f.game_company_id)),
    [isRefMode, refFees, fees],
  );

  const refFeeOptions = useMemo(() => {
    const sorted = [...allAgents]
      .filter((a) => a._id !== id)
      .sort((a, b) => a.branch_code.localeCompare(b.branch_code));
    return [
      { value: REF_NONE_VALUE, label: REF_NONE_LABEL },
      ...sorted.map((a) => ({ value: a.branch_id, label: `${a.branch_code} · ${a.branch_name}` })),
    ];
  }, [allAgents, id]);

  const filteredCompanies = useMemo(() => {
    let sorted = [...companies].sort((a, b) => companyLabel(a).localeCompare(companyLabel(b)));
    if (hideEmptyProviders) {
      sorted = sorted.filter((company) => feesByCompany.has(company._id));
    }
    const query = providerSearch.trim().toLowerCase();
    if (query) {
      sorted = sorted.filter((company) => companyLabel(company).toLowerCase().includes(query));
    }
    return sorted;
  }, [companies, feesByCompany, hideEmptyProviders, providerSearch]);

  const usedCompaniesCount = useMemo(
    () => companies.filter((company) => feesByCompany.has(company._id)).length,
    [companies, feesByCompany],
  );

  const emptyDescription = useMemo(() => {
    if (providerSearch.trim() && !isRefMode) {
      return "No providers match your search.";
    }
    if (isRefMode) {
      return `${refAgentName} has no fee overrides configured — providers will use the default fee rate.`;
    }
    if (hideEmptyProviders) {
      return 'No providers have fee overrides yet. Uncheck "Hide providers without fees" to see all providers.';
    }
    return "No providers found.";
  }, [providerSearch, isRefMode, refAgentName, hideEmptyProviders]);

  const dirty = isDirty();

  if (agentLoading) {
    return (
      <DetailContainer title="Agent fees" description="Loading agent details…" onBack={handleBack}>
        <div className="flex flex-col gap-6" role="status" aria-busy="true" aria-label="Loading agent fees">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </DetailContainer>
    );
  }

  const tableLoading = (fetching || masterDataLoading || refFeesLoading) && companies.length === 0;

  const matrixDescription =
    filteredCompanies.length > 0 && categories.length > 0
      ? `${filteredCompanies.length} provider${filteredCompanies.length === 1 ? "" : "s"} × ${categories.length} categor${categories.length === 1 ? "y" : "ies"}. Check a cell to override the default fee rate.`
      : "Provider and category fee overrides. Check a cell to override the default fee rate.";

  const pageTitle = agent ? `${agent.branch_name} · ${agent.branch_code} · ${agent.branch_type}` : "Agent fees";

  return (
    <DetailContainer
      title={pageTitle}
      status={<ActiveBadge active={!!agent?.active} />}
      onBack={handleBack}
      extra={
        <LoadingButton size="default" loading={isSaving} disabled={!dirty} onClick={() => void handleSaveChanges()}>
          <Save data-icon="inline-start" />
          Save changes
        </LoadingButton>
      }
      maxWidth={1200}
      className="gap-4"
    >
      <Card className="min-w-0 shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription className="text-pretty">
            Default fee rate, reference fees, and matrix overrides are saved together with Save changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field>
              <FieldLabel>Currency</FieldLabel>
              <p className="font-medium text-sm uppercase tabular-nums">{agent?.currency || "—"}</p>
            </Field>
            <Field>
              <FieldLabel>Companies configured</FieldLabel>
              <p className="font-medium text-sm tabular-nums">
                {usedCompaniesCount} / {companies.length}
              </p>
            </Field>
            <Field>
              <FieldLabel htmlFor="default-fee-rate">Default fee rate</FieldLabel>
              <div className="flex items-center gap-2">
                <Input
                  id="default-fee-rate"
                  type="number"
                  min={0}
                  max={99}
                  step={0.01}
                  inputMode="decimal"
                  value={draftRate}
                  disabled={isRefMode || isSaving}
                  onChange={(e) => {
                    setDraftRate(clampFeeRate(Number(e.target.value)));
                    markDirty();
                  }}
                  onBlur={(e) => {
                    setDraftRate(clampFeeRate(Number(e.target.value)));
                  }}
                  className="w-full tabular-nums"
                />
                <span className="shrink-0 text-muted-foreground text-sm">%</span>
              </div>
            </Field>
            <Field>
              <FieldLabel htmlFor="reference-fees">Reference fees</FieldLabel>
              <FilterSelect
                id="reference-fees"
                placeholder={REF_NONE_LABEL}
                value={draftRefFeeBranchId ?? REF_NONE_VALUE}
                onChange={(value) => handleRefSelectChange(value ?? REF_NONE_VALUE)}
                options={refFeeOptions}
                includeAllOption={false}
                searchable
                searchPlaceholder="Search branches…"
                width="w-full"
                disabled={isSaving}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {isRefMode ? (
        <Alert>
          <AlertTitle>Referenced fee configuration</AlertTitle>
          <AlertDescription>
            Fee configuration is referenced from <strong>{refAgentName}</strong>. To edit fees independently, set
            reference to none and save changes.
          </AlertDescription>
        </Alert>
      ) : null}

      {validationErrors.length > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>Fix invalid fee values</AlertTitle>
          <AlertDescription>
            <ul className="flex flex-col gap-1">
              {validationErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <ListPageCard
        title="Fee matrix"
        description={matrixDescription}
        descriptionClassName="max-w-none leading-snug"
        filterRow={
          <div className="flex w-full min-w-0 flex-nowrap items-center gap-3">
            <ListPageSearch
              id="provider-search"
              placeholder="Search providers…"
              value={providerSearch}
              onChange={setProviderSearch}
              className="min-w-0 flex-1 sm:max-w-xs"
            />
            <Field orientation="horizontal" className="w-auto shrink-0 items-center gap-2">
              <Checkbox
                id="hide-empty-providers"
                checked={hideEmptyProviders}
                onCheckedChange={(value) => setHideEmptyProviders(value === true)}
              />
              <FieldLabel htmlFor="hide-empty-providers" className="font-normal text-sm whitespace-nowrap">
                Hide providers without fees
              </FieldLabel>
            </Field>
          </div>
        }
      >
        {tableLoading ? (
          <Skeleton className="m-4 h-64" role="status" aria-busy="true" />
        ) : filteredCompanies.length === 0 ? (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Inbox aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No providers</EmptyTitle>
              <EmptyDescription>{emptyDescription}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button type="button" variant="outline" onClick={() => navigate("/agents")}>
                Back to agents
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <section aria-label="Agent fee matrix by provider and category">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 min-w-[180px] bg-card">Provider</TableHead>
                  {categories.map((cat) => {
                    const label = categoryLabel(cat);
                    return (
                      <TableHead
                        key={cat._id}
                        className="max-w-[120px] min-w-[120px] truncate text-center"
                        title={label}
                      >
                        {label}
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((company) => {
                  const provider = companyLabel(company);
                  return (
                    <TableRow key={company._id}>
                      <TableCell className="sticky left-0 z-10 bg-card font-medium">{provider}</TableCell>
                      {categories.map((cat) => {
                        const key = `${company._id}_${cat._id}`;
                        const catLabel = categoryLabel(cat);
                        return (
                          <TableCell key={cat._id} className={cn("text-center", isRefMode && "bg-muted/30")}>
                            <MatrixCell
                              key={key}
                              defaultRate={matrixDefaultRate}
                              readOnly={isRefMode}
                              providerLabel={provider}
                              categoryLabel={catLabel}
                              onChange={markDirty}
                              ref={(el) => setMatrixCellRef(key, el)}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </section>
        )}
      </ListPageCard>
    </DetailContainer>
  );
};

export default AgentFeesPage;
