# Tennis String Tracker — Full-Stack Architecture

## ภาพรวมระบบ

```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend (Next.js 14)                      │
│                      Vercel                                   │
├──────────────────────┬──────────────────────────────────────┤
│      User App        │         Admin Dashboard               │
│  - บันทึกรายการ         │  - รายงานรวมทุก user                  │
│  - สรุปรายวัน/เดือน     │  - จัดการ user (เพิ่ม/แก้ไข/ลบ/ban)   │
│  - Filter ช่วงวันที่    │  - Export Excel/PDF (Phase 3)         │
└──────────┬───────────┴──────────────┬────────────────────────┘
           │    /api/* → proxy        │
           ▼                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend API (Go + Gin)                      │
│                    Railway / Render                           │
├─────────────────────────────────────────────────────────────┤
│  Auth                                                        │
│    POST /api/auth/login                                      │
│    GET  /api/auth/me                                         │
│    POST /api/auth/change-password                            │
│                                                              │
│  Records  (ต้อง auth — เห็นเฉพาะของตัวเอง)                    │
│    GET    /api/records?date=YYYY-MM-DD                       │
│    GET    /api/records?start=&end=                           │
│    GET    /api/records/summary/daily?start=&end=             │
│    GET    /api/records/summary/monthly?year=                 │
│    POST   /api/records                                       │
│    PUT    /api/records/:id                                   │
│    DELETE /api/records/:id                                   │
│                                                              │
│  Admin  (ต้อง auth + role=admin)                              │
│    GET    /api/admin/users                                   │
│    POST   /api/admin/users                                   │
│    PUT    /api/admin/users/:id                               │
│    DELETE /api/admin/users/:id                               │
│    GET    /api/admin/report?start=&end=&user_id=             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                        │
│                       Neon.tech                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  users                                                       │
│  ├── id          UUID PK (gen_random_uuid())                 │
│  ├── username    VARCHAR UNIQUE NOT NULL                     │
│  ├── password    VARCHAR NOT NULL (bcrypt cost=12)           │
│  ├── name        VARCHAR NOT NULL                            │
│  ├── role        VARCHAR DEFAULT 'user' ('admin' | 'user')   │
│  ├── is_active   BOOLEAN DEFAULT true                        │
│  ├── created_at  TIMESTAMPTZ DEFAULT now()                   │
│  └── updated_at  TIMESTAMPTZ (auto-update via trigger)       │
│                                                              │
│  records                                                     │
│  ├── id          UUID PK (gen_random_uuid())                 │
│  ├── user_id     UUID FK → users.id ON DELETE CASCADE        │
│  ├── date        DATE NOT NULL                               │
│  ├── seq         INTEGER NOT NULL                            │
│  ├── type        VARCHAR DEFAULT 'string' ('string'|'sale')  │
│  ├── racket      VARCHAR                                     │
│  ├── string1     VARCHAR                                     │
│  ├── string2     VARCHAR                                     │
│  ├── price       INTEGER CHECK (price IN (200, 300))         │
│  ├── note        TEXT                                        │
│  ├── created_at  TIMESTAMPTZ DEFAULT now()                   │
│  └── updated_at  TIMESTAMPTZ (auto-update via trigger)       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer    | Technology                        | Hosting        |
|----------|-----------------------------------|----------------|
| Frontend | Next.js 14 App Router + TypeScript + Tailwind CSS | Vercel |
| Backend  | Go 1.22 + Gin + pgx/v5            | Railway/Render |
| Database | PostgreSQL                        | Neon.tech      |
| Auth     | JWT (golang-jwt/jwt/v5) + bcrypt (cost 12) | —       |

## User Flow

### Admin
1. Login ด้วย admin account (default: `admin` / `admin123`)
2. เพิ่ม user ใหม่ + ตั้ง username/password
3. ดู report รวม — รายได้ทั้งหมด, แยกตาม user
4. Ban/Unban, แก้ไข, หรือลบ user
5. Export Excel/PDF *(Phase 3)*

### User ทั่วไป
1. รับ username + password จาก admin
2. Login → เห็นเฉพาะข้อมูลตัวเอง
3. บันทึก/แก้ไข/ลบรายการขึ้นเอ็น (ราคา 200 หรือ 300)
4. ดูสรุปรายวัน / รายเดือน / filter ช่วงวันที่

## โครงสร้างไฟล์สำคัญ

```
tennis-tracker/
├── backend/
│   ├── cmd/server/main.go          ← entry point + graceful shutdown
│   ├── cmd/seed/main.go            ← สร้าง admin user
│   ├── internal/
│   │   ├── config/config.go        ← env vars
│   │   ├── database/database.go    ← pgxpool connection
│   │   ├── middleware/auth.go      ← JWT middleware, Claims struct
│   │   ├── model/                  ← User, Record structs
│   │   ├── handler/                ← auth, records, admin handlers
│   │   └── router/router.go        ← Gin routes + CORS
│   └── migrations/
│       ├── 001_init.sql            ← schema + triggers
│       └── 002_add_record_type.sql ← เพิ่ม type column
│
└── frontend/src/
    ├── app/
    │   ├── login/page.tsx
    │   └── (dashboard)/
    │       ├── layout.tsx          ← auth guard + NavBar
    │       ├── daily/page.tsx      ← บันทึกรายวัน (main)
    │       ├── summary/page.tsx    ← สรุปรายวัน
    │       └── admin/page.tsx      ← admin dashboard
    ├── components/
    │   ├── NavBar.tsx, RecordCard.tsx, RecordForm.tsx
    │   ├── Toast.tsx, ConfirmDialog.tsx
    └── lib/
        ├── api.ts                  ← authApi, recordsApi, adminApi
        └── utils.ts                ← fmtDate, fmtMoney, token helpers
```

## Environment Variables

### backend/.env
```
DATABASE_URL=postgresql://user:pass@host:5432/tennis_tracker?sslmode=require
JWT_SECRET=strong-random-secret-at-least-32-chars
PORT=8080
CORS_ORIGIN=https://your-app.vercel.app
GIN_MODE=release
```

### frontend/.env.local
```
NEXT_PUBLIC_API_URL=https://your-api.railway.app
```

## Hosting แนะนำ

| Service | Plan | หมายเหตุ |
|---------|------|---------|
| [Neon.tech](https://neon.tech) | Free 0.5 GB | ไม่มี sleep, always on |
| [Railway.app](https://railway.app) | Free $5/เดือน | พอสำหรับ app เล็ก |
| [Render.com](https://render.com) | Free | sleep หลัง 15 นาที idle |
| [Vercel](https://vercel.com) | Free | Next.js ฟรี ไม่จำกัด |

## สถานะปัจจุบัน

- [x] Backend Go: Auth, Records CRUD, Admin CRUD, graceful shutdown
- [x] Frontend Next.js: Login, Daily, Summary, Filter→Summary, Admin
- [x] Database schema: users + records + updated_at triggers
- [x] Migration 002: record type (string / sale)
- [ ] Deploy backend (Railway / Render)
- [ ] Deploy frontend (Vercel)
- [ ] Export feature (Excel/PDF) — Phase 3
