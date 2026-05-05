# SEO Implementation Design

**Date:** 2026-05-05  
**Status:** Approved

---

## What we're doing

Adding proper SEO to `index.html` — core meta tags, Open Graph / Twitter Card for social sharing previews, and JSON-LD structured data for Google. All changes are confined to the `<head>` of `index.html`. No new files except the spec and plan docs.

**Goal:** Rank on Google for office furniture planner searches AND produce great sharing previews when the URL is sent via WhatsApp, email, or LinkedIn. A click-through link from `xfurniture.co.za` will pass domain authority to the subdomain.

**Production URL:** `https://quotes.xfurniture.co.za`

---

## Business details (sourced from xfurniture.co.za/contact/)

| Field | Value |
|-------|-------|
| Company | X-Furniture |
| Street | 19 Dartfield Rd, Sandown |
| City | Sandton |
| Province | Gauteng |
| Postal code | 2031 |
| Country | South Africa (ZA) |
| Phone | +27 10 824 7622 (E.164: +27108247622) |
| Email | hello@xfurniture.co.za |
| Website | https://www.xfurniture.co.za |
| Facebook | https://www.facebook.com/xfurnitureza/ |
| Instagram | https://www.instagram.com/x_furnitureza/ |

---

## Changes — `index.html` `<head>` only

### 1. HTML lang attribute
```html
<html lang="en-ZA">
```
Change from `en` → `en-ZA` (South African English).

### 2. Title tag
```html
<title>Office Planner &amp; Instant Quote Tool | X-Furniture South Africa</title>
```
Replaces: `<title>Office Planner — X-Furniture</title>`

Includes: primary action (planner + quote), brand name, geographic modifier.

### 3. Core meta tags
```html
<meta name="description" content="Design your perfect office with X-Furniture's interactive planner. Choose from 8 configurations and get an instant branded PDF quote — available to buy or rent. Based in Sandton, delivering across South Africa.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://quotes.xfurniture.co.za">
<meta name="theme-color" content="#1A1A1A">
<meta name="geo.region" content="ZA-GP">
<meta name="geo.placename" content="Sandton">
```

### 4. Favicon
```html
<link rel="icon" type="image/webp" href="assets/favicon.webp">
```
File committed at `assets/favicon.webp`. WebP favicons are supported by Chrome, Firefox, and Edge. Safari support is limited on older versions — acceptable for this audience.

### 5. Open Graph tags
```html
<meta property="og:type" content="website">
<meta property="og:url" content="https://quotes.xfurniture.co.za">
<meta property="og:site_name" content="X-Furniture">
<meta property="og:locale" content="en_ZA">
<meta property="og:title" content="Office Planner &amp; Instant Quote | X-Furniture South Africa">
<meta property="og:description" content="Design your perfect office and get an instant PDF quote. 8 configurations, available to buy or rent. Based in Sandton.">
<meta property="og:image" content="https://quotes.xfurniture.co.za/assets/images/exec-traditional.jpg">
<meta property="og:image:alt" content="X-Furniture executive office setup">
```

OG image uses `exec-traditional.jpg` (96 KB, already on disk). Replace with a proper 1200×630 branded social card when available.

### 6. Twitter Card tags
```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Office Planner &amp; Instant Quote | X-Furniture">
<meta name="twitter:description" content="Design your perfect office and get an instant PDF quote. 8 configurations, buy or rent.">
<meta name="twitter:image" content="https://quotes.xfurniture.co.za/assets/images/exec-traditional.jpg">
```

### 7. JSON-LD structured data
One `<script type="application/ld+json">` block with a `@graph` containing two schemas:

**FurnitureStore** — the business entity, anchored at `xfurniture.co.za/#business`:
```json
{
  "@type": "FurnitureStore",
  "@id": "https://www.xfurniture.co.za/#business",
  "name": "X-Furniture",
  "url": "https://www.xfurniture.co.za",
  "telephone": "+27108247622",
  "email": "hello@xfurniture.co.za",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "19 Dartfield Rd, Sandown",
    "addressLocality": "Sandton",
    "addressRegion": "Gauteng",
    "postalCode": "2031",
    "addressCountry": "ZA"
  },
  "sameAs": [
    "https://www.facebook.com/xfurnitureza/",
    "https://www.instagram.com/x_furnitureza/"
  ]
}
```

**WebApplication** — the quote tool, anchored at `quotes.xfurniture.co.za/#app`, linked to the business via `provider`:
```json
{
  "@type": "WebApplication",
  "@id": "https://quotes.xfurniture.co.za/#app",
  "name": "X-Furniture Office Planner",
  "url": "https://quotes.xfurniture.co.za",
  "description": "Interactive office planning and instant PDF quote tool. Choose from 8 pre-configured office layouts, set quantities, and receive a branded quote — available for purchase or 36-month rental.",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Any",
  "provider": { "@id": "https://www.xfurniture.co.za/#business" },
  "offers": {
    "@type": "Offer",
    "description": "Office furniture — purchase or 36-month rental",
    "areaServed": "ZA"
  }
}
```

---

## Insertion point in `index.html`

All new tags go in `<head>`, after the existing `<meta charset>` and `<meta viewport>` tags and before the Google Fonts `<link>` tags. The JSON-LD `<script>` block goes last in `<head>`, just before `</head>`.

Exact insertion:
```
[line 4] <meta charset="UTF-8">
[line 5] <meta name="viewport" ...>
[INSERT HERE] — title + core meta + favicon + OG + Twitter
[line 7] <link rel="preconnect" href="https://fonts.googleapis.com">
...
[line 13] <link href="...Saira..." rel="stylesheet">
[INSERT HERE] — JSON-LD <script> block
[line 14] <!-- jsPDF comment --> ← now replaced by vendor script tag
```

---

## Out of scope

- Creating a dedicated 1200×630 social card image (design work)
- `sitemap.xml` — single-page tool; the main site handles sitemapping
- `robots.txt` — no crawl restrictions needed
- `hreflang` — single language target (en-ZA)
- Changes to any file other than `index.html`
