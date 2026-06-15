import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Button,
  Input,
  Select,
  Typography,
  Card,
  Flex,
  Form,
  theme,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { TablePaginationConfig } from 'antd/es/table';
import type {
  StaffProfile,
  ProfileStatus,
  PatchProfilePayload,
} from '../types/staff';
import * as staffApi from '../lib/staffApiClient';
import { useAuth } from '../contexts/AuthContext';
import { apiErrorMessage } from '../lib/apiError';
import { useAppFeedback } from '../hooks/useAppFeedback';
import StaffTable from '../components/staff/StaffTable';
import StaffDrawer, { type DrawerMode, type DrawerFormValues } from '../components/staff/StaffDrawer';
import { formatTelephoneToE164 } from '../lib/telephone';
import { usePermission } from '../hooks/usePermission';

const { Title } = Typography;
const { Search } = Input;

const STATUS_OPTIONS: { value: ProfileStatus; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

const StaffManagement: React.FC = () => {
  const { user } = useAuth();
  const { message, modal } = useAppFeedback();
  const [profiles, setProfiles] = useState<StaffProfile[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [paginationConfig, setPaginationConfig] = useState({ current: 1, pageSize: 20, total: 0 });
  const [rawSearch, setRawSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProfileStatus>('active');
  const [refreshToken, setRefreshToken] = useState(0);
  const [form] = Form.useForm();
  const { token } = theme.useToken();
  const currentEtag = useRef<string | null>(null);

  // Debounce search input — resets to page 1 on new query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(rawSearch);
      setPaginationConfig((prev) => ({ ...prev, current: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [rawSearch]);

  // Load profiles whenever filters, pagination, or refreshToken changes
  const { current: currentPage, pageSize } = paginationConfig;
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setTableLoading(true);
      try {
        const res = await staffApi.listProfiles({
          q: debouncedSearch || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          page: currentPage,
          limit: pageSize,
          sort: '-upd_date',
        });
        if (cancelled) return;
        setProfiles(res.data);
        setPaginationConfig((prev) => ({
          ...prev,
          total: res.pagination?.total ?? prev.total,
        }));
      } catch (err) {
        if (!cancelled) message.error(apiErrorMessage(err, 'Failed to load profiles'));
      } finally {
        if (!cancelled) setTableLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, message, statusFilter, currentPage, pageSize, refreshToken]);

  const refresh = useCallback(() => setRefreshToken((t) => t + 1), []);

  const handleTableChange = useCallback((cfg: TablePaginationConfig) => {
    setPaginationConfig((prev) => ({
      ...prev,
      current: cfg.current ?? prev.current,
      pageSize: cfg.pageSize ?? prev.pageSize,
    }));
  }, []);

  const handleOpenDrawer = useCallback(
    async (mode: DrawerMode, record?: StaffProfile) => {
      setDrawerMode(mode);
      setIsDrawerOpen(true);
      currentEtag.current = null;

      if (!record || mode === 'create') {
        setEditingId(null);
        setEditingUserId(null);
        form.resetFields();
        return;
      }

      setEditingId(record.id);
      setEditingUserId(record.user_id);

      if (mode === 'view') {
        form.setFieldsValue({
          code: record.code,
          firstname: record.firstname,
          lastname: record.lastname,
          email: record.email,
          tel: record.tel,
          role: record.user?.role,
        });
        return;
      }

      // edit: fetch fresh data + ETag for optimistic concurrency
      setDrawerLoading(true);
      try {
        const { profile, etag } = await staffApi.getProfileById(record.id);
        currentEtag.current = etag;
        form.setFieldsValue({
          code: profile.code,
          firstname: profile.firstname,
          lastname: profile.lastname,
          email: profile.email,
          tel: profile.tel,
          role: profile.user?.role,
        });
      } catch (err) {
        message.error(apiErrorMessage(err, 'Failed to load profile'));
        setIsDrawerOpen(false);
      } finally {
        setDrawerLoading(false);
      }
    },
    [form, message],
  );

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    form.resetFields();
    currentEtag.current = null;
    setEditingId(null);
    setEditingUserId(null);
  }, [form]);

  const showAdminResetPassword =
    drawerMode === 'edit' && editingUserId !== null && user?.sub !== undefined && editingUserId !== user.sub;

  const handleUpdatePassword = useCallback(async () => {
    if (!editingId) return;

    const newPassword = form.getFieldValue('newPassword') as string | undefined;
    if (!newPassword?.trim()) {
      message.warning('Enter a new password to update, or leave the fields empty.');
      return;
    }

    try {
      await form.validateFields(['newPassword', 'confirmNewPassword']);
    } catch {
      return;
    }

    modal.confirm({
      title: 'Reset password?',
      content: 'This will sign the user out of all devices.',
      okText: 'Update password',
      cancelText: 'Cancel',
      onOk: async () => {
        setUpdatingPassword(true);
        try {
          await staffApi.resetProfilePassword(editingId, {
            password: newPassword,
            revoke_sessions: true,
          });
          message.success('Password updated');
          form.setFieldsValue({ newPassword: undefined, confirmNewPassword: undefined });
        } catch (err) {
          message.error(apiErrorMessage(err, 'Failed to update password'));
        } finally {
          setUpdatingPassword(false);
        }
      },
    });
  }, [editingId, form, message, modal]);

  const handleSave = useCallback(async () => {
    const isPlatformAdmin = user?.role === 'platform_admin';
    const isCreate = drawerMode === 'create';
    const fieldNames = isCreate
        ? ['code', 'firstname', 'lastname', 'email', 'tel', 'username', 'password', 'confirmPassword', ...(isPlatformAdmin ? ['role'] : [])]
        : ['firstname', 'lastname', 'email', 'tel', ...(isPlatformAdmin ? ['role'] : [])];

    let values: DrawerFormValues;
    try {
      values = (await form.validateFields(fieldNames)) as DrawerFormValues;
    } catch {
      return;
    }

    setIsSaving(true);
    try {
      if (isCreate) {
        const { code, firstname, lastname, email, tel, username, password, role } = values as Required<DrawerFormValues>;
        await staffApi.createProfile({
          code,
          firstname,
          lastname,
          email,
          tel: formatTelephoneToE164(tel),
          username,
          password,
          role,
        });
        message.success('Profile created');
        setIsDrawerOpen(false);
        form.resetFields();
        setPaginationConfig((prev) => ({ ...prev, current: 1 }));
        refresh();
        return;
      }

      if (editingId && currentEtag.current) {
        const { firstname, lastname, email, tel, role } = values;
        const payload: PatchProfilePayload = { firstname, lastname, email, tel: formatTelephoneToE164(tel) };
        await staffApi.patchProfile(editingId, payload, currentEtag.current);

        const existingRecord = profiles.find((p) => p.id === editingId);
        if (isPlatformAdmin && role && role !== existingRecord?.user?.role) {
          await staffApi.changeProfileRole(editingId, role);
        }

        message.success('Profile updated');
        setIsDrawerOpen(false);
        refresh();
      } else if (!currentEtag.current) {
        message.error('Cannot save: version token missing. Please close and reopen the form.');
      }
    } catch (err) {
      message.error(apiErrorMessage(err, isCreate ? 'Failed to create profile' : 'Failed to update profile'));
    } finally {
      setIsSaving(false);
    }
  }, [form, drawerMode, editingId, message, refresh, user, profiles]);

  const handleArchive = useCallback(
    (record: StaffProfile) => {
      modal.confirm({
        title: 'Archive Staff Profile?',
        content:
          'Are you sure you want to archive this staff member? Their active session will be revoked immediately and they will need to log in again if restored.',
        okText: 'Archive',
        okType: 'danger',
        cancelText: 'Cancel',
        onOk: async () => {
          try {
            const { etag } = await staffApi.getProfileById(record.id);
            if (!etag) throw new Error('Could not determine current profile version');
            await staffApi.archiveProfile(record.id, etag);
            message.success('Profile archived');
            refresh();
          } catch (err) {
            message.error(apiErrorMessage(err, 'Failed to archive profile'));
          }
        },
      });
    },
    [message, modal, refresh],
  );

  const handleRestore = useCallback(
    (record: StaffProfile) => {
      modal.confirm({
        title: 'Restore Staff Profile?',
        content: 'This profile will become active again. The user must log in to create a new session.',
        okText: 'Restore',
        cancelText: 'Cancel',
        onOk: async () => {
          try {
            const { etag } = await staffApi.getProfileById(record.id);
            if (!etag) throw new Error('Could not determine current profile version');
            await staffApi.restoreProfile(record.id, etag);
            message.success('Profile restored');
            refresh();
          } catch (err) {
            message.error(apiErrorMessage(err, 'Failed to restore profile'));
          }
        },
      });
    },
    [message, modal, refresh],
  );

  const canCreate = usePermission('profiles:create');
  const canEdit = usePermission('profiles:edit');

  return (
    <div>
      <Flex justify="space-between" align="flex-start" style={{ marginBottom: token.marginLG }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Staff Management
          </Title>
          <Typography.Text type="secondary">
            Manage staff profiles, system roles, and authentication credentials.
          </Typography.Text>
        </div>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenDrawer('create')}>
            Add New Staff
          </Button>
        )}
      </Flex>

      <Card styles={{ body: { padding: token.paddingLG } }}>
        <Flex gap={token.margin} style={{ marginBottom: token.marginLG }}>
          <Search
            placeholder="Search code, name..."
            style={{ width: 300 }}
            value={rawSearch}
            onChange={(e) => setRawSearch(e.target.value)}
            allowClear
          />
          <Select
            value={statusFilter}
            options={STATUS_OPTIONS}
            style={{ width: 150 }}
            onChange={(val: ProfileStatus) => {
              setStatusFilter(val);
              setPaginationConfig((prev) => ({ ...prev, current: 1 }));
            }}
          />
        </Flex>

        <StaffTable
          profiles={profiles}
          loading={tableLoading}
          pagination={paginationConfig}
          onView={(record) => handleOpenDrawer('view', record)}
          onEdit={canEdit ? (record) => handleOpenDrawer('edit', record) : undefined}
          onArchive={handleArchive}
          onRestore={handleRestore}
          onTableChange={handleTableChange}
        />
      </Card>

      <StaffDrawer
        open={isDrawerOpen}
        mode={drawerMode}
        loading={drawerLoading}
        isSaving={isSaving}
        updatingPassword={updatingPassword}
        showAdminResetPassword={showAdminResetPassword}
        isPlatformAdmin={user?.role === 'platform_admin'}
        form={form}
        onClose={handleCloseDrawer}
        onSave={() => void handleSave()}
        onSwitchToEdit={() => {
          const record = profiles.find((p) => p.id === editingId);
          if (record) void handleOpenDrawer('edit', record);
          else message.error('Profile not found in current list. Please refresh.');
        }}
        onUpdatePassword={() => void handleUpdatePassword()}
      />
    </div>
  );
};

export default StaffManagement;
