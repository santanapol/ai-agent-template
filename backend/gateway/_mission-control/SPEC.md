# Spec: Forward `x-user-permissions` Header (Dynamic Permission — Phase G)

> 🗺️ ภาพรวมทุก phase: [ROADMAP](../../auth/_mission-control/ROADMAP.md)
>
> ต่อจาก [`backend/auth/_mission-control/SPEC.md`](../../auth/_mission-control/SPEC.md) (merge แล้ว) — phase นี้ทำให้ gateway ส่งต่อเคลม `permissions` ไปยัง upstream services
> ลำดับ rollout ของทั้งระบบ: **auth → gateway (phase นี้) → staff → frontend**

## Assumptions I'm Making

1. Auth service ออก Access JWT ที่มีเคลม `permissions` (อาเรย์ string — exact key หรือ wildcard `domain:*` แบบไม่ expand) แล้วทุก token ใหม่
2. ช่วง rollout จะมี token เก่า (อายุไม่เกิน `ACCESS_TOKEN_TTL_SECONDS` = 15 นาที) ที่**ไม่มี**เคลม `permissions` — gateway ต้องไม่ reject token เหล่านี้ (จะ break ผู้ใช้ที่ login ค้างอยู่)
3. รูปแบบ header เป็น **comma-separated** ค่าดิบตามเคลม เช่น `x-user-permissions: profiles:*,invoice:read` — ผู้บริโภคปลายทาง split ด้วย `,` แล้ว match ตาม Permission Matching Contract
4. Gateway **ไม่ match สิทธิ์เอง** — หน้าที่มีแค่ verify JWT, แกะเคลม, ส่งต่อ (ตาม Assumption 2 ของ auth SPEC)

---

## Objective

ให้ gateway แกะเคลม `permissions` จาก Access JWT แล้ว inject เป็น request header `x-user-permissions` ไปยัง upstream services พร้อมปิดช่องทาง spoofing จาก client เพื่อให้ phase ถัดไป (staff service) เช็คสิทธิ์ราย action จาก header นี้ได้

**User story:** เมื่อ staff service ได้รับ request ที่ผ่าน gateway มันต้องเชื่อ header `x-user-permissions` ได้ 100% — ค่าต้องมาจากเคลมใน JWT ที่ verify แล้วเท่านั้น ไม่มีทางมาจาก client โดยตรง

---

## Tech Stack

- **Runtime**: Node.js (>=24 <25), Fastify + `@fastify/http-proxy` (ตามที่ติดตั้งอยู่)
- ไม่เพิ่ม dependency ใหม่

## Commands

- **Dev**: `npm run dev` (จาก `backend/gateway`)
- **Test**: `npm test`
- **Lint**: `npm run lint`
- **CI รวม**: `npm run ci`
- **OpenAPI**: `npm run spec:lint && npm run spec:codes`

## Project Structure (จุดที่แตะ)

```
backend/gateway/
  src/
    app.js                      ← [MODIFY] เพิ่ม 'x-user-permissions' ใน TRUSTED_HEADER_KEYS (duplicate-header guard)
    lib/claims.js               ← [MODIFY] เพิ่ม normalizePermissionsClaim (อาเรย์ string → comma-separated)
    plugins/inject-context.js   ← [MODIFY] แกะเคลม permissions → gatewayUpstreamHeaders['x-user-permissions']
    proxy/register-proxies.js   ← [MODIFY] เพิ่มใน DANGEROUS_HEADERS (strip ขาเข้า) + trustedHeaders (inject ขาออก)
  openapi.yaml                  ← [MODIFY] เอกสาร header ที่ inject ไป upstream
  test/                         ← [NEW/MODIFY] tests ของ normalize + inject + strip
  docs/architecture.md          ← [MODIFY] เพิ่ม 'x-user-permissions' ใน Section 4 (Header Contract) + Bump doc version ใน Section 15
  CHANGELOG.md                  ← [MODIFY] บันทึกการเปลี่ยนแปลงและเลขเวอร์ชันเอกสาร
```

## Code Style

### Header contract

```
x-user-permissions: profiles:*,invoice:read
```

กติกาการแปลงเคลม → header (`normalizePermissionsClaim`):

- เคลมเป็นอาเรย์ของ string → join ด้วย `,` (ไม่มี space)
- เคลม**หายไป** (token เก่าช่วง rollout) หรือเป็นอาเรย์ว่าง → header เป็น **string ว่าง** `''` (ยัง inject เสมอ — ผู้บริโภคตีความเป็น "ไม่มีสิทธิ์" deny by default)
- เคลมรูปแบบผิด (ไม่ใช่อาเรย์, สมาชิกไม่ใช่ string, สมาชิกเป็น string ว่าง/มีแต่ช่องว่าง, สมาชิกมี `,` หรือ whitespace ในคำ) → **reject เป็น `GATEWAY_CLAIM_REJECTED`** (401 ตามแบบแผนเดิมของ `inject-context.js`) — claim ผิดรูปคือ token ที่ไม่น่าเชื่อถือ ไม่ใช่เคสว่าง

