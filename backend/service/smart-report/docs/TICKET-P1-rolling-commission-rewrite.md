# Ticket: Rewrite Rolling Commission 777WW [New] P1

**Status:** Open (out of scope — script compiler release 1–2)  
**Report name:** `Rolling Commission 777WW [New] P1`  
**Current state:** `enabled: false` via `migrate-report-scripts.mjs`

## Problem

Report กลุ่ม C ใช้ `insert()` / write operations ใน Booster script — ผ่าน AST validator ไม่ได้ และไม่ควรรันบน read-only sandbox

## Acceptance criteria

1. Rewrite script เป็น read-only aggregate (หรือแยก pipeline ออกจาก smart-report)
2. Validate + Test Run + Save ผ่าน UI
3. `enabled: true` หลัง migrate สำเร็จ
4. Manual run `recordCount > 0` บน staging ก่อน prod

## References

- Script compiler release (group C / P1 disable) — shipped PRs #27–#33; historical specs removed from `_mission-control/` (see git history).
