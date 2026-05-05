// ============================================================
//  WEBHOOK CONFIGURATION
// ------------------------------------------------------------
//  When a client submits the form, the planner does TWO things:
//
//    1. Generates a branded PDF in the client's browser and
//       offers it as an immediate download. (Always works.)
//
//    2. POSTs the lead — including the full pricing payload —
//       to the WEBHOOK_URL below so your sales team is notified
//       and you have a record of the enquiry.
//
//  TO RECEIVE LEADS, replace the WEBHOOK_URL value below with
//  your endpoint. Easy options that need no code on your side:
//
//    · Zapier   — "Webhooks by Zapier" → Catch Hook trigger.
//                  Then use the Email action to send to your sales inbox.
//                  (https://zapier.com/apps/webhook/integrations)
//
//    · Make.com — Webhook module → Email module. Same pattern.
//                  (https://www.make.com)
//
//    · Formspree — Create an endpoint, paste the URL here. Leads
//                  arrive in your sales inbox automatically.
//                  (https://formspree.io)
//
//    · Your CRM  — Most CRMs (HubSpot, Salesforce, Pipedrive, etc.)
//                  accept webhook leads.
//
//  The POST body is JSON. Shape:
//    {
//      client: { company, contact, phone, email, location },
//      lineItems: [{ sku, name, description, qty,
//                    unitPrice, unitRent, unitSqm,
//                    lineTotal, lineRent, lineSqm }],
//      totals: { purchase, rental, sqm },
//      reference: "XF-260427-XXXX",
//      issuedAt:  "2026-04-27T..."
//    }
// ============================================================
const WEBHOOK_URL = 'REPLACE_ME_WITH_YOUR_WEBHOOK_URL';
const SALES_EMAIL = 'sales@xfurniture.co.za';

async function submitQuote(client) {
  const payload = buildPayload(client);

  // 1) ALWAYS generate the PDF locally and download it to the client.
  //    This works whether or not a webhook is configured.
  try {
    const pdfBlob = generateQuotePDF(payload);
    lastPdfBlob = pdfBlob;
    triggerPdfDownload(pdfBlob, payload.reference);
  } catch (err) {
    console.error('PDF generation failed:', err);
    setStatus('warn',
      "We couldn't generate your PDF",
      `Please contact us directly at <a href="mailto:${SALES_EMAIL}" style="color:var(--ink); text-decoration: underline;">${SALES_EMAIL}</a> or call +27 64 521 0662 and we'll send you a quote.`);
    return;
  }

  // 2) Send the lead to the configured webhook (if any).
  if (!WEBHOOK_URL || WEBHOOK_URL === 'REPLACE_ME_WITH_YOUR_WEBHOOK_URL') {
    // No webhook configured yet — only the local download happened.
    // Still show the user a positive message, since their PDF downloaded fine.
    setStatus('success',
      'Your quote is ready',
      `Your PDF quote (reference <strong>${escapeHtml(payload.reference)}</strong>) has downloaded to this device. Please email it to <a href="mailto:${SALES_EMAIL}" style="color:var(--ink); text-decoration: underline;">${SALES_EMAIL}</a> or call +27 64 521 0662 — a consultant will be in touch within one business day.`);
    return;
  }

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    setStatus('success',
      'Your quote is on its way',
      `Your PDF (reference <strong>${escapeHtml(payload.reference)}</strong>) has downloaded to this device, and we've notified our sales team. A consultant will be in touch within one business day at <strong>${escapeHtml(client.email)}</strong>.`);
  } catch (err) {
    console.error('Webhook submit failed:', err);
    // PDF downloaded successfully — only the lead notification failed.
    setStatus('warn',
      'Quote downloaded — please email us',
      `Your PDF quote has downloaded, but we couldn't reach our system to notify the team. Please email it to <a href="mailto:${SALES_EMAIL}" style="color:var(--ink); text-decoration: underline;">${SALES_EMAIL}</a> or call +27 64 521 0662 and we'll follow up right away.`);
  }
}

