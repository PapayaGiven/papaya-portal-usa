-- Announcements: display_type controls how the banner renders on creator
-- dashboards. 'banner' = dismissible sticky top bar (existing behavior),
-- 'popup' = full-screen modal shown once per user via localStorage.
--
-- Idempotent — safe to re-run.

alter table announcements
  add column if not exists display_type text not null default 'banner';
