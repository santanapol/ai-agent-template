# Branch Report — Frontend Design

> UI design specs สำหรับรายงานแยกใน `branch-report` service  
> Stack: **React + Ant Design (antd)** · สอดคล้อง backoffice zero-platform

## Reports

| รายงาน | Design spec | Backend spec | สถานะ |
|---|---|---|---|
| Royalty 21 Times | [royalty-21-times-ui.md](./royalty-21-times-ui.md) | [../royalty-21-times.md](../royalty-21-times.md) | **design ready** |
| Channel Summary | — | [../channel-summary.md](../channel-summary.md) | รอ spec confirm |
| Trend 3 Months | — | [../trend-3-months.md](../trend-3-months.md) | รอ spec confirm |

## Shared conventions (ทุกรายงาน)

| หัวข้อ | กฎ |
|---|---|
| Branch | จาก navbar combobox เท่านั้น — **ไม่แสดง branch field ในหน้ารายงาน** |
| Auth | `Authorization: Bearer` — gateway inject `x-user-ou` / `x-user-branch` |
| Layout | ใช้ `AdminLayout` ที่มีอยู่ — page content เป็น Card + search + table |
| Empty state | ยังไม่ search → แสดงคำแนะนำ; search แล้วไม่มีข้อมูล → `Empty` |
| Export Excel | phase 2 — ไม่ใส่ปุ่ม Export รอบแรก |

## Ant Design components (standard set)

| ใช้กับ | Component | เหตุผล (จาก antd docs) |
|---|---|---|
| Page shell | `Card` | container สำหรับ filter + result |
| Search form | `Form` + `Form.Item` | validation, `onFinish` trigger search |
| Channel type | `Radio.Group` `optionType="button"` | 3 ตัวเลือก — antd แนะนำ Radio เมื่อ options < 5 |
| Affiliate link | `Select` `showSearch` `options` | รายการยาว — filter + virtual scroll |
| Actions | `Button` `type="primary"` / `htmlType="reset"` | Search / Clear |
| Result | `Table` | server pagination + wide columns |
| Loading | `Spin` via `Table.loading` | ไม่ block ทั้งหน้า |
| Title | `Typography.Title` level 4 | ชื่อรายงานใน Card |
| Layout spacing | `Flex` `gap="middle"` | จัดปุ่มและ filter แนวนอน |

Reference demos: Table [`ajax`](https://ant.design/components/table#table-demo-ajax) (server fetch), [`fixed-columns-header`](https://ant.design/components/table#table-demo-fixed-columns-header) (คอลัมน์เยอะ)
