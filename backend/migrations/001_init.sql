-- Tennis String Tracker — Database Schema
-- Run: psql "$DATABASE_URL" -f migrations/001_init.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE user_role_enum AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Users ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id         UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  username   VARCHAR(50)      UNIQUE NOT NULL,
  password   VARCHAR(255)     NOT NULL,           -- bcrypt hashed
  name       VARCHAR(100)     NOT NULL,
  role       user_role_enum   NOT NULL DEFAULT 'user'::user_role_enum,
  is_active  BOOLEAN          DEFAULT true,
  created_at TIMESTAMPTZ      DEFAULT now(),
  updated_at TIMESTAMPTZ      DEFAULT now()
);

-- ─── Records ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS records (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date       DATE         NOT NULL,
  seq        INTEGER      NOT NULL,
  racket     VARCHAR(200) NOT NULL,
  string1    VARCHAR(200) DEFAULT '',
  string2    VARCHAR(200) DEFAULT '',
  price      INTEGER      NOT NULL CHECK (price IN (200, 300)),
  note       TEXT         DEFAULT '',
  created_at TIMESTAMPTZ  DEFAULT now(),
  updated_at TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_records_user_date ON records (user_id, date);
CREATE INDEX IF NOT EXISTS idx_records_date      ON records (date);

-- ─── updated_at trigger ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at   ON users;
DROP TRIGGER IF EXISTS trg_records_updated_at ON records;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_records_updated_at
  BEFORE UPDATE ON records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── NOTE ────────────────────────────────────────────────────────────────────
-- Admin user is created by running: make seed
-- (cmd/seed/main.go  — generates bcrypt hash at runtime)
