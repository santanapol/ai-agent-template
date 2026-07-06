# Regression Test Suite - Release v2.1.0

ชุดการทดสอบนี้ใช้สำหรับรันทุกครั้งก่อนที่จะเอาโค้ดขึ้น Production เพื่อการันตีว่าฟีเจอร์เดิมไม่พัง
**Environment:** Staging
**Release Date:** 2026-10-15

## 📦 1. Core Authentication (ต้องรันทุกครั้ง)
- [ ] `REG-AUTH-001` [Auto]: ผู้เล่นล็อกอินสำเร็จ (E2E Playwright)
- [ ] `REG-AUTH-002` [Auto]: แอดมินล็อกอินเข้า Backoffice สำเร็จ (E2E Playwright)
- [ ] `REG-AUTH-003` [Manual]: Token หมดอายุ ระบบเด้งกลับไปหน้าล็อกอินอัตโนมัติ

## 💳 2. Payment & Wallet (จุดที่เซนซิทีฟที่สุด)
- [ ] `REG-PAY-001` [Manual]: ผู้เล่นสามารถสร้างรายการฝากเงินผ่าน QR Code ได้
- [ ] `REG-PAY-002` [Auto]: ผู้เล่นสามารถทำรายการถอนเงินออกจาก Wallet ได้ (API Test)
- [ ] `REG-PAY-003` [Manual]: แอดมินสามารถกด Approve ยอดถอนเงินหลักแสนได้

## 🎮 3. Game Integration
- [ ] `REG-GAME-001` [Manual]: เข้าเล่นเกมสล็อต Provider A ได้ปกติ มียอดตัดกระเป๋า
- [ ] `REG-GAME-002` [Auto]: ระบบสามารถดึง Bet Log จาก Provider กลับมาได้ (Integration Sync)

## 🛒 4. Feature: Rolling Commission (อัปเดตล่าสุด)
- [ ] `REG-RC-001` [Manual]: หน้า Create Commission โหลดข้อมูล Dropdown ถูกต้อง
- [ ] `REG-RC-002` [Manual]: การตั้งเวลาแบบ Future Date ใช้งานได้ แคมเปญเปลี่ยนสถานะเมื่อถึงเวลา

---
*หมายเหตุ: ข้อที่มี Tag `[Auto]` หมายความว่าถูกรวมอยู่ใน CI/CD Pipeline แล้ว หากไฟเขียวสามารถข้ามการทำ Manual ได้*
