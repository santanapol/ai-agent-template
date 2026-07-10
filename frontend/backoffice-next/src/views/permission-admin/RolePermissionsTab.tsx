import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import axios from "axios";
import { FolderTree } from "lucide-react";

import { LoadingButton } from "@/components/LoadingButton";
import { MenuTree } from "@/components/MenuTree";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppFeedback } from "@/hooks/useAppFeedback";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { apiErrorMessage } from "@/lib/apiError";
import * as authApi from "@/lib/authApiClient";
import type { AdminMenuNode, KnownRole } from "@/types/permissionAdmin";
import { KNOWN_ROLES, PROTECTED_MENU_KEY } from "@/types/permissionAdmin";

import AdminApiForbidden from "./AdminApiForbidden";
import {
  buildMenuTree,
  buildRoleSaveMenuKeys,
  expandRoleMappingToCheckedKeys,
  filterCheckedActionKeys,
  isPlatformAdminManageCheckboxDisabled,
  splitMappingKeys,
} from "./permissionAdminUtils";

const MANAGE_LOCKOUT_TOOLTIP = "Required for platform_admin unless permissions:* wildcard is already granted.";

const ROLE_LABELS: Record<KnownRole, string> = {
  platform_admin: "Platform Admin",
  branch_admin: "Branch Admin",
  support_admin: "Support Admin",
  support: "Support",
  staff: "Staff",
};

function sortedKeySignature(keys: string[]): string {
  return [...keys].sort().join("|");
}

interface RolePermissionsTabProps {
  menus: AdminMenuNode[];
  menusLoading: boolean;
  menusForbidden: boolean;
  onGoToCatalog?: () => void;
}

const RolePermissionsTab: React.FC<RolePermissionsTabProps> = ({
  menus,
  menusLoading,
  menusForbidden,
  onGoToCatalog,
}) => {
  const { message } = useAppFeedback();
  const messageRef = useRef(message);
  messageRef.current = message;
  const { confirm } = useConfirmDialog();
  const [role, setRole] = useState<KnownRole>("platform_admin");
  const [checkedExact, setCheckedExact] = useState<string[]>([]);
  const [baselineCheckedExact, setBaselineCheckedExact] = useState<string[]>([]);
  const [wildcards, setWildcards] = useState<string[]>([]);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [revokeSessions, setRevokeSessions] = useState(false);

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

  const applyRoleChange = (nextRole: KnownRole) => {
    setRevokeSessions(false);
    setRole(nextRole);
  };

  const handleRoleChange = (nextRole: KnownRole) => {
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
  };

  const handleCheckedChange = (keys: string[]) => {
    let next = filterCheckedActionKeys(keys, menus);
    if (isPlatformAdminManageCheckboxDisabled(role, PROTECTED_MENU_KEY, wildcards)) {
      next = [...new Set([...next, PROTECTED_MENU_KEY])];
    }
    setCheckedExact(next);
  };

  const handleSave = async () => {
    if (revokeSessions) {
      const confirmed = await confirm({
        title: "Revoke active sessions?",
        content: "Users with this role will be signed out immediately. Continue?",
        okText: "Save and revoke",
        danger: true,
      });
      if (!confirmed) return;
    }

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
      setRevokeSessions(false);
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
  };

  if (menusForbidden || forbidden) {
    return <AdminApiForbidden />;
  }

  return (
    <div data-testid="role-permissions-tab">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Field className="max-w-xs">
          <FieldLabel htmlFor="role-select">Role</FieldLabel>
          <Select value={role} onValueChange={(value) => handleRoleChange(value as KnownRole)}>
            <SelectTrigger id="role-select" className="w-full min-w-[200px]" aria-label="Role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {KNOWN_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <LoadingButton loading={saving} disabled={loading} onClick={() => void handleSave()}>
          Save
        </LoadingButton>
      </div>

      {wildcards.length > 0 ? (
        <Alert className="mb-4">
          <AlertTitle>Loaded mapping includes wildcards</AlertTitle>
          <AlertDescription>
            {wildcards.join(", ")} — shown as checked action keys below. Uncheck and save to remove.
          </AlertDescription>
        </Alert>
      ) : null}

      <label htmlFor="revoke-sessions" className="mb-4 flex items-center gap-2 text-sm">
        <Checkbox
          id="revoke-sessions"
          checked={revokeSessions}
          onCheckedChange={(value) => setRevokeSessions(value === true)}
        />
        Revoke active sessions for users with this role
      </label>

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
    </div>
  );
};

export default RolePermissionsTab;
