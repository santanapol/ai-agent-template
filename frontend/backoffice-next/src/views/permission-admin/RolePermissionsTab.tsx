import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import axios from "axios";
import { FolderTree } from "lucide-react";

import { MenuTree } from "@/components/MenuTree";
import { InlineFilterSelect } from "@/components/list-page";
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
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppFeedback } from "@/hooks/useAppFeedback";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { apiErrorMessage } from "@/lib/apiError";
import * as authApi from "@/lib/authApiClient";
import type { AdminMenuNode, KnownRole } from "@/types/permissionAdmin";
import { PROTECTED_MENU_KEY } from "@/types/permissionAdmin";

import AdminApiForbidden from "./AdminApiForbidden";
import {
  buildMenuTree,
  buildRoleSaveMenuKeys,
  expandRoleMappingToCheckedKeys,
  filterCheckedActionKeys,
  isPlatformAdminManageCheckboxDisabled,
  ROLE_FILTER_OPTIONS,
  splitMappingKeys,
} from "./permissionAdminUtils";

const MANAGE_LOCKOUT_TOOLTIP = "Required for platform_admin unless permissions:* wildcard is already granted.";

function sortedKeySignature(keys: string[]): string {
  return [...keys].sort().join("|");
}

export interface RoleSaveActions {
  save: () => void;
  saving: boolean;
  disabled: boolean;
}

interface RolePermissionsTabProps {
  menus: AdminMenuNode[];
  menusLoading: boolean;
  menusForbidden: boolean;
  role: KnownRole;
  onRoleCommitted: (next: KnownRole) => void;
  onSaveActionReady?: (actions: RoleSaveActions | null) => void;
  onGoToCatalog?: () => void;
}

