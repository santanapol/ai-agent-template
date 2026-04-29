# Backend MongoDB standard

Connection, pooling, transactions, health checks สำหรับ internal API

> **Tag legend:** [`README.md` → Tag legend](./README.md#tag-legend)

## Table of contents
1. **Architecture & Lifecycle** (Core rules, Layout, Multi-cluster)
2. **Client Configuration** (MongoClient options, Read preference)
3. **Queries & Operations** (Transactions, Indexes, E11000)
4. **Health & Observability** (Health checks, Logging)
5. **Forbidden Practices**

---

## 1. Architecture & Lifecycle

### 1.1 Core rules

| Item | Rule |
| :--- | :--- |
| **Driver** | **`mongodb` official เท่านั้น** (baseline `^7.1.1`); **ห้าม** Mongoose |
| **Config** | **`MONGODB_URI`** + **`DB_NAME`** จาก **ENV เท่านั้น**; ห้าม hardcode |
| **URI secret** | **ห้าม log `MONGODB_URI` เต็ม**; redact `user:pass@` portion ก่อน log error (ดู [Observability → Redaction](./observability.md#22-log-redaction-required)) |
| **Replica set** | URI ระบุ node ครบตาม infra (อย่าพึ่งโหนดเดียวเมื่อ replica / sharded) |
| **Collection naming** | **`snake_case_plural`** (เช่น `bank_accounts`) — ใช้กับ collection ใหม่; collection เก่า**ไม่ rename** |

### 1.2 Singleton layout (default: single cluster)

| Item | Rule |
| :--- | :--- |
| **Path** | **`src/config/database.js`**; ห้ามย้ายนอก tooling sync |
| **Exports** | **`connectDatabase()`**, **`getDatabase()`**, **`closeDatabase()`** |
| **Pool creation** | `connectDatabase()` สร้าง client ครั้งเดียวที่ bootstrap; repository ใช้ `getDatabase()` เท่านั้น |
| **Forbidden** | **ห้าม** `new MongoClient()` ใน `*.repository.js` หรือ นอก `src/config/database.js` |

> Multi-cluster setup ดู [1.4 Multi-cluster (advanced)](#14-multi-cluster-advanced-adr-gated) ด้านล่าง — std.min default = **single cluster** เพื่อ keep API เรียบ

### 1.3 Lifecycle

- **Bootstrap:** `server.js` เรียก `connectDatabase()` ก่อน `app.listen()`
- **Shutdown:** `closeDatabase()` ต้องปิด pool; call site ดู [Runtime → Graceful shutdown](./runtime.md#22-graceful-shutdown) (step 3)
- **TLS / Atlas:** ใช้ `mongodb+srv://` + พารามิเตอร์ TLS/CA ตาม Atlas/org; **ห้าม** commit credential

### 1.4 Multi-cluster (advanced) [ADR-gated]

ใช้เมื่อ service ต้องเชื่อม **2+ MongoDB cluster** (เช่น read-replica แยก region, archive cluster) — เปิดใช้ต้อง **ADR**

**Extended exports:**
```text
src/config/database.js
├── connectDatabase()                          // เปิด pool ทุก cluster ใน ENV
├── getDatabase(clusterKey?, dbName?)          // default = cluster หลัก + DB_NAME
└── closeDatabase()                            // ปิด pool ของทุก cluster
```

**ENV pattern:**
| Pattern | Example |
| :--- | :--- |
| Default cluster | `MONGODB_URI`, `DB_NAME` |
| Additional cluster | `MONGODB_URI__<CLUSTER_KEY>`, `DB_NAME__<CLUSTER_KEY>` |

```bash
MONGODB_URI=mongodb+srv://primary.example.com/...
DB_NAME=app_main
MONGODB_URI__ARCHIVE=mongodb+srv://archive.example.com/...
DB_NAME__ARCHIVE=app_archive
```

**Repository usage:**
```js
const archiveDb = getDatabase('archive');                  // archive cluster, default DB
const archiveOther = getDatabase('archive', 'other_db');   // override DB name
```

**Pool creation rule:**
- `connectDatabase()` สร้าง client **แยกต่อ cluster** ครั้งเดียว
- `closeDatabase()` ต้องปิด pool ของ**ทุก** cluster

---

## 2. Client Configuration

### 2.1 MongoClient options (defaults, tunable under load)

| Option | Value | Note |
| :--- | :--- | :--- |
| **`appName`** | **`<service-name>`** | required (Atlas monitoring แยกตาม service) |
| `maxPoolSize` | `10` | |
| `minPoolSize` | `2` | |
| `serverSelectionTimeoutMS` | `5000` | |
| `connectTimeoutMS` | `10000` | |
| `socketTimeoutMS` | `45000` | |
| **`timeoutMS`** | **`30000`** | operation-level timeout; override ต่อ operation เมื่อ aggregation ใหญ่ |
| `readPreference` | `primaryPreferred` | |
| `writeConcern` | `{ w: 'majority', j: true, wtimeoutMS: 5000 }` | |
| **`retryWrites`** | `true` | driver default; ประกาศเพื่อชัดเจน |
| **`retryReads`** | `true` | driver default; ประกาศเพื่อชัดเจน |
| **`compressors`** | `['zstd', 'snappy']` | ลด bandwidth (peer dep ดู [Supply chain → Optional peer](./supply-chain.md#11-production-dependencies)) |

### 2.2 Read preference

| Preference | Usage |
| :--- | :--- |
| **`primaryPreferred`** | default บริการทั่วไป |
| **`primary`** | ธุรกรรม / operation ที่ต้องอ่านจาก primary เท่านั้น |
| **`secondary` / `secondaryPreferred`** | read-heavy (report / export) — override ระดับ operation |

---

## 3. Queries & Operations

### 3.1 Transactions

- ใช้ **`client.startSession()`** + **`session.withTransaction(async () => {...})`** สำหรับ multi-document atomic
- Read preference ภายใน transaction = **`primary`** (driver บังคับ)
- ต้องการ **replica set / sharded cluster**; standalone ไม่รองรับ
- `retryWrites` / `retryReads` = `true` → transient error auto-retry ได้ (ไม่ต้องเขียน retry loop เอง)

### 3.2 Indexes

- **Authority:** **DBA** เป็นผู้สร้าง / แก้ / ลบ index ผ่าน **Atlas UI หรือ script แยก**; **ห้ามสร้างใน bootstrap code**
- **Audit trail (required):** ทุก change ต้อง commit เป็นไฟล์ **`docs/indexes/<collection>.md`** พร้อม index `name`, `keys`, `options`, `reason`, `date`, `PR`
- **Query discipline:** ทุก query ต้อง match index; ก่อน deploy query ใหม่ต้องรัน **`.explain('executionStats')`** → stage ต้องไม่เป็น `COLLSCAN` บน collection > threshold ที่ DBA กำหนด
- **Rollout procedure:** ดู [Ops → Index rollout](./ops.md#41-index-rollout-procedure-required)

### 3.3 Unique index violations (E11000)

**[Required]** — เมื่อ write ชน **unique index** (รวม **compound unique** เช่น `ou_id` + `branch_id` + `code`) MongoDB จะคืน **`MongoServerError`** จาก driver โดย **`code === 11000`** (duplicate key / `E11000`)

| Rule | Detail |
| :--- | :--- |
| **HTTP** | **409 Conflict** — **ห้าม** คืน **500** `INTERNAL_ERROR` สำหรับเคสนี้ |
| **Envelope `code`** | ใช้ **domain code** ที่ลงทะเบียนใน OpenAPI + [`codes.yaml`](./codes.yaml) (เช่น `DUPLICATE_*`, `*_ALREADY_EXISTS`) — อาจอิงแนว [`CONFLICT`](./codes.yaml) (**409**) เป็น generic baseline |
| **`data`** | อนุญาตใส่ **`keyPattern` / `keyValue`** หลัง normalize ค่า (เช่น `ObjectId` → hex string) เพื่อให้ client รู้ฟิลด์ที่ชน — **ห้าม** ใส่ stack, raw driver message ที่ leak infra, หรือ URI |
| **Where to map** | **Repository** หรือ **centralized error handler** ต้องแปลงก่อนถึง client — **ห้าม** ปล่อย `E11000` เป็น unhandled exception |

**หมายเหตุ:** error อื่นจาก MongoDB (เช่น **121** document validation) มี mapping แยก — ดู [`codes.yaml`](./codes.yaml) และ error handler ของ service

---

## 4. Health & Observability

### 4.1 Health check integration

- **Liveness (`GET /healthz`):** `status` / `timestamp` / `uptime` (process alive; ไม่ ping dep)
- **Readiness (`GET /readyz`):** ping MongoDB ด้วย **`client.db().admin().command({ ping: 1 })`** + timeout **`1000 ms`**
- Ping fail → คืน **`503 Service Unavailable`** พร้อม `code: "SERVICE_UNAVAILABLE"` และ envelope `data.dependencies[]` (ดู [API → Health and readiness endpoints](./api.md#health-and-readiness-endpoints))

### 4.2 Logging (pino)

- ใช้ **pino**; **ห้าม** `console.log` ในไฟล์ database config
- **monitorCommands:** เปิด `true` ใน production เพื่อ hook event ลง pino (ดู [Observability](./observability.md))

---

## 5. Forbidden Practices

- ใช้ **Mongoose** (เลือก official driver ตาม [Core rules](#11-core-rules))
- `new MongoClient()` นอก `src/config/database.js`
- hardcode `MONGODB_URI` หรือ `DB_NAME`
- log full `MONGODB_URI` (ต้อง redact `user:pass@`)
- สร้าง index ใน bootstrap code (DBA-managed; ดู [Indexes](#32-indexes))
- query โดยไม่ filter `ou_id` + `branch_id` (ดู [Tenant + audit](./tenant-audit.md))
- คืน **500** `INTERNAL_ERROR` เมื่อ write ชน unique index (**`E11000`**) — ต้อง map เป็น **409** + domain code (ดู [Unique index violations (E11000)](#33-unique-index-violations-e11000))
- ใช้ multi-cluster API (`getDatabase(clusterKey)`) โดยไม่มี ADR
