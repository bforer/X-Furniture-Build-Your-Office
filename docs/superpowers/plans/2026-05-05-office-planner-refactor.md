# Office Planner — Refactor & README Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `office-planner.html` into a maintainable multi-file structure and write a developer README for the GitHub repo.

**Architecture:** A Node.js extraction script reads the monolithic HTML and writes each logical chunk into its own file — CSS, jsPDF vendor, product images, JS modules, and a clean `index.html` shell. No bundler; all JS files load as plain `<script>` tags in dependency order, sharing globals across files. The production URL is `https://quotes.xfurniture.co.za`.

**Tech Stack:** Vanilla HTML/CSS/JS, jsPDF 2.5.1 (vendored), Node.js (extraction script only — not a runtime dependency)

---

## File Map

| Source | Destination | What it contains |
|--------|-------------|-----------------|
| `office-planner.html` lines 16–415 | `vendor/jspdf.min.js` | jsPDF 2.5.1 verbatim |
| `office-planner.html` lines 418–1261 | `css/styles.css` | All CSS |
| `office-planner.html` line 1468 (base64) | `assets/images/<id>.jpg` × 8 | Product JPEGs |
| `office-planner.html` line 1468 (paths) | `js/data/items.js` | `const ITEMS` array with file paths |
| `office-planner.html` lines 1470–1472, 2115–2117 | `js/utils.js` | `fmtZAR`, `fmtZAR2`, `fmtSqm`, `escape` |
| `office-planner.html` lines 1737–2032 | `js/pdf.js` | `lastPdfBlob`, `generateQuotePDF`, `drawXmark`, `triggerPdfDownload` |
| `office-planner.html` lines 1612–1732, 2033–2113 | `js/quote.js` | `WEBHOOK_URL`, `SALES_EMAIL`, `submitQuote`, `buildPayload`, `setStatus`, `computeTotals`, `currentRef`, `getRef`, `showQuote` |
| `office-planner.html` lines 1459–1467, 1474–1610, 2119–2161 | `js/main.js` | `state`, catalogue render, stepper, `updateTotals`, form, event listeners, init call |
| Assembled | `index.html` | Head + body HTML + script/link tags |
| New | `scripts/extract-assets.js` | One-time extraction script |
| New | `README.md` | Developer docs |

**Load order** (bottom of `<body>` in `index.html`):
```
vendor/jspdf.min.js → js/data/items.js → js/utils.js → js/pdf.js → js/quote.js → js/main.js
```

---

## Task 1: Write extraction script

**Files:**
- Create: `scripts/extract-assets.js`

- [ ] **Create `scripts/extract-assets.js`**

```javascript
#!/usr/bin/env node
// Run once: node scripts/extract-assets.js
// Splits office-planner.html into the multi-file project structure.

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'office-planner.html'), 'utf8');
const lines = html.split('\n');

// 1-indexed inclusive slice
const slice = (from, to) => lines.slice(from - 1, to).join('\n');

['assets/images', 'css', 'js/data', 'vendor', 'scripts'].forEach(d =>
  fs.mkdirSync(path.join(ROOT, d), { recursive: true })
);

// ── 1. vendor/jspdf.min.js ────────────────────────────────────────────────
fs.writeFileSync(path.join(ROOT, 'vendor/jspdf.min.js'), slice(16, 415));
console.log('✓ vendor/jspdf.min.js');

// ── 2. css/styles.css ─────────────────────────────────────────────────────
fs.writeFileSync(path.join(ROOT, 'css/styles.css'), slice(418, 1261));
console.log('✓ css/styles.css');

// ── 3. assets/images/ + js/data/items.js ─────────────────────────────────
const itemsLine = lines[1467]; // line 1468, 0-indexed
const json      = itemsLine.trim().replace(/^const ITEMS = /, '').replace(/;$/, '');
const items     = JSON.parse(json);

items.forEach(item => {
  const base64 = item.img.replace(/^data:image\/\w+;base64,/, '');
  const buf    = Buffer.from(base64, 'base64');
  fs.writeFileSync(path.join(ROOT, 'assets/images', `${item.id}.jpg`), buf);
  console.log(`  ✓ assets/images/${item.id}.jpg  (${Math.round(buf.length / 1024)} KB)`);
});

const cleanItems = items.map(({ id, name, desc, price, rent, sqm, tag }) => ({
  id, name, desc, price, rent, sqm, tag,
  img: `./assets/images/${id}.jpg`
}));
fs.writeFileSync(
  path.join(ROOT, 'js/data/items.js'),
  `const ITEMS = ${JSON.stringify(cleanItems, null, 2)};\n`
);
console.log('✓ js/data/items.js');

// ── 4. js/utils.js ────────────────────────────────────────────────────────
const utils = slice(1470, 1472) + '\n\n' + slice(2115, 2117) + '\n';
fs.writeFileSync(path.join(ROOT, 'js/utils.js'), utils);
console.log('✓ js/utils.js');

// ── 5. js/pdf.js ──────────────────────────────────────────────────────────
fs.writeFileSync(path.join(ROOT, 'js/pdf.js'), slice(1737, 2032) + '\n');
console.log('✓ js/pdf.js');

// ── 6. js/quote.js ────────────────────────────────────────────────────────
const quoteJs = slice(1612, 1732) + '\n\n' + slice(2033, 2113) + '\n';
fs.writeFileSync(path.join(ROOT, 'js/quote.js'), quoteJs);
console.log('✓ js/quote.js');

// ── 7. js/main.js ─────────────────────────────────────────────────────────
const mainJs = slice(1459, 1467) + '\n'
             + slice(1474, 1610) + '\n\n'
             + slice(2119, 2161) + '\n';
fs.writeFileSync(path.join(ROOT, 'js/main.js'), mainJs);
console.log('✓ js/main.js');

// ── 8. index.html ─────────────────────────────────────────────────────────
const head        = slice(1, 13);       // DOCTYPE → Google Fonts link
const bodyContent = slice(1265, 1457);  // body HTML (excludes <body> tag)

const indexHtml = [
  head,
  '  <script src="vendor/jspdf.min.js"></script>',
  '  <link rel="stylesheet" href="css/styles.css">',
  '</head>',
  '<body>',
  bodyContent,
  '',
  '  <script src="js/data/items.js"></script>',
  '  <script src="js/utils.js"></script>',
  '  <script src="js/pdf.js"></script>',
  '  <script src="js/quote.js"></script>',
  '  <script src="js/main.js"></script>',
  '</body>',
  '</html>',
].join('\n');

fs.writeFileSync(path.join(ROOT, 'index.html'), indexHtml);
console.log('✓ index.html');

console.log('\nAll done. Test with: npx serve .');
```

