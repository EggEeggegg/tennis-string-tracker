# Tennis String Tracker — Full-Stack

ระบบบันทึกการขึ้นเอ็นเทนนิส พร้อมระบบ user และ admin dashboard

## Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | Next.js 14 (App Router, TypeScript, Tailwind CSS) |
| Backend  | Go 1.24 + Gin + GORM + pgx        |
| Database | PostgreSQL (Neon.tech) + Excelize |
| Auth     | JWT (HS256) + bcrypt (cost 12)    |

## Quick Start

### Prerequisites
- Go 1.24+
- Node.js 20+
- PostgreSQL database (สมัคร [Neon.tech](https://neon.tech) ฟรี)

### 1. Database

สมัคร Neon.tech → สร้าง database → copy connection string

รัน migration:
```bash
psql "$DATABASE_URL" -f backend/migrations/001_init.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# แก้ไข .env ใส่ DATABASE_URL และ JWT_SECRET

go mod download
go run ./cmd/seed    # สร้าง admin user
go run ./cmd/server  # start dev server (port 8080)
```

หรือใช้ Makefile:
```bash
make seed
make run
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
# แก้ไข NEXT_PUBLIC_API_URL ถ้า backend ไม่ได้รันที่ localhost:8080

npm install
npm run dev  # start dev server (port 3000)
```

### 4. Deploy

| Service  | Platform              |
|----------|-----------------------|
| Frontend | Vercel                |
| Backend  | Railway / Render      |
| Database | Neon.tech             |

## Default Admin

- Username: `admin`
- Password: `admin123`
- **เปลี่ยนรหัสผ่านหลัง login ครั้งแรก!**

## API Endpoints

### Auth
| Method | Path                        | Auth | Description              |
|--------|-----------------------------|------|--------------------------|
| POST   | /api/auth/login             | -    | Login, รับ JWT token     |
| GET    | /api/auth/me                | JWT  | ข้อมูล user ปัจจุบัน    |
| POST   | /api/auth/change-password   | JWT  | เปลี่ยนรหัสผ่าน         |

### Records
| Method | Path                        | Auth | Description              |
|--------|-----------------------------|------|--------------------------|
| GET    | /api/records                | JWT  | ดึง records (filter ได้) |
| POST   | /api/records                | JWT  | สร้าง record ใหม่        |
| PUT    | /api/records/:id            | JWT  | แก้ไข record             |
| DELETE | /api/records/:id            | JWT  | ลบ record                |
| GET    | /api/records/summary/daily  | JWT  | สรุปรายวัน              |
| GET    | /api/records/summary/monthly| JWT  | สรุปรายเดือน            |

### Admin
| Method | Path                | Auth       | Description         |
|--------|---------------------|------------|---------------------|
| GET    | /api/admin/users    | JWT+Admin  | ดู user ทั้งหมด    |
| POST   | /api/admin/users    | JWT+Admin  | สร้าง user ใหม่    |
| PUT    | /api/admin/users/:id| JWT+Admin  | แก้ไข / toggle user |
| DELETE | /api/admin/users/:id| JWT+Admin  | ลบ user             |
| GET    | /api/admin/report   | JWT+Admin  | Report รวมทุก user  |
| POST   | /api/records/export | JWT       | Export CSV/Excel    |

## Project Structure

```
tennis-tracker/
├── docs/
│   └── architecture.md        ← full system architecture
├── backend/
│   ├── cmd/
│   │   ├── server/main.go     ← entry point (HTTP server + graceful shutdown)
│   │   └── seed/main.go       ← seed admin user
│   ├── internal/
│   │   ├── config/config.go   ← env config
│   │   ├── database/          ← GORM connection
│   │   ├── handler/           ← HTTP handlers (auth, records, admin, export)
│   │   ├── middleware/        ← JWT auth, admin-only
│   │   ├── model/             ← GORM models (User, Record) + DTOs
│   │   └── router/router.go   ← Gin router setup + CORS
│   ├── migrations/
│   │   ├── 001_init.sql       ← DB schema + triggers
│   │   └── 002_add_record_type.sql ← type column (string | sale)
│   ├── go.mod
│   ├── Makefile
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── app/               ← Next.js App Router pages
    │   │   ├── login/         ← หน้า login
    │   │   └── (dashboard)/   ← daily, summary, filter, admin
    │   ├── components/        ← NavBar, Toast, ConfirmDialog, RecordForm, etc.
    │   ├── lib/               ← api client (authApi, recordsApi, adminApi), utils
    │   └── types/             ← TypeScript types (User, Record, DaySummary, etc.)
    ├── next.config.ts         ← proxy /api/* → backend
    ├── tailwind.config.ts
    └── .env.example
```

## Environment Variables

### Backend (`backend/.env`)
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your-secret-key-here
PORT=8080
GIN_MODE=debug
CORS_ORIGIN=http://localhost:3000
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```
