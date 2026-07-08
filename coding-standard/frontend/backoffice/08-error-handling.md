# 8. Error Handling

## 🚫 User feedback

- Error จากการ save/submit → **[Required]** แจ้งผู้ใช้ผ่าน `sonner` toast ทันที (ไม่ใช่ AntD `message`)
- แปล error code จาก API เป็นข้อความอ่านเข้าใจผ่าน `apiErrorMessage()` (`lib/apiError.ts`) — เฉพาะ code ที่อยู่ใน allowlist เท่านั้นที่ echo `detail` จาก server ตรงๆ ส่วนที่เหลือ map เป็นข้อความคงที่หรือ fallback

## 🚧 Error boundaries (Next.js App Router)

Next.js มีกลไก error boundary ในตัว — ใช้ตามนี้ ไม่ประกอบเอง:

- **`src/app/error.tsx`** — route-level error boundary, render `Error500` view, log เฉพาะ non-production
- **`src/app/global-error.tsx`** — root-level (จับ error ที่ error.tsx จับไม่ได้) ต้อง render `<html>/<body>` เอง เพราะแทนที่ root layout ทั้งหมด แยกเคส **chunk-load error** (deploy ใหม่ระหว่างผู้ใช้เปิดค้าง) ออกเป็นหน้า "reload required" ต่างหากจาก `Error500` ทั่วไป
- **`src/app/not-found.tsx`** — 404
- **`(main)/403/page.tsx`, `(main)/500/page.tsx`** — หน้า error แบบ route ปกติ (ไม่ผ่าน boundary) สำหรับ flow ที่รู้ error code ล่วงหน้า (เช่น permission check)

**[Required]** Error boundary ใหม่ต้อง reuse `Error500`/pattern เดิม — ห้ามปล่อยให้ผู้ใช้เห็นหน้าขาวเปล่าเมื่อ component พัง
