# Tennis String Tracker — Full-Stack Project

## บริบทของโปรเจค
ระบบบันทึกการขึ้นเอ็นเทนนิส (Tennis String Tracker) เดิมเป็น React app ที่เก็บข้อมูลใน localStorage
ตอนนี้กำลัง upgrade เป็น full-stack: Node.js backend + PostgreSQL database + React frontend
เพื่อรองรับระบบผู้ใช้หลายคน, admin dashboard, และ report/export

## สถานะปัจจุบัน
- [x] Frontend React app ทำเสร็จแล้ว (อยู่ใน /frontend)
- [x] Deploy บน Vercel แล้ว: https://tennis-string-tracker.vercel.app
- [x] Architecture document อยู่ใน /docs/architecture.md
- [ ] Phase 1: Backend API + Database
- [ ] Phase 2: เชื่อม Frontend กับ Backend + Login
- [ ] Phase 3: Admin Dashboard + Export

## Tech Stack
- Frontend: React + Vite (deploy Vercel)
- Backend: Node.js + Express (deploy Railway / Render)
- Database: PostgreSQL (Neon.tech ฟรี)
- Auth: JWT (jsonwebtoken) + bcrypt
- ORM: ไม่ใช้ — ใช้ pg library ตรงๆ เพื่อความเร็วและ control

## Database Schema

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL, -- bcrypt hashed
  name VARCHAR(100) NOT NULL,
  role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### records
```sql
CREATE TABLE records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  seq INTEGER NOT NULL,
  racket VARCHAR(200) NOT NULL,
  string1 VARCHAR(200) DEFAULT '',
  string2 VARCHAR(200) DEFAULT '',
  price INTEGER NOT NULL CHECK (price IN (200, 300)),
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_records_user_date ON records(user_id, date);
```

## API Endpoints

### Auth
- POST /api/auth/login → { username, password } → { token, user }

### Records (ต้อง login, เห็นเฉพาะของตัวเอง)
- GET /api/records?date=YYYY-MM-DD&start=&end= → list records
- GET /api/records/summary/daily?start=&end= → daily summary
- GET /api/records/summary/monthly?year= → monthly summary
- POST /api/records → create record
- PUT /api/records/:id → update record (auto updatedAt)
- DELETE /api/records/:id → delete record

### Admin (ต้อง login + role=admin)
- GET /api/admin/users → list all users
- POST /api/admin/users → create user { username, password, name }
- PUT /api/admin/users/:id → update user / toggle active
- DELETE /api/admin/users/:id → delete user
- GET /api/admin/report?start=&end=&user_id= → aggregated report
- GET /api/admin/export?format=excel|pdf&start=&end= → download file

## โครงสร้างไฟล์

```
tennis-tracker-fullstack/
├── CLAUDE.md              ← ไฟล์นี้ (context สำหรับ Claude Code)
├── docs/
│   └── architecture.md    ← architecture diagram + details
├── backend/
│   ├── package.json
│   ├── .env.example       ← ตัวอย่าง environment variables
│   ├── src/
│   │   ├── index.js       ← Express server entry point
│   │   ├── config/
│   │   │   └── db.js      ← PostgreSQL connection (pg Pool)
│   │   ├── middleware/
│   │   │   └── auth.js    ← JWT verify middleware
│   │   ├── routes/
│   │   │   ├── auth.js    ← POST /api/auth/login
│   │   │   ├── records.js ← CRUD /api/records
│   │   │   └── admin.js   ← /api/admin/* routes
│   │   └── models/
│   │       └── init.sql   ← Database schema + seed admin
│   └── .gitignore
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   │   ├── manifest.json
│   │   ├── sw.js
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── src/
│       ├── main.jsx
│       └── App.jsx         ← React app (จะเชื่อมกับ API ใน Phase 2)
└── README.md
```

## คำแนะนำสำหรับ Claude Code

### Phase 1 — เริ่มจาก Backend
1. สร้าง backend/src/index.js — Express server + CORS + JSON body parser
2. สร้าง backend/src/config/db.js — pg Pool connection ใช้ DATABASE_URL จาก env
3. สร้าง backend/src/models/init.sql — สร้างตาราง + seed admin (username: admin, password: admin123)
4. สร้าง backend/src/middleware/auth.js — JWT verify, ดึง user จาก token
5. สร้าง backend/src/routes/auth.js — login endpoint, return JWT
6. สร้าง backend/src/routes/records.js — CRUD, filter by user_id จาก token
7. สร้าง backend/src/routes/admin.js — admin-only routes, check role
8. ทดสอบ API ด้วย curl

### Phase 2 — เชื่อม Frontend
1. เพิ่ม API_URL config ใน frontend
2. สร้างหน้า Login (username + password)
3. เก็บ JWT ใน localStorage
4. เปลี่ยน useStore hook → useAPI hook ที่ fetch จาก backend
5. ทุก request แนบ Authorization: Bearer <token>

### Phase 3 — Admin Dashboard
1. สร้าง admin routes ใน frontend (ถ้า role=admin จะเห็น tab เพิ่ม)
2. หน้าจัดการ user — เพิ่ม/เปิดปิด/ลบ
3. หน้า report — สรุปรวมทุก user, กราฟ, ตาราง
4. Export — ใช้ exceljs สำหรับ Excel, pdfkit สำหรับ PDF

## Environment Variables (backend/.env)
```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your-secret-key-here
PORT=3001
CORS_ORIGIN=https://tennis-string-tracker.vercel.app
```

## ข้อควรระวัง
- Password ต้อง hash ด้วย bcrypt เสมอ (ห้ามเก็บ plain text)
- ทุก record query ต้อง filter by user_id (ป้องกัน user เห็นข้อมูลคนอื่น)
- Admin routes ต้องเช็ค role=admin ทุก endpoint
- updatedAt ต้อง auto-update เมื่อ PUT (ใช้ NOW() ใน SQL)
- CORS ต้อง whitelist เฉพาะ frontend URL
