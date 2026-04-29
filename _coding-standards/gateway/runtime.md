# Gateway runtime standard

Runtime + process + package conventions สำหรับ **API gateway**

> **Tag legend:** [`README.md` → Tag legend](./README.md#tag-legend)

Cross-ref: ค่า default ที่ไม่ได้ระบุในไฟล์นี้ให้ถือว่า **สอดคล้อง** [`../backend/runtime.md`](../backend/runtime.md)

## 1. Node.js และ module system

| Item | Rule |
| :--- | :--- |
| **Node version** | **`>=24 <25`** ใน `engines.node` (สอดคล้อง backend) |
| **Module system** | **[Required] ใช้ ESM** — `"type": "module"`; **ข้อยกเว้น**จาก default CommonJS ของ [`../backend/runtime.md`](../backend/runtime.md#11-nodejs) สำหรับ **บริการ gateway ตามโฟลเดอร์ `gateway/`**; ต้องมี **ADR** ใน repo บริการ gateway |
| **Source maps** | **[Recommended]** `--enable-source-maps` ใน production |

## 2. Package manager

| Item | Rule |
| :--- | :--- |
| **npm** | **[Required]** เท่านั้น — [`../backend/supply-chain.md`](../backend/supply-chain.md) |
| **`packageManager` / `engine-strict`** | **[Required]** เหมือน [`../auth/runtime.md`](../auth/runtime.md#2-package-manager-และ-lockfile) |

## 3. Environment และ shutdown

| Item | Rule |
| :--- | :--- |
| **`TZ` / `NODE_ENV` / secrets** | สอดคล้อง [`../backend/runtime.md`](../backend/runtime.md#13-environment-variables) |
| **Graceful shutdown** | `SIGINT` / `SIGTERM`; หยุดรับ connection; รอ in-flight; ปิด upstream client; timeout ตาม [`../backend/runtime.md` → Graceful shutdown](../backend/runtime.md#22-graceful-shutdown) |

## 4. Experimental flags

- ห้ามใช้ `--experimental-*` ใน **production entrypoint** โดยไม่มี ADR — สอดคล้อง backend
- การรัน test บน ESM + Jest อาจใช้ `NODE_OPTIONS=--experimental-vm-modules` ใน **dev/CI เท่านั้น** — ระบุใน ADR หรือ README บริการ
