# 4. Connect MongoDB

การเชื่อมต่อฐานข้อมูล MongoDB จะใช้รูปแบบ **Singleton Pattern** เพื่อป้องกันการสร้าง Connection ซ้ำซ้อน ซึ่งช่วยประหยัดทรัพยากร (Memory) และจัดการ Connection Pool ได้อย่างมีประสิทธิภาพ

### 📝 หลักการทำงาน (Best Practices)
- **Singleton Instance:** เรียกใช้ (Share) Connection Client ตัวเดียวกันตลอดทั้งแอปพลิเคชัน
- **Connection Pool:** ระบุ `maxPoolSize` และ `minPoolSize` เพื่อรองรับผู้ใช้งานพร้อมกันจำนวนมากโดยไม่ทำให้เซิร์ฟเวอร์ฐานข้อมูลล่ม
- **Fail-fast:** ตรวจสอบค่าคอนฟิกตั้งแต่แรก หากไม่มี `MONGODB_URI` จะให้พัง (Throw Error) ทันทีเพื่อไม่ให้แอปพลิเคชันรันต่อแบบผิดๆ

**ไฟล์ `src/config/database.js`**

```javascript
import { MongoClient } from 'mongodb';

const DB_OPTIONS = {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    writeConcern: { w: 'majority', j: true, wtimeoutMS: 5000 },
    readPreference: 'primaryPreferred'
};

let client = null;
let db = null;

export async function connectDatabase() {
    // ถ้าเคยต่อไว้แล้ว ให้ส่งของเดิมกลับไปทันที (Singleton)
    if (db) return db;

    if (!process.env.MONGODB_URI || !process.env.DB_NAME) {
        throw new Error('[Database] Missing MONGODB_URI or DB_NAME config.');
    }

    client = new MongoClient(process.env.MONGODB_URI, DB_OPTIONS);
    await client.connect();
    db = client.db(process.env.DB_NAME);
    
    return db;
}

export function getDatabase() {
    // ใช้เรียก Instance ปัจจุบันโดยไม่ต้อง await ถ้ายังไม่ต่อ DB ให้แจ้งเตือน
    if (!db) throw new Error('[Database] Call connectDatabase() first.');
    return db;
}

export async function closeDatabase() {
    // สำหรับการสั่งปิด Connection อย่างถูกต้องตอน Graceful Shutdown
    if (client) {
        await client.close();
        client = null;
        db = null;
    }
}
```
