let lastPdfBlob = null;

async function generateQuotePDF(payload) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;

  const DARK      = '#141414';
  const GREEN     = '#94c356';
  const WHITE     = '#FFFFFF';
  const INK       = '#1A1A1A';
  const INK_SOFT  = '#555555';
  const INK_MUTE  = '#999999';
  const LINE      = '#E0E0E0';
  const BG_PANEL  = '#F5F5F5';
  const FOOTER_H  = 36;

  const logoDataUrl = await svgToDataUrl('assets/images/x-logo-light.svg', 43, 40);

  let y = 0;

  // ── HEADER ──────────────────────────────────────────────────────────────
  const headerH = 70;
  doc.setFillColor(DARK);
  doc.rect(0, 0, W, headerH, 'F');
  doc.addImage(logoDataUrl, 'PNG', M, 15, 21, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(WHITE);
  doc.text('X-FURNITURE', M + 30, 29, { charSpace: 2 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor('#AAAAAA');
  doc.text('www.xfurniture.co.za', W - M, 26, { align: 'right' });
  doc.text('+27 64 521 0662', W - M, 37, { align: 'right' });
  // green accent bar at bottom of header
  doc.setFillColor(GREEN);
  doc.rect(0, headerH - 3, W, 3, 'F');

  y = headerH + 36;

  // ── TITLE BLOCK ──────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(GREEN);
  doc.text('— YOUR QUOTE —', M, y, { charSpace: 2 });
  y += 22;
  doc.setFontSize(28);
  doc.setTextColor(INK);
  doc.text('OFFICE PLAN', M, y);
  y += 28;
  doc.setTextColor('#AAAAAA');
  doc.text('MADE TO ORDER', M, y);
  y += 36;

  // Reference / date / validity row
  const refY = y;
  const issuedDate = new Date(payload.issuedAt)
    .toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })
    .toUpperCase();
  [
    ['QUOTE REF', payload.reference, true],
    ['ISSUED',    issuedDate,         false],
    ['VALID',     '30 DAYS',          false]
  ].forEach(([label, val, highlight], i) => {
    const x = M + i * 170;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(INK_MUTE);
    doc.text(label, x, refY, { charSpace: 1.5 });
    doc.setFont('helvetica', highlight ? 'bold' : 'normal');
    doc.setFontSize(10);
    doc.setTextColor(highlight ? GREEN : INK);
    doc.text(val, x, refY + 14);
  });
  y = refY + 34;
  doc.setDrawColor(LINE);
  doc.setLineWidth(0.5);
  doc.line(M, y, W - M, y);
  y += 24;

  // ── CLIENT PANEL ─────────────────────────────────────────────────────────
  const clientFields = [
    ['COMPANY',  payload.client.company],
    ['CONTACT',  payload.client.contact],
    ['PHONE',    payload.client.phone],
    ['EMAIL',    payload.client.email],
    ['LOCATION', payload.client.location]
  ];
  const panelH = 80;
  doc.setFillColor(BG_PANEL);
  doc.roundedRect(M, y, W - 2 * M, panelH, 4, 4, 'F');
  doc.setFillColor(GREEN);
  doc.roundedRect(M, y, 4, panelH, 2, 2, 'F');

  const colW = (W - 2 * M - 32) / 2;
  clientFields.forEach((f, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = M + 18 + col * colW;
    const ty = y + 18 + row * 22;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(INK_MUTE);
    doc.text(f[0], cx, ty, { charSpace: 1.5 });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(INK);
    let val = String(f[1] || '');
    const maxW = colW - 16;
    while (doc.getTextWidth(val) > maxW && val.length > 4) val = val.slice(0, -2);
    if (val !== f[1]) val = val.slice(0, -1) + '…';
    doc.text(val, cx, ty + 10);
  });
  y += panelH + 28;

  // ── LINE ITEMS HEADER ────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(INK);
  doc.text('YOUR SELECTION', M, y, { charSpace: 1.5 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(INK_MUTE);
  doc.text(
    `${payload.lineItems.length} configuration${payload.lineItems.length > 1 ? 's' : ''}`,
    W - M, y, { align: 'right' }
  );
  y += 10;
  doc.setDrawColor(INK);
  doc.setLineWidth(1);
  doc.line(M, y, W - M, y);
  y += 16;
  doc.setLineWidth(0.5);

  // ── LINE ITEMS ───────────────────────────────────────────────────────────
  payload.lineItems.forEach(li => {
    if (y > H - FOOTER_H - 220) { doc.addPage(); y = M; }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(INK);
    doc.text(li.name.toUpperCase(), M, y);
    doc.setTextColor('#BBBBBB');
    doc.text(`× ${li.qty}`, W - M, y, { align: 'right' });
    y += 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(INK_SOFT);
    const descLines = doc.splitTextToSize(
      li.description.replace(/\n/g, ' · '),
      W - 2 * M - 120
    );
    doc.text(descLines, M, y);
    y += descLines.length * 11 + 4;

    // Spec row with green labels
    let xCursor = M;
    const spec = (label, val) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(GREEN);
      doc.text(label, xCursor, y);
      const lw = doc.getTextWidth(label) + 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(INK);
      doc.text(val, xCursor + lw, y);
      xCursor += lw + doc.getTextWidth(val) + 20;
    };
    spec('UNIT PRICE', fmtZAR2(li.unitPrice));
    spec('PER MONTH',  fmtZAR2(li.unitRent));
    spec('AREA',       fmtSqm(li.unitSqm) + ' sqm');
    y += 18;

    // Subtotal (right-aligned, positioned above current y)
    const subY = y - 36;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(INK);
    doc.text(fmtZAR2(li.lineTotal), W - M, subY, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(INK_MUTE);
    doc.text(fmtZAR2(li.lineRent) + ' / month', W - M, subY + 12, { align: 'right' });
    doc.text(fmtSqm(li.lineSqm) + ' sqm',       W - M, subY + 22, { align: 'right' });

    y += 4;
    doc.setDrawColor(LINE);
    doc.line(M, y, W - M, y);
    y += 12;
  });

  // ── TOTALS BLOCK ─────────────────────────────────────────────────────────
  if (y + 234 > H - FOOTER_H) { doc.addPage(); y = M; }
  y += 8;
  const tH = 110;
  doc.setFillColor(DARK);
  doc.roundedRect(M, y, W - 2 * M, tH, 4, 4, 'F');
  doc.setFillColor(GREEN);
  doc.roundedRect(M, y, W - 2 * M, 3, 2, 2, 'F');

  const tColW = (W - 2 * M) / 3;
  [
    ['TOTAL PURCHASE', fmtZAR2(payload.totals.purchase),              'Excludes VAT, delivery & installation', GREEN],
    ['OR PER MONTH',   fmtZAR2(payload.totals.rental),                '36-month rental, indicative',            WHITE],
    ['FLOOR AREA',     fmtSqm(payload.totals.sqm) + ' sqm',           'Allow ~15% for circulation',             WHITE]
  ].forEach(([label, val, sub, col], i) => {
    const x = M + 24 + i * tColW;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor('#888888');
    doc.text(label, x, y + 26, { charSpace: 1.5 });
    doc.setFontSize(18);
    doc.setTextColor(col);
    doc.text(val, x, y + 58);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor('#666666');
    doc.text(sub, x, y + 74);
  });
  y += tH + 28;

  // ── WHAT HAPPENS NEXT ────────────────────────────────────────────────────
  doc.setFillColor(BG_PANEL);
  doc.roundedRect(M, y, W - 2 * M, 60, 4, 4, 'F');
  doc.setFillColor(GREEN);
  doc.rect(M, y, 4, 60, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(INK);
  doc.text('WHAT HAPPENS NEXT', M + 18, y + 18, { charSpace: 1.5 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(INK_SOFT);
  doc.text(
    doc.splitTextToSize(
      'A consultant will contact you within one business day to confirm specifications, lead time (typically 4–6 weeks), and arrange a site walkthrough if needed. Final pricing is confirmed once finishes and any custom requirements are agreed.',
      W - 2 * M - 36
    ),
    M + 18, y + 32
  );

  // ── FOOTER ───────────────────────────────────────────────────────────────
  doc.setFillColor(DARK);
  doc.rect(0, H - FOOTER_H, W, FOOTER_H, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor('#666666');
  doc.text('X-FURNITURE · OFFICE PLANNER · ' + payload.reference, M, H - FOOTER_H + 22, { charSpace: 1 });
  doc.text('www.xfurniture.co.za · +27 64 521 0662', W - M, H - FOOTER_H + 22, { align: 'right', charSpace: 1 });

  return doc.output('blob');
}

function svgToDataUrl(src, w, h) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = w * 4;
      canvas.height = h * 4;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = src;
  });
}

function triggerPdfDownload(blob, ref) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `xfurniture-quote-${ref}.pdf`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}