- [ ] **Commit the extraction script**

```bash
git add scripts/extract-assets.js
git commit -m "chore: add extraction script to split monolithic HTML"
```

---

## Task 2: Run the extraction script

**Files:**
- Creates: `vendor/jspdf.min.js`, `css/styles.css`, `js/data/items.js`, `js/utils.js`, `js/pdf.js`, `js/quote.js`, `js/main.js`, `assets/images/*.jpg`, `index.html`

- [ ] **Run the script**

```bash
node scripts/extract-assets.js
```

Expected output:
```
✓ vendor/jspdf.min.js
✓ css/styles.css
  ✓ assets/images/exec-traditional.jpg  (NNN KB)
  ✓ assets/images/<id>.jpg  (NNN KB)
  ... (8 images total)
✓ js/data/items.js
✓ js/utils.js
✓ js/pdf.js
✓ js/quote.js
✓ js/main.js
✓ index.html

All done. Test with: npx serve .
```

- [ ] **Verify file sizes are sensible**

```bash
# Windows PowerShell
Get-ChildItem assets/images/ | Select-Object Name, Length
# Each image should be between 50 KB and 500 KB (they were base64-embedded JPEGs)
```

- [ ] **Verify item count**

```bash
node -e "const I = require('./js/data/items.js'); console.log('BUG - items.js is not a module')" 2>/dev/null || true
node -e "eval(require('fs').readFileSync('js/data/items.js','utf8')); console.log(ITEMS.length + ' items, first: ' + ITEMS[0].name)"
```

Expected: `8 items, first: Executive Office - Traditional`

- [ ] **Commit extracted assets**

```bash
git add index.html css/ js/ vendor/ assets/
git commit -m "chore: extract CSS, JS, images and vendor from monolithic HTML"
```

---

## Task 3: Verify locally in browser

**Files:** No changes — manual verification only

- [ ] **Start a local server**

```bash
npx serve .
```

Open `http://localhost:3000` in Chrome or Edge.

- [ ] **Check Network tab for 404s**

Open DevTools → Network → reload. All requests should return 200. Specifically verify:
- `css/styles.css` ✓
- `vendor/jspdf.min.js` ✓
- `js/data/items.js` ✓
- `js/utils.js` ✓
- `js/pdf.js` ✓
- `js/quote.js` ✓
- `js/main.js` ✓
- `assets/images/*.jpg` (8 images, all 200) ✓

- [ ] **Check Console tab for JS errors** — should be empty.

- [ ] **Test the golden path**
  1. Page loads with hero and product catalogue
  2. Product cards render with images, names, descriptions, area badges
  3. Click `+` on two products — items counter and m² update in the sticky summary bar
  4. Click **Continue** — page scrolls to the form
  5. Submit with blank fields — inline validation errors appear
  6. Fill all fields (Company, Contact, Phone, Email, Location) and submit
  7. Page transitions to Quote view — reference number, client details, line items, totals visible
  8. PDF downloads automatically — open the PDF and verify: X-Furniture header, client details, line items, totals, quote reference
  9. Click **Download PDF again** — another download triggers
  10. Click **Edit selection** — returns to form
  11. Click **Start over** → confirm → form clears, counter resets

