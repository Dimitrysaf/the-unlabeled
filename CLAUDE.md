# The Unlabeled

Political blog and data journalism SPA deployed at https://the-unlabeled.com.

## Stack

| Layer      | Technology                                      |
| ---------- | ----------------------------------------------- |
| Frontend   | Vanilla JS (ES modules) + Vite 8                |
| Design     | GOV.UK Frontend 5.x (loaded from jsDelivr CDN) |
| Backend    | Supabase (PostgreSQL + Auth)                    |
| Deployment | Vercel (static site + serverless functions)     |

## Setup

```bash
cp .env.example .env.local   # fill in values (see comments in .env.example)
pnpm install
pnpm run dev                 # http://localhost:5173
```

## Commands

| Command                | Description                          |
| ---------------------- | ------------------------------------ |
| `pnpm run dev`         | Start Vite dev server                |
| `pnpm run build`       | Production build → `dist/`           |
| `pnpm run preview`     | Preview the production build locally |
| `pnpm run lint`        | ESLint check                         |
| `pnpm run lint:fix`    | ESLint auto-fix                      |
| `pnpm run format`      | Prettier format all source files     |
| `pnpm run format:check`| Check formatting without writing     |
| `pnpm test`            | Run tests once                       |
| `pnpm run test:watch`  | Run tests in watch mode              |
| `pnpm run test:coverage`| Run tests with coverage report      |

## Architecture

```
src/
  pages/       Route-specific renderers (one file per route)
  components/  Shared UI — Layout, Grid, Comments, ErrorPage
  data/        Supabase query wrappers; all queries cached for 5 min
  lib/         Utilities: auth, validation, sanitize, escape, seo, …
api/           Vercel serverless functions (Node.js runtime)
public/        Static assets: favicon, PWA manifest, service worker
```

## Key Conventions

### Security — innerHTML contract
Every `innerHTML` assignment must use `escapeHtml` / `escapeAttr` from `src/lib/escape.js`
for any user-supplied or database-sourced data. The only exception is admin-authored
`html_content`, which goes through `sanitizeHtml` from `src/lib/sanitize.js` first.

`sanitizeHtml` is **browser-only** — it uses `DOMParser`. Do not call it from `api/` code.

### Caching
All Supabase queries in `src/data/` use a shared 5-minute in-memory cache.
The cache TTL constant is defined per-module.

### Routing
Client-side router is in `src/router.js` (vanilla JS, no framework). Pages are
lazily imported on navigation.

### GOV.UK Frontend
GOV.UK Frontend JS is loaded from CDN (not bundled). `window.GOVUKFrontend.initAll()`
is called in `src/main.js` after each client-side navigation.

### Environment Variables
- `VITE_*` vars → bundled into the client-side JS by Vite.
- All other vars → available only in `api/` serverless functions (never sent to browser).
- See `.env.example` for the full list and where to find each value.

## Deployment

Vercel auto-deploys on push to `main`. The configuration in `vercel.json` maps:
- Static frontend build (`dist/`) to the CDN
- Five serverless functions under `/api/`

The `send-notifications.js` function is called every 5 minutes by a Supabase `pg_cron`
job via `pg_net`. Authenticate the cron call with the `CRON_SECRET` header.
