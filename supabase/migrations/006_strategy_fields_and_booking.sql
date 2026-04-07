-- Feature 1: Strategy — Video Focus + Quick Checklist
ALTER TABLE strategy_products ADD COLUMN IF NOT EXISTS video_focus TEXT;
ALTER TABLE strategy_products ADD COLUMN IF NOT EXISTS quick_checklist TEXT[];

-- Feature 2: 1:1 Booking Button
ALTER TABLE creators ADD COLUMN IF NOT EXISTS booking_link TEXT;

-- Settings table for booking configuration
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calls_per_month_initiation INTEGER DEFAULT 0,
  calls_per_month_foundation INTEGER DEFAULT 0,
  calls_per_month_growth INTEGER DEFAULT 1,
  calls_per_month_scale INTEGER DEFAULT 2,
  calls_per_month_elite INTEGER DEFAULT 4,
  booking_link_growth TEXT,
  booking_link_scale TEXT,
  booking_link_elite TEXT DEFAULT 'https://calendar.app.google/bW5ZsKF9wbDrLVF6A',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default settings row
INSERT INTO settings (
  calls_per_month_initiation, calls_per_month_foundation,
  calls_per_month_growth, calls_per_month_scale, calls_per_month_elite,
  booking_link_elite
) VALUES (0, 0, 1, 2, 4, 'https://calendar.app.google/bW5ZsKF9wbDrLVF6A')
ON CONFLICT DO NOTHING;
