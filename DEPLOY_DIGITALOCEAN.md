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
cp backend/service/smart-report/.env.example backend/service/smart-report/.env.prod
cp backend/service/branch-report/.env.example backend/service/branch-report/.env.prod
cp backend/service/demo-service/.env.example backend/service/demo-service/.env.prod

# 2. เข้าไปแก้ไขรหัสผ่าน/ความลับ ในไฟล์ .env.prod ของแต่ละ Service ให้ถูกต้อง
nano backend/gateway/.env.prod
# (เช่น แก้ไขค่า GATEWAY_SECRET ให้ปลอดภัย)
# branch-report: ตั้ง GATEWAY_SECRET ให้ตรง gateway, MONGODB_URI เป็น read replica (เช่น user เดียวกับ auth MONGODB_URI_READ), MONGODB_DB_BRANCH=gpp_777ww

# ทำแบบเดียวกันกับโฟลเดอร์อื่นๆ...
```

### 1.4 บิลด์ระบบและสตาร์ทครั้งแรก
ก่อนที่เราจะรันระบบ เราต้องติดตั้งไลบรารีและสร้างไฟล์ Frontend สำหรับใช้งานจริง (เนื่องจาก Frontend ของเราเป็นไฟล์เว็บแบบ Static (React/Vite) ดังนั้น Nginx จะเป็นคนอ่านไฟล์เหล่านี้โดยตรง ไม่ต้องใช้ PM2 รันค่ะ):

```bash
cd /var/www/zero-platform

# 1. ติดตั้งไลบรารีและบิลด์ Frontend
npm ci --prefix frontend/backoffice
npm run build --prefix frontend/backoffice

# 2. ติดตั้งไลบรารี Backend และ Frontend (แยก service — ไม่มี root workspace)
bash backend/scripts/install-all-deps.sh

# 3. รัน Redis ผ่าน Docker
docker compose -f backend/docker-compose.prod.yml up -d

# 4. รัน API Backend ด้วย PM2
pm2 start backend/ecosystem.config.js

# 5. สั่งให้ PM2 รันออโต้เมื่อเครื่องรีสตาร์ท
pm2 save
pm2 startup
```

---

## ขั้นที่ 2: ผูกกุญแจรีโมท (GitHub Secrets)

> **อย่าสลับกับ Deploy key ในขั้นที่ 1.2** — มีกุญแจ SSH สองคู่ที่ทำงานคนละทิศทาง:
>
> | ทิศทาง | Private key อยู่ที่ | Public key อยู่ที่ | ใช้ทำอะไร |
> |--------|---------------------|---------------------|-----------|
> | Droplet → GitHub (`git pull`) | บนเซิร์ฟเวอร์ `~/.ssh/id_ed25519` | GitHub **Deploy keys** (ขั้น 1.2) | เซิร์ฟเวอร์ดึงโค้ดจาก private repo |
> | GitHub Actions → Droplet (SSH deploy) | GitHub Secret `DO_SSH_KEY` | `~/.ssh/authorized_keys` บน Droplet | Workflow ใน `.github/workflows/deploy.yml` เข้าเซิร์ฟเวอร์ |

ไปที่หน้าเว็บ GitHub ของโปรเจกต์ > **Settings** > **Secrets and variables** > **Actions** แล้วกดสร้าง **New repository secret** ดังนี้:

- `DO_HOST` : IP Address หรือ hostname ของ Droplet (เช่น `128.199.100.200`)
- `DO_USERNAME` : ชื่อ user ที่ใช้ SSH เข้าเซิร์ฟเวอร์ (เช่น `root` หรือ `ubuntu` — ต้องตรงกับ user ที่ login ได้จริง)
- `DO_SSH_KEY` : **Private key ฝั่ง client** ที่คู่กับ public key ใน `authorized_keys` บน Droplet (ไม่ใช่ `id_ed25519` จากขั้น 1.2)

**`DO_SSH_KEY` มาจากไหน (เลือกอย่างใดอย่างหนึ่ง):**

1. **ตอนสร้าง Droplet** — ใส่ SSH public key จากเครื่อง dev ตอนสร้าง VM → นำ **private key คู่นั้น** (เช่น `~/.ssh/id_ed25519` บนเครื่องคุณ หรือไฟล์ `.pem` ที่ DigitalOcean ให้) ใส่ใน secret
2. **สร้างคู่ใหม่เฉพาะ CI** — บนเครื่อง dev:
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/do_deploy -N ""
   cat ~/.ssh/do_deploy.pub   # นำไปใส่ใน authorized_keys บน Droplet
   cat ~/.ssh/do_deploy         # นำทั้งไฟล์ (รวม BEGIN/END) ใส่ใน DO_SSH_KEY
   ```

