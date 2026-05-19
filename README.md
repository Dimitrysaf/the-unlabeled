# The Unlabeled

A personal blog. Previous attempts didn't pass the vibe check — this one might.

**Live:** [the-unlabeled.com](https://the-unlabeled.com)

---

## Stack

| Layer | Tech |
|---|---|
| Build | [Vite](https://vite.dev) |
| UI Framework | [GOV.UK Frontend](https://frontend.design-system.service.gov.uk/) v5.9 |
| Styling | GOV.UK CSS + custom `style.css` overrides |
| Scripting | Vanilla JS |
| Database & Auth | [Supabase](https://supabase.com) |
| Markdown | [marked](https://marked.js.org) + [EasyMDE](https://easymde.github.io/EasyMDE/) |
| Charts | [Chart.js](https://www.chartjs.org/) + chartjs-plugin-zoom |
| Push notifications | [web-push](https://github.com/web-push-libs/web-push) |
| Analytics | Vercel Analytics + Vercel Speed Insights |
| Deploy | [Vercel](https://vercel.com) |

The GOV.UK design system handles layout and accessibility. `src/style.css` customises it to feel less like a government portal.

---

## Project Structure

```
the-unlabeled/
├── api/             # Vercel serverless functions (article SSR, sitemap, push)
├── public/          # Static assets (favicon, sw.js, manifest)
├── src/
│   ├── components/  # Shared UI components (Layout, Grid, Comments, etc.)
│   ├── data/        # Supabase query helpers
│   ├── lib/         # Utilities (auth, validation, logger, markdown, etc.)
│   ├── pages/       # Page renderers (one file per route)
│   ├── main.js      # Entry point and client-side router
│   └── style.css    # GOV.UK overrides & custom styles
├── index.html
├── vercel.json
└── package.json
```

---

## Getting Started

```bash
pnpm install
pnpm run dev
```

Other scripts:

```bash
pnpm run build    # Production build
pnpm run preview  # Preview the production build locally
```

Copy `.env.example` to `.env.local` and fill in your Supabase and VAPID keys before running locally.

---

## Roadmap

- [x] Database integration (Supabase)
- [x] Markdown support for article content
- [x] Comments and voting system
- [x] Push notifications
- [x] Admin panel
- [ ] More articles, presumably

---

## Status

Work in progress. Things will break and change without warning.
