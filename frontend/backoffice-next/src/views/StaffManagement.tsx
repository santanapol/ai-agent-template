import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { VisibilityState } from "@tanstack/react-table";
import { Plus } from "lucide-react";

import {
  DataTableSelectionBar,
  DataTableToolbarActions,
  type ListViewMode,
  useServerDataTable,
} from "@/components/data-table";
import { ListPageCard } from "@/components/layout";
import { InlineFilterSelect, ListPageSearch } from "@/components/list-page";
import StaffDrawerComponent, { type DrawerFormValues, type DrawerMode } from "@/components/staff/StaffDrawer";
import StaffTable from "@/components/staff/StaffTable";
import { createStaffColumns } from "@/components/staff/staff-columns";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAppFeedback } from "@/hooks/useAppFeedback";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { usePermission } from "@/hooks/usePermission";
import { apiErrorMessage } from "@/lib/apiError";
import { resolveBranchScopedEmptyState } from "@/lib/branchScopedEmptyState";
import { passwordFieldRules } from "@/lib/passwordPolicy";
import * as staffApi from "@/lib/staffApiClient";
import { formatTelephoneToE164 } from "@/lib/telephone";
import type { PatchProfilePayload, ProfileStatus, StaffProfile } from "@/types/staff";

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

const emptyForm: DrawerFormValues = {
  code: "",
  firstname: "",
  lastname: "",
  email: "",
  tel: "",
  username: "",
  password: "",
  confirmPassword: "",
  role: "staff",
};

function validateField(field: keyof DrawerFormValues, values: DrawerFormValues): string | undefined {
  const v = values[field];
  if (field === "code" && !v?.trim()) return "Please enter staff code";
  if (field === "firstname" && !v?.trim()) return "Please enter first name";
  if (field === "lastname" && !v?.trim()) return "Please enter last name";
  if (field === "email") {
    if (!v?.trim()) return "Please enter a valid email";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Please enter a valid email";
  }
  // ST-03: tel validation deferred
  if (field === "username" && values.password !== undefined) {
    if (!v?.trim()) return "Please enter username";
    if (!/^[a-zA-Z0-9_]+$/.test(v)) return "Only English letters, numbers, and underscores allowed";
  }
  if (field === "password" && values.username !== undefined) {
    for (const rule of passwordFieldRules) {
      if (typeof rule === "object" && "min" in rule && (v?.length ?? 0) < (rule.min as number)) {
        return `Password must be at least ${rule.min} characters`;
      }
    }
  }
  if (field === "confirmPassword" && values.password) {
    if (v !== values.password) return "Passwords do not match";
  }
  return undefined;
}

