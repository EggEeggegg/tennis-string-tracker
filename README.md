# Tennis String Tracker — Full-Stack

ระบบบันทึกการขึ้นเอ็นเทนนิส พร้อมระบบ user และ admin dashboard

## Quick Start

### 1. Database (Neon.tech)
- สมัคร https://neon.tech (ฟรี)
- สร้าง database ใหม่
- copy connection string

### 2. Backend
```bash
cd backend
cp .env.example .env
# แก้ไข .env ใส่ DATABASE_URL และ JWT_SECRET

npm install
npm run db:init    # สร้างตาราง + seed admin
npm run dev        # start dev server
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 4. Deploy
- Frontend → Vercel (เหมือนเดิม)
- Backend → Railway / Render
- Database → Neon.tech

## Default Admin
- Username: `admin`
- Password: `admin123`
- เปลี่ยนรหัสผ่านหลัง login ครั้งแรก!

## Project Structure
```
├── CLAUDE.md          ← Context สำหรับ Claude Code
├── docs/              ← Architecture docs
├── backend/           ← Node.js + Express API
│   └── src/
│       ├── index.js
│       ├── config/db.js
│       ├── middleware/auth.js
│       ├── routes/auth.js
│       ├── routes/records.js
│       └── routes/admin.js
└── frontend/          ← React + Vite (existing)
    └── src/App.jsx
```
