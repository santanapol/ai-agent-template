import React, { useState } from 'react';
import { Layout, Menu, Dropdown, Avatar, Space, Typography, theme } from 'antd';
import { UserOutlined, TeamOutlined, DashboardOutlined, LogoutOutlined, FileTextOutlined, ShopOutlined } from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const isStaffAdmin =
    user?.role === 'platform_admin' || user?.role === 'branch_admin';

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/agents', icon: <ShopOutlined />, label: 'Agent Fees' },
    { key: '/invoices', icon: <FileTextOutlined />, label: 'Invoices' },
    { key: '/profile', icon: <UserOutlined />, label: 'My Profile' },
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
            padding: token.paddingLG,
            textAlign: 'center',
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
            background: token.colorBgContainer,
            paddingInline: token.paddingLG,
            paddingBlock: 0,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <Space size="large">
            <div style={{ textAlign: 'right', lineHeight: '1.2' }}>
              <Text strong>{user?.sub ?? '—'}</Text>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                Role: {user?.role ?? '—'} | Branch: {user?.branch_id ?? '—'}
              </Text>
            </div>
            <Dropdown menu={userMenu} placement="bottomRight">
              <Avatar style={{ backgroundColor: token.colorPrimary, cursor: 'pointer' }} icon={<UserOutlined />} />
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
