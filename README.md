# ☀️ Papaya Social Club — Members Portal

Private creator portal for TikTok Shop creators in Germany. Built with Next.js 14 App Router, Supabase, and Tailwind CSS.

## Stack

- **Framework:** Next.js 14 (App Router, Server Components)
- **Auth & DB:** Supabase (Auth + Postgres + RLS)
- **Styling:** Tailwind CSS + Google Fonts (Playfair Display, DM Sans)
- **Deployment:** Vercel-ready

---

## Pages

| Route | Description |
|---|---|
| `/login` | Supabase email+password login |
| `/dashboard` | Creator home: smart banner, GMV ring, tasks, campaigns, products |
| `/progress` | Level track: Initiation → Rising → Pro → Elite |
| `/rewards` | What creators earn at each level |
| `/admin` | Password-protected admin panel |

---

## Local Setup

```bash
# 1. Install dependencies
cd papaya-portal
npm install

# 2. Environment variables are already set in .env.local
# If deploying, copy to your host's env vars (see below)

# 3. Set up the database — run this once in Supabase SQL Editor:
# supabase/migrations/001_init.sql

# 4. Start dev server
npm run dev
# → http://localhost:3000
```

---

## Admin Panel

URL: `http://localhost:3000/admin`
Password: set via `ADMIN_PASSWORD` in `.env.local` (default: `papaya-admin-2024`)

**Tabs:**
- **Creators** — View all creators, edit GMV inline (auto-recalculates level), change level manually, toggle active/inactive, invite new creators via Supabase Auth email invite
- **Produkte** — Add/edit/delete products, toggle exclusive flag
- **Kampagnen** — Add campaigns, edit spots remaining, toggle active/inactive
- **Aufgaben** — Assign daily tasks individually or bulk-assign by level; view today's completion status

---

## Creator Levels

| Level | GMV Range | Next Target |
|---|---|---|
| Initiation | €0 – €299 | €300 |
| Rising | €300 – €999 | €1,000 |
| Pro | €1,000 – €4,999 | €5,000 |
| Elite | €5,000+ | — |

Level is **automatically recalculated** when GMV is updated via the admin panel.

---

## TikTok Shop API Integration (Future)

The `gmv` column on `creators` is a plain `numeric` field — no migration needed.

To add auto-sync:
1. Create `app/api/sync-gmv/route.ts` (webhook or cron endpoint)
2. Use `createAdminClient()` from `lib/supabase/admin.ts` (service role, bypasses RLS)
3. Update GMV: `UPDATE creators SET gmv = ? WHERE email = ?`
4. Reuse the level-recalculation logic from `updateCreatorGMV()` in `app/admin/actions.ts`

---

## Deploying to Vercel

1. Push to GitHub
2. Import repo in Vercel
3. Add these environment variables in Vercel dashboard:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ADMIN_PASSWORD=...
   NEXT_PUBLIC_SITE_URL=https://your-vercel-url.vercel.app
   ```
4. Deploy — builds in ~30s

---

## Security Notes

- Creators can only read/update their own rows (Supabase RLS via `email = auth.email()`)
- Admin panel uses `SUPABASE_SERVICE_ROLE_KEY` (server-side only, never exposed to client)
- Admin session stored as `httpOnly` cookie, expires in 24h
- See `supabase/migrations/001_init.sql` for all RLS policies