function buildPayload(client) {
  return {
    client,
    lineItems: ITEMS.filter(it => state[it.id] > 0).map(it => ({
      sku: it.id,
      name: it.name,
      description: it.desc,
      qty: state[it.id],
      unitPrice: it.price,
      unitRent: it.rent,
      unitSqm: it.sqm,
      lineTotal: state[it.id] * it.price,
      lineRent: state[it.id] * it.rent,
      lineSqm: state[it.id] * it.sqm
    })),
    totals: computeTotals(),
    reference: getRef(),
    issuedAt: new Date().toISOString()
  };
}

function setStatus(kind, title, message) {
  const banner = document.getElementById('statusBanner');
  const icon = banner.querySelector('.status-icon');
  banner.className = 'status-banner ' + kind;
  document.getElementById('statusTitle').textContent = title;
  document.getElementById('statusMessage').innerHTML = message;
  if (kind === 'success') icon.textContent = '✓';
  else if (kind === 'warn')   icon.textContent = '!';
  else                        icon.textContent = '';
}

function computeTotals() {
  let p = 0, r = 0, s = 0;
  ITEMS.forEach(it => {
    const q = state[it.id];
    p += q * it.price; r += q * it.rent; s += q * it.sqm;
  });
  return { purchase: p, rental: r, sqm: s };
}

// ---- QUOTE VIEW ----
let currentRef = null;
function getRef() {
  if (!currentRef) {
    const d = new Date();
    currentRef = 'XF-' + d.getFullYear().toString().slice(2) +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0') + '-' +
      Math.random().toString(36).slice(2, 6).toUpperCase();
  }
  return currentRef;
}

function showQuote(client) {
  document.body.classList.add('quote-mode');

  // Reset status banner to pending state
  setStatus('pending', 'Sending your quote…', 'Generating PDF and emailing you a copy.');

  document.getElementById('qRef').textContent = getRef();
  document.getElementById('qDate').textContent = new Date().toLocaleDateString('en-ZA', {
    year: 'numeric', month: 'short', day: 'numeric'
  }).toUpperCase();

  const cc = document.getElementById('clientCard');
  cc.innerHTML = '';
  [
    ['Company', client.company],
    ['Contact', client.contact],
    ['Phone', client.phone],
    ['Email', client.email],
    ['Location', client.location]
  ].forEach(([label, val]) => {
    const c = document.createElement('div');
    c.innerHTML = `<div class="ck-label">${label}</div><div class="ck-val">${escapeHtml(val)}</div>`;
    cc.appendChild(c);
  });

  const qi = document.getElementById('quoteItems');
  qi.innerHTML = '';
  ITEMS.filter(it => state[it.id] > 0).forEach(it => {
    const q = state[it.id];
    const el = document.createElement('div');
    el.className = 'qi';
    el.innerHTML = `
      <div class="qi-img"><img src="${it.img}" alt="${it.name}"></div>
      <div>
        <div class="qi-name">${it.name}</div>
        <div class="qi-desc">${escapeHtml(it.desc)}</div>
        <div class="qi-line">
          <span>Unit price <strong>${fmtZAR2(it.price)}</strong></span>
          <span>Per month <strong>${fmtZAR2(it.rent)}</strong></span>
          <span>Area <strong>${fmtSqm(it.sqm)} m²</strong></span>
        </div>
      </div>
      <div class="qi-totals">
        <div class="qi-qty">${q}</div>
        <div class="qi-sub">${fmtZAR2(q * it.price)}</div>
        <div class="qi-rent">${fmtZAR2(q * it.rent)} / month</div>
      </div>
    `;
    qi.appendChild(el);
  });

  const t = computeTotals();
  document.getElementById('qPurchase').textContent = fmtZAR2(t.purchase);
  document.getElementById('qRental').textContent = fmtZAR2(t.rental);
  document.getElementById('qSqm').innerHTML = fmtSqm(t.sqm) + '<span class="unit">m²</span>';

  document.getElementById('quoteView').classList.add('show');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
