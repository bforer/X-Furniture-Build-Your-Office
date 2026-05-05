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

Open `js/quote.js` and replace the placeholder on the first line:

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

The `scripts/`, `docs/`, and `office-planner.html` files are development artefacts and do not need to be uploaded to the server.

```
upload to server/
  index.html
  css/
  js/
  assets/
  vendor/
```

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

---

## Extraction script

`scripts/extract-assets.js` is a **one-time development tool** used to split the original `office-planner.html` monolith into this multi-file structure. You do not need to run it again unless you are re-extracting from a new version of the monolith.

```bash
node scripts/extract-assets.js
```

It requires Node.js and reads `office-planner.html` from the project root. It will overwrite all generated files in `css/`, `js/`, `assets/images/`, `vendor/`, and `index.html`.
