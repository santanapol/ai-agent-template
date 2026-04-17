# Deploy checklist — JWT & gateway ↔ auth alignment

ใช้ก่อน deploy / หลังเปลี่ยน env ระหว่าง **auth-service**, **gateway-service**, และ **internal-api** (shared `GATEWAY_SECRET` กับ gateway เท่านั้น — ไม่เกี่ยว JWT claims)

## 1. JWKS URL (gateway ต้องชี้ auth)

| Check | auth-service | gateway-service |
|-------|----------------|-----------------|
| URL ลงท้าย `/.well-known/jwks.json` | `JWKS_PUBLIC_URL` ใน `.env` ต้องเป็น URL **ที่ client/gateway เรียกถึงได้** (public base + path) | `JWT_JWKS_URL` **ต้องตรงกับ endpoint จริง**ที่ให้ JWKS document เดียวกับที่ auth ประกาศ |
| ตัวอย่าง dev | `http://127.0.0.1:3001/.well-known/jwks.json` | `http://127.0.0.1:3001/.well-known/jwks.json` |

ถ้า `JWT_JWKS_URL` ผิดหรือ auth ดับ → gateway ได้ **401** บน route ที่มี JWT (verify ล้ม)

## 2. Key id (`kid`) — signing กับ JWKS

| Check | auth-service | gateway-service |
|-------|----------------|-----------------|
| kid บน access token | `JWT_KID` (default `default`) ต้องตรงกับ key ใน JWKS document | verify ผ่าน `jose` + remote JWKS — **kid ใน JWT header ต้องมีใน `keys[]`** |

เปลี่ยน key rotation: อัปเดต JWKS ให้มี kid ใหม่ก่อนออก token ด้วย kid นั้น

## 3. Issuer & audience (ถ้าตั้ง — ต้องคู่กัน)

| Variable | auth-service | gateway-service |
|----------|----------------|-----------------|
| Issuer | `JWT_ISSUER` — ถ้าว่าง จะไม่ใส่ claim `iss` ใน access token | `JWT_ISSUER` ถ้าว่าง = ไม่ verify issuer |
| Audience | `JWT_AUDIENCE` — ถ้าว่าง จะไม่ใส่ claim `aud` | `JWT_AUDIENCE` ถ้าว่าง = ไม่ verify audience |

**กฎ:** ถ้าฝั่ง auth ใส่ `iss` / `aud` แล้ว ฝั่ง gateway **ต้องตั้งค่าเดียวกัน** มิฉะนั้น verify ล้ม → **401** (ดู `LOG_LEVEL=debug` ที่ gateway สำหรับ `jwtVerifyFailedCode` จาก `jose` — **ไม่มี token ใน log**)

## 4. Claims → upstream headers

| Variable | auth-service | gateway-service |
|----------|----------------|-----------------|
| User id claim → `x-user-id` | `JWT_CLAIM_USER_ID` (default `sub`) — ค่าใน access payload | `JWT_CLAIM_USER_ID` **ต้องตรงกับชื่อ claim ที่ auth ใส่** (default `sub`) |
| Role claim → `x-user-role` | `JWT_CLAIM_ROLE` (default `role`) | `JWT_CLAIM_ROLE` **ต้องตรงกัน** |

## 5. `GATEWAY_SECRET` (gateway + internal-api เท่านั้น)

- ความยาวขั้นต่ำ **32 ตัวอักษร** (enforce ใน Joi ทั้งสอง service)
- ค่าเดียวกัน: `gateway-service` env `GATEWAY_SECRET` = `internal-api` env `GATEWAY_SECRET`
- ห้ามส่งจาก browser client — gateway inject เป็น `x-gateway-secret` ตอน proxy

## 6. OpenAPI / SoT

| เอกสาร | หน้าที่ |
|---------|---------|
| [auth-service/docs/openapi.yaml](../auth-service/docs/openapi.yaml) | Login / refresh / logout, issuance |
| [gateway-service/docs/openapi.yaml](../gateway-service/docs/openapi.yaml) | `GET /health`, SoT links |
| [internal-api/docs/openapi-via-gateway.yaml](../internal-api/docs/openapi-via-gateway.yaml) | Client → gateway (Bearer) |
| [gateway-design.md](../gateway-service/gateway-design.md) | Header contract, errors, routing |

## 7. Smoke หลัง deploy

1. `GET` auth JWKS → **200** + JSON `keys`
2. Login auth → ได้ access token
3. `GET` gateway proxied path พร้อม `Authorization: Bearer <access>` → **200** จาก upstream (เมื่อ upstream พร้อม)
4. internal-api **โดยตรง** พร้อม `x-gateway-secret` + injected headers → ตามสเปก upstream

สคริปต์ dev: `gateway-service` → `npm run try:proxy`
