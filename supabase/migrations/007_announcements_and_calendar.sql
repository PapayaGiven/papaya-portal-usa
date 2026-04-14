-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add videos_done column to daily_checklist for per-video tracking
ALTER TABLE daily_checklist ADD COLUMN IF NOT EXISTS videos_done INTEGER DEFAULT 0;
