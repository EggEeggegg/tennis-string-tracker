-- Add is_new_racket column: true = ลูกค้าซื้อไม้ใหม่ด้วย (+200 ค่าคอม)
-- Run: psql "$DATABASE_URL" -f migrations/002_add_record_type.sql

ALTER TABLE records
  ADD COLUMN IF NOT EXISTS is_new_racket BOOLEAN NOT NULL DEFAULT false;
