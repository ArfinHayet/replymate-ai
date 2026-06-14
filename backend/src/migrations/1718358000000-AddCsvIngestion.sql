-- Migration: AddCsvIngestion
-- Created: 2026-06-14
--
-- Changes:
--   1. Create `csvs` table (parent record per uploaded CSV file)
--   2. Create `csv_chunks` table (one row per CSV row, stores pgvector embedding)
--   3. Add `csv_upload_limit` column to `plan` table
--   4. Seed default plan limits for existing rows

-- ─── 1. csvs ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS csvs (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"    UUID,
  "fileName"  TEXT          NOT NULL,
  "rowCount"  INT           NOT NULL DEFAULT 0,
  headers     TEXT[]        NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_csvs_user_id ON csvs ("userId");

-- ─── 2. csv_chunks ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS csv_chunks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"     UUID,
  "csvId"      UUID        REFERENCES csvs(id) ON DELETE CASCADE,
  content      TEXT        NOT NULL,
  "fileName"   TEXT        NOT NULL,
  "chunkIndex" INT         NOT NULL,
  embedding    TEXT        NOT NULL,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_csv_chunks_user_id ON csv_chunks ("userId");
CREATE INDEX IF NOT EXISTS idx_csv_chunks_csv_id  ON csv_chunks ("csvId");

-- ─── 3. plan: add csv_upload_limit column ─────────────────────────────────────

ALTER TABLE plan
  ADD COLUMN IF NOT EXISTS csv_upload_limit INT NOT NULL DEFAULT 0;

-- ─── 4. Seed limits for existing plans ───────────────────────────────────────
--   Free plan    (id = 1) → 5  CSV uploads
--   Premium plan (id = 2) → 50 CSV uploads

UPDATE plan SET csv_upload_limit = 5  WHERE id = 1 AND csv_upload_limit = 0;
UPDATE plan SET csv_upload_limit = 50 WHERE id = 2 AND csv_upload_limit = 0;
