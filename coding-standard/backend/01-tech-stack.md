# 1. Tech Stack & Dependencies

| Runtime / Database / Standard | Specification |
| :--- | :--- |
| **Node.js** | `v24.xx LTS` |
| **MongoDB** | `v8.0.x` |
| **Module System** | `ECMAScript Modules (ESM)` |

### 📦 Standard Dependencies (Node.js)

```json
"dependencies": {
  "axios": "^1.7.2",
  "fastify": "^5.8.5",
  "fastify-plugin": "^5.1.0",
  "jsonwebtoken": "^9.0.3",
  "lodash": "^4.17.23",
  "mongodb": "^7.2.0"
}
```

### 🛠️ Development Dependencies (Node.js)

```json
"devDependencies": {
  "@eslint/js": "^9.39.2",
  "eslint": "^9.39.2",
  "eslint-config-prettier": "^10.1.8",
  "eslint-plugin-import": "^2.32.0",
  "eslint-plugin-node": "^11.1.0",
  "eslint-plugin-promise": "^7.2.1",
  "prettier": "^3.8.1"
}
```

> **[Note]** ทดสอบระบบใช้ `node --test` เป็น Native Test Runner แทนที่ Jest เสมอ และจัดการ Environment ด้วย Node Native flag `--env-file` (ไม่ต้องติดตั้ง dotenv อีกต่อไป)
