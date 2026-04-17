# authorization-gateway — document set

เอกสารในโฟลเดอร์นี้เป็นชุดอ้างอิงเดียวกันสำหรับ **services ใน repo เดียว** (`gateway-service`, `auth-service`, `internal-api`) — อ่าน **gateway-architecture.md** ก่อน แล้วค่อยตามด้วย SoT ตามบทบาท

Release notes ระดับ repo: [`CHANGELOG.md`](./CHANGELOG.md)

## วิธีอ่านชุดเอกสารนี้

| Step | Read | Outcome |
|------|------|---------|
| **1. ภาพรวมระบบ** | [gateway-architecture.md](./gateway-architecture.md) | architecture, trust boundary, system flow, diagrams |
| **2. Gateway SoT** | [gateway-design.md](./gateway-service/gateway-design.md) | contract, env, runtime, lifecycle, deployment ของ Gateway |
| **3. Login / Auth SoT** | [auth-login-design.md](./auth-service/auth-login-design.md) | login, refresh, JWT issuance, token storage, security |
| **4. Deploy / env คู่กัน** | [docs/deploy-jwt-env-checklist.md](./docs/deploy-jwt-env-checklist.md) | `JWT_JWKS_URL`, `JWT_ISSUER` / `JWT_AUDIENCE`, `JWT_KID`, claims, `GATEWAY_SECRET` |

**TL;DR:** Client ได้ JWT จาก **auth-service** แล้วเรียก **gateway-service** ด้วย Bearer token; `gateway-service` เป็นจุด verify JWT, inject headers, และ proxy ไปยัง internal services

| File | Role |
|------|------|
| [gateway-architecture.md](./gateway-architecture.md) | ADR, flow, trust boundary, diagrams |
| [gateway-design.md](./gateway-service/gateway-design.md) | `gateway-service` — production SoT |
| [auth-login-design.md](./auth-service/auth-login-design.md) | `auth-service` (Login / Auth) — JWT issuance |
| [docs/deploy-jwt-env-checklist.md](./docs/deploy-jwt-env-checklist.md) | Checklist ก่อน deploy: JWT + gateway + internal secret |
