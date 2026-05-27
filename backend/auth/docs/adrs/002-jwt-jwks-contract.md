# ADR 002 — `auth`: JWT & JWKS Contract with Gateway

| Field                    | Value                                         |
| :----------------------- | :-------------------------------------------- |
| **Status**               | Accepted                                      |
| **Scope**                | `zero-platform/auth`                          |
| **Normative SoT**        | [`docs/architecture.md`](../architecture.md)  |
| **Architecture context** | [`ARCHITECTURE.md`](../../../ARCHITECTURE.md) |

## Context

เพื่อให้ `gateway` สามารถตรวจสอบความถูกต้องของ Access JWT ที่ออกโดย `auth` service ได้อย่างถูกต้องและปลอดภัย จำเป็นต้องมีการตกลงเรื่อง Claims, Algorithms และช่องทางการเผยแพร่กุญแจสาธารณะ (JWKS) ที่ชัดเจนและสอดคล้องกันทั้งสองฝั่ง

## Decision

1.  **JWT Claims:**
    - `sub`: ต้องเก็บ User ID (ASCII printable, ไม่เกิน 128 ตัวอักษร)
    - `role claim`: ต้องแมปกับ `x-user-role` ตามมาตรฐาน Gateway
    - `token_gen` (O-16): ต้องตรงกับ `access_token_gen` ในฐานข้อมูล เพื่อรองรับการทำ Immediate Revocation
2.  **Algorithm (O-08):** ต้องใช้โหมด **Asymmetric (RS256 หรือ ES256)** เท่านั้น ห้ามใช้ Shared Symmetric Secret (HS256) สำหรับ Access Token
3.  **JWKS Document (P2):** เผยแพร่กุญแจสาธารณะที่เส้นทาง **`GET /.well-known/jwks.json`** โดย URL เต็มต้องตรงกับ `JWT_JWKS_URL` บน Gateway
4.  **Key Rotation:** ต้องใส่ **`kid`** (Key ID) ใน JWT Header เสมอ เพื่อรองรับการมีหลายกุญแจพร้อมกันหรือการทำ Key Rotation

## Consequences

- การเปลี่ยนแปลงใด ๆ ในสัญญา JWT หรือเส้นทาง JWKS จะถือเป็น Breaking Change ที่ต้องทำ ADR และปรับปรุง Gateway ควบคู่กันเสมอ
- ช่วยให้การทำ Immediate Revocation (O-16) ทำงานได้อย่างสมบูรณ์ที่ Edge (Gateway)
- ลดความเสี่ยงจากการใช้ Shared Secret และเพิ่มความปลอดภัยด้วยมาตรฐาน JWKS
