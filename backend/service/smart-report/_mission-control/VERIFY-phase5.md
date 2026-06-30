# Verify checklist — Phase 5 (post-migrate)

รันหลัง `npm run migrate:scripts -- --test-run --fail-on-error` บน environment เป้าหมาย

## Automated (CI / local)

```bash
cd backend/service/smart-report
npm test
npm run lint
rg prepareBoosterStyleScript compileOnRead   # ต้องไม่พบใน src/
```

## Manual — key prod reports

| Report | ขั้นตอน | ผ่านเมื่อ |
|--------|---------|-----------|
| **Staff Login History** | Backoffice → Manual Run | `recordCount > 0`, ไฟล์ CSV/Excel ไม่ว่าง |
| **WWL Monthly report** | Test Run ใน editor แล้ว Manual Run | `recordCount` ตรงกับ Test Run ±0, ไฟล์มีข้อมูล |
| **Rolling Commission P1** | ตรวจ list | `enabled: false`, ไม่ถูก scheduler รัน |

## Scheduler smoke

1. เลือก report ที่ `enabled: true` + มี `schedule` + `compiledScript`
2. รอ cron หรือ trigger `task.execute()` ใน integration env
3. ตรวจ `download_history`: `status: success`, `recordCount` ไม่ null

## UI flow (new report)

1. Validate → Compiled tab แสดง `withReport(async () => ...)`
2. Test Run → preview + badge `Testing with: yesterday`
3. Save → สำเร็จ
4. แก้ script → Save disabled จน Test Run ใหม่

## Sign-off

- [ ] migrate ≥12/13 pass (P1 disabled)
- [ ] Manual run ตรงกับ Test Run สำหรับ Staff Login History
- [ ] ไม่มี `prepareBoosterStyleScript` / `compileOnRead` ใน `src/`
