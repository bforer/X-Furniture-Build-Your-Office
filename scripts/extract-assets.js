#!/usr/bin/env node
// Run once: node scripts/extract-assets.js
// Splits office-planner.html into the multi-file project structure.

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const srcPath = path.join(ROOT, 'office-planner.html');
if (!fs.existsSync(srcPath)) {
  console.error('ERROR: office-planner.html not found in', ROOT);
  process.exit(1);
}
const html = fs.readFileSync(srcPath, 'utf8');
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
let items;
try {
  items = JSON.parse(json);
} catch (e) {
  console.error('ERROR: Could not parse ITEMS array from line 1468. Check that line numbers are still correct.');
  process.exit(1);
}

if (items.length !== 8) {
  console.warn(`WARNING: Expected 8 items, found ${items.length}. Proceeding anyway.`);
}

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
const head        = slice(1, 13);      // DOCTYPE → Google Fonts link
const bodyContent = slice(1265, 1457); // body HTML (excludes <body> tag)

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
