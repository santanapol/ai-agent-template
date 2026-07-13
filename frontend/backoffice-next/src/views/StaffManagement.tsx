import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { VisibilityState } from "@tanstack/react-table";
import { Plus } from "lucide-react";

import { DataTableToolbarActions, useServerDataTable } from "@/components/data-table";
import { ListPageCard } from "@/components/layout";
import { InlineFilterSelect, ListPageSearch } from "@/components/list-page";
import StaffTable from "@/components/staff/StaffTable";
import { createStaffColumns } from "@/components/staff/staff-columns";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAppFeedback } from "@/hooks/useAppFeedback";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { usePermission } from "@/hooks/usePermission";
import { apiErrorMessage } from "@/lib/apiError";
import { resolveBranchScopedEmptyState } from "@/lib/branchScopedEmptyState";
import * as staffApi from "@/lib/staffApiClient";
import { useNavigate } from "@/navigation/compat";
import type { ProfileStatus, StaffProfile } from "@/types/staff";

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

async function withProfileEtag(record: StaffProfile, action: (id: string, etag: string) => Promise<unknown>) {
  const { etag } = await staffApi.getProfileById(record.id);
  if (!etag) throw new Error("Could not determine current profile version");
  await action(record.id, etag);
}

const StaffManagement: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { message } = useAppFeedback();
  const { confirm } = useConfirmDialog();
  const [profiles, setProfiles] = useState<StaffProfile[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [paginationConfig, setPaginationConfig] = useState({ current: 1, pageSize: 10, total: 0 });
  const [rawSearch, setRawSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProfileStatus | "all">("active");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [refreshToken, setRefreshToken] = useState(0);
  const canCreate = usePermission("profiles:create");
  const canEdit = usePermission("profiles:edit");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(rawSearch);
      setPaginationConfig((prev) => ({ ...prev, current: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [rawSearch]);

  const { current: currentPage, pageSize } = paginationConfig;
  useEffect(() => {
    // Intentional: refreshToken / branch_id must re-run list even when other deps are unchanged.
    void refreshToken;
    void user?.branch_id;
    const controller = new AbortController();

    const load = async () => {
      setTableLoading(true);
      try {
        const res = await staffApi.listProfiles(
          {
            q: debouncedSearch || undefined,
            status: statusFilter !== "all" ? statusFilter : undefined,
            page: currentPage,
            limit: pageSize,
            sort: "-upd_date",
          },
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setProfiles(Array.isArray(res.data) ? res.data : []);
        setPaginationConfig((prev) => ({ ...prev, total: res.pagination?.total ?? prev.total }));
      } catch (err) {
        if (controller.signal.aborted) return;
        message.error(apiErrorMessage(err, "Failed to load profiles"));
      } finally {
        if (!controller.signal.aborted) setTableLoading(false);
      }
    };
    void load();
    return () => {
      controller.abort();
    };
  }, [debouncedSearch, message, statusFilter, currentPage, pageSize, refreshToken, user?.branch_id]);

  const refresh = useCallback(() => setRefreshToken((t) => t + 1), []);

  const handleArchive = useCallback(
    (record: StaffProfile) => {
      void confirm({
        title: "Archive Staff Profile?",
        content:
          "Are you sure you want to archive this staff member? Their active session will be revoked immediately.",
        okText: "Archive",
        danger: true,
        onOk: async () => {
          await withProfileEtag(record, staffApi.archiveProfile);
          message.success("Profile archived");
          refresh();
        },
      });
    },
    [confirm, message, refresh],
  );

  const handleRestore = useCallback(
    (record: StaffProfile) => {
      void confirm({
        title: "Restore Staff Profile?",
        content: "This profile will become active again.",
        okText: "Restore",
        onOk: async () => {
          await withProfileEtag(record, staffApi.restoreProfile);
          message.success("Profile restored");
          refresh();
        },
      });
    },
    [confirm, message, refresh],
  );

  const columnHandlers = useMemo(
    () => ({
      onView: (record: StaffProfile) => navigate(`/staff/${record.id}`),
      onEdit: canEdit ? (record: StaffProfile) => navigate(`/staff/${record.id}/edit`) : undefined,
      onArchive: canEdit ? handleArchive : undefined,
      onRestore: canEdit ? handleRestore : undefined,
    }),
    [canEdit, handleArchive, handleRestore, navigate],
  );

  const columns = useMemo(() => createStaffColumns(columnHandlers), [columnHandlers]);

  const pageCount = Math.max(1, Math.ceil(paginationConfig.total / paginationConfig.pageSize) || 1);

  const table = useServerDataTable({
    data: profiles,
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
    getRowId: (row) => row.id,
  });

  const branchScopedEmpty = useMemo(
    () =>
      resolveBranchScopedEmptyState({
        activeBranchId: user?.branch_id,
        resource: "staff",
        scopedToActiveBranch: true,
        hasNoRows: !tableLoading && paginationConfig.total === 0,
      }),
    [user?.branch_id, tableLoading, paginationConfig.total],
  );

  return (
    <ListPageCard
      title="Staff Management"
      description="Profiles, roles, and credentials for the active branch."
      toolbar={
        <>
          <ListPageSearch
            id="staff-search"
            placeholder="Search code, name, username…"
            value={rawSearch}
            onChange={setRawSearch}
          />
          <DataTableToolbarActions table={table} exportFileName="staff" showColumnVisibility={false} />
          {canCreate ? (
            <Button onClick={() => navigate("/staff/new")}>
              <Plus data-icon="inline-start" aria-hidden="true" />
              Create staff
            </Button>
          ) : null}
        </>
      }
      filterRow={
        <InlineFilterSelect
          id="staff-status"
          prefix="Status:"
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={(value) => {
            setStatusFilter(value as ProfileStatus | "all");
            setPaginationConfig((prev) => ({ ...prev, current: 1 }));
          }}
        />
      }
    >
      <StaffTable
        table={table}
        loading={tableLoading}
        pagination={paginationConfig}
        emptyTitle={branchScopedEmpty?.emptyTitle}
        emptyDescription={branchScopedEmpty?.emptyDescription}
        emptyAction={
          canCreate
            ? {
                label: "Create staff",
                onClick: () => navigate("/staff/new"),
              }
            : undefined
        }
      />
    </ListPageCard>
  );
};

export default StaffManagement;
