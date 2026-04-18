# Campus Sports Scheduler — Setup Guide

## Overview

This is a fully static web app (HTML + CSS + vanilla JS) backed by **Supabase** (free tier).
It deploys to **Netlify** with zero configuration beyond what's in `netlify.toml`.

---

## 1. Supabase Setup

### 1a. Create a project

1. Go to [supabase.com](https://supabase.com) and sign up / log in.
2. Click **New Project**, give it a name (e.g. `campus-sports`), set a DB password, choose a region close to Germany (e.g. `eu-central-1`).
3. Wait ~1 minute for it to provision.

---

### 1b. Create the `games` table

In the Supabase dashboard → **Table Editor** → **New Table**, or run this SQL in the **SQL Editor**:

```sql
create table games (
  id           uuid primary key default gen_random_uuid(),
  sport        text not null,
  "locationName" text not null,
  lat          float8 not null,
  lng          float8 not null,
  "timeOptions" jsonb not null default '[]',
  "expiresAt"  timestamptz not null,
  "createdAt"  timestamptz not null default now()
);

-- Allow anonymous reads and inserts (no auth)
alter table games enable row level security;

create policy "Public read"   on games for select using (true);
create policy "Public insert" on games for insert with check (true);
create policy "Public update" on games for update using (true);
```

> **Note:** The `update` policy is needed for casting votes.

---

### 1c. Create the `config` table (weekly reset)

```sql
create table config (
  key   text primary key,
  value text not null
);

alter table config enable row level security;

create policy "Public read"   on config for select using (true);
create policy "Public update" on config for update using (true);
create policy "Public insert" on config for insert with check (true);

-- Seed the initial lastReset value to epoch start
insert into config (key, value)
values ('lastReset', '1970-01-01T00:00:00.000Z')
on conflict (key) do nothing;
```

---

### 1d. Create the `reset_all_votes` RPC function

This stored function atomically zeroes every vote in one call:

```sql
create or replace function reset_all_votes()
returns void
language plpgsql
security definer
as $$
declare
  rec record;
  opts jsonb;
  i    int;
begin
  for rec in select id, "timeOptions" from games loop
    opts := rec."timeOptions";
    for i in 0 .. jsonb_array_length(opts) - 1 loop
      opts := jsonb_set(opts, array[i::text, 'votes'], '0');
    end loop;
    update games set "timeOptions" = opts where id = rec.id;
  end loop;
end;
$$;

-- Grant anon role permission to call it
grant execute on function reset_all_votes() to anon;
```

---

### 1e. Get your API keys

In the Supabase dashboard → **Settings** → **API**:

- Copy **Project URL** (looks like `https://xxxxxxxxxxxx.supabase.co`)
- Copy **anon / public** key (long JWT string)

---

## 2. Configure the App

Open `js/supabase.js` and replace the two placeholder values:

```js
const SUPABASE_URL      = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

---

## 3. Deploy to Netlify

### Option A — Netlify Drop (fastest, no account needed)

1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag-and-drop the entire project folder onto the page.
3. Done — Netlify gives you a live URL in seconds.

### Option B — Git + Netlify CI (recommended for ongoing updates)

1. Push the project to a GitHub / GitLab / Bitbucket repository.
2. Log in to [netlify.com](https://netlify.com) → **Add new site** → **Import an existing project**.
3. Connect your repo.
4. Leave build settings blank (the `netlify.toml` handles everything).
5. Click **Deploy site**.

Every `git push` will auto-deploy.

---

## 4. Project File Structure

```
campus-sports-scheduler/
├── index.html          ← Single-page app shell
├── style.css           ← All styles (mobile-first)
├── netlify.toml        ← Netlify deploy config
├── SETUP.md            ← This file
└── js/
    ├── app.js          ← Entry point, wires everything together
    ├── supabase.js     ← Supabase client (put your keys here)
    ├── games.js        ← DB operations: fetch / create / vote
    ├── reset.js        ← Weekly vote-reset logic
    ├── votes.js        ← localStorage vote tracker (prevent duplicates)
    ├── map.js          ← Leaflet map helpers
    ├── locations.js    ← Predefined Hagen locations + coordinates
    └── ui.js           ← DOM rendering (cards, modals, vote UI)
```

---

## 5. Customising Locations

Edit `js/locations.js` to add, remove, or adjust sports venues.
Each entry needs:

```js
{
  name:   'Venue Name',
  lat:    51.3697,
  lng:    7.4845,
  sports: ['football', 'basketball'],
}
```

---

## 6. Weekly Reset Behaviour

- On every page load, the app compares the stored `lastReset` timestamp to the most recent Sunday 00:00 UTC.
- If a new week has started, it atomically claims the reset (race-condition safe) and zeros all votes.
- A yellow banner appears briefly to inform users.
- The user's local vote history (in `localStorage`) is **not** automatically cleared on reset — they'll get a fresh vote ability once the server-side counts are zeroed, but the browser still remembers their selections. To also clear localStorage on reset, call `clearAllVotes()` from `votes.js` inside `checkAndRunWeeklyReset`.

---

## 7. Free Tier Limits (Supabase)

| Resource        | Free limit          |
|-----------------|---------------------|
| DB storage      | 500 MB              |
| API requests    | Unlimited           |
| Realtime        | 200 concurrent      |
| Edge functions  | Not used here       |

This app is well within free limits for a campus-scale deployment.
