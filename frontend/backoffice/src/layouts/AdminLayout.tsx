import React, { useEffect, useState } from 'react';
import { Layout, Menu, Dropdown, Avatar, Space, Tag, Typography, theme } from 'antd';
import { UserOutlined, TeamOutlined, DashboardOutlined, LogoutOutlined, FileTextOutlined, ShopOutlined } from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import * as staffApi from '../lib/staffApiClient';
import * as invoicesApi from '../lib/invoicesApiClient';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const ROLE_LABELS: Record<string, string> = {
  platform_admin: 'Platform Admin',
  branch_admin: 'Branch Admin',
  staff: 'Staff',
};

function formatRoleLabel(role: string | undefined): string {
  if (!role) return '—';
  return (
    ROLE_LABELS[role] ??
    role
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
}

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string | null>(null);

  const isStaffAdmin =
    user?.role === 'platform_admin' || user?.role === 'branch_admin';

  // Resolve raw IDs from the JWT (`user.sub`, `user.branch_id`) into human-readable
  // names for the navbar — best-effort, falls back to the raw ID if lookups fail.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    staffApi
      .getProfileByUserId(user.sub)
      .then(({ profile }) => {
        if (cancelled) return;
        const fullName = `${profile.firstname} ${profile.lastname}`.trim();
        setDisplayName(fullName || profile.user.username);
      })
      .catch(() => {
        if (!cancelled) setDisplayName(null);
      });

    invoicesApi
      .listInvoiceAgents()
      .then((res) => {
        if (cancelled) return;
        const match = res.data.find((branch) => branch.branch_id === user.branch_id);
        setBranchName(match?.branch_name ?? null);
      })
      .catch(() => {
        if (!cancelled) setBranchName(null);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/agents', icon: <ShopOutlined />, label: 'Agent Fees' },
    { key: '/invoices', icon: <FileTextOutlined />, label: 'Invoices' },
    ...(isStaffAdmin
      ? [{ key: '/staff', icon: <TeamOutlined />, label: 'Staff Management' }]
      : []),
  ];

  const userMenu = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: 'My Profile',
        onClick: () => navigate('/profile'),
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Logout',
        onClick: async () => {
          await logout();
          navigate('/login');
        },
      },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        width={250}
        theme="light"
        style={{ borderRight: `1px solid ${token.colorBorderSecondary}` }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            overflow: 'hidden',
          }}
        >
          <Typography.Title
            level={4}
            style={{ margin: 0, color: token.colorPrimary, whiteSpace: 'nowrap' }}
          >
            {collapsed ? 'ZP' : 'Zero Platform'}
          </Typography.Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          style={{ borderRight: 0, marginTop: token.margin }}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            height: 64,
            lineHeight: '64px',
            background: token.colorBgContainer,
            paddingInline: token.paddingLG,
            paddingBlock: 0,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <Space size="middle" align="center">
            <div style={{ textAlign: 'right', lineHeight: 1.4 }}>
              <Text strong style={{ fontSize: token.fontSize }}>
                {displayName ?? user?.sub ?? '—'}
              </Text>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 2 }}>
                <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                  {formatRoleLabel(user?.role)}
                </Tag>
                <Tag icon={<ShopOutlined />} style={{ marginInlineEnd: 0 }}>
                  {branchName ?? user?.branch_id ?? '—'}
                </Tag>
              </div>
            </div>
            <Dropdown menu={userMenu} placement="bottomRight">
              <Avatar
                size={40}
                style={{ backgroundColor: token.colorPrimary, cursor: 'pointer' }}
                icon={<UserOutlined />}
              />
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ padding: token.paddingLG, background: token.colorBgLayout }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