บน Droplet ให้แน่ใจว่า public key คู่กันอยู่ใน `~/.ssh/authorized_keys` ของ user ที่ตั้งใน `DO_USERNAME` (เช่น `echo "ssh-ed25519 AAAA... github-actions-deploy" >> ~/.ssh/authorized_keys`)

ทดสอบก่อน push: `ssh -i ~/.ssh/do_deploy DO_USERNAME@DO_HOST` ต้อง login ได้โดยไม่ถามรหัสผ่าน

---

## ขั้นที่ 3: ตั้งค่า Nginx ปล่อยของ (Reverse Proxy)

สร้างไฟล์คอนฟิก Nginx ใหม่ หรือแก้ไฟล์เดิม:
```bash
sudo nano /etc/nginx/sites-available/zero-platform
```

ใส่การตั้งค่าดังนี้:

```nginx
server {
    listen 80;
    server_name zero.168bits.com; # โดเมนสำหรับระบบ

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

บันทึกไฟล์และรันคำสั่งเพื่อเปิดใช้งาน (และปิดหน้า Default ของ Nginx):
```bash
sudo ln -s /etc/nginx/sites-available/zero-platform /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```
---

## ขั้นที่ 4: ตั้งค่า SSL/HTTPS ด้วย Certbot (ฟรีและแนะนำอย่างยิ่ง)

เพื่อให้ระบบปลอดภัยและสามารถส่งผ่านข้อมูลได้อย่างสมบูรณ์แบบ เราต้องเปิดใช้งาน HTTPS ค่ะ:

1. **ติดตั้ง Certbot**:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   ```

2. **สั่งให้ Certbot จัดการใบรับรองและแก้ไข Nginx อัตโนมัติ**:
   ```bash
   sudo certbot --nginx -d zero.168bits.com
   ```

3. **ทำตามขั้นตอนบนหน้าจอ**:
   - ใส่อีเมลของคุณ (เวลาระบบจะหมดอายุเขาจะส่งอีเมลมาเตือน)
   - พิมพ์ `Y` เพื่อยอมรับเงื่อนไข

เมื่อเสร็จแล้ว Certbot จะสร้างระบบต่ออายุอัตโนมัติ (Auto-renew) ให้เลย เราไม่ต้องทำอะไรเพิ่มแล้วค่ะ!

---

## ขั้นที่ 5: ลุยเลย! 🚀

ระบบพร้อมแล้ว! ครั้งต่อไปที่คุณพิมพ์:
```bash
git commit -m "Deploying new feature"
git push origin main
```

**สิ่งที่เกิดขึ้นเบื้องหลัง:**
1. GitHub จะใช้ไฟล์ `.github/workflows/deploy.yml` เพื่อเปิด Runner
2. GitHub Runner จะต่อ SSH เข้ามายังเซิร์ฟเวอร์ DigitalOcean โดยอัตโนมัติ
3. สั่ง `git pull` ดึงโค้ดเวอร์ชันล่าสุด
4. รัน `backend/scripts/install-all-deps.sh` เพื่อ `npm ci` แต่ละ service และ frontend
5. สั่ง `npm run build` เพื่อสร้างไฟล์เว็บ Frontend ใหม่
6. สั่ง `pm2 reload` ให้ Backend รับโค้ดใหม่แบบไร้รอยต่อ (Zero-downtime)

คุณสามารถดูสถานะการ Deploy สดๆ ได้จากแท็บ **Actions** บน GitHub ของคุณครับ!
