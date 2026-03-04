# Tennis String Tracker — Full-Stack Project

## Tech Stack
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS → Deploy Vercel
- **Backend**: Go 1.22 + Gin + pgx/v5 → Deploy Railway / Render
- **Database**: PostgreSQL (Neon.tech)
- **Auth**: JWT (golang-jwt/jwt/v5) + bcrypt (cost 12)

## โครงสร้างไฟล์

```
tennis-tracker/
├── backend/                         ← Go API server
│   ├── go.mod                       ← module: tennis-tracker
│   ├── Makefile                     ← make run / build / migrate / seed
│   ├── .env.example
│   ├── migrations/
│   │   └── 001_init.sql             ← CREATE TABLE users, records + triggers
│   ├── cmd/
│   │   ├── server/main.go           ← HTTP server entry + graceful shutdown
│   │   └── seed/main.go             ← สร้าง admin user (make seed)
│   └── internal/
│       ├── config/config.go         ← Load env vars (mustEnv / getEnv)
│       ├── database/database.go     ← pgxpool.Pool with connection settings
│       ├── model/
│       │   ├── user.go              ← User struct + input types
│       │   └── record.go            ← Record struct + input types + summary types
│       ├── middleware/
│       │   └── auth.go              ← Auth() + AdminOnly() Gin middleware, Claims struct
│       ├── handler/
│       │   ├── handler.go           ← Handler struct{db, cfg}
│       │   ├── auth.go              ← Login, Me, ChangePassword
│       │   ├── records.go           ← ListRecords, CreateRecord, UpdateRecord, DeleteRecord
│       │   │                           DailySummary, MonthlySummary
│       │   └── admin.go             ← ListUsers, CreateUser, UpdateUser, DeleteUser, AdminReport
│       └── router/router.go         ← Gin engine + CORS + all routes
│
└── frontend/                        ← Next.js App Router
    ├── package.json
    ├── tailwind.config.ts
    ├── next.config.ts               ← proxy /api/* → Go backend
    ├── src/
    │   ├── types/index.ts           ← User, Record, DaySummary, MonthSummary, etc.
    │   ├── lib/
    │   │   ├── api.ts               ← authApi, recordsApi, adminApi (typed fetch)
    │   │   └── utils.ts             ← fmtDate, fmtMoney, getToken, clearAuth, etc.
    │   ├── components/
    │   │   ├── NavBar.tsx           ← bottom nav (shows Admin tab for role=admin)
    │   │   ├── RecordCard.tsx       ← single record display
    │   │   ├── RecordForm.tsx       ← create/edit modal
    │   │   ├── Toast.tsx            ← global toast system (toast() function)
    │   │   └── ConfirmDialog.tsx    ← delete confirmation modal
    │   └── app/
    │       ├── layout.tsx           ← root layout (fonts, meta)
    │       ├── globals.css          ← Tailwind + custom component classes
    │       ├── page.tsx             ← redirect → /daily or /login
    │       ├── login/page.tsx       ← login form
    │       └── (dashboard)/
    │           ├── layout.tsx       ← auth guard + NavBar + ToastContainer
    │           ├── daily/page.tsx   ← บันทึกรายวัน (main page)
    │           ├── summary/page.tsx ← สรุปรายวัน
    │           ├── monthly/page.tsx ← สรุปรายเดือน
    │           ├── filter/page.tsx  ← filter ช่วงวันที่
    │           └── admin/page.tsx   ← admin: user management + report
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

## คำสั่งสำคัญ

### Backend
```bash
cd backend
cp .env.example .env           # แก้ค่าใน .env
go mod tidy                    # install dependencies
make migrate                   # สร้างตาราง DB
make seed                      # สร้าง admin user (admin / admin123)
make run                       # dev server (port 8080)
make build                     # build binary
```

### Frontend
```bash
cd frontend
cp .env.example .env.local     # แก้ NEXT_PUBLIC_API_URL
npm install
npm run dev                    # dev server (port 3000)
npm run build && npm run start # production
```

## API Endpoints

### Auth
- `POST /api/auth/login`          → `{ username, password }` → `{ token, user }`
- `GET  /api/auth/me`             ← ต้อง auth
- `POST /api/auth/change-password` ← ต้อง auth

### Records (ต้อง auth — เห็นเฉพาะของตัวเอง)
- `GET    /api/records?date=YYYY-MM-DD`
- `GET    /api/records?start=&end=`
- `GET    /api/records/summary/daily?start=&end=`
- `GET    /api/records/summary/monthly?year=`
- `POST   /api/records`
- `PUT    /api/records/:id`
- `DELETE /api/records/:id`

### Admin (ต้อง auth + role=admin)
- `GET    /api/admin/users`
- `POST   /api/admin/users`
- `PUT    /api/admin/users/:id`
- `DELETE /api/admin/users/:id`
- `GET    /api/admin/report?start=&end=&user_id=`

## Database Schema (ดูรายละเอียดใน migrations/001_init.sql)
- **users**: id (UUID), username, password (bcrypt), name, role, is_active
- **records**: id, user_id (FK), date, seq, racket, string1, string2, price (200|300), note
- ทั้งสองตารางมี `created_at`, `updated_at` + auto-update trigger

## ข้อควรระวัง
- ห้ามเก็บ plain text password — ใช้ bcrypt cost=12 เสมอ
- ทุก records query ต้อง filter by `user_id` เสมอ
- Admin routes ต้องผ่าน `middleware.AdminOnly()` ทุกครั้ง
- `updated_at` auto-update ผ่าน PostgreSQL trigger (ไม่ต้องใส่ใน SQL)
- CORS ต้อง whitelist เฉพาะ frontend URL

## สถานะปัจจุบัน
- [x] Backend Go: Auth, Records CRUD, Admin, graceful shutdown
- [x] Frontend Next.js: Login, Daily, Summary, Monthly, Filter, Admin
- [ ] Deploy backend (Railway / Render)
- [ ] Deploy frontend (Vercel)
- [ ] Export feature (Excel/PDF) — Phase 3
