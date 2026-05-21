# gateway — session revoke / `token_gen` (implemented)

เอกสารนี้สรุปงาน **D3** ที่ implement แล้ว: หลัง JWKS verify เปรียบเทียบ claim **`token_gen`** ใน access JWT กับค่าใน Redis **`user:{sub}:token_gen`** (สัญญาเดียวกับ auth D1)

ฝั่ง **auth** (O-16 + D1): [`../auth/docs/session-revoke-token-gen-changes.md`](../auth/docs/session-revoke-token-gen-changes.md) · SoT หลัก: [`architecture.md`](./architecture.md) §5 (`REDIS_URL`), §7, §9, §11.5

---

## 1. พฤติกรรม (runtime)

| ลำดับ | งาน                                                                                |          สถานะ          |
| :---: | :--------------------------------------------------------------------------------- | :---------------------: |
|   1   | Verify: signature, `exp`, `iss`, `aud`, JWKS                                       |    ✅ `jwt-auth.js`     |
|   2   | อ่าน claim **`token_gen`** — ไม่มีหรือไม่ valid → **`401`** `GATEWAY_JWT_REJECTED` |           ✅            |
|   3   | เมื่อ **`REDIS_URL`** ตั้ง: `GET user:{sub}:token_gen` — key ไม่มี → **0**         | ✅ `redis-token-gen.js` |
|   4   | JWT `token_gen` **<** ค่าปัจจุบัน → **`401`** — ไม่ inject mesh headers            |           ✅            |
|   5   | Redis read error → **fail-closed** `GATEWAY_JWT_REJECTED`                          |           ✅            |
|   6   | `REDIS_URL` ว่าง → ข้ามขั้น Redis (backward compat dev/CI)                         |           ✅            |

---

## 2. ไฟล์หลัก

| ไฟล์                                      | บทบาท                                     |
| :---------------------------------------- | :---------------------------------------- |
| `src/lib/redis-token-gen.js`              | key helper, parse claim, read current gen |
| `src/plugins/jwt-auth.js`                 | post-verify gate                          |
| `src/app.js`                              | Redis client, `readyz` ping               |
| `src/config/env.js`                       | `REDIS_URL` optional                      |
| `test/lib/redis-token-gen.test.js`        | unit                                      |
| `test/plugins/jwt-auth-token-gen.test.js` | integration (mock Redis)                  |

---

## 3. Config

| Variable    | หมายเหตุ                                                             |
| :---------- | :------------------------------------------------------------------- |
| `REDIS_URL` | production **ควร** ตรงกับ auth; ว่าง = ไม่เช็ค `token_gen` กับ Redis |
| `readyz`    | เมื่อ Redis client เปิด → dependency `redis: ok`                     |

---

## Last updated

2026-05-15 — D3 implemented; อ้าง `architecture.md` v1.4.1
