# DigitalOcean Deployment Guide (GitHub Actions CI/CD)

คู่มือนี้อธิบายขั้นตอนการตั้งค่าเซิร์ฟเวอร์ DigitalOcean (Ubuntu) เพื่อใช้งานร่วมกับ **GitHub Actions CI/CD** ให้ทำการ Deploy โค้ดอัตโนมัติทุกครั้งที่มีการ Push เข้า branch `main`

---

## ขั้นที่ 1: เตรียมเครื่อง DigitalOcean (ทำแค่ครั้งแรกครั้งเดียว)

ล็อกอิน SSH เข้าไปที่เซิร์ฟเวอร์ Ubuntu แล้วทำตามขั้นตอนนี้:

### 1.1 ติดตั้งโปรแกรมพื้นฐาน (สำหรับ Ubuntu 24.04 LTS)
เนื่องจากโปรเจกต์ต้องการ Node.js เวอร์ชันใหม่ (>=24) เราจึงต้องติดตั้งผ่าน NodeSource:

```bash
sudo apt update && sudo apt upgrade -y

# ติดตั้ง Nginx และ Docker
sudo apt install -y nginx docker.io docker-compose-v2

# ติดตั้ง Node.js (เวอร์ชัน 24.x)
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# ติดตั้ง PM2
sudo npm install -g pm2
```

### 1.2 ตั้งค่า SSH Deploy Key และ Clone โค้ด (Private Repo)
เนื่องจากโปรเจกต์นี้เป็น Private Repository เซิร์ฟเวอร์ต้องมีสิทธิ์ดึงโค้ดจาก GitHub ผ่านกุญแจ SSH:

1. **สร้างกุญแจ SSH บนเซิร์ฟเวอร์** (กด Enter ข้ามได้เลยไม่ต้องตั้งรหัสผ่าน):
   ```bash
   ssh-keygen -t ed25519 -C "digitalocean-server"
   cat ~/.ssh/id_ed25519.pub
   ```
2. **นำกุญแจไปใส่ใน GitHub**:
   - ก๊อปปี้ข้อความที่แสดงออกมา (ขึ้นต้นด้วย `ssh-ed25519 ...`)
   - ไปที่หน้า GitHub ของโปรเจกต์ > **Settings** > **Deploy keys** > **Add deploy key**
   - นำข้อความไปวาง ตั้งชื่อ (เช่น `DO Server`) แล้วกด Add key
3. **Clone โค้ดลงเซิร์ฟเวอร์**:
   ```bash
   sudo mkdir -p /var/www
   sudo chown -R $USER:$USER /var/www
   cd /var/www
   # ใช้ลิงก์แบบ SSH (git@github.com:...) 
   git clone git@github.com:Chiang-Rai-Technology/zero-platform.git zero-platform
   ```

### 1.3 สร้างและตั้งค่าไฟล์ Environment
เนื่องจากไฟล์ `.env.prod` จะไม่ถูกเก็บไว้ใน Git (เพื่อความปลอดภัย) คุณจึงต้องสร้างมันขึ้นมาใหม่จากไฟล์ `.env.example` บนเซิร์ฟเวอร์ก่อน:
```bash
cd /var/www/zero-platform

# 1. คัดลอกไฟล์ต้นแบบสำหรับทุก Service
cp backend/gateway/.env.example backend/gateway/.env.prod
cp backend/auth/.env.example backend/auth/.env.prod
cp backend/service/staff/.env.example backend/service/staff/.env.prod
cp backend/service/agent-invoice/.env.example backend/service/agent-invoice/.env.prod
cp backend/service/demo-service/.env.example backend/service/demo-service/.env.prod

# 2. เข้าไปแก้ไขรหัสผ่าน/ความลับ ในไฟล์ .env.prod ของแต่ละ Service ให้ถูกต้อง
nano backend/gateway/.env.prod
# (เช่น แก้ไขค่า GATEWAY_SECRET ให้ปลอดภัย)

# ทำแบบเดียวกันกับโฟลเดอร์อื่นๆ...
```

### 1.4 สตาร์ทระบบครั้งแรก
```bash
cd /var/www/zero-platform

# 1. รัน Redis ผ่าน Docker
docker compose -f backend/docker-compose.prod.yml up -d

# 2. รัน API Backend ด้วย PM2
pm2 start backend/ecosystem.config.js

# 3. สั่งให้ PM2 รันออโต้เมื่อเครื่องรีสตาร์ท
pm2 save
pm2 startup
```

---

## ขั้นที่ 2: ผูกกุญแจรีโมท (GitHub Secrets)

ไปที่หน้าเว็บ GitHub ของโปรเจกต์ > **Settings** > **Secrets and variables** > **Actions** แล้วกดสร้าง **New repository secret** ดังนี้:

- `DO_HOST` : ใส่ IP Address ของ Digital Ocean (เช่น `128.199.100.200`)
- `DO_USERNAME` : ใส่ชื่อ User ของเซิร์ฟเวอร์ (เช่น `root` หรือ `ubuntu`)
- `DO_SSH_KEY` : ใส่ Private Key ของเซิร์ฟเวอร์ (เช่น เนื้อหาในไฟล์ `~/.ssh/id_rsa` หรือไฟล์ `.pem`)

---

## ขั้นที่ 3: ตั้งค่า Nginx ปล่อยของ (Reverse Proxy)

สร้างไฟล์คอนฟิก Nginx ใหม่ หรือแก้ไฟล์เดิม:
```bash
sudo nano /etc/nginx/sites-available/zero-platform
```

ใส่การตั้งค่าดังนี้ (แก้ `yourdomain.com` เป็นโดเมนจริงของคุณ):

```nginx
server {
    listen 80;
    server_name yourdomain.com; # โดเมนสำหรับ Frontend

    # 1. ให้ Nginx โฮสต์ไฟล์ Frontend (React/Vite)
    root /var/www/zero-platform/frontend/backoffice/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 2. Reverse Proxy ให้ /api และ /auth ไปหา Gateway
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /auth/ {
        proxy_pass http://127.0.0.1:3000; # Gateway จะเป็นคนปัดไป 3001 เอง หรือชี้ไป 3001 โดยตรงก็ได้
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

บันทึกไฟล์และรันคำสั่ง:
```bash
sudo ln -s /etc/nginx/sites-available/zero-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```
*(แนะนำให้ทำ HTTPS ด้วย Certbot/Let's Encrypt ในภายหลัง)*

---

## ขั้นที่ 4: ลุยเลย! 🚀

ระบบพร้อมแล้ว! ครั้งต่อไปที่คุณพิมพ์:
```bash
git commit -m "Deploying new feature"
git push origin main
```

**สิ่งที่เกิดขึ้นเบื้องหลัง:**
1. GitHub จะใช้ไฟล์ `.github/workflows/deploy.yml` เพื่อเปิด Runner
2. GitHub Runner จะต่อ SSH เข้ามายังเซิร์ฟเวอร์ DigitalOcean โดยอัตโนมัติ
3. สั่ง `git pull` ดึงโค้ดเวอร์ชันล่าสุด
4. สั่ง `npm ci` เพื่อดาวน์โหลดไลบรารีใหม่ใน Backend
5. สั่ง `npm run build` เพื่อสร้างไฟล์เว็บ Frontend ใหม่
6. สั่ง `pm2 reload` ให้ Backend รับโค้ดใหม่แบบไร้รอยต่อ (Zero-downtime)

คุณสามารถดูสถานะการ Deploy สดๆ ได้จากแท็บ **Actions** บน GitHub ของคุณครับ!
