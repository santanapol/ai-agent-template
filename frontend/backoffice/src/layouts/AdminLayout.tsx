import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Layout,
  Menu,
  Dropdown,
  Space,
  Tag,
  Typography,
  theme,
  Alert,
  Select,
  Grid,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  DashboardOutlined,
  LogoutOutlined,
  FileTextOutlined,
  ShopOutlined,
  CodeOutlined,
  DollarOutlined,
  FundOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import * as staffApi from '../lib/staffApiClient';
import * as invoicesApi from '../lib/invoicesApiClient';
import { apiErrorMessage } from '../lib/apiError';
import { useAppFeedback } from '../hooks/useAppFeedback';
import {
  canSwitchActiveBranch,
  findInvoiceAgentBranch,
  formatBranchDisplayLabel,
  formatBranchOptionLabel,
  getCachedInvoiceAgentBranches,
  mergePlatformBranches,
  setCachedInvoiceAgentBranches,
} from '../lib/branchOptions';
import { subscribeProfileRefresh } from '../lib/profileRefresh';
import type { InvoiceAgentBranch } from '../types/invoice';
import { UserAvatar } from '../components/UserAvatar';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const ROLE_LABELS: Record<string, string> = {
  platform_admin: 'Platform Admin',
  branch_admin: 'Branch Admin',
  support_admin: 'Support Admin',
  support: 'Support',
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
  route?: string;
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

/** Account routes — header user menu only, not sidebar navigation. */
const SIDEBAR_EXCLUDED_MENU_KEYS = new Set(['my_profile']);

const MENU_UI: Record<string, MenuItemUI> = {
  dashboard: { icon: <DashboardOutlined />, route: '/' },
  'dashboard:view': { icon: <DashboardOutlined />, route: '/' },
  staff: { icon: <TeamOutlined /> },
  'profiles:list': { icon: <TeamOutlined />, route: '/staff' },
  billing: { icon: <DollarOutlined /> },
  'agents:list': { icon: <ShopOutlined />, route: '/agents' },
  'invoices:list': { icon: <FileTextOutlined />, route: '/invoices' },
  reports: { icon: <CodeOutlined /> },
  'reports:smart': { icon: <CodeOutlined />, route: '/smart-reports' },
  'branch-report': { icon: <FundOutlined /> },
  'branch-report:marketing': { icon: <FundOutlined /> },
  'branch-report:marketing:channel-performance:read': {
    icon: <FundOutlined />,
    route: '/branch-report/marketing/channel-performance',
  },
  my_profile: { icon: <UserOutlined />, route: '/profile' },
  settings: { icon: <SettingOutlined /> },
  'permissions:manage': { icon: <SafetyCertificateOutlined />, route: '/permissions' },
};

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const isCompactHeader = !screens.md;
  const { user, logout, switchBranch, branchSwitching, menus, menuError } = useAuth();
  const { message } = useAppFeedback();
  const [collapsed, setCollapsed] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [headerProfile, setHeaderProfile] = useState<{
    firstname: string;
    lastname: string;
    username: string;
  } | null>(null);
  const [branches, setBranches] = useState<InvoiceAgentBranch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [optimisticBranchId, setOptimisticBranchId] = useState<string | null>(null);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);

  const showBranchSwitcher = canSwitchActiveBranch(user?.role);

  const homeBranchId = user?.home_branch_id ?? user?.branch_id;
  const activeBranchId = optimisticBranchId ?? user?.branch_id;
  const viewingOtherBranch =
    Boolean(user?.home_branch_id) && activeBranchId !== user?.home_branch_id;

  const handleBranchSwitch = useCallback(
    async (branchId: string) => {
      if (branchSwitching) return;
      if (branchId === activeBranchId) return;
      const target = findInvoiceAgentBranch(branches, branchId);
      const label = target ? formatBranchOptionLabel(target) : branchId;
      setOptimisticBranchId(branchId);
      try {
        await switchBranch(branchId);
        setOptimisticBranchId(null);
        message.success(`Switched to ${label}`);
      } catch (err: unknown) {
        setOptimisticBranchId(null);
        message.error(apiErrorMessage(err, 'Could not switch branch'));
      }
    },
    [switchBranch, message, branches, activeBranchId, branchSwitching],
  );

  useEffect(() => {
    return subscribeProfileRefresh(() => {
      setProfileRefreshKey((key) => key + 1);
    });
  }, []);

  useEffect(() => {
    if (!user?.sub) return;
    let cancelled = false;

    staffApi
      .getProfileByUserId(user.sub)
      .then(({ profile }) => {
        if (cancelled) return;
        const fullName = `${profile.firstname} ${profile.lastname}`.trim();
        setHeaderProfile({
          firstname: profile.firstname,
          lastname: profile.lastname,
          username: profile.user.username,
        });
        setDisplayName(fullName || profile.user.username);
      })
      .catch(() => {
        if (!cancelled) {
          setDisplayName(null);
          setHeaderProfile(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.sub, profileRefreshKey]);

  useEffect(() => {
    if (!user?.sub) return;
    let cancelled = false;

    const cached = getCachedInvoiceAgentBranches(user.ou_id);
    if (cached) {
      /* eslint-disable react-hooks/set-state-in-effect -- hydrate branch list from OU cache */
      setBranches(mergePlatformBranches(cached));
      setBranchesLoading(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    setBranchesLoading(true);
    invoicesApi
      .listInvoiceAgents()
      .then((res) => {
        if (cancelled) return;
        const sorted = mergePlatformBranches(res.data);
        if (user.ou_id) {
          setCachedInvoiceAgentBranches(user.ou_id, sorted);
        }
        setBranches(sorted);
      })
      .catch(() => {
        if (!cancelled) setBranches(mergePlatformBranches([]));
      })
      .finally(() => {
        if (!cancelled) setBranchesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.sub, user?.ou_id]);

  const branchDisplayLabel = formatBranchDisplayLabel(
    branches,
    user?.branch_id,
    branchesLoading,
  );

  const branchSelectOptions = useMemo(
    () =>
      branches.map((branch) => ({
        value: branch.branch_id,
        label: formatBranchOptionLabel(branch),
        disabled: branch.active === false,
      })),
    [branches],
  );

  const menuItems = useMemo(() => {
    const itemMap = new Map<string, { item: MenuItemType; parentKey: string | null }>();

    menus.forEach((node) => {
      if (SIDEBAR_EXCLUDED_MENU_KEYS.has(node.key)) return;
      const ui = MENU_UI[node.key];
      if (!ui) return;

      const item: MenuItemType = {
        key: ui.route || node.key,
        label: node.label,
        icon: ui.icon,
        sort_order: node.sort_order,
      };

      itemMap.set(node.key, { item, parentKey: node.parent_key });
    });

    const rootItems: MenuItemType[] = [];

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

  const branchSelectLoading =
    branchSwitching || (showBranchSwitcher && branchesLoading && branches.length === 0);

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
            lineHeight: 'normal',
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
            <div style={{ textAlign: 'right', lineHeight: 1.25, maxWidth: 340 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <Text strong style={{ fontSize: token.fontSize }}>
                  {displayName ?? user?.sub ?? '—'}
                </Text>
                {!isCompactHeader && (
                  <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                    {formatRoleLabel(user?.role)}
                  </Tag>
                )}
                {!showBranchSwitcher && (
                  <Tag icon={<ShopOutlined />} style={{ marginInlineEnd: 0 }}>
                    {branchDisplayLabel}
                  </Tag>
                )}
              </div>

              {showBranchSwitcher && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 6,
                    marginTop: 2,
                    flexWrap: 'nowrap',
                  }}
                >
                  <Text
                    type="secondary"
                    style={{ fontSize: token.fontSizeSM, whiteSpace: 'nowrap' }}
                  >
                    Branch
                  </Text>
                  <Select
                    size="small"
                    variant="borderless"
                    showSearch
                    optionFilterProp="label"
                    placement="bottomRight"
                    listHeight={320}
                    popupMatchSelectWidth={false}
                    style={{ width: 'auto', maxWidth: 220 }}
                    styles={{ popup: { root: { minWidth: 200 } } }}
                    aria-label="Select active branch"
                    placeholder="Select branch"
                    value={activeBranchId}
                    loading={branchSelectLoading}
                    allowClear={viewingOtherBranch}
                    options={branchSelectOptions}
                    notFoundContent={branchesLoading ? 'Loading branches...' : 'No branches found'}
                    onChange={(branchId) => {
                      if (!branchId || branchId === activeBranchId) return;
                      void handleBranchSwitch(branchId);
                    }}
                    onClear={() => {
                      if (homeBranchId) void handleBranchSwitch(homeBranchId);
                    }}
                  />
                </div>
              )}
            </div>
            <Dropdown menu={userMenu} placement="bottomRight">
              <UserAvatar
                size={40}
                firstname={headerProfile?.firstname}
                lastname={headerProfile?.lastname}
                displayName={displayName}
                username={headerProfile?.username}
                style={{ backgroundColor: token.colorPrimary, cursor: 'pointer' }}
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
          <Outlet key={user?.branch_id ?? 'guest'} />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
