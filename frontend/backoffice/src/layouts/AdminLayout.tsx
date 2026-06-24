import React, { useEffect, useState, useMemo } from 'react';
import { Layout, Menu, Dropdown, Avatar, Space, Tag, Typography, theme, Alert } from 'antd';
import type { MenuProps } from 'antd';
import { UserOutlined, TeamOutlined, DashboardOutlined, LogoutOutlined, FileTextOutlined, ShopOutlined, CodeOutlined, DollarOutlined, SettingOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
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

interface MenuItemUI {
  icon: React.ReactNode;
  route?: string;  // undefined = menu group (no route)
}

interface MenuItemType {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  children?: MenuItemType[];
  sort_order: number;
}

function toAntdMenuItems(items: MenuItemType[]): MenuProps['items'] {
  return items.map((item) => ({
    key: item.key,
    label: item.label,
    icon: item.icon,
    children: item.children?.length ? toAntdMenuItems(item.children) : undefined,
  }));
}

const MENU_UI: Record<string, MenuItemUI> = {
  'dashboard': { icon: <DashboardOutlined />, route: '/' },
  'dashboard:view': { icon: <DashboardOutlined />, route: '/' },
  'staff': { icon: <TeamOutlined /> },                 // โหนด menu = กลุ่ม ไม่มี route
  'profiles:list': { icon: <TeamOutlined />, route: '/staff' },
  'billing': { icon: <DollarOutlined /> },              // group
  'agents:list': { icon: <ShopOutlined />, route: '/agents' },
  'invoices:list': { icon: <FileTextOutlined />, route: '/invoices' },
  'reports': { icon: <CodeOutlined /> },               // group
  'reports:smart': { icon: <CodeOutlined />, route: '/smart-reports' },
  'my_profile': { icon: <UserOutlined />, route: '/profile' },
  'settings': { icon: <SettingOutlined /> },
  'permissions:manage': { icon: <SafetyCertificateOutlined />, route: '/permissions' },
};

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string | null>(null);


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

  const { menus, menuError } = useAuth();

  const menuItems = useMemo(() => {
    const itemMap = new Map<string, { item: MenuItemType; parentKey: string | null }>();

    // 1. Create all items and map them by their original node.key
    menus.forEach((node) => {
      const ui = MENU_UI[node.key];
      if (!ui) return; // Skip if not mapped in UI

      const item: MenuItemType = {
        key: ui.route || node.key,
        label: node.label,
        icon: ui.icon,
        sort_order: node.sort_order,
      };

      itemMap.set(node.key, { item, parentKey: node.parent_key });
    });

    const rootItems: MenuItemType[] = [];

    // 2. Link children to their parents
    itemMap.forEach((val) => {
      const { item, parentKey } = val;
      if (parentKey && itemMap.has(parentKey)) {
        const parentVal = itemMap.get(parentKey)!;
        if (!parentVal.item.children) {
          parentVal.item.children = [];
        }
        parentVal.item.children.push(item);
      } else {
        rootItems.push(item);
      }
    });

    // 3. Sort recursively with depth guard (max depth 5)
    const sortItems = (items: MenuItemType[], depth = 0) => {
      if (depth > 5) {
        console.warn('Menu structure exceeded maximum depth or contains a cycle');
        return;
      }
      items.sort((a, b) => a.sort_order - b.sort_order);
      items.forEach((item) => {
        if (item.children) {
          sortItems(item.children, depth + 1);
        }
      });
    };

    sortItems(rootItems);
    return toAntdMenuItems(rootItems);
  }, [menus]);

  const defaultOpenKeys = useMemo(() => {
    const keys: string[] = [];
    menus.forEach((node) => {
      const ui = MENU_UI[node.key];
      if (ui && ui.route === location.pathname && node.parent_key) {
        keys.push(node.parent_key);
      }
    });
    return keys;
  }, [menus, location.pathname]);

  const [openKeys, setOpenKeys] = useState<string[]>(defaultOpenKeys);

  // Sync openKeys when defaultOpenKeys changes (e.g., route change or menu reload).
  // Functional update (prev => ...) is safe: derives next state from prev only,
  // never reads component state directly, so it does not cause cascading renders.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setOpenKeys((prev) => [...new Set([...prev, ...defaultOpenKeys])]);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [defaultOpenKeys]);


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
          openKeys={openKeys}
          onOpenChange={setOpenKeys}
          style={{ borderRight: 0, marginTop: token.margin }}
          items={menuItems}
          onClick={({ key }) => {
            if (key.startsWith('/')) {
              navigate(key);
            }
          }}
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
          {menuError && (
            <Alert
              title="System warning"
              description="Some menu items are temporarily unavailable. Please try refreshing the page or logging in again."
              type="warning"
              showIcon
              closable
              style={{ marginBottom: token.marginLG, borderRadius: token.borderRadius }}
            />
          )}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
