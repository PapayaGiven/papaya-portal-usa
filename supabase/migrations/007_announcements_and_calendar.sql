-- ============================================================
-- Announcements table
-- ============================================================

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Row Level Security — Announcements
-- ============================================================

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read active announcements
CREATE POLICY "announcements_read_active" ON announcements
  FOR SELECT TO authenticated USING (is_active = true);

-- Admin operations (insert/update/delete) are done via the
-- service-role key (createAdminClient), which bypasses RLS.

-- ============================================================
-- Add videos_done column to daily_checklist
-- ============================================================

ALTER TABLE daily_checklist ADD COLUMN IF NOT EXISTS videos_done INTEGER DEFAULT 0;
