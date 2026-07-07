# zero-platform — Backend

Monorepo สำหรับ API platform: **auth** (IdP), **gateway** (JWT edge), และ internal services ที่รับ traffic ผ่าน gateway เท่านั้น

> [!TIP]
> **TL;DR:** Client รับ JWT จาก **auth** → เรียก **gateway** ด้วย `Authorization: Bearer` → **gateway** verify JWT, inject trusted headers, proxy ไป **upstream** (เช่น `demo-service`)

## Monorepo layout

| Directory | Role | Stack | Default port |
| :--- | :--- | :--- | :---: |
| [`auth/`](./auth/) | Login, refresh, JWT/JWKS, session revoke (`token_gen`) | Fastify (ESM) | **3001** |
| [`gateway/`](./gateway/) | JWT verify, Redis `token_gen` gate, reverse proxy | Fastify (ESM) | **3000** |
| [`service/demo-service/`](./service/demo-service/) | ตัวอย่าง internal API — `/api/v1/me`, `/api/v1/items` | Fastify (ESM) | **3002** |
| [`service/staff/`](./service/staff/) | Staff API (**spec only** — docs scaffold) | — | **3101** (reserved) |

Infrastructure สำหรับ local dev: [`docker-compose.yml`](./docker-compose.yml) (MongoDB `27017`, Redis `6379`)

Frontend ที่ใช้ platform นี้อยู่ที่ [`../frontend/backoffice/`](../frontend/backoffice/)

## Request flow

```
Client ──Bearer JWT──► gateway ──x-gateway-secret + x-user-*──► Internal API
         ▲                    │
         └── login/refresh ───┘ auth (:3001)
```

รายละเอียด trust boundary, sequence diagrams, และกฎ security อยู่ใน [ARCHITECTURE.md](./ARCHITECTURE.md)

## Document map

| Document | เนื้อหา |
| :--- | :--- |
| [ENV.md](./ENV.md) | **ไฟล์ env** — `.env` / `.env.prod` / harness / ชื่อตัวแปรมาตรฐาน |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | ภาพรวมระบบ, trust zones, Mermaid diagrams (**อ่านก่อน**) |
| [RUNBOOK.md](./RUNBOOK.md) | Setup, Docker, smoke test, troubleshooting, deploy checklist |
| [CHANGELOG.md](../CHANGELOG.md) | Release notes ระดับ repository |
| [auth/docs/architecture.md](./auth/docs/architecture.md) | JWT issuance, JWKS, Redis revoke (auth SoT) |
| [gateway/docs/architecture.md](./gateway/docs/architecture.md) | Routing, env, errors (gateway SoT) |
| [service/demo-service/README.md](./service/demo-service/README.md) | Sample upstream + OpenAPI / Bruno |
| [service/staff/docs/](./service/staff/docs/) | Staff business + technical docs |

## Local ports

| Service / dependency | Port | Notes |
| :--- | :---: | :--- |
| **auth** | 3001 | JWKS: `http://127.0.0.1:3001/.well-known/jwks.json` |
| **gateway** | 3000 | Public entry สำหรับ client |
| **demo-service** | 3002 | Routed ใน [`gateway/routes.json`](./gateway/routes.json) |
| **items** | 3000 | ค่าเริ่มต้นจาก `items/.env.example` (`PORT`) |
| **MongoDB** | 27017 | `docker compose up -d` |
| **Redis** | 6379 | `token_gen` — auth + gateway ใช้ `REDIS_URL` ร่วมกัน |

Gateway routes (SoT: [`gateway/routes.json`](./gateway/routes.json)):

| Prefix | Upstream | Service |
| :--- | :--- | :--- |
| `/api/v1/items` | `:3002` | demo-service |
| `/api/v1/me` | `:3002` | demo-service |
| `/api/v1/staff` | `:3101` | staff (**spec only** — ยังไม่ bootstrap service) |
| `/auth` | `:3001` | auth (proxy ผ่าน gateway) |

## Quick start

1. **Dependencies**

   ```bash
   cd backend
   docker compose up -d
   ```

2. **auth** — สร้าง `.env` และ seed DB

   ```bash
   cd auth && npm ci && npm run create-env && npm run init:db
   npm run dev
   ```

3. **gateway**

   ```bash
   cd gateway && cp .env.example .env
   # ตั้ง JWT_JWKS_URL, GATEWAY_SECRET (≥32 chars), REDIS_URL=redis://127.0.0.1:6379/0
   npm ci && npm run dev
   ```

4. **demo-service** (optional)

   ```bash
   cd demo-service && cp .env.example .env
   npm ci && npm run dev
   ```

5. **Smoke test** — [RUNBOOK.md §4](./RUNBOOK.md#4--smoke-test)

## Prerequisites

- **Node.js** `>=24 <25` (auth, gateway, demo-service)
- **npm** ตาม `packageManager` ในแต่ละ service
- **Docker** สำหรับ MongoDB + Redis ใน local

## Quality gates

แต่ละ service มี `npm run ci` ของตัวเอง — รันจาก directory ของ service นั้น (`npm ci` ก่อนรัน test)

ติดตั้ง dependency ทุก service พร้อมกัน: `bash scripts/install-all-deps.sh`
