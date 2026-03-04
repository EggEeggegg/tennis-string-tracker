# Tennis String Tracker — Full-Stack Architecture

## ภาพรวมระบบ

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
│                  Vercel (เหมือนเดิม)                  │
├──────────────────┬──────────────────────────────────┤
│   User App       │        Admin Dashboard           │
│  - บันทึกรายการ     │  - ดู report รวมทุก user          │
│  - สรุปรายวัน/เดือน  │  - จัดการ user (เพิ่ม/ลบ)         │
│  - Filter        │  - Export Excel/PDF              │
└────────┬─────────┴──────────┬───────────────────────┘
         │     API calls       │
         ▼                     ▼
┌─────────────────────────────────────────────────────┐
│              Backend API (Node.js + Express)         │
│                    Railway / Render                   │
├─────────────────────────────────────────────────────┤
│  POST /api/auth/login                               │
│  GET  /api/records        (user's own records)      │
│  POST /api/records        (create)                  │
│  PUT  /api/records/:id    (update → updatedAt)      │
│  DEL  /api/records/:id    (delete)                  │
│  GET  /api/admin/report   (admin only)              │
│  GET  /api/admin/users    (admin only)              │
│  POST /api/admin/users    (admin creates user)      │
│  GET  /api/admin/export   (Excel/PDF)               │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│              PostgreSQL Database                     │
│              Railway / Supabase / Neon               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  users                                              │
│  ├── id          UUID PK                            │
│  ├── username    VARCHAR UNIQUE                     │
│  ├── password    VARCHAR (hashed)                   │
│  ├── name        VARCHAR                            │
│  ├── role        ENUM('admin','user')               │
│  ├── is_active   BOOLEAN DEFAULT true               │
│  ├── created_at  TIMESTAMP                          │
│  └── updated_at  TIMESTAMP                          │
│                                                     │
│  records                                            │
│  ├── id          UUID PK                            │
│  ├── user_id     UUID FK → users.id                 │
│  ├── date        DATE                               │
│  ├── seq         INTEGER                            │
│  ├── racket      VARCHAR                            │
│  ├── string1     VARCHAR                            │
│  ├── string2     VARCHAR                            │
│  ├── price       INTEGER (200 or 300)               │
│  ├── note        TEXT                               │
│  ├── created_at  TIMESTAMP                          │
│  └── updated_at  TIMESTAMP                          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer      | Technology           | Hosting          | Cost    |
|------------|---------------------|------------------|---------|
| Frontend   | React + Vite        | Vercel           | ฟรี     |
| Backend    | Node.js + Express   | Railway / Render | ฟรี*    |
| Database   | PostgreSQL          | Railway / Neon   | ฟรี*    |
| Auth       | JWT (jsonwebtoken)  | —                | —       |

> *Railway free tier: 500 hours/month, Neon free: 0.5GB storage

## User Flow

### สำหรับ Admin
1. Login ด้วย admin account
2. เพิ่ม user ใหม่ (ตั้ง username + password ให้)
3. ดู dashboard report รวม — รายได้ทั้งหมด, แยกตาม user, แยกตามวัน/เดือน
4. Export report เป็น Excel หรือ PDF
5. เปิด/ปิดการใช้งานของ user

### สำหรับ User ทั่วไป
1. ได้รับ username + password จาก admin
2. Login แล้วเห็นเฉพาะข้อมูลตัวเอง
3. บันทึก/แก้ไข/ลบรายการขึ้นเอ็น (เหมือนเดิม)
4. ดูสรุปรายวัน/รายเดือน/filter ของตัวเอง

## API Endpoints

### Auth
- `POST /api/auth/login` — { username, password } → { token, user }

### Records (ต้อง login)
- `GET /api/records?date=2025-03-01` — ดึงรายการของ user ตาม filter
- `POST /api/records` — เพิ่มรายการ
- `PUT /api/records/:id` — แก้ไข (auto update updatedAt)
- `DELETE /api/records/:id` — ลบ

### Admin (ต้อง login + role=admin)
- `GET /api/admin/users` — list users ทั้งหมด
- `POST /api/admin/users` — สร้าง user ใหม่
- `PUT /api/admin/users/:id` — แก้ไข user / เปิดปิด
- `GET /api/admin/report?start=&end=` — report รวม
- `GET /api/admin/export?format=excel&start=&end=` — export

## ลำดับการทำ (แนะนำ)

### Phase 1 — Backend API + Database
- ตั้ง PostgreSQL database
- สร้าง Node.js API server
- ระบบ Auth (login, JWT)
- CRUD records API
- Deploy backend

### Phase 2 — เชื่อม Frontend กับ Backend
- เปลี่ยน frontend จาก localStorage → API calls
- หน้า Login
- แต่ละ user เห็นเฉพาะข้อมูลตัวเอง

### Phase 3 — Admin Dashboard
- หน้า admin จัดการ user
- หน้า report รวม
- Export Excel/PDF

## Hosting ที่แนะนำ (ฟรี)

**Database — Neon.tech**
- PostgreSQL ฟรี 0.5GB (เก็บข้อมูลขึ้นเอ็นได้หลายแสน records)
- ไม่มี sleep, always available

**Backend — Railway.app หรือ Render.com**
- Railway: ฟรี $5 credit/เดือน (พอสำหรับ app เล็ก)
- Render: ฟรี แต่ sleep หลัง 15 นาที idle
