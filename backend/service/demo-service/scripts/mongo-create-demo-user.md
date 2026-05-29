# MongoDB — `demo_service_role` + user `demo-service`

รันครั้งเดียวหลัง Mongo พร้อม (local: `docker exec -it zero-platform-mongodb mongosh`)

```javascript
use demo-service

db.createRole({
  role: "demo_service_role",
  privileges: [
    {
      resource: { db: "demo-service", collection: "items" },
      actions: [
        "find",
        "insert",
        "update",
        "remove",
        "createIndex",
        "listIndexes",
        "dropIndex",
      ],
    },
  ],
  roles: [],
})

db.createUser({
  user: "demo-service",
  pwd: "demo-service",
  roles: [{ role: "demo_service_role", db: "demo-service" }],
})
```

ตรวจสอบ:

```javascript
db.getRole("demo_service_role");
db.getUser("demo-service");
```

ลบแล้วสร้างใหม่ (dev):

```javascript
db.dropUser("demo-service");
db.dropRole("demo_service_role");
```

`.env` ที่สอดคล้อง:

```env
DB_NAME=demo-service
MONGODB_URI=mongodb://demo-service:demo-service@localhost:27017/demo-service?authSource=demo-service
```
