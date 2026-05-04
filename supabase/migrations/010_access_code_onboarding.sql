-- Access code onboarding (replaces email-invite flow)
-- These columns may already exist in production from manual SQL editor runs;
-- the IF NOT EXISTS guards make this safe to re-apply.

alter table creators add column if not exists access_code text unique;
alter table creators add column if not exists has_completed_onboarding boolean default false;

-- Backfill access codes for any existing creator who doesn't have one yet.
-- Format: ABC-123-XYZ (3 uppercase letters, 3 digits, 3 uppercase letters).
update creators
set access_code = upper(
  chr(65 + floor(random() * 26)::int) ||
  chr(65 + floor(random() * 26)::int) ||
  chr(65 + floor(random() * 26)::int) || '-' ||
  floor(random() * 9 + 1)::text ||
  floor(random() * 10)::text ||
  floor(random() * 10)::text || '-' ||
  chr(65 + floor(random() * 26)::int) ||
  chr(65 + floor(random() * 26)::int) ||
  chr(65 + floor(random() * 26)::int)
)
where access_code is null;
