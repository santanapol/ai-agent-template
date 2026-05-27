# 🏛️ zero-platform — Architecture ADR

> [!TIP]
> **TL;DR:** `auth` แจก JWT → Client ยิงหา `gateway` → `gateway` ตรวจ JWT (Stateless) + Inject Context Headers → Proxy หา Internal API → Internal API ตรวจ `x-gateway-secret` ก่อนทำงานเสมอ

## 1. System Flow & Trust Boundary

**Trust Boundary:** Internal API จะเชื่อถือ Request **ก็ต่อเมื่อ** มาจาก `gateway` (Private Network) และ `x-gateway-secret` ถูกต้องเท่านั้น ห้ามเชื่อ Client โดยตรง

1. **Client** ส่ง Request พร้อม `Bearer <JWT>`
2. **`gateway`**:
   - ตรวจ Signature ของ JWT
   - **(O-16):** ตรวจ `token_gen` กับ Redis ว่าไม่ถูก Revoke (ถ้าอยู่ในโหมด Production)
   - ลบ/เขียนทับ `x-user-*` headers เพื่อป้องกัน Client ปลอมแปลง
   - แนบ `x-gateway-secret` และ Proxy ไปยัง Internal API
3. **Internal API**:
   - ตรวจ `x-gateway-secret` ก่อนเริ่มทำงานเสมอ
   - ใช้ `x-user-*` (เช่น `x-user-id`, `x-user-role`) เป็น User Context ในการตรวจสอบสิทธิ์ต่อไป

## 2. Components Overview

### 🛡️ `gateway`

- **Stack:** Fastify (Exceptions: รองรับ Throughput สูง, ESM)
- **Rules:**
  - Verify JWT ผ่าน **JWKS** เท่านั้น
  - ห้าม Forward `Authorization` header ไปที่ Internal
  - ตั้งค่า Timeout ป้องกันการค้าง; ถ้าเชื่อมต่อไม่ได้ตอบ `502`/`504`; ถ้า Secret ผิดตอบ `403`

### ⚙️ Internal APIs (เช่น `service-demo`, `items`)

- **Rules:**
  - ห้าม Verify JWT ซ้ำ (ถือว่า Gateway ทำแล้ว)
  - ตรวจสอบ `x-gateway-secret` **ทุกครั้ง**
  - จัดการ Authorization (เช่น RBAC) จาก `x-user-role` เองตาม Business Logic

## 3. Diagrams

แผนภาพด้านล่าง render ได้ใน GitHub, GitLab, VS Code / Cursor (Markdown preview) และ tools ที่รองรับ [Mermaid](https://mermaid.js.org/)

### 3.1 Trust zones & components

```mermaid
flowchart LR
  subgraph publicPath["Public path"]
    C[("Client")]
  end

  subgraph gwEdge["gateway (Fastify)"]
    G["gateway: JWT verify, header inject, reverse proxy"]
  end

  subgraph privateNet["Private network"]
    I["Internal API: validate gateway secret, RBAC, business logic"]
  end

  C -->|"TLS · Authorization: Bearer JWT"| G
  G -->|"Allowlist gateway IP only · TLS · injected headers + gateway secret"| I
```

### 3.2 Request sequence

```mermaid
sequenceDiagram
  autonumber
  participant C as Client
  participant G as gateway
  participant R as Redis (token_gen)
  participant I as Internal API

  C->>+G: HTTPS + Bearer JWT
  G->>G: Verify JWT signature (stateless)
  G->>+R: GET user:{sub}:token_gen (if production)
  R-->>-G: current_gen
  G->>G: Compare JWT token_gen vs current_gen
  G->>G: Strip or override client x-user-* headers
  G->>G: Set x-user-id, x-user-role, x-gateway-secret
  G->>+I: Proxy over private path
  I->>I: Validate x-gateway-secret
  I->>I: Authorize from x-user-role
  I->>I: Execute business logic
  I-->>-G: Response
  G-->>-C: Response
```

### 3.3 Multiple internal services (routing)

เมื่อมีหลาย internal service `gateway` จะทำหน้าที่รวม **auth ไว้จุดเดียว** แล้ว **กระจายตาม route แบบ path-based (`prefix`)** — upstream ทุกตัว **ต้อง** ตรวจ `x-gateway-secret` และทำ authorization ตาม section 3 (Internal API) เหมือนกัน; ใน ADR นี้ **ใช้ secret ชุดเดียวกันทุก upstream** และหากจะเปลี่ยนเป็น secret คนละตัวต่อ service **ต้อง** ทำ decision แยก

```mermaid
flowchart TB
  C[("Client")]
  G["gateway: JWT verify, inject headers, route"]

  subgraph prv["Private network"]
    S1["Internal: example Orders"]
    S2["Internal: example Users"]
    S3["Internal: example Reports"]
  end

  C -->|"TLS + Bearer JWT"| G
  G -->|"e.g. path /api/orders"| S1
  G -->|"e.g. path /api/users"| S2
  G -->|"e.g. path /api/reports"| S3
```

ในทางปฏิบัติ ลูกศรทุกเส้นจาก `gateway` ไป internal จะแนบ **ชุด header เดียวกัน** (user context + gateway secret) ตามที่ `gateway` inject หลัง verify JWT แล้ว

### 3.4 Self-hosted IdP: `auth` + `gateway` (ภาพรวม)

```mermaid
sequenceDiagram
  autonumber
  participant C as Client
  participant L as auth
  participant R as Redis (token_gen)
  participant G as gateway
  participant I as Internal API

  C->>+L: Login (credential)
  L-->>-C: access JWT (token_gen=N) + refresh token

  Note over C,L: Refresh ทำที่ auth เท่านั้น
  C->>+L: Refresh request
  L-->>-C: New access JWT + rotated refresh token

  rect rgb(255, 235, 235)
    Note over L,R: Session Revoke (O-16)
    L->>L: Bump access_token_gen (N+1)
    L->>R: SET user:{sub}:token_gen = N+1
  end

  C->>+G: API request + Bearer JWT (token_gen=N)
  G->>+R: GET user:{sub}:token_gen
  R-->>-G: N+1
  G->>G: N < N+1 → Reject (401)
  G-->>C: 401 Unauthorized

  C->>+G: API request + New JWT (token_gen=N+1)
  G->>+R: GET user:{sub}:token_gen
  R-->>-G: N+1
  G->>G: N+1 == N+1 → OK
  G->>+I: Proxy
  I-->>-G: Response
  G-->>-C: Response
```

_(รายละเอียด IdP, การหมุน Token และ Revocation แบบเต็มอยู่ที่ [`auth` SoT](./auth/docs/architecture.md))_
