# Staff Service — Spec-Driven Workflow

Entry point: [staff-spec.md](./staff-spec.md)

## Gated workflow

```
SPECIFY → PLAN → TASKS → IMPLEMENT
```

ห้ามข้ามไป IMPLEMENT จนกว่า spec ที่เกี่ยวข้องจะอัปเดตและ review แล้ว

## เมื่อไหร่ต้องแก้ spec ก่อน code

| การเปลี่ยนแปลง | แก้ไฟล์ |
|----------------|---------|
| Business rule, RBAC, lifecycle | `business-domain.md` (this folder) |
| HTTP contract (path, body, status) | `backend/service/staff/openapi.yaml`, `openapi-via-gateway.yaml` |
| Error codes | `backend/service/staff/codes.yaml`, `error-codes.js` |
| Schema / indexes | `database-erd.md` (this folder), `backend/service/staff/scripts/init-db.mjs` |
| Acceptance criteria | `staff-spec.md` (AC table) in this folder |
| ฟีเจอร์ใหม่หลายขั้น | plan file ใน `plans/` |

## last-verified policy

- อัปเดต `last-verified` ใน [staff-spec.md](./staff-spec.md) frontmatter ทุกครั้งที่ merge PR ที่แตะ staff business logic, OpenAPI, หรือ acceptance criteria
- Quarterly audit (ทุก 3 เดือน) ถ้าไม่มี PR — owner รัน `npm run ci` และตรวจ drift กับ docs

## PR checklist

- [ ] อัปเดต spec ที่เกี่ยวข้อง (business-domain / openapi / staff-spec AC)
- [ ] เปลี่ยน OpenAPI ถ้า API behavior เปลี่ยน (`npm run spec:lint`)
- [ ] เพิ่มหรืออัปเดต tests ที่ map กับ AC
- [ ] `npm run ci` ผ่านใน `backend/service/staff`
- [ ] อัปเดต `last-verified` ใน staff-spec frontmatter (ถ้าแตะ business/API)

## Task template

```markdown
- [ ] Task: <description>
  - Acceptance: <measurable outcome — reference AC-XX if applicable>
  - Verify: <command or manual step, e.g. npm test -- profiles.patch.test.js>
  - Files: <likely paths>
```

## Plan file template

เก็บที่ `plans/YYYY-MM-DD-<feature>.md`:

```markdown
# Plan: <feature name>

## Objective
<one paragraph>

## Spec changes
- business-domain.md: §X
- openapi.yaml: <operationId>

## Tasks
1. ...
2. ...

## Risks
- shared DB with auth → coordinate with auth team
```

## Example

```markdown
- [ ] Add department filter to profile list
  - Acceptance: GET /profiles?department=Sales returns filtered list; AC extended in staff-spec
  - Verify: npm test -- profiles.list.test.js
  - Files: business-domain.md §8, openapi.yaml, profiles.repository.js, profiles.list.test.js
```

## Related

- [staff-spec.md](./staff-spec.md) — central spec + AC-01–AC-10
- [plans/README.md](./plans/README.md) — plan folder convention
- Skill: `spec-driven-development` (repo `.cursor/skills/`)
