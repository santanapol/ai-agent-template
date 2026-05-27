import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Badge,
  Typography,
  Drawer,
  Form,
  Modal,
  message,
  Card,
  Flex,
  theme,
  Spin,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  InboxOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type {
  StaffProfile,
  ProfileStatus,
  CreateProfilePayload,
  PatchProfilePayload,
} from '../types/staff';
import * as staffApi from '../lib/staffApiClient';
import { useAuth } from '../contexts/AuthContext';
import {
  PASSWORD_MIN_LENGTH,
  confirmPasswordRule,
  optionalConfirmPasswordRule,
  optionalNewPasswordRules,
  passwordFieldRules,
} from '../lib/passwordPolicy';
import axios from 'axios';

const { Title, Text } = Typography;

function apiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const code = err.response?.data?.code as string | undefined;
    if (code === 'VERSION_CONFLICT') return 'Profile was modified by another session. Please refresh and try again.';
    if (code === 'STAFF_AUTH_REVOKE_PENDING') return 'Profile archived, but session revocation is still pending.';
    if (code === 'DUPLICATE') return 'A profile with this staff code or user already exists.';
    const msg = err.response?.data?.message as string | undefined;
    if (msg) return msg;
  }
  return fallback;
}

type DrawerFormValues = CreateProfilePayload &
  PatchProfilePayload & {
    password?: string;
    confirmPassword?: string;
    newPassword?: string;
    confirmNewPassword?: string;
  };

