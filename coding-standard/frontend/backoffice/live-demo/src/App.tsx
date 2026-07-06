import React, { useState } from 'react';
import { ConfigProvider, Button, Space, Layout, Menu, Typography, Dropdown, Avatar, theme } from 'antd';
import type { MenuProps } from 'antd';
import {
  BulbOutlined,
  BulbFilled,
  DashboardOutlined,
  FileTextOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  DownOutlined,
  TeamOutlined,
  FundProjectionScreenOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { BrowserRouter } from 'react-router-dom';
import { designTokens, getAppTheme } from './themeConfig';
import LayoutDemo, { type DemoMode } from './templates/LayoutDemo';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface AppShellProps {
  themeMode: 'light' | 'dark';
  onToggleTheme: () => void;
}

const AppShell: React.FC<AppShellProps> = ({ themeMode, onToggleTheme }) => {
  const { token } = theme.useToken();
  const [collapsed, setCollapsed] = useState(false);
  const [demoMode, setDemoMode] = useState<DemoMode>('dashboard');
  const [subResultKey, setSubResultKey] = useState<string>('success');
  const [openKeys, setOpenKeys] = useState<string[]>(['result']);
  const [selectedInvoiceCode, setSelectedInvoiceCode] = useState<string>('IV-2026-003');
  const [detailReturnMode, setDetailReturnMode] = useState<DemoMode>('dashboard');

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key.startsWith('result-')) {
      setDemoMode('result');
      setSubResultKey(key.replace('result-', ''));
    } else {
      setDemoMode(key as DemoMode);
    }
  };

  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'profile') setDemoMode('profile');
  };

  const menuItems: MenuProps['items'] = [
    { key: 'dashboard', label: 'Dashboard', icon: <DashboardOutlined /> },
    { type: 'divider' },
    { key: 'invoices', label: 'Invoices Management', icon: <FileTextOutlined /> },
    { key: 'staff', label: 'Staff Management', icon: <UserOutlined /> },
    { key: 'agents', label: 'Agents List', icon: <TeamOutlined /> },
    { key: 'channel-performance', label: 'Channel Performance', icon: <LineChartOutlined /> },
    { key: 'smart-reports', label: 'Smart Reports', icon: <FundProjectionScreenOutlined /> },
    { key: 'profile', label: 'My Profile', icon: <UserOutlined /> },
    { type: 'divider' },
    {
      key: 'result',
      label: 'Result / Error',
      icon: <SafetyCertificateOutlined />,
      children: [
        { key: 'result-success', label: 'Payment Success' },
        { key: 'result-403', label: 'Forbidden (403)' },
        { key: 'result-404', label: 'Not Found (404)' },
        { key: 'result-500', label: 'Server Error (500)' },
      ],
    },
  ];

  const getSelectedMenuKey = () => {
    if (demoMode === 'result') return `result-${subResultKey}`;
    if (demoMode === 'staff-detail') return 'staff';
    if (demoMode === 'invoice-detail') return detailReturnMode === 'dashboard' ? 'dashboard' : 'invoices';
    if (demoMode === 'agent-detail') return 'agents';
    if (demoMode === 'campaign-detail') return 'channel-performance';
    if (demoMode === 'report-detail') return 'smart-reports';
    return demoMode;
  };

  const shellBorder = `1px solid ${token.colorBorderSecondary}`;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={250}
        theme={themeMode}
        trigger={null}
        style={{
          borderRight: shellBorder,
          position: 'fixed',
          height: '100vh',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          overflow: 'auto',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: shellBorder,
            overflow: 'hidden',
          }}
        >
          <Text
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 'bold',
              color: themeMode === 'dark' ? token.colorText : designTokens.colorPrimary,
              whiteSpace: 'nowrap',
            }}
          >
            {collapsed ? 'ZP' : 'Zero Platform'}
          </Text>
        </div>
        <Menu
          mode="inline"
          theme={themeMode}
          selectedKeys={[getSelectedMenuKey()]}
          openKeys={openKeys}
          onOpenChange={setOpenKeys}
          style={{ borderRight: 0, marginTop: 16 }}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 250, transition: 'all 0.2s' }}>
        <Header
          style={{
            height: 64,
            lineHeight: 'normal',
            background: token.colorBgContainer,
            paddingInline: 24,
            paddingBlock: 0,
            borderBottom: shellBorder,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 99,
            width: '100%',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16, width: 40, height: 40 }}
          />
          <Space size="large" align="center">
            <Button
              type="text"
              icon={themeMode === 'dark' ? <BulbFilled style={{ color: token.colorWarning }} /> : <BulbOutlined />}
              onClick={onToggleTheme}
            >
              {themeMode === 'dark' ? 'Light' : 'Dark'}
            </Button>
            <Dropdown
              menu={{
                onClick: handleUserMenuClick,
                items: [
                  { key: 'profile', icon: <UserOutlined />, label: 'My Profile' },
                  { key: 'logout', icon: <LogoutOutlined />, label: 'Logout' },
                ],
              }}
              trigger={['click']}
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: token.colorPrimary }} />
                <span style={{ color: token.colorText, fontWeight: 500 }}>Beer Admin</span>
                <DownOutlined style={{ fontSize: 10, color: token.colorTextSecondary }} />
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ padding: 24, minHeight: 'calc(100vh - 64px)' }}>
          <LayoutDemo
            demoMode={demoMode}
            setDemoMode={setDemoMode}
            subResultKey={subResultKey}
            selectedInvoiceCode={selectedInvoiceCode}
            setSelectedInvoiceCode={setSelectedInvoiceCode}
            detailReturnMode={detailReturnMode}
            setDetailReturnMode={setDetailReturnMode}
          />
        </Content>
      </Layout>
    </Layout>
  );
};

const App: React.FC = () => {
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

  return (
    <BrowserRouter>
      <ConfigProvider theme={getAppTheme(themeMode)}>
        <AppShell
          themeMode={themeMode}
          onToggleTheme={() => setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'))}
        />
      </ConfigProvider>
    </BrowserRouter>
  );
};

export default App;