const StaffManagement: React.FC = () => {
  const { user } = useAuth();
  const { message } = useAppFeedback();
  const { confirm } = useConfirmDialog();
  const [profiles, setProfiles] = useState<StaffProfile[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("create");
  const [formValues, setFormValues] = useState<DrawerFormValues>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof DrawerFormValues, string>>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [paginationConfig, setPaginationConfig] = useState({ current: 1, pageSize: 20, total: 0 });
  const [rawSearch, setRawSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProfileStatus | "all">("active");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [viewMode, setViewMode] = useState<ListViewMode>("list");
  const [refreshToken, setRefreshToken] = useState(0);
  const currentEtag = useRef<string | null>(null);
  const listFetchKeyRef = useRef<string | null>(null);
  const canCreate = usePermission("profiles:create");
  const canEdit = usePermission("profiles:edit");
  const canAssignRole = usePermission("roles:assign");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(rawSearch);
      setPaginationConfig((prev) => ({ ...prev, current: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [rawSearch]);

  const { current: currentPage, pageSize } = paginationConfig;
  useEffect(() => {
    void refreshToken;
    const fetchKey = `${user?.branch_id ?? ""}:${debouncedSearch}:${statusFilter}:${currentPage}:${pageSize}:${refreshToken}`;
    if (listFetchKeyRef.current === fetchKey) return;
    listFetchKeyRef.current = fetchKey;

    let cancelled = false;
    const load = async () => {
      setTableLoading(true);
      try {
        const res = await staffApi.listProfiles({
          q: debouncedSearch || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          page: currentPage,
          limit: pageSize,
          sort: "-upd_date",
        });
        if (cancelled) return;
        setProfiles(Array.isArray(res.data) ? res.data : []);
        setPaginationConfig((prev) => ({ ...prev, total: res.pagination?.total ?? prev.total }));
      } catch (err) {
        if (!cancelled) message.error(apiErrorMessage(err, "Failed to load profiles"));
      } finally {
        if (!cancelled) setTableLoading(false);
        if (listFetchKeyRef.current === fetchKey) listFetchKeyRef.current = null;
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, message, statusFilter, currentPage, pageSize, refreshToken, user?.branch_id]);

  const refresh = useCallback(() => setRefreshToken((t) => t + 1), []);

  const handleFieldChange = (field: keyof DrawerFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleOpenDrawer = useCallback(
    async (mode: DrawerMode, record?: StaffProfile) => {
      setDrawerMode(mode);
      setIsDrawerOpen(true);
      currentEtag.current = null;
      setFormErrors({});

      if (!record || mode === "create") {
        setEditingId(null);
        setEditingUserId(null);
        setFormValues({ ...emptyForm, role: "staff" });
        return;
      }

      setEditingId(record.id);
      setEditingUserId(record.user_id);

      if (mode === "view") {
        setFormValues({
          code: record.code,
          firstname: record.firstname,
          lastname: record.lastname,
          email: record.email,
          tel: record.tel,
          role: record.user?.role,
        });
        return;
      }

      setDrawerLoading(true);
      try {
        const { profile, etag } = await staffApi.getProfileById(record.id);
        currentEtag.current = etag;
        setFormValues({
          code: profile.code,
          firstname: profile.firstname,
          lastname: profile.lastname,
          email: profile.email,
          tel: profile.tel,
          role: profile.user?.role,
        });
      } catch (err) {
        message.error(apiErrorMessage(err, "Failed to load profile"));
        setIsDrawerOpen(false);
      } finally {
        setDrawerLoading(false);
      }
    },
    [message],
  );

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setFormValues(emptyForm);
    currentEtag.current = null;
    setEditingId(null);
    setEditingUserId(null);
  }, []);

  const showAdminResetPassword =
    drawerMode === "edit" && editingUserId !== null && user?.sub !== undefined && editingUserId !== user.sub;

  const validateForm = useCallback(
    (isCreate: boolean): boolean => {
      const fields: (keyof DrawerFormValues)[] = isCreate
        ? ["code", "firstname", "lastname", "email", "tel", "username", "password", "confirmPassword"]
        : ["firstname", "lastname", "email", "tel"];
      const errors: Partial<Record<keyof DrawerFormValues, string>> = {};
      fields.forEach((f) => {
        const err = validateField(f, formValues);
        if (err) errors[f] = err;
      });
      setFormErrors(errors);
      return Object.keys(errors).length === 0;
    },
    [formValues],
  );

  const handleUpdatePassword = useCallback(async () => {
    if (!editingId) return;
    const newPassword = formValues.newPassword?.trim();
    if (!newPassword) {
      setFormErrors((prev) => ({ ...prev, newPassword: "Enter a new password to update it." }));
      message.warning("Enter a new password to update, or leave the fields empty.");
      return;
    }
    if (formValues.confirmNewPassword !== newPassword) {
      setFormErrors((prev) => ({ ...prev, confirmNewPassword: "Passwords do not match" }));
      return;
    }
    setFormErrors((prev) => ({ ...prev, newPassword: undefined, confirmNewPassword: undefined }));
    await confirm({
      title: "Reset password?",
      content: "This will sign the user out of all devices.",
      okText: "Update password",
      onOk: async () => {
        setUpdatingPassword(true);
        try {
          await staffApi.resetProfilePassword(editingId, { password: newPassword, revoke_sessions: true });
          message.success("Password updated");
          setFormValues((prev) => ({ ...prev, newPassword: "", confirmNewPassword: "" }));
        } catch (err) {
          message.error(apiErrorMessage(err, "Failed to update password"));
        } finally {
          setUpdatingPassword(false);
        }
      },
    });
  }, [confirm, editingId, formValues.confirmNewPassword, formValues.newPassword, message]);

  const handleSave = useCallback(async () => {
    const isCreate = drawerMode === "create";
    if (!validateForm(isCreate)) return;

    setIsSaving(true);
    try {
      if (isCreate) {
        const { code, firstname, lastname, email, tel, username, password } = formValues;
        if (!code || !firstname || !lastname || !email || !tel || !username || !password) return;
        await staffApi.createProfile({
          code,
          firstname,
          lastname,
          email,
          tel: formatTelephoneToE164(tel),
          username,
          password,
          ...(canAssignRole && formValues.role ? { role: formValues.role } : {}),
        });
        message.success("Profile created");
        handleCloseDrawer();
        setPaginationConfig((prev) => ({ ...prev, current: 1 }));
        refresh();
        return;
      }

      if (editingId && currentEtag.current) {
        const { firstname, lastname, email, tel } = formValues;
        if (!firstname || !lastname || !email || !tel) return;
        const payload: PatchProfilePayload = {
          firstname,
          lastname,
          email,
          tel: formatTelephoneToE164(tel),
        };
        await staffApi.patchProfile(editingId, payload, currentEtag.current);
        const existingRecord = profiles.find((p) => p.id === editingId);
        if (canAssignRole && formValues.role && formValues.role !== existingRecord?.user?.role) {
          await staffApi.changeProfileRole(editingId, formValues.role);
        }
        message.success("Profile updated");
        handleCloseDrawer();
        refresh();
      } else if (!currentEtag.current) {
        message.error("Cannot save: version token missing. Please close and reopen the form.");
      }
    } catch (err) {
      message.error(apiErrorMessage(err, isCreate ? "Failed to create profile" : "Failed to update profile"));
    } finally {
      setIsSaving(false);
    }
  }, [canAssignRole, drawerMode, editingId, formValues, handleCloseDrawer, message, profiles, refresh, validateForm]);

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
      onView: (record: StaffProfile) => void handleOpenDrawer("view", record),
      onEdit: canEdit ? (record: StaffProfile) => void handleOpenDrawer("edit", record) : undefined,
      onArchive: handleArchive,
      onRestore: handleRestore,
    }),
    [canEdit, handleArchive, handleOpenDrawer, handleRestore],
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
    <>
      <ListPageCard
        title="Staff Management"
        description="Manage staff profiles, system roles, and authentication credentials."
        toolbar={
          <>
            <ListPageSearch
              id="staff-search"
              placeholder="Search code, name..."
              value={rawSearch}
              onChange={setRawSearch}
            />
            <DataTableToolbarActions table={table} exportFileName="staff" />
            {canCreate ? (
              <Button onClick={() => void handleOpenDrawer("create")}>
                <Plus data-icon="inline-start" />
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
        selectionBar={
          <DataTableSelectionBar table={table} viewMode={viewMode} onViewModeChange={setViewMode} showViewToggle />
        }
      >
        <StaffTable
          table={table}
          loading={tableLoading}
          pagination={paginationConfig}
          viewMode={viewMode}
          handlers={columnHandlers}
          emptyTitle={branchScopedEmpty?.emptyTitle}
          emptyDescription={branchScopedEmpty?.emptyDescription}
        />
      </ListPageCard>

      <StaffDrawerComponent
        open={isDrawerOpen}
        mode={drawerMode}
        loading={drawerLoading}
        isSaving={isSaving}
        updatingPassword={updatingPassword}
        showAdminResetPassword={showAdminResetPassword}
        canAssignRole={canAssignRole}
        values={formValues}
        errors={formErrors}
        onChange={handleFieldChange}
        onClose={handleCloseDrawer}
        onSave={() => void handleSave()}
        onSwitchToEdit={() => {
          const record = profiles.find((p) => p.id === editingId);
          if (record) void handleOpenDrawer("edit", record);
          else message.error("Profile not found in current list. Please refresh.");
        }}
        onUpdatePassword={() => void handleUpdatePassword()}
      />
    </>
  );
};

export default StaffManagement;
