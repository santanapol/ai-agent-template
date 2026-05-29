import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Button,
  Input,
  Select,
  Typography,
  Modal,
  message,
  Card,
  Flex,
  Form,
  theme,
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { TablePaginationConfig } from 'antd/es/table';
import type {
  StaffProfile,
  ProfileStatus,
  PatchProfilePayload,
} from '../types/staff';
import * as staffApi from '../lib/staffApiClient';
import { useAuth } from '../contexts/AuthContext';
import { apiErrorMessage } from '../lib/apiError';
import StaffTable from '../components/staff/StaffTable';
import StaffDrawer, { type DrawerMode, type DrawerFormValues } from '../components/staff/StaffDrawer';

const { Title } = Typography;

const StaffManagement: React.FC = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<StaffProfile[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [updatingPassword, setUpdatingPassword] = useState(false);
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
          status: statusFilter,
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
  }, [debouncedSearch, statusFilter, currentPage, pageSize, refreshToken]);

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

      if (record && mode !== 'create') {
        setEditingId(record.id);
        setEditingUserId(record.user_id);
        if (mode === 'view') {
          form.setFieldsValue({
            code: record.code,
            firstname: record.firstname,
            lastname: record.lastname,
            email: record.email,
            tel: record.tel,
          });
        } else {
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
            });
          } catch (err) {
            message.error(apiErrorMessage(err, 'Failed to load profile'));
            setIsDrawerOpen(false);
          } finally {
            setDrawerLoading(false);
          }
        }
      } else {
        setEditingId(null);
        setEditingUserId(null);
        form.resetFields();
      }
    },
    [form],
  );

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    form.resetFields();
    currentEtag.current = null;
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

    Modal.confirm({
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
  }, [editingId, form]);

  const handleSave = useCallback(async () => {
    const isCreate = drawerMode === 'create';
    const fieldNames = isCreate
        ? ['code', 'firstname', 'lastname', 'email', 'tel', 'username', 'password', 'confirmPassword']
        : ['firstname', 'lastname', 'email', 'tel'];
    const values = (await form.validateFields(fieldNames)) as DrawerFormValues;

    if (isCreate) {
      try {
        const { code, firstname, lastname, email, tel, username, password } = values as Required<DrawerFormValues>;
        await staffApi.createProfile({
          code,
          firstname,
          lastname,
          email,
          tel,
          username,
          password,
        });
        message.success('Profile created');
        setIsDrawerOpen(false);
        form.resetFields();
        setPaginationConfig((prev) => ({ ...prev, current: 1 }));
        refresh();
      } catch (err) {
        message.error(apiErrorMessage(err, 'Failed to create profile'));
      }
      return;
    }

    if (drawerMode === 'edit' && editingId && currentEtag.current) {
      const { firstname, lastname, email, tel } = values;
      const payload: PatchProfilePayload = { firstname, lastname, email, tel };
      try {
        await staffApi.patchProfile(editingId, payload, currentEtag.current);
        message.success('Profile updated');
        setIsDrawerOpen(false);
        refresh();
      } catch (err) {
        message.error(apiErrorMessage(err, 'Failed to update profile'));
      }
    }
  }, [form, drawerMode, editingId, refresh]);

  const handleArchive = useCallback(
    (record: StaffProfile) => {
      Modal.confirm({
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
    [refresh],
  );

  const handleRestore = useCallback(
    (record: StaffProfile) => {
      Modal.confirm({
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
    [refresh],
  );

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: token.marginLG }}>
        <Title level={2} style={{ margin: 0 }}>
          Staff Management
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenDrawer('create')}>
          Add New Staff
        </Button>
      </Flex>

      <Card styles={{ body: { padding: token.paddingLG } }}>
        <Flex gap={token.margin} style={{ marginBottom: token.marginLG }}>
          <Input
            placeholder="Search code, name..."
            prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
            style={{ width: 300 }}
            value={rawSearch}
            onChange={(e) => setRawSearch(e.target.value)}
            allowClear
          />
          <Select
            value={statusFilter}
            style={{ width: 150 }}
            onChange={(val: ProfileStatus) => {
              setStatusFilter(val);
              setPaginationConfig((prev) => ({ ...prev, current: 1 }));
            }}
          >
            <Select.Option value="all">All Status</Select.Option>
            <Select.Option value="active">Active</Select.Option>
            <Select.Option value="archived">Archived</Select.Option>
          </Select>
        </Flex>

        <StaffTable
          profiles={profiles}
          loading={tableLoading}
          pagination={paginationConfig}
          onView={(record) => handleOpenDrawer('view', record)}
          onEdit={(record) => handleOpenDrawer('edit', record)}
          onArchive={handleArchive}
          onRestore={handleRestore}
          onTableChange={handleTableChange}
        />
      </Card>

      <StaffDrawer
        open={isDrawerOpen}
        mode={drawerMode}
        loading={drawerLoading}
        updatingPassword={updatingPassword}
        showAdminResetPassword={!!showAdminResetPassword}
        form={form}
        onClose={handleCloseDrawer}
        onSave={() => void handleSave()}
        onSwitchToEdit={() => handleOpenDrawer('edit', profiles.find((p) => p.id === editingId))}
        onUpdatePassword={() => void handleUpdatePassword()}
      />
    </div>
  );
};

export default StaffManagement;
