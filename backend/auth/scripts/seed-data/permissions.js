/**
 * Source of truth ของผังเมนูกลาง + role mappings (Global Default — ou_id: null)
 * แก้ไขสิทธิ์ที่ไฟล์นี้แล้วรัน `node --env-file=.env scripts/seed-permissions.js`
 * (เพิ่ม `--prune` เมื่อต้องการลบรายการที่ถูกถอดออกจากไฟล์นี้)
 *
 * กฎ: ห้าม rename key (ฝังใน JWT/โค้ด service) — ย้ายตำแหน่งเมนูผ่าน parent_key เท่านั้น
 */

export const seedMenus = [
  {
    key: 'dashboard:view',
    label: 'Dashboard',
    type: 'action',
    parent_key: null,
    sort_order: 0,
    ou_id: null
  },
  {
    key: 'billing',
    label: 'Billing',
    type: 'menu',
    parent_key: null,
    sort_order: 10,
    ou_id: null
  },
  {
    key: 'invoices:list',
    label: 'Invoices',
    type: 'action',
    parent_key: 'billing',
    sort_order: 10,
    ou_id: null
  },
  {
    key: 'invoices:read',
    label: 'View Invoice',
    type: 'action',
    parent_key: 'billing',
    sort_order: 15,
    ou_id: null
  },
  {
    key: 'invoices:write',
    label: 'Manage Invoices',
    type: 'action',
    parent_key: 'billing',
    sort_order: 16,
    ou_id: null
  },
  {
    key: 'agents:list',
    label: 'Agents',
    type: 'action',
    parent_key: 'billing',
    sort_order: 20,
    ou_id: null
  },
  {
    key: 'agents:fees',
    label: 'Agent Fees',
    type: 'action',
    parent_key: 'billing',
    sort_order: 25,
    ou_id: null
  },
  {
    key: 'agents:write',
    label: 'Manage Agents',
    type: 'action',
    parent_key: 'billing',
    sort_order: 26,
    ou_id: null
  },
  {
    key: 'staff',
    label: 'Staff',
    type: 'menu',
    parent_key: null,
    sort_order: 20,
    ou_id: null
  },
  {
    key: 'profiles:list',
    label: 'Staff Management',
    type: 'action',
    parent_key: 'staff',
    sort_order: 10,
    ou_id: null
  },
  {
    key: 'profiles:lookup',
    label: 'Lookup Staff',
    type: 'action',
    parent_key: 'staff',
    sort_order: 20,
    ou_id: null
  },
  {
    key: 'profiles:read',
    label: 'View Staff Profile',
    type: 'action',
    parent_key: 'staff',
    sort_order: 30,
    ou_id: null
  },
  {
    key: 'profiles:create',
    label: 'Create Staff Profile',
    type: 'action',
    parent_key: 'staff',
    sort_order: 40,
    ou_id: null
  },
  {
    key: 'profiles:edit',
    label: 'Edit Staff Profile',
    type: 'action',
    parent_key: 'staff',
    sort_order: 50,
    ou_id: null
  },
  {
    key: 'roles:assign',
    label: 'Assign Roles',
    type: 'action',
    parent_key: 'staff',
    sort_order: 60,
    ou_id: null
  },
  {
    key: 'reports',
    label: 'Reports',
    type: 'menu',
    parent_key: null,
    sort_order: 30,
    ou_id: null
  },
  {
    key: 'reports:smart',
    label: 'Smart Reports',
    type: 'action',
    parent_key: 'reports',
    sort_order: 10,
    ou_id: null
  },
  {
    key: 'my_profile',
    label: 'My Profile',
    type: 'action',
    parent_key: null,
    sort_order: 80,
    ou_id: null
  },
  {
    key: 'settings',
    label: 'Settings',
    type: 'menu',
    parent_key: null,
    sort_order: 90,
    ou_id: null
  },
  {
    key: 'permissions:manage',
    label: 'Permissions',
    type: 'action',
    parent_key: 'settings',
    sort_order: 10,
    ou_id: null
  }
]

/**
 * สิทธิ์ตั้งต้นอิงพฤติกรรม static เดิม:
 * - ทุก role ที่ login ได้ dashboard + my_profile
 * - admin roles ได้ billing + reports
 * - staff domain ตาม isAdminRole / support / self lookup เดิม
 */
export const seedRolePermissions = [
  {
    ou_id: null,
    role: 'platform_admin',
    menu_keys: [
      'dashboard:view',
      'my_profile',
      'invoices:*',
      'agents:*',
      'reports:*',
      'profiles:*',
      'roles:assign',
      'permissions:manage'
    ]
  },
  {
    ou_id: null,
    role: 'branch_admin',
    menu_keys: ['dashboard:view', 'my_profile', 'invoices:*', 'agents:*', 'profiles:*']
  },
  {
    ou_id: null,
    role: 'support_admin',
    menu_keys: ['dashboard:view', 'my_profile', 'profiles:*']
  },
  {
    ou_id: null,
    role: 'support',
    menu_keys: ['dashboard:view', 'my_profile', 'profiles:list', 'profiles:lookup', 'profiles:read']
  },
  {
    ou_id: null,
    role: 'staff',
    menu_keys: ['dashboard:view', 'my_profile', 'profiles:lookup', 'profiles:read']
  }
]
