import React from 'react';
import {
  Button,
  Divider,
  Drawer,
  Flex,
  Form,
  Input,
  Space,
  Spin,
  Typography,
  theme,
} from 'antd';
import type { FormInstance } from 'antd';
import type { CreateProfilePayload, PatchProfilePayload } from '../../types/staff';
import {
  PASSWORD_MIN_LENGTH,
  confirmPasswordRule,
  optionalConfirmPasswordRule,
  optionalNewPasswordRules,
  passwordFieldRules,
} from '../../lib/passwordPolicy';

export type DrawerMode = 'create' | 'edit' | 'view';

export type DrawerFormValues = CreateProfilePayload &
  PatchProfilePayload & {
    password?: string;
    confirmPassword?: string;
    newPassword?: string;
    confirmNewPassword?: string;
  };

interface StaffDrawerProps {
  open: boolean;
  mode: DrawerMode;
  loading: boolean;
  isSaving: boolean;
  updatingPassword: boolean;
  showAdminResetPassword: boolean;
  form: FormInstance;
  onClose: () => void;
  onSave: () => void;
  onSwitchToEdit: () => void;
  onUpdatePassword: () => void;
}

const StaffDrawer: React.FC<StaffDrawerProps> = ({
  open,
  mode,
  loading,
  isSaving,
  updatingPassword,
  showAdminResetPassword,
  form,
  onClose,
  onSave,
  onSwitchToEdit,
  onUpdatePassword,
}) => {
  const { token } = theme.useToken();

  const drawerTitle =
    mode === 'create'
      ? 'Create Staff Profile'
      : mode === 'edit'
        ? 'Edit Staff Profile'
        : 'View Staff Profile';

  return (
    <Drawer
      title={drawerTitle}
      size={500}
      onClose={onClose}
      open={open}
      destroyOnHidden
      extra={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          {mode !== 'view' && (
            <Button type="primary" onClick={onSave} loading={isSaving} disabled={isSaving}>
              {mode === 'create' ? 'Create Profile' : 'Save Changes'}
            </Button>
          )}
          {mode === 'view' && (
            <Button type="primary" onClick={onSwitchToEdit}>
              Edit Profile
            </Button>
          )}
        </Space>
      }
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" disabled={mode === 'view'}>
          <Form.Item
            label="Staff Code"
            name="code"
            rules={[{ required: true, message: 'Please enter staff code' }]}
          >
            <Input disabled={mode !== 'create'} placeholder="e.g. EMP-001" maxLength={32} />
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

          {mode === 'create' ? (
            <>
              <Divider plain>Login credentials</Divider>
              <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
                Minimum {PASSWORD_MIN_LENGTH} characters.
              </Typography.Paragraph>
              <Form.Item
                label="Username"
                name="username"
                rules={[
                  { required: true, message: 'Please enter username' },
                  { pattern: /^[a-zA-Z0-9_]+$/, message: 'Only English letters, numbers, and underscores allowed' }
                ]}
              >
                <Input maxLength={128} autoComplete="off" />
              </Form.Item>
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
                rules={[
                  optionalConfirmPasswordRule(
                    () => form.getFieldValue('newPassword') as string,
                  ),
                ]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>
              <Button loading={updatingPassword} onClick={onUpdatePassword}>
                Update password
              </Button>
            </>
          ) : null}
        </Form>
      </Spin>
    </Drawer>
  );
};

export default StaffDrawer;
