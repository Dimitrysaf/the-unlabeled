# The Unlabeled

A personal blog. Previous attempts didn't pass the vibe check — this one might.

**Live:** [the-unlabeled.vercel.app](https://the-unlabeled.vercel.app)

---

## Stack

| Layer | Tech |
|---|---|
| Build | [Vite](https://vite.dev) |
| UI Framework | [GOV.UK Frontend](https://frontend.design-system.service.gov.uk/) v5.9 |
| Styling | GOV.UK CSS + custom `style.css` overrides |
| Scripting | Vanilla JS + [jQuery](https://jquery.com/) |
| Charts | [Chart.js](https://www.chartjs.org/) + chartjs-plugin-zoom |
| Icons | Font Awesome 6 |
| Deploy | [Vercel](https://vercel.com) |

The GOV.UK design system handles the heavy lifting for layout and accessibility. `src/style.css` customises it to feel less like a government portal and more like an actual blog.

---

## Project Structure

```
the-unlabeled/
├── public/          # Static assets
├── src/
│   ├── main.js      # Entry point
│   └── style.css    # GOV.UK overrides & custom styles
├── index.html
├── package.json
└── vercel.json
```

---

## Getting Started

```bash
npm install
npm run dev
```

Other scripts:

```bash
npm run build    # Production build
npm run preview  # Preview the production build locally
```

---

## Roadmap

- [ ] Database integration for post metadata
- [ ] Markdown support for post content (if the schema stays simple enough)
- [ ] More posts, presumably

---

## Status

Work in progress. Things will break and change without warning.
