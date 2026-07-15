# 1. Tech Stack & Dependencies

| Layer | Technology / Specification |
| :--- | :--- |
| **Framework** | `React v19` |
| **Build Tool** | `Vite v8` |
| **Language** | `TypeScript` (Strict Mode) |
| **Routing** | `react-router-dom v7` |
| **UI Library** | `shadcn/ui` + `Tailwind CSS v4` + `lucide-react` |
| **HTTP Client** | `axios` |
| **Testing** | `vitest` + `@testing-library/react` |
| **Toasts / feedback** | `sonner` |

## App paths

| App | Path | UI stack |
| :--- | :--- | :--- |
| **backoffice-next** | `frontend/backoffice-next` | Next.js 16 + shadcn/ui + CSS variables |
| **live-demo-shadcn** (template) | `coding-standard/frontend/backoffice/live-demo-shadcn` | Reference scaffold for new shadcn pages |

## 📦 Package Management
* บังคับให้ใช้คำสั่งที่อ่านจาก Lockfile (`npm ci`) เมื่ออยู่บนระบบ CI/CD
* อนุญาตให้อัปเดตเวอร์ชันระดับ `minor` และ `patch` ได้อิสระ แต่หากเป็น `major` ต้องมีการรีวิวผลกระทบเสมอ
