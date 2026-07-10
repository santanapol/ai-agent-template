"use client";

import type React from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

import type { VisibilityState } from "@tanstack/react-table";
import { RefreshCw } from "lucide-react";

import {
  DataTablePagination,
  DataTableToolbarActions,
  DataTableView,
  useServerDataTable,
} from "@/components/data-table";
import { FilterSelect } from "@/components/FilterSelect";
import { LoadingButton } from "@/components/LoadingButton";
import { ListPageCard } from "@/components/layout";
import { type InlineFilterOption, InlineFilterSelect, ListPageSearch } from "@/components/list-page";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { usePermission } from "@/hooks/usePermission";
import { fieldErrorIds } from "@/lib/fieldA11y";
import { useNavigate } from "@/navigation/compat";
import type { Agent } from "@/types/agents";

import { createAgentsColumns } from "./agents-columns";
import { useAgents } from "./hooks/useAgents";

const BRANCH_FILTER_OPTIONS: InlineFilterOption[] = [
  { value: "active", label: "Active only" },
  { value: "all", label: "Active + inactive" },
];

const AgentsList: React.FC = () => {
  const {
    agents,
    unsyncedBranches,
    total,
    loading,
    loadingUnsynced,
    fetchAgents,
    fetchUnsyncedBranches,
    syncData,
    deleteData,
  } = useAgents();
  const canWrite = usePermission("agents:write");
  const syncIncludeInactiveId = useId();
  const [rawSearch, setRawSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paginationConfig, setPaginationConfig] = useState({ current: 1, pageSize: 10, total: 0 });
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [syncIncludeInactive, setSyncIncludeInactive] = useState(false);
  const [branchId, setBranchId] = useState<string | undefined>();
  const [branchError, setBranchError] = useState<string | undefined>();
  const [syncing, setSyncing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(rawSearch);
      setPaginationConfig((prev) => ({ ...prev, current: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [rawSearch]);

  const { current: currentPage, pageSize } = paginationConfig;

  const refreshAgents = useCallback(() => {
    void fetchAgents({
      page: currentPage,
      limit: pageSize,
      search: debouncedSearch || undefined,
      includeInactive: showInactive || undefined,
    });
  }, [fetchAgents, currentPage, pageSize, debouncedSearch, showInactive]);

  useEffect(() => {
    void refreshAgents();
  }, [refreshAgents]);

  useEffect(() => {
    setPaginationConfig((prev) => ({ ...prev, total }));
  }, [total]);

  const handleOpenSyncModal = () => {
    setIsSyncModalOpen(true);
    setSyncIncludeInactive(false);
    setBranchId(undefined);
    setBranchError(undefined);
    void fetchUnsyncedBranches(false);
  };

  const handleSyncIncludeInactiveChange = (checked: boolean) => {
    setSyncIncludeInactive(checked);
    setBranchId(undefined);
    if (branchError) setBranchError(undefined);
    void fetchUnsyncedBranches(checked);
  };

  const handleSync = async () => {
    if (!branchId) {
      setBranchError("Please select a branch!");
      return;
    }
    setSyncing(true);
    try {
      const success = await syncData(branchId);
      if (success) {
        setIsSyncModalOpen(false);
        setBranchId(undefined);
        refreshAgents();
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const success = await deleteData(deleteTarget._id, deleteTarget.upd_date);
    setDeleteTarget(null);
    if (success) {
      refreshAgents();
    }
  };

  const columnHandlers = useMemo(
    () => ({
      onManageFees: (record: Agent) => navigate(`/agents/${record._id}/fees`),
      onDelete: (record: Agent) => setDeleteTarget(record),
      canWrite,
    }),
    [navigate, canWrite],
  );

  const columns = useMemo(() => createAgentsColumns(columnHandlers), [columnHandlers]);

  const pageCount = Math.max(1, Math.ceil(paginationConfig.total / paginationConfig.pageSize) || 1);

  const table = useServerDataTable({
    data: agents,
    columns,
    pageIndex: paginationConfig.current - 1,
    pageSize: paginationConfig.pageSize,
    pageCount,
    onPaginationChange: ({ pageIndex, pageSize: nextPageSize }) => {
      setPaginationConfig((prev) => ({
        ...prev,
        current: pageIndex + 1,
        pageSize: nextPageSize,
      }));
    },
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: (row) => row._id,
  });

  const branchOptions = useMemo(
    () =>
      [...unsyncedBranches]
        .sort((a, b) => a.branch_code.localeCompare(b.branch_code, undefined, { sensitivity: "base" }))
        .map((b) => ({
          value: b.branch_id,
          label: `${b.branch_code} - ${b.branch_name}${b.active === false ? " [Inactive]" : ""}`,
        })),
    [unsyncedBranches],
  );

  return (
    <>
      <ListPageCard
        title="Agents"
        description="View and configure agent branches, fee overrides, and reference fees."
        toolbar={
          <>
            <ListPageSearch
              id="agent-search"
              placeholder="Search by branch code or name…"
              value={rawSearch}
              onChange={setRawSearch}
            />
            <DataTableToolbarActions table={table} exportFileName="agents" showColumnVisibility={false} />
            {canWrite ? (
              <Button onClick={handleOpenSyncModal}>
                <RefreshCw data-icon="inline-start" />
                Sync Branch
              </Button>
            ) : null}
          </>
        }
        filterRow={
          <InlineFilterSelect
            id="agents-branch-status"
            prefix="Branches:"
            value={showInactive ? "all" : "active"}
            options={BRANCH_FILTER_OPTIONS}
            onChange={(value) => {
              setShowInactive(value === "all");
              setPaginationConfig((prev) => ({ ...prev, current: 1 }));
            }}
          />
        }
      >
        <DataTableView
          table={table}
          loading={loading}
          emptyTitle="No agents yet"
          emptyDescription="Sync a branch from master data to create an agent record."
          emptyAction={canWrite ? { label: "Sync Branch", onClick: handleOpenSyncModal } : undefined}
        />
        <DataTablePagination table={table} total={paginationConfig.total} pageSizeOptions={[10, 20, 50]} />
      </ListPageCard>

      <Dialog
        open={isSyncModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsSyncModalOpen(false);
            setSyncIncludeInactive(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sync Agent Branch</DialogTitle>
            <DialogDescription className="text-pretty">
              Select a branch from master data to sync as an agent record.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={!!branchError}>
              <FieldLabel htmlFor="sync-branch">Branch</FieldLabel>
              <FilterSelect
                id="sync-branch"
                placeholder={loadingUnsynced ? "Loading branches…" : "Select a branch to sync"}
                value={branchId}
                disabled={loadingUnsynced}
                includeAllOption={false}
                searchable
                searchPlaceholder="Search by branch code or name…"
                onChange={(val) => {
                  setBranchId(val);
                  if (branchError) setBranchError(undefined);
                }}
                options={branchOptions}
                width="w-full"
                aria-invalid={!!branchError}
                aria-describedby={branchError ? fieldErrorIds("sync-branch").describedBy : undefined}
              />
              {branchError ? (
                <FieldDescription id={fieldErrorIds("sync-branch").errorId} className="text-destructive" role="alert">
                  {branchError}
                </FieldDescription>
              ) : null}
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                id={syncIncludeInactiveId}
                checked={syncIncludeInactive}
                disabled={loadingUnsynced}
                onCheckedChange={(value) => handleSyncIncludeInactiveChange(value === true)}
              />
              <FieldLabel htmlFor={syncIncludeInactiveId}>Include inactive branches</FieldLabel>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSyncModalOpen(false)}>
              Cancel
            </Button>
            <LoadingButton onClick={() => void handleSync()} loading={syncing}>
              Sync
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this agent?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.branch_name}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void handleDelete()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AgentsList;