- [ ] **Spot-check responsive layout**

  Resize browser to 375px wide (mobile). Verify:
  - Cards stack to single column
  - Summary bar stacks vertically
  - Form fields stack to single column

- [ ] **If any step fails**, check the Console error and cross-reference the line number with the corresponding extracted file. Fix the extraction script (Task 1) and re-run (Task 2).

---

## Task 4: Write README.md

**Files:**
- Create: `README.md`

- [ ] **Create `README.md`**

```markdown
# X-Furniture Office Planner

A self-contained office furniture planning and quoting tool for [X-Furniture](https://www.xfurniture.co.za). Customers browse eight pre-configured office layouts, set quantities, submit their details, and instantly receive a branded PDF quote — with no server required. Leads are optionally forwarded to your sales team via webhook.

Live at **[quotes.xfurniture.co.za](https://quotes.xfurniture.co.za)**.

---

## How it works

```
Customer selects items  →  fills contact form  →  clicks Generate Quote
        │
        ├─ 1. jsPDF generates a branded PDF in-browser  →  auto-downloads to device
        │
        └─ 2. Payload POSTed to WEBHOOK_URL  →  Zapier / Make.com / CRM  →  sales team email
```

All processing happens in the browser. There is no backend — the server only needs to serve static files. The PDF is generated client-side by [jsPDF](https://github.com/parallax/jsPDF) (vendored in `vendor/`).

---

## Project structure

```
build-my-office/
├── index.html              # Page shell — no inline styles or scripts
├── css/
│   └── styles.css          # All styles
├── js/
│   ├── data/
│   │   └── items.js        # Product catalogue — edit here to update items/prices
│   ├── utils.js            # Shared formatting helpers (fmtZAR, fmtSqm, escape)
│   ├── pdf.js              # PDF generation (jsPDF calls)
│   ├── quote.js            # Webhook POST, form payload, status banner, quote view
│   └── main.js             # Catalogue render, stepper, totals, form validation
├── assets/
│   └── images/             # Product JPEGs (one per catalogue item)
├── vendor/
│   └── jspdf.min.js        # jsPDF 2.5.1 — vendored for offline reliability
├── scripts/
│   └── extract-assets.js   # One-time extraction script (not a runtime dependency)
└── docs/
    └── web-team-brief.docx # Integration guide with webhook setup walkthrough
```

---

## Local development

No build step. Serve the directory with any static file server:

```bash
# Option A — Node (no install required)
npx serve .

# Option B — Python
python -m http.server 8080

# Option C — VS Code Live Server extension
# Right-click index.html → Open with Live Server
```

Then open `http://localhost:3000` (or whichever port the server prints).

> **Do not open `index.html` directly as a `file://` URL.** Browsers block cross-origin requests for local files, which breaks image loading and the webhook POST.

---

## Configuration

### Webhook URL

Open `js/quote.js` and replace the placeholder on line 1:

```js
// js/quote.js
const WEBHOOK_URL = 'REPLACE_ME_WITH_YOUR_WEBHOOK_URL';
```

