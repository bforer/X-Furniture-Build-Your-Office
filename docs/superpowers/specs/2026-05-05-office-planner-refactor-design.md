# Office Planner — Refactor & README Design

**Date:** 2026-05-05  
**Status:** Approved

---

## What we're doing

The project currently ships as a single monolithic `office-planner.html` (~1.3 MB). We're splitting it into a proper multi-file structure so the codebase is maintainable on GitHub — easy to update product photos, pricing, copy, and styles without touching everything at once. We're also writing a developer-facing README.

---

## Project structure (target)

```
build-my-office/
├── index.html               ← shell: loads CSS + scripts, no inline styles or logic
├── css/
│   └── styles.css           ← all styles extracted from <style> block
├── js/
│   ├── main.js              ← init, catalogue render, stepper, totals, scroll-to-form
│   ├── quote.js             ← form validation, webhook POST, status banner
│   ├── pdf.js               ← PDF generation (jsPDF calls only)
│   └── data/
│       └── items.js         ← ITEMS array; image src = path to assets/images/
├── assets/
│   └── images/              ← product JPEGs extracted from base64, named by item id
│       ├── exec-traditional.jpg
│       └── ...
├── vendor/
│   └── jspdf.min.js         ← jsPDF 2.5.1 extracted from inline block
├── docs/
│   └── web-team-brief.docx  ← existing integration guide
└── README.md
```

---

## Extraction plan

### CSS
Lift the entire `<style>` block verbatim into `css/styles.css`. Replace with `<link rel="stylesheet" href="css/styles.css">`.

### jsPDF vendor
The minified jsPDF source is already a discrete block (line 67 of the original). Extract it exactly as-is into `vendor/jspdf.min.js`. Replace with `<script src="vendor/jspdf.min.js"></script>`.

### Images
Each item in ITEMS has an `img` field containing a `data:image/jpeg;base64,...` string. Write each one to `assets/images/<id>.jpg` as a binary JPEG. Update the `img` field in `items.js` to `./assets/images/<id>.jpg`.

> There are 8 items. We'll script the extraction (Node one-liner) rather than copying by hand.

### JS modules
The original script block (after jsPDF) contains everything. Split at logical boundaries:

| File | Contains |
|------|----------|
| `js/data/items.js` | `const ITEMS = [...]` — exported as `window.ITEMS` (no bundler, plain globals) |
| `js/pdf.js` | `generateQuotePDF()`, `triggerPdfDownload()`, `drawXmark()`, helper format fns (`fmtZAR2`, `fmtSqm`) |
| `js/quote.js` | `buildPayload()`, `submitQuote()`, `setStatus()`, `showQuote()`, `computeTotals()`, `getRef()`, `WEBHOOK_URL`, `SALES_EMAIL` |
| `js/main.js` | DOM init, catalogue render loop, stepper events, `updateTotals()`, scroll-to-form, `goBtn` handler |

Load order in `index.html`:
```html
<script src="vendor/jspdf.min.js"></script>
<script src="js/data/items.js"></script>
<script src="js/pdf.js"></script>
<script src="js/quote.js"></script>
<script src="js/main.js"></script>
```

No module bundler — plain globals. `ITEMS`, `generateQuotePDF`, `triggerPdfDownload`, `buildPayload`, `submitQuote`, `setStatus`, `showQuote`, `computeTotals`, `getRef`, `fmtZAR2`, `fmtSqm` all live on `window` implicitly (or we use explicit `window.X =` assignments to make it clear).

---

## README sections

1. **What it is** — one-paragraph description
2. **How it works** — architecture diagram (text-based): browser → form → PDF + webhook
3. **Project structure** — annotated tree
4. **Local development** — `python -m http.server` or `npx serve .`
5. **Configuration** — how to set `WEBHOOK_URL` in `js/quote.js`
6. **Webhook payload** — full JSON shape with field descriptions
7. **Integration options** — Zapier / Make.com / Formspree / CRM, one paragraph each
8. **Deployment** — upload the directory to `quotes.xfurniture.co.za`; no build step required; all asset paths are relative so nothing changes between local dev and production
9. **Updating products** — how to edit `js/data/items.js` and swap images

---

## What doesn't change

- No framework, no bundler, no npm — plain HTML/CSS/JS
- Deployment model: upload directory to web server, done
- The webhook payload shape and PDF output are identical to the original
- `web-team-brief.docx` stays in `docs/` and is referenced from the README

---

## Out of scope

- Rewriting any business logic
- Changing the UI or PDF design
- Adding TypeScript or a build pipeline
