/**
 * Source of truth ของผังเมนูกลาง + role mappings (Global Default — ou_id: null)
 * แก้ไขสิทธิ์ที่ไฟล์นี้แล้วรัน `node --env-file=.env scripts/seed-permissions.js`
 * (เพิ่ม `--prune` เมื่อต้องการลบรายการที่ถูกถอดออกจากไฟล์นี้)
 *
 * กฎ: ห้าม rename key (ฝังใน JWT/โค้ด service) — ย้ายตำแหน่งเมนูผ่าน parent_key เท่านั้น
 */

export const seedMenus = [
  {
    key: 'staff',
    label: 'จัดการพนักงาน',
    type: 'menu',
    parent_key: null,
    sort_order: 10,
    ou_id: null
  },
  {
    key: 'staff:profiles',
    label: 'โปรไฟล์พนักงาน',
    type: 'menu',
    parent_key: 'staff',
    sort_order: 10,
    ou_id: null
  },
  {
    key: 'profiles:list',
    label: 'รายชื่อพนักงาน',
    type: 'action',
    parent_key: 'staff:profiles',
    sort_order: 10,
    ou_id: null
  },
  {
    key: 'profiles:lookup',
    label: 'ค้นหาพนักงาน',
    type: 'action',
    parent_key: 'staff:profiles',
    sort_order: 20,
    ou_id: null
  },
  {
    key: 'profiles:read',
    label: 'ดูข้อมูลพนักงาน',
    type: 'action',
    parent_key: 'staff:profiles',
    sort_order: 30,
    ou_id: null
  },
  {
    key: 'profiles:create',
    label: 'สร้างโปรไฟล์พนักงาน',
    type: 'action',
    parent_key: 'staff:profiles',
    sort_order: 40,
    ou_id: null
  },
  {
    key: 'profiles:edit',
    label: 'แก้ไขโปรไฟล์พนักงาน',
    type: 'action',
    parent_key: 'staff:profiles',
    sort_order: 50,
    ou_id: null
  }
]

/** สิทธิ์ตั้งต้นอิงพฤติกรรม static เดิมใน staff service (isAdminRole + self lookup) */
export const seedRolePermissions = [
  { ou_id: null, role: 'platform_admin', menu_keys: ['profiles:*'] },
  { ou_id: null, role: 'branch_admin', menu_keys: ['profiles:*'] },
  {
    ou_id: null,
    role: 'support',
    menu_keys: ['profiles:list', 'profiles:lookup', 'profiles:read']
  },
  { ou_id: null, role: 'staff', menu_keys: ['profiles:lookup', 'profiles:read'] }
]
