-- Admin Dashboard support
-- Adds a level_updated_at timestamp so the dashboard can answer "how many
-- creators leveled up this month". updateCreatorLevel (app/admin/actions)
-- writes this on every level change. Existing rows get NULL, which we
-- treat as "no recent level change" in the dashboard query.

alter table creators add column if not exists level_updated_at timestamptz;
