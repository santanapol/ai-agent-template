# 13. Code Quality & Supply Chain

มาตรฐานในการดูแลคุณภาพของโค้ด (Code Quality) ป้องกันช่องโหว่ และนโยบายการจัดการแพ็กเกจ (Dependencies)

## 📦 Dependency & Lockfile Policies
* **SemVer Bump:** การอัปเดตเวอร์ชันแพ็กเกจระดับ `major` ต้องได้รับการพิจารณาและอนุมัติ (PR Review / ADR) เสมอ ส่วน `minor` และ `patch` สามารถทำแบบอัตโนมัติได้หากผ่านการเทส (CI)
* **Lockfile:** บังคับให้ Commit ไฟล์ `package-lock.json` เสมอ เพื่อตรึง (Pin) เวอร์ชันของแพ็กเกจให้ตรงกันทุกสภาพแวดล้อม
* **CI Install:** เมื่ออยู่ในระบบ CI/CD Pipeline บังคับให้ใช้คำสั่ง `npm ci` (ห้ามใช้ `npm install`) เพื่ออ่าน Dependency จาก Lockfile โดยตรงและทำความสะอาดโฟลเดอร์ให้ใหม่เสมอ

## 🌍 Environment Management (Native Node.js)
* **Dev/Test:** บังคับรันสคริปต์ด้วย **`--env-file=.env`** (ห้ามใช้หรือลงไลบรารี `dotenv` โดยเด็ดขาด)
* **Production:** **ห้าม** มีไฟล์ `.env` อยู่บนเครื่อง Server เด็ดขาด (ให้อ่านค่าจากระบบโดยตรง เช่น กำหนดผ่าน Kubernetes, PM2, หรือ Systemd)
* **ข้อบังคับ:** ไฟล์ `.env` ห้าม Commit ลง Git แต่ต้องเตรียมไฟล์ `.env.example` ที่มีเฉพาะชื่อตัวแปรว่าง ๆ ไว้ให้เพื่อนร่วมทีมเสมอ

## 🧹 Linting (ESLint)
กฎข้อบังคับ (Lint) เพื่อป้องกันบัคก่อนรันแอปพลิเคชัน:
* **No Console:** ห้ามมีคำสั่ง `console.log` หลุดไปใน Production (ระดับ `error`)
* **Security Rules:** บังคับตรวจ Security Pattern (เช่น ห้ามใช้คำสั่ง `eval()`, ห้ามเขียน Regex ที่อาจทำให้เกิด ReDoS)
* **Boundary Enforcement:** บังคับให้โค้ดเรียกหากันตามลำดับชั้น (Layer) อย่างเคร่งครัด **ห้ามข้าม Layer** ภายใน Module เดียวกัน หากฝ่าฝืน Lint จะแจ้ง Error ทันที

## 🎨 Formatting (Prettier & EditorConfig)
บังคับให้ทีมเขียนโค้ดออกมาหน้าตาเหมือนกันทั้งหมด ด้วย Prettier:
* ใช้ Single Quote (`'`) เสมอ
* ปิดท้ายบรรทัดด้วย Semicolon (`;`) เสมอ
* ใช้การเว้นวรรค 2 เคาะ (2 Spaces Indent) และห้ามใช้ Tab

## ⚓ Git Hooks (Husky & lint-staged)
* **Pre-commit:** มีการผูกสคริปต์อัตโนมัติไว้ดักจังหวะตอนผู้ใช้งานพิมพ์คำสั่ง `git commit`
* **Automated Fix:** ก่อนโค้ดจะถูกบันทึกลง Git ระบบจะรันเครื่องมือ `lint-staged` เพื่อสั่ง `eslint --fix` และ `prettier --write` โดยอัตโนมัติ หากโค้ดมี Error ที่แก้ไม่ได้ ระบบจะบล็อกการ Commit จนกว่าโปรแกรมเมอร์จะแก้ไขให้ถูกต้อง
