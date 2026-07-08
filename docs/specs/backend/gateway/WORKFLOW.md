# Gateway — Spec-Driven Workflow

Entry point: [gateway-spec.md](./gateway-spec.md)

## Gated workflow

```
SPECIFY → PLAN → TASKS → IMPLEMENT
```

## เมื่อไหร่ต้องแก้ spec ก่อน code

| การเปลี่ยนแปลง | แก้ไฟล์ |
|----------------|---------|
| Trust boundary, header contract | `business-domain.md` |
| Plugins, env, routing | `technical-architecture.md`, `routes.json` |
| Redis / token_gen | `database-erd.md`, `business-domain.md` §4 |
| Edge HTTP contract | `backend/gateway/openapi.yaml` |
| Problem codes | `coding-standard/gateway/codes.yaml` |
| AC | `gateway-spec.md` |
| ฟีเจอร์ใหม่ | [`docs/exec-plans/active/`](../../../exec-plans/active/) (front-matter `services: [gateway]`) |

## PR checklist

- [ ] อัปเดต central spec ใน `docs/specs/backend/gateway/`
- [ ] `npm run spec:lint` + `spec:codes` + `spec:consistency`
- [ ] `npm run ci` ผ่าน
- [ ] อัปเดต `last-verified` ใน gateway-spec frontmatter
