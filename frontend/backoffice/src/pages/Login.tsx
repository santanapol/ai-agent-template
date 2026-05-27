import React, { useState } from 'react';
import { Form, Input, Button, Typography, Card, message, theme } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

function authErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const code = err.response?.data?.code as string | undefined;
    if (code === 'LOGIN_INVALID_CREDENTIALS') return 'Invalid username or password';
    if (code === 'LOGIN_ACCOUNT_LOCKED') return 'Account is locked due to too many failed attempts';
    if (code === 'AUTH_TOO_MANY_ATTEMPTS') return 'Too many attempts. Please try again later.';
    const detail = err.response?.data?.detail as string | undefined;
    if (detail) return detail;
  }
  return 'Login failed. Please try again.';
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const { login } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const onFinish = async (values: { username: string; password: string }) => {
    setSubmitting(true);
    try {
      await login(values.username, values.password);
      navigate('/');
    } catch (err) {
      message.error(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: token.colorBgLayout,
      }}
    >
      <Card style={{ width: 400, boxShadow: token.boxShadowSecondary, borderRadius: token.borderRadiusLG }}>
        <div style={{ textAlign: 'center', marginBottom: token.marginLG }}>
          <Title level={3} style={{ color: token.colorPrimary, margin: 0 }}>
            Zero Platform
          </Title>
          <Text type="secondary">Sign in to your account</Text>
        </div>

        <Form name="login" layout="vertical" onFinish={onFinish} autoComplete="off">
          <Form.Item
            label="Username"
            name="username"
            rules={[{ required: true, message: 'Please input your username!' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: token.colorTextQuaternary }} />}
              placeholder="Username"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: token.colorTextQuaternary }} />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>

          <Form.Item style={{ marginTop: token.marginLG }}>
            <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
              Sign In
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
