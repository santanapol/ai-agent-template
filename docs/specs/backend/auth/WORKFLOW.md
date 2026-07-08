# Auth Service — Spec-Driven Workflow

Entry point: [auth-spec.md](./auth-spec.md)

## Gated workflow

```
SPECIFY → PLAN → TASKS → IMPLEMENT
```

ห้ามข้ามไป IMPLEMENT จนกว่า spec ที่เกี่ยวข้องจะอัปเดตและ review แล้ว

## เมื่อไหร่ต้องแก้ spec ก่อน code

| การเปลี่ยนแปลง | แก้ไฟล์ |
|----------------|---------|
| Business rule, RBAC, lifecycle | `business-domain.md` (this folder) |
| JWT contract, security | `technical-architecture.md` |
| HTTP contract | `backend/auth/openapi.yaml` |
| Schema / indexes | `database-erd.md`, `backend/auth/scripts/init-db.mjs` |
| Acceptance criteria | `auth-spec.md` (AC table) |
| ฟีเจอร์ใหม่หลายขั้น | [`docs/exec-plans/active/`](../../../exec-plans/active/) (front-matter `services: [auth]`) |

## last-verified policy

- อัปเดต `last-verified` ใน [auth-spec.md](./auth-spec.md) frontmatter ทุกครั้งที่ merge PR ที่แตะ auth business logic, OpenAPI, หรือ AC
- Quarterly audit — owner รัน `npm run ci` และตรวจ drift

## PR checklist

- [ ] อัปเดต spec ที่เกี่ยวข้อง (business-domain / openapi / auth-spec AC)
- [ ] เปลี่ยน OpenAPI ถ้า API behavior เปลี่ยน (`npm run spec:lint`)
- [ ] เพิ่มหรืออัปเดต tests ที่ map กับ AC
- [ ] `npm run ci` ผ่านใน `backend/auth`
- [ ] อัปเดต `last-verified` ใน auth-spec frontmatter

## Related

- [auth-spec.md](./auth-spec.md)
- [docs/exec-plans/README.md](../../../exec-plans/README.md) — plan file convention
- Skill: `spec-driven-development` — `/spec`
- Bootstrap: `backend-service-spec-bootstrap` — `/spec-bootstrap-backend`