Set this to your Zapier catch-hook URL, Make.com webhook, Formspree endpoint, or CRM intake URL. See [Integration options](#integration-options) below.

If `WEBHOOK_URL` is left as the placeholder, the PDF still downloads — the customer just won't trigger a sales notification.

### Sales email address

```js
const SALES_EMAIL = 'sales@xfurniture.co.za';
```

This address appears in customer-facing fallback messages when the webhook is unreachable.

---

## Webhook payload

When a customer submits the form, the planner sends a `POST` request with `Content-Type: application/json`:

```json
{
  "client": {
    "company":  "Acme Corp",
    "contact":  "Jane Smith",
    "phone":    "+27 11 000 0000",
    "email":    "jane@acme.co.za",
    "location": "Sandton, Johannesburg"
  },
  "lineItems": [
    {
      "sku":         "exec-traditional",
      "name":        "Executive Office - Traditional",
      "description": "Solid Walnut veneer desk ...",
      "qty":         2,
      "unitPrice":   237166.99,
      "unitRent":    5872.25,
      "unitSqm":     36.0,
      "lineTotal":   474333.99,
      "lineRent":    11744.50,
      "lineSqm":     72.0
    }
  ],
  "totals": {
    "purchase": 474333.99,
    "rental":   11744.50,
    "sqm":      72.0
  },
  "reference": "XF-260427-AB3X",
  "issuedAt":  "2026-04-27T08:15:00.000Z"
}
```

| Field | Type | Notes |
|-------|------|-------|
| `client` | object | Contact details from the form |
| `lineItems` | array | One entry per selected configuration |
| `lineItems[].sku` | string | Matches `id` in `js/data/items.js` |
| `totals.purchase` | number | Sum of all `lineTotal` values, excl. VAT |
| `totals.rental` | number | Sum of all `lineRent` values (36-month indicative) |
| `totals.sqm` | number | Total floor area required |
| `reference` | string | Format: `XF-YYMMDD-XXXX` |
| `issuedAt` | string | ISO 8601 UTC timestamp |

---

## Integration options

### Zapier
1. Create a Zap: trigger = **Webhooks by Zapier → Catch Hook**
2. Copy the generated webhook URL into `WEBHOOK_URL`
3. Add an action: **Gmail / Outlook → Send Email** — map `client.email`, `reference`, `totals.purchase` into the subject and body
4. (Optional) add a second action to create a CRM record

### Make.com (formerly Integromat)
1. Create a scenario: trigger = **Webhooks → Custom Webhook**
2. Copy the URL into `WEBHOOK_URL`
3. Add an Email module — map the JSON fields as above

### Formspree
1. Sign up at [formspree.io](https://formspree.io), create an endpoint
2. Paste the endpoint URL into `WEBHOOK_URL`
3. Formspree sends each submission to your configured inbox automatically

### CRM (HubSpot, Salesforce, Pipedrive, etc.)
Most CRMs expose a native webhook or form-submission endpoint. Paste the CRM's intake URL directly into `WEBHOOK_URL`. Alternatively, route through Zapier/Make.com to map fields to CRM properties before creating a contact or deal.

For detailed setup instructions and a recommended sales-team email template, see `docs/web-team-brief.docx`.

---

## Deployment

Upload the entire directory to the web server. All asset paths are relative, so no changes are needed between local dev and production.

**Production URL:** `https://quotes.xfurniture.co.za`

```
upload/
  index.html
  css/
  js/
  assets/
  vendor/
```

The `scripts/`, `docs/`, and `office-planner.html` files are development artefacts and do not need to be uploaded to the server.

---

## Updating products

All product data lives in `js/data/items.js`. Each entry:

```js
{
  "id":    "exec-traditional",          // kebab-case, must match image filename
  "name":  "Executive Office - Traditional",
  "desc":  "Solid Walnut veneer desk…", // shown on card and in PDF
  "price": 237166.9938,                 // purchase price (ZAR, excl. VAT)
  "rent":  5872.25,                     // monthly rental (ZAR, 36-month indicative)
  "sqm":   36.0,                        // floor area in square metres
  "tag":   "Executive",                 // badge shown on the product card image
  "img":   "./assets/images/exec-traditional.jpg"
}
```

To add a product: add an entry to the array and drop the JPEG into `assets/images/`.  
To remove a product: delete its entry — the catalogue rebuilds from the array automatically.  
To update a price: edit `price` and/or `rent` directly.
```

- [ ] **Commit README**

```bash
git add README.md
git commit -m "docs: add developer README"
```

---

## Task 5: Final cleanup

**Files:**
- `office-planner.html` — keep as legacy reference but note it is superseded

- [ ] **Verify the project tree looks right**

```bash
# PowerShell
Get-ChildItem -Recurse -Name | Where-Object { $_ -notmatch '\.git|node_modules' } | Sort-Object
```

Expected files present:
```
README.md
assets/images/  (8 .jpg files)
css/styles.css
docs/superpowers/...
docs/web-team-brief.docx
index.html
js/data/items.js
js/main.js
js/pdf.js
js/quote.js
js/utils.js
scripts/extract-assets.js
vendor/jspdf.min.js
```

- [ ] **Do one final end-to-end browser test** (same steps as Task 3) to confirm nothing regressed.

- [ ] **Commit any final tweaks**

```bash
git add -A
git status  # review before committing
git commit -m "chore: finalize project structure refactor"
```

---

## Self-Review Notes

- **Spec coverage:** All spec sections covered — CSS extraction, jsPDF vendor, image extraction, JS module split, index.html shell, README with all required sections (webhook config, payload shape, integration options, deployment at `quotes.xfurniture.co.za`, product updating).
- **Placeholder scan:** No TBDs or TODOs. All code blocks are complete. README code samples use real field names from the codebase.
- **Type consistency:** `ITEMS`, `fmtZAR2`, `fmtSqm`, `escape`, `lastPdfBlob`, `currentRef`, `state`, `fields` are all plain globals — consistent with how they're used across files. Load order in `index.html` matches dependency order.
- **Edge case:** `currentRef` (line 2043) and `let lastPdfBlob` (line 1737) are module-level `let` declarations that become implicit globals — `main.js` resets both in the "Start over" handler, which works because all scripts share the same global scope.
