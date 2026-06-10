import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Flex,
  Form,
  Input,
  Spin,
  Typography,
  theme,
} from 'antd';
import { KeyOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { PatchProfilePayload, StaffProfile } from '../types/staff';
import * as staffApi from '../lib/staffApiClient';
import * as authApi from '../lib/authApiClient';
import {
  PASSWORD_MIN_LENGTH,
  confirmPasswordRule,
  passwordFieldRules,
} from '../lib/passwordPolicy';
import { telephoneRules } from '../lib/telephone';
import axios from 'axios';
import { apiErrorMessage } from '../lib/apiError';
import { useAppFeedback } from '../hooks/useAppFeedback';
import { formatTelephoneToE164 } from '../lib/telephone';

const { Title, Text } = Typography;

const MyProfile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { message } = useAppFeedback();
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const currentEtag = useRef<string | null>(null);

  const userSub = user?.sub;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!userSub) {
        setLoadError('User session is missing.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);
      try {
        const { profile: data, etag } = await staffApi.getProfileByUserId(userSub);
        if (cancelled) return;
        setProfile(data);
        currentEtag.current = etag;
        form.setFieldsValue({
          code: data.code,
          firstname: data.firstname,
          lastname: data.lastname,
          email: data.email,
          tel: data.tel,
        });
      } catch (err) {
        if (cancelled) return;
        setProfile(null);
        const msg = apiErrorMessage(err, 'Failed to load your profile');
        setLoadError(msg);
        message.error(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [form, message, userSub, reloadKey]);

  const handleSave = async () => {
    if (!profile || !currentEtag.current) return;

    let values: Record<string, string>;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload: PatchProfilePayload = {
      firstname: values.firstname,
      lastname: values.lastname,
      email: values.email,
      tel: formatTelephoneToE164(values.tel),
    };

    setSaving(true);
    try {
      const { profile: updated, etag } = await staffApi.patchProfile(
        profile.id,
        payload,
        currentEtag.current,
      );
      setProfile(updated);
      currentEtag.current = etag;
      form.setFieldsValue({
        code: updated.code,
        firstname: updated.firstname,
        lastname: updated.lastname,
        email: updated.email,
        tel: updated.tel,
      });
      message.success('Profile updated');
    } catch (err) {
      message.error(apiErrorMessage(err, 'Failed to update profile'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    let values: Record<string, string>;
    try {
      values = await passwordForm.validateFields();
    } catch {
      return;
    }
    setChangingPassword(true);
    try {
      await authApi.changePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      });
      message.success('Password updated. Please sign in again.');
      passwordForm.resetFields();
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const code = err.response?.data?.code as string | undefined;
        if (code === 'LOGIN_INVALID_CREDENTIALS') {
          message.error('Current password is incorrect.');
          return;
        }
        if (code === 'AUTH_PASSWORD_UNCHANGED') {
          message.error('New password must differ from the current password.');
          return;
        }
        if (code === 'AUTH_PASSWORD_POLICY_VIOLATION') {
          message.error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
          return;
        }
      }
      message.error(apiErrorMessage(err, 'Failed to change password'));
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div>
      <Flex justify="space-between" align="flex-start" style={{ marginBottom: token.marginLG }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            My Profile
          </Title>
          <Text type="secondary">View and update your staff contact details. Staff code cannot be changed.</Text>
        </div>
        <Button onClick={() => setReloadKey((k) => k + 1)} disabled={loading}>
          Refresh
        </Button>
      </Flex>

      <Spin spinning={loading}>
        {loadError && !profile ? (
          <Card variant="borderless" style={{ borderRadius: token.borderRadius }}>
            <Text type="danger">{loadError}</Text>
          </Card>
        ) : profile ? (
          <Card variant="borderless" style={{ borderRadius: token.borderRadius, maxWidth: 720 }}>
            <Descriptions
              column={1}
              size="small"
              style={{ marginBottom: token.marginLG }}
              items={[
                { label: 'Login username', children: profile.user.username },
                { label: 'System role', children: profile.user.role },
                { label: 'Status', children: profile.status },
              ]}
            />

            <Form form={form} layout="vertical" onFinish={() => void handleSave()}>
              <Form.Item label="Staff Code" name="code">
                <Input disabled placeholder="e.g. EMP-001" maxLength={32} />
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
                rules={telephoneRules}
              >
                <Input placeholder="e.g. 0812345678 or +66812345678" maxLength={20} />
              </Form.Item>

              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                Save Changes
              </Button>
            </Form>
          </Card>
        ) : null}
      </Spin>

      {profile ? (
        <Card
          variant="borderless"
          title="Change password"
          style={{ borderRadius: token.borderRadius, maxWidth: 720, marginTop: token.marginLG }}
        >
          <Form form={passwordForm} layout="vertical" onFinish={() => void handleChangePassword()}>
            <Form.Item
              label="Current password"
              name="current_password"
              rules={[{ required: true, message: 'Please enter your current password' }]}
            >
              <Input.Password autoComplete="current-password" />
            </Form.Item>
            <Form.Item label="New password" name="new_password" rules={passwordFieldRules}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Form.Item
              label="Confirm new password"
              name="confirm_new_password"
              dependencies={['new_password']}
              rules={[
                { required: true, message: 'Please confirm your new password' },
                confirmPasswordRule(() => passwordForm.getFieldValue('new_password') as string),
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<KeyOutlined />}
              loading={changingPassword}
            >
              Change password
            </Button>
          </Form>
        </Card>
      ) : null}
    </div>
  );
};

export default MyProfile;