### จุด inject (pattern เดิมใน `inject-context.js`)

```javascript
request.gatewayUpstreamHeaders = {
  'x-gateway-secret': env.GATEWAY_SECRET,
  'x-user-ou': ouId,
  'x-user-branch': branchId,
  'x-user-id': userId,
  'x-user-role': role,
  'x-user-permissions': permissions, // ← เพิ่ม (comma-separated หรือ '')
  'x-request-id': requestId
}
```

### Anti-spoofing (สำคัญที่สุดของ phase นี้ — ครบ 3 จุดเสมอ)

1. `DANGEROUS_HEADERS` ใน `register-proxies.js` — strip `x-user-permissions` ที่ client ส่งเข้ามาก่อน proxy
2. `trustedHeaders` ใน `rewriteRequestHeaders` — ค่าที่ส่งไป upstream มาจาก `gatewayUpstreamHeaders` เท่านั้น
3. `TRUSTED_HEADER_KEYS` ใน `app.js` — reject request ที่ส่ง header นี้ซ้ำหลายตัว (duplicate-header guard)

## Testing Strategy

Node test runner (แบบแผนเดิมใน `test/`):

1. **Unit (`lib/claims`)**: normalize เคลมปกติ → comma-separated; เคลมหาย/ว่าง → `''`; เคลมผิดรูป (ไม่ใช่อาเรย์, สมาชิกมี `,`) → โยน error
2. **Integration (inject + proxy)**: mock upstream เช็คว่า header ที่มาถึงตรงเคลมใน JWT; client ส่ง `x-user-permissions` ปลอมเข้ามา → ถูก strip (upstream เห็นค่าจาก JWT ไม่ใช่ค่าปลอม); ส่ง header ซ้ำ → `GATEWAY_CLAIM_REJECTED`; token เก่าไม่มีเคลม → upstream ได้ header ว่าง ไม่ใช่ 401

## Boundaries

- **Always**:
  - inject `x-user-permissions` ทุก protected route เสมอ (แม้ค่าว่าง) — upstream แยกแยะ "ไม่มีสิทธิ์" ออกจาก "ไม่ได้ผ่าน gateway" ได้ด้วย `x-gateway-secret` อยู่แล้ว
  - strip header นี้จาก inbound request เสมอ (กฎ anti-spoofing 3 จุดต้องครบพร้อมกันใน PR เดียว)
  - ส่งต่อค่าดิบไม่ expand wildcard ตาม Permission Matching Contract ใน auth SPEC
- **Ask first**:
  - หากต้องการเปลี่ยนรูปแบบ header (เช่น JSON แทน comma-separated) — เป็นสัญญาข้าม service
  - หากพบ header รวมเกิน ~8KB ในทางปฏิบัติ (ควรแก้ฝั่งข้อมูลด้วย wildcard ไม่ใช่ขยาย limit)
- **Never**:
  - ห้าม gateway ตัดสินใจอนุญาต/ปฏิเสธจากเนื้อหา permissions (matching เป็นหน้าที่ upstream)
  - ห้าม reject token ที่แค่ไม่มีเคลม `permissions` (break rollout window)

## Success Criteria

1. Request ผ่าน protected route → upstream ได้ `x-user-permissions` ตรงกับเคลมใน JWT (ค่าดิบ, comma-separated)
2. Client ส่ง `x-user-permissions` ปลอม → upstream ได้ค่าจาก JWT เสมอ; ส่งซ้ำหลายตัว → 401 `GATEWAY_CLAIM_REJECTED`
3. Token ที่ไม่มีเคลม (ออกก่อน auth deploy) → ผ่านได้ปกติ, header เป็น string ว่าง
4. เคลมผิดรูป → 401 `GATEWAY_CLAIM_REJECTED`
5. `npm run ci` ผ่าน; `openapi.yaml` อัปเดต header ใหม่; อัปเดต `docs/architecture.md` (Section 4 + 15) และ bump document version พร้อมอัปเดต `CHANGELOG.md`

## Open Questions

- ไม่มี — รูปแบบ comma-separated และพฤติกรรมเคลมหาย→ว่าง ตัดสินใจไว้ในการรีวิว phase auth แล้ว (หากทีมอยากเปลี่ยนรูปแบบ header ให้เคาะก่อนเริ่ม phase staff เพราะเป็นสัญญาคู่กัน)
