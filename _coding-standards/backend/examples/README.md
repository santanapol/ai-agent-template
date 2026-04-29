# Backend examples

Reference snippets ที่ตัดออกจาก prose SoT เพื่อ keep doc อ่านง่าย — **ไม่ใช่ binding rule** แต่เป็น implementation pattern ที่ตรงกับเอกสารมาตรฐานใน `../`

## Index

| File | Referenced from |
| :--- | :--- |
| [`duplicate-header.middleware.js`](./duplicate-header.middleware.js) | [API → Duplicate header policy](../api.md#duplicate-header-policy-required) |
| [`validate.middleware.js`](./validate.middleware.js) | [API → Validation middleware](../api.md#validation-middleware) |
| [`rate-limit.middleware.js`](./rate-limit.middleware.js) | [API → Rate limiting → Implementation contract](../api.md#implementation-contract-required) |
| [`logger.config.js`](./logger.config.js) | [Observability → Redaction](../observability.md#log-redaction-required) |
| [`pino-http.config.js`](./pino-http.config.js) | [Observability → HTTP logger](../observability.md#http-logger-pino-http) |
| [`user.validator.js`](./user.validator.js) | [API → Validation → File location](../api.md#file-location-and-export-shape) |
| [`user.route.js`](./user.route.js) | [API → Validation → File location](../api.md#file-location-and-export-shape) |
| [`eslint.config.js`](./eslint.config.js) | [Supply chain → ESLint base config](../supply-chain.md#eslint-base-config-eslintconfigjs) |
| [`jest.config.js`](./jest.config.js) | [Ops → Coverage threshold](../ops.md#coverage-threshold) |
| [`package.json.scripts.json`](./package.json.scripts.json) | [Runtime → `package.json` scripts](../runtime.md#packagejson-scripts) |
| [`envelope-examples.json`](./envelope-examples.json) | [API → Example responses](../api.md#example-responses-reference) |
| [`health-envelope-examples.json`](./health-envelope-examples.json) | [API → Health and readiness endpoints](../api.md#health-and-readiness-endpoints) |
| [`openapi-components.fragment.yaml`](./openapi-components.fragment.yaml) | [API → OpenAPI → Shared envelope / Security / servers](../api.md#openapi-contract) |

## Usage

- ใช้เป็น starting point เมื่อ scaffold service ใหม่
- เนื้อหาในไฟล์เหล่านี้ **ขัด SoT ได้ไม่ได้** — ถ้าพบ drift, prose SoT ชนะเสมอ (ดู `AGENTS.md §2`)
- ห้าม import โดยตรงจาก service code (copy + adapt)