const RolePermissionsTab: React.FC<RolePermissionsTabProps> = ({
  menus,
  menusLoading,
  menusForbidden,
  role,
  onRoleCommitted,
  onSaveActionReady,
  onGoToCatalog,
}) => {
  const { message } = useAppFeedback();
  const messageRef = useRef(message);
  messageRef.current = message;
  const { confirm } = useConfirmDialog();
  const [checkedExact, setCheckedExact] = useState<string[]>([]);
  const [baselineCheckedExact, setBaselineCheckedExact] = useState<string[]>([]);
  const [wildcards, setWildcards] = useState<string[]>([]);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const isDirty = useMemo(
    () => sortedKeySignature(checkedExact) !== sortedKeySignature(baselineCheckedExact),
    [checkedExact, baselineCheckedExact],
  );

  const loadRoleMapping = useCallback(async (selectedRole: KnownRole, registry: AdminMenuNode[]) => {
    const mappings = await authApi.listRolePermissions({ role: selectedRole });
    const mapping = mappings.find((m) => m.role === selectedRole);
    const menuKeys = mapping?.menu_keys ?? [];
    const { wildcards: mappingWildcards } = splitMappingKeys(menuKeys);
    const expanded = expandRoleMappingToCheckedKeys(menuKeys, registry);
    setCheckedExact(expanded);
    setBaselineCheckedExact(expanded);
    setWildcards(mappingWildcards);
  }, []);

  useEffect(() => {
    if (menusLoading) return;
    if (menus.length === 0) {
      setCheckedExact([]);
      setBaselineCheckedExact([]);
      setWildcards([]);
      return;
    }

    let cancelled = false;

    async function loadMapping() {
      setMappingLoading(true);
      try {
        await loadRoleMapping(role, menus);
      } catch (err) {
        if (!cancelled) {
          if (axios.isAxiosError(err) && err.response?.status === 403) {
            setForbidden(true);
          } else {
            messageRef.current.error(apiErrorMessage(err, "Failed to load role permissions"));
          }
        }
      } finally {
        if (!cancelled) setMappingLoading(false);
      }
    }

    void loadMapping();
    return () => {
      cancelled = true;
    };
  }, [role, menus, menusLoading, loadRoleMapping]);

  const loading = menusLoading || (menus.length > 0 && mappingLoading);

  const treeNodes = useMemo(() => buildMenuTree(menus), [menus]);

  const applyRoleChange = useCallback(
    (nextRole: KnownRole) => {
      onRoleCommitted(nextRole);
    },
    [onRoleCommitted],
  );

  const handleRoleChange = useCallback(
    (nextRole: KnownRole) => {
      if (nextRole === role) return;

      if (!isDirty) {
        applyRoleChange(nextRole);
        return;
      }

      void confirm({
        title: "Discard unsaved changes?",
        content: "Role permission changes for the current role will be lost.",
        okText: "Discard",
        danger: true,
        onOk: () => applyRoleChange(nextRole),
      });
    },
    [role, isDirty, applyRoleChange, confirm],
  );

  const handleCheckedChange = (keys: string[]) => {
    let next = filterCheckedActionKeys(keys, menus);
    if (isPlatformAdminManageCheckboxDisabled(role, PROTECTED_MENU_KEY, wildcards)) {
      next = [...new Set([...next, PROTECTED_MENU_KEY])];
    }
    setCheckedExact(next);
  };

  const persistRolePermissions = useCallback(
    async (revokeSessions: boolean) => {
      setSaveDialogOpen(false);
      setSaving(true);
      try {
        const menu_keys = buildRoleSaveMenuKeys(role, checkedExact, []);
        const result = await authApi.upsertRolePermission(role, {
          menu_keys,
          revoke_sessions: revokeSessions,
        });
        if (result.revoked_users_count > 0) {
          message.success(`Revoked ${result.revoked_users_count} active session(s).`);
        } else {
          message.success("Role permissions saved. Users must refresh their session to see permission changes.");
        }
        try {
          await loadRoleMapping(role, menus);
        } catch {
          // Save succeeded; stale checkbox state is acceptable until manual refresh.
        }
      } catch (err) {
        message.error(apiErrorMessage(err, "Failed to save role permissions"));
      } finally {
        setSaving(false);
      }
    },
    [role, checkedExact, message, loadRoleMapping, menus],
  );

  const handleSave = useCallback(() => {
    setSaveDialogOpen(true);
  }, []);

  useEffect(() => {
    onSaveActionReady?.({
      save: handleSave,
      saving,
      disabled: loading || saving,
    });
    return () => onSaveActionReady?.(null);
  }, [onSaveActionReady, handleSave, saving, loading]);

  if (menusForbidden || forbidden) {
    return <AdminApiForbidden />;
  }

  return (
    <div data-testid="role-permissions-tab" className="flex flex-col gap-4 px-4">
      <InlineFilterSelect
        id="permission-role"
        prefix="Role:"
        value={role}
        options={ROLE_FILTER_OPTIONS}
        onChange={(value) => handleRoleChange(value as KnownRole)}
      />

      {loading && <Skeleton className="h-48 w-full" aria-busy="true" />}
      {!loading && menus.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderTree aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No menu nodes in registry</EmptyTitle>
            <EmptyDescription>Add menu nodes in the catalog tab first.</EmptyDescription>
          </EmptyHeader>
          {onGoToCatalog ? (
            <EmptyContent>
              <Button type="button" variant="outline" onClick={onGoToCatalog}>
                Open menu catalog
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      )}
      {!loading && menus.length > 0 && (
        <MenuTree
          nodes={treeNodes}
          defaultExpanded
          checkable
          checkedKeys={checkedExact}
          onCheckedChange={handleCheckedChange}
          isCheckboxDisabled={(key) => isPlatformAdminManageCheckboxDisabled(role, key, wildcards)}
          getCheckboxTooltip={(key) =>
            isPlatformAdminManageCheckboxDisabled(role, key, wildcards) ? MANAGE_LOCKOUT_TOOLTIP : undefined
          }
        />
      )}

      <AlertDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Save role permissions?</AlertDialogTitle>
            <AlertDialogDescription>
              Optionally revoke active sessions so users with this role pick up the new permissions immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            <AlertDialogAction
              disabled={saving}
              onClick={(e) => {
                e.preventDefault();
                void persistRolePermissions(false);
              }}
            >
              Save only
            </AlertDialogAction>
            <Button
              type="button"
              variant="destructive"
              disabled={saving}
              onClick={() => void persistRolePermissions(true)}
            >
              Save and revoke sessions
            </Button>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RolePermissionsTab;
