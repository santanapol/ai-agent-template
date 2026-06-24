import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Alert,
  Button,
  Checkbox,
  Empty,
  Flex,
  Select,
  Skeleton,
  Space,
  Tooltip,
  Tree,
  Typography,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import type { Key } from 'antd/es/table/interface';
import type { AdminMenuNode, KnownRole } from '../../types/permissionAdmin';
import { KNOWN_ROLES, PROTECTED_MENU_KEY } from '../../types/permissionAdmin';
import * as authApi from '../../lib/authApiClient';
import { apiErrorMessage } from '../../lib/apiError';
import { useAppFeedback } from '../../hooks/useAppFeedback';
import {
  buildMenuTree,
  buildRoleSaveMenuKeys,
  expandRoleMappingToCheckedKeys,
  filterCheckedActionKeys,
  isPlatformAdminManageCheckboxDisabled,
  splitMappingKeys,
  type MenuTreeNode,
} from './permissionAdminUtils';
import AdminApiForbidden from './AdminApiForbidden';

const { Text } = Typography;

const MANAGE_LOCKOUT_TOOLTIP =
  'Required for platform_admin unless permissions:* wildcard is already granted.';

const ROLE_LABELS: Record<KnownRole, string> = {
  platform_admin: 'Platform Admin',
  branch_admin: 'Branch Admin',
  support_admin: 'Support Admin',
  support: 'Support',
  staff: 'Staff',
};

function sortedKeySignature(keys: string[]): string {
  // '|' cannot appear in registry keys; safe delimiter for dirty-state comparison.
  return [...keys].sort().join('|');
}

function mapRoleCheckTree(
  nodes: MenuTreeNode[],
  role: string,
  wildcards: string[],
): DataNode[] {
  return nodes.map((node) => {
    const checkboxLocked = isPlatformAdminManageCheckboxDisabled(role, node.key, wildcards);
    const label = (
      <Space size={4}>
        <Text>{node.label}</Text>
        <Text type="secondary">({node.key})</Text>
      </Space>
    );

    return {
      key: node.key,
      title: checkboxLocked ? <Tooltip title={MANAGE_LOCKOUT_TOOLTIP}>{label}</Tooltip> : label,
      disableCheckbox: checkboxLocked,
      children: node.children?.length
        ? mapRoleCheckTree(node.children, role, wildcards)
        : undefined,
    };
  });
}

const RolePermissionsTab: React.FC = () => {
  const { message, modal } = useAppFeedback();
  const [menus, setMenus] = useState<AdminMenuNode[]>([]);
  const [role, setRole] = useState<KnownRole>('platform_admin');
  const [checkedExact, setCheckedExact] = useState<string[]>([]);
  const [baselineCheckedExact, setBaselineCheckedExact] = useState<string[]>([]);
  const [wildcards, setWildcards] = useState<string[]>([]);
  const [menusLoading, setMenusLoading] = useState(true);
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
    let cancelled = false;
    async function loadMenus() {
      setMenusLoading(true);
      setForbidden(false);
      try {
        const registry = await authApi.listAdminMenus();
        if (!cancelled) {
          setMenus(registry);
          if (registry.length === 0) {
            setCheckedExact([]);
            setBaselineCheckedExact([]);
            setWildcards([]);
          }
        }
      } catch (err) {
        if (!cancelled) {
          if (axios.isAxiosError(err) && err.response?.status === 403) {
            setForbidden(true);
          } else {
            message.error(apiErrorMessage(err, 'Failed to load menu registry'));
          }
        }
      } finally {
        if (!cancelled) setMenusLoading(false);
      }
    }
    void loadMenus();
    return () => {
      cancelled = true;
    };
  }, [message]);

  useEffect(() => {
    if (menusLoading || menus.length === 0) return;

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
            message.error(apiErrorMessage(err, 'Failed to load role permissions'));
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
  }, [role, menus, menusLoading, loadRoleMapping, message]);

  // Skip mapping spinner when registry is empty (no mapping fetch runs).
  const loading = menusLoading || (menus.length > 0 && mappingLoading);

  const treeData = useMemo(() => {
    return mapRoleCheckTree(buildMenuTree(menus), role, wildcards);
  }, [menus, role, wildcards]);

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

    modal.confirm({
      title: 'Discard unsaved changes?',
      content: 'Role permission changes for the current role will be lost.',
      okText: 'Discard',
      onOk: () => applyRoleChange(nextRole),
    });
  };

  const handleCheck = (checked: Key[] | { checked: Key[]; halfChecked: Key[] }) => {
    const keys = Array.isArray(checked) ? checked : checked.checked;
    let next = filterCheckedActionKeys(keys.map(String), menus);
    if (isPlatformAdminManageCheckboxDisabled(role, PROTECTED_MENU_KEY, wildcards)) {
      next = [...new Set([...next, PROTECTED_MENU_KEY])];
    }
    setCheckedExact(next);
  };

  const handleSave = async () => {
    if (revokeSessions) {
      const confirmed = await new Promise<boolean>((resolve) => {
        modal.confirm({
          title: 'Revoke active sessions?',
          content: 'Users with this role will be signed out immediately. Continue?',
          okText: 'Save and revoke',
          okButtonProps: { danger: true },
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
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
        message.success(
          'Role permissions saved. Users must refresh their session to see permission changes.',
        );
      }
      setRevokeSessions(false);
      try {
        await loadRoleMapping(role, menus);
      } catch {
        // Save succeeded; stale checkbox state is acceptable until manual refresh.
      }
    } catch (err) {
      message.error(apiErrorMessage(err, 'Failed to save role permissions'));
    } finally {
      setSaving(false);
    }
  };

  if (forbidden) {
    return <AdminApiForbidden />;
  }

  return (
    <div data-testid="role-permissions-tab">
      <Flex align="center" justify="space-between" wrap="wrap" gap={12} style={{ marginBottom: 16 }}>
        <Space>
          <Text>Role</Text>
          <Select
            aria-label="Role"
            value={role}
            style={{ minWidth: 200 }}
            options={KNOWN_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
            onChange={(value) => handleRoleChange(value as KnownRole)}
          />
        </Space>
        <Button type="primary" loading={saving} disabled={loading} onClick={handleSave}>
          Save
        </Button>
      </Flex>

      {wildcards.length > 0 && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title="Loaded mapping includes wildcards"
          description={`${wildcards.join(', ')} — shown as checked action keys below. Uncheck and save to remove.`}
        />
      )}

      <Checkbox
        checked={revokeSessions}
        onChange={(e) => setRevokeSessions(e.target.checked)}
        style={{ marginBottom: 16 }}
      >
        Revoke active sessions for users with this role
      </Checkbox>

      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : menus.length === 0 ? (
        <Empty description="No menu nodes in registry" />
      ) : (
        <Tree
          checkable
          defaultExpandAll
          selectable={false}
          treeData={treeData}
          checkedKeys={checkedExact}
          onCheck={handleCheck}
        />
      )}
    </div>
  );
};

export default RolePermissionsTab;
