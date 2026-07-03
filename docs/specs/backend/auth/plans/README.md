# Plans folder

เก็บ plan files สำหรับฟีเจอร์ใหม่หลัง bootstrap — ใช้ร่วมกับ [WORKFLOW.md](../WORKFLOW.md)

## Naming

```
plans/YYYY-MM-DD-<feature-slug>.md
```

## Plan file template

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
- JWT/gateway contract → coordinate with gateway team
```