const StaffManagement: React.FC = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<StaffProfile[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'view'>('create');
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
    async (mode: 'create' | 'edit' | 'view', record?: StaffProfile) => {
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
    drawerMode === 'edit' &&
    editingUserId &&
    user?.sub &&
    editingUserId !== user.sub;

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
    const fieldNames =
      drawerMode === 'create'
        ? ['code', 'firstname', 'lastname', 'email', 'tel', 'password', 'confirmPassword']
        : ['firstname', 'lastname', 'email', 'tel'];
    const values = (await form.validateFields(fieldNames)) as DrawerFormValues;

    if (drawerMode === 'create') {
      try {
        await staffApi.createProfile({
          code: values.code!,
          firstname: values.firstname!,
          lastname: values.lastname!,
          email: values.email!,
          tel: values.tel!,
          password: values.password!,
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
      const payload: PatchProfilePayload = {
        firstname: values.firstname,
        lastname: values.lastname,
        email: values.email,
        tel: values.tel,
      };
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

  const columns = useMemo<ColumnsType<StaffProfile>>(
    () => [
      { title: 'Code', dataIndex: 'code', key: 'code' },
      {
        title: 'Name',
        key: 'name',
        render: (_, record) => (
          <Text strong>
            {record.firstname} {record.lastname}
          </Text>
        ),
      },
      {
        title: 'Username',
        key: 'username',
        render: (_, record) => <Text type="secondary">{record.user?.username ?? '—'}</Text>,
      },
      { title: 'Email', dataIndex: 'email', key: 'email' },
      { title: 'Tel', dataIndex: 'tel', key: 'tel' },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (status: StaffProfile['status']) => (
          <Badge
            status={status === 'active' ? 'success' : 'error'}
            text={
              <span
                style={{
                  textTransform: 'capitalize',
                  color: status === 'active' ? token.colorSuccess : token.colorError,
                }}
              >
                {status}
              </span>
            }
          />
        ),
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_, record) => (
          <Space>
            <Button
              type="text"
              icon={<EyeOutlined />}
              aria-label="View profile"
              onClick={() => handleOpenDrawer('view', record)}
            />
            <Button
              type="text"
              icon={<EditOutlined />}
              aria-label="Edit profile"
              onClick={() => handleOpenDrawer('edit', record)}
            />
            {record.status === 'active' ? (
              <Button
                type="text"
                danger
                icon={<InboxOutlined />}
                aria-label="Archive profile"
                onClick={() => handleArchive(record)}
              />
            ) : (
              <Button
                type="text"
                style={{ color: token.colorSuccess }}
                icon={<ReloadOutlined />}
                aria-label="Restore profile"
                onClick={() => handleRestore(record)}
              />
            )}
          </Space>
        ),
      },
    ],
    [handleOpenDrawer, handleArchive, handleRestore, token],
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

        <Table
          columns={columns}
          dataSource={profiles}
          rowKey="id"
          loading={tableLoading}
          pagination={{
            current: paginationConfig.current,
            pageSize: paginationConfig.pageSize,
            total: paginationConfig.total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
          }}
          onChange={handleTableChange}
        />
      </Card>

      <Drawer
        title={
          drawerMode === 'create'
            ? 'Create Staff Profile'
            : drawerMode === 'edit'
              ? 'Edit Staff Profile'
              : 'View Staff Profile'
        }
        width={500}
        onClose={handleCloseDrawer}
        open={isDrawerOpen}
        extra={
          <Space>
            <Button onClick={handleCloseDrawer}>Cancel</Button>
            {drawerMode !== 'view' && (
              <Button type="primary" onClick={handleSave}>
                {drawerMode === 'create' ? 'Create Profile' : 'Save Changes'}
              </Button>
            )}
            {drawerMode === 'view' && (
              <Button type="primary" onClick={() => handleOpenDrawer('edit', profiles.find((p) => p.id === editingId))}>
                Edit Profile
              </Button>
            )}
          </Space>
        }
      >
        <Spin spinning={drawerLoading}>
          <Form form={form} layout="vertical" disabled={drawerMode === 'view'}>
            <Form.Item
              label="Staff Code"
              name="code"
              rules={[{ required: true, message: 'Please enter staff code' }]}
            >
              <Input disabled={drawerMode !== 'create'} placeholder="e.g. EMP-001" maxLength={32} />
            </Form.Item>

            <Flex gap={token.margin}>
              <Form.Item
                label="First Name"
                name="firstname"
                rules={[{ required: true, message: 'Please enter first name' }]}
                style={{ flex: 1 }}
              >
                <Input maxLength={128} />
              </Form.Item>
              <Form.Item
                label="Last Name"
                name="lastname"
                rules={[{ required: true, message: 'Please enter last name' }]}
                style={{ flex: 1 }}
              >
                <Input maxLength={128} />
              </Form.Item>
            </Flex>

            <Form.Item
              label="Email"
              name="email"
              rules={[{ required: true, type: 'email', message: 'Please enter a valid email' }]}
            >
              <Input maxLength={254} />
            </Form.Item>

            <Form.Item
              label="Telephone"
              name="tel"
              rules={[{ required: true, message: 'Please enter telephone number' }]}
            >
              <Input placeholder="+66812345678" maxLength={16} />
            </Form.Item>

            {drawerMode === 'create' ? (
              <>
                <Divider plain>Login credentials</Divider>
                <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
                  Minimum {PASSWORD_MIN_LENGTH} characters. Username = Staff Code.
                </Typography.Paragraph>
                <Form.Item label="Password" name="password" rules={passwordFieldRules}>
                  <Input.Password autoComplete="new-password" />
                </Form.Item>
                <Form.Item
                  label="Confirm password"
                  name="confirmPassword"
                  dependencies={['password']}
                  rules={[
                    { required: true, message: 'Please confirm the password' },
                    confirmPasswordRule(() => form.getFieldValue('password') as string),
                  ]}
                >
                  <Input.Password autoComplete="new-password" />
                </Form.Item>
              </>
            ) : null}

            {showAdminResetPassword ? (
              <>
                <Divider plain>Reset password (admin)</Divider>
                <Form.Item label="New password" name="newPassword" rules={optionalNewPasswordRules}>
                  <Input.Password autoComplete="new-password" />
                </Form.Item>
                <Form.Item
                  label="Confirm password"
                  name="confirmNewPassword"
                  dependencies={['newPassword']}
                  rules={[optionalConfirmPasswordRule(() => form.getFieldValue('newPassword') as string)]}
                >
                  <Input.Password autoComplete="new-password" />
                </Form.Item>
                <Button loading={updatingPassword} onClick={() => void handleUpdatePassword()}>
                  Update password
                </Button>
              </>
            ) : null}
          </Form>
        </Spin>
      </Drawer>
    </div>
  );
};

export default StaffManagement;
