// ============================================================
//  X-FURNITURE  ·  OFFICE PLANNER
//  Plug-in source.  Connect the submitQuote() function to
//  your backend / CRM endpoint.
//
//  Flow: pick quantities (no pricing shown) → submit details
//        → quote with full pricing is generated.
// ============================================================

const state = {};
ITEMS.forEach(it => state[it.id] = 0);

// ---- BUILD CARDS (no prices visible) ----
const catalogue = document.getElementById('catalogue');
ITEMS.forEach((it, i) => {
  const card = document.createElement('article');
  card.className = 'card' + (i % 2 === 1 ? ' flip' : '');
  card.dataset.id = it.id;
  card.innerHTML = `
    <div class="card-img-wrap">
      <img src="${it.img}" alt="${it.name}" loading="lazy">
      <span class="card-img-tag">${it.tag}</span>
      <span class="card-img-area"><span class="label">Area</span>${fmtSqm(it.sqm)} m²</span>
    </div>
    <div class="card-body">
      <h3 class="card-name">${it.name}</h3>
      <p class="card-desc">${it.desc}</p>
      <div class="qty-row">
        <label for="qty-${it.id}">Quantity required</label>
        <div class="stepper">
          <button type="button" data-action="dec" aria-label="Decrease">−</button>
          <input type="number" id="qty-${it.id}" min="0" max="50" value="0" data-id="${it.id}" inputmode="numeric">
          <button type="button" data-action="inc" aria-label="Increase">+</button>
        </div>
      </div>
    </div>
  `;
  catalogue.appendChild(card);
});

// ---- STEPPER BEHAVIOUR ----
catalogue.addEventListener('click', e => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const stepper = btn.closest('.stepper');
  const input = stepper.querySelector('input');
  let v = parseInt(input.value, 10) || 0;
  if (btn.dataset.action === 'inc') v = Math.min(50, v + 1);
  else v = Math.max(0, v - 1);
  input.value = v;
  input.dispatchEvent(new Event('input', { bubbles: true }));
});

catalogue.addEventListener('input', e => {
  if (e.target.matches('input[type="number"]')) {
    const id = e.target.dataset.id;
    let v = parseInt(e.target.value, 10);
    if (isNaN(v) || v < 0) v = 0;
    if (v > 50) v = 50;
    e.target.value = v;
    state[id] = v;
    updateTotals();
  }
});

// ---- TOTALS (only sqm + count visible — no money) ----
const sb = document.getElementById('summaryBar');
const sbHeadline = document.getElementById('sbHeadline');
const sbCount = document.getElementById('sbCount');
const sbSqm = document.getElementById('sbSqm');
const goBtn = document.getElementById('goToForm');
const formSection = document.getElementById('formSection');

function updateTotals() {
  let count = 0, sqm = 0;
  ITEMS.forEach(it => {
    const q = state[it.id];
    count += q;
    sqm += q * it.sqm;
    const card = catalogue.querySelector(`[data-id="${it.id}"]`);
    if (card) card.classList.toggle('has-qty', q > 0);
  });

  if (count === 0) {
    sbHeadline.textContent = 'No items selected';
    sb.classList.add('dim');
    goBtn.disabled = true;
    formSection.classList.add('locked');
  } else {
    const distinct = ITEMS.filter(it => state[it.id] > 0).length;
    sbHeadline.innerHTML = `<strong>${count}</strong> item${count > 1 ? 's' : ''} across <strong>${distinct}</strong> configuration${distinct > 1 ? 's' : ''}`;
    sb.classList.remove('dim');
    goBtn.disabled = false;
    formSection.classList.remove('locked');
  }
  sbCount.textContent = String(count).padStart(2, '0');
  sbSqm.innerHTML = fmtSqm(sqm) + '<span class="unit">m²</span>';
}

goBtn.addEventListener('click', () => {
  formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => document.getElementById('company').focus(), 600);
});

// ---- FORM VALIDATION ----
const form = document.getElementById('quoteForm');
const fields = ['company', 'contact', 'phone', 'email', 'location'];

function validate() {
  let ok = true;
  fields.forEach(f => {
    const el = document.getElementById(f);
    const err = document.querySelector(`[data-for="${f}"]`);
    const v = el.value.trim();
    let msg = '';
    if (!v) msg = 'Required';
    else if (f === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) msg = 'Invalid email';
    else if (f === 'phone' && v.replace(/\D/g, '').length < 7) msg = 'Invalid phone';
    el.classList.toggle('error', !!msg);
    err.textContent = msg;
    if (msg) ok = false;
  });
  if (!ITEMS.some(it => state[it.id] > 0)) ok = false;
  return ok;
}

fields.forEach(f => {
  const el = document.getElementById(f);
  el.addEventListener('input', () => {
    el.classList.remove('error');
    document.querySelector(`[data-for="${f}"]`).textContent = '';
  });
});

form.addEventListener('submit', e => {
  e.preventDefault();
  if (!validate()) {
    const firstErr = form.querySelector('.error');
    if (firstErr) firstErr.focus();
    return;
  }
  const client = {};
  fields.forEach(f => client[f] = document.getElementById(f).value.trim());
  showQuote(client);
  submitQuote(client);
});

document.getElementById('editBtn').addEventListener('click', () => {
  document.body.classList.remove('quote-mode');
  document.getElementById('quoteView').classList.remove('show');
  formSection.scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('downloadPdfBtn').addEventListener('click', () => {
  const ref = getRef();
  if (lastPdfBlob) {
    triggerPdfDownload(lastPdfBlob, ref);
    return;
  }
  // Fallback: rebuild from current state if blob was cleared
  const client = {};
  fields.forEach(f => client[f] = document.getElementById(f).value.trim());
  const payload = buildPayload(client);
  try {
    const blob = generateQuotePDF(payload);
    lastPdfBlob = blob;
    triggerPdfDownload(blob, payload.reference);
  } catch (err) {
    alert('Sorry, the PDF could not be generated. Please try again or contact us at sales@xfurniture.co.za.');
    console.error(err);
  }
});

document.getElementById('newBtn').addEventListener('click', () => {
  if (!confirm('Clear your selection and start over?')) return;
  ITEMS.forEach(it => {
    state[it.id] = 0;
    const inp = document.getElementById('qty-' + it.id);
    if (inp) inp.value = 0;
  });
  fields.forEach(f => document.getElementById(f).value = '');
  currentRef = null;
  lastPdfBlob = null;
  updateTotals();
  document.body.classList.remove('quote-mode');
  document.getElementById('quoteView').classList.remove('show');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

updateTotals();
