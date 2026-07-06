# Security Testing (Penetration Testing)

## 📌 คืออะไร
ทดสอบเจาะระบบ หาช่องโหว่ความปลอดภัย เช่น SQL Injection, XSS, CSRF

## 👥 ใครทำ
Security QA / Security Engineer / DevSecOps

## 🛠️ เครื่องมือที่แนะนำ (Zero Platform Standard)
- **Dynamic Analysis (DAST):** `OWASP ZAP` (ฟรีและทรงพลัง เอาไว้สแกน API ที่กำลังรันอยู่)
- **Static Analysis (SAST):** `SonarQube` (เชื่อมเข้ากับ CI/CD เพื่อสแกน Source Code อัตโนมัติทุกครั้งก่อน Merge)

## 🔥 ความจำเป็น
**Must-have** สำหรับระบบที่เกี่ยวกับการเงินหรือข้อมูลส่วนบุคคล (Casino, Wallet)
