let lastPdfBlob = null;

function generateQuotePDF(payload) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();   // 595.28
  const H = doc.internal.pageSize.getHeight();  // 841.89
  const M = 48; // margin

  // CI palette in PDF (hex)
  const INK = '#1A1A1A';
  const INK_SOFT = '#555555';
  const INK_MUTE = '#888888';
  const LINE = '#D4D4D4';
  const GREY_LIGHT = '#DCDCDC';
  const GREY_MID = '#888888';
  const BG_PANEL = '#F5F5F5';

  let y = M;

  // === HEADER ===
  // X mark — recreate from SVG paths, scaled
  drawXmark(doc, M, y, 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(INK);
  doc.text('X-FURNITURE', M + 32, y + 14, { charSpace: 1.5 });
  // contact info on right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(INK_MUTE);
  doc.text('www.xfurniture.co.za', W - M, y + 8, { align: 'right' });
  doc.text('+27 64 521 0662', W - M, y + 18, { align: 'right' });
  y += 36;
  doc.setDrawColor(LINE); doc.setLineWidth(0.5);
  doc.line(M, y, W - M, y);
  y += 32;

  // === TITLE BLOCK ===
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(INK_MUTE);
  doc.text('— YOUR QUOTE —', M, y, { charSpace: 2 });
  y += 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(INK);
  doc.text('OFFICE PLAN', M, y);
  y += 28;
  doc.setTextColor(GREY_MID);
  doc.text('MADE TO ORDER', M, y);
  y += 36;

  // Reference / date / validity row
  const refY = y;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(INK_MUTE);
  const issuedDate = new Date(payload.issuedAt).toLocaleDateString('en-ZA', {
    year: 'numeric', month: 'short', day: 'numeric'
  }).toUpperCase();
  const blocks = [
    ['QUOTE REF', payload.reference],
    ['ISSUED', issuedDate],
    ['VALID', '30 DAYS']
  ];
  blocks.forEach((b, i) => {
    const x = M + i * 170;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(INK_MUTE);
    doc.text(b[0], x, refY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(INK);
    doc.setFontSize(10);
    doc.text(b[1], x, refY + 14);
    doc.setFontSize(8);
  });
  y = refY + 34;
  doc.setDrawColor(LINE);
  doc.line(M, y, W - M, y);
  y += 24;

  // === CLIENT DETAILS PANEL ===
  const cd = payload.client;
  const clientFields = [
    ['COMPANY', cd.company],
    ['CONTACT', cd.contact],
    ['PHONE', cd.phone],
    ['EMAIL', cd.email],
    ['LOCATION', cd.location]
  ];
  const panelH = 80;
  doc.setFillColor(BG_PANEL);
  doc.roundedRect(M, y, W - 2 * M, panelH, 4, 4, 'F');
  const colW = (W - 2 * M - 32) / 2; // two columns inside the panel
  clientFields.forEach((f, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = M + 16 + col * colW;
    const ty = y + 18 + row * 22;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(INK_MUTE);
    doc.text(f[0], x, ty, { charSpace: 1.5 });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(INK);
    // Truncate long values to fit column
    let val = String(f[1] || '');
    const maxW = colW - 16;
    while (doc.getTextWidth(val) > maxW && val.length > 4) val = val.slice(0, -2);
    if (val !== f[1]) val = val.slice(0, -1) + '…';
    doc.text(val, x, ty + 10);
  });
  y += panelH + 28;

  // === LINE ITEMS HEADER ===
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(INK);
  doc.text('YOUR SELECTION', M, y, { charSpace: 1.5 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(INK_MUTE);
  doc.text(`${payload.lineItems.length} configuration${payload.lineItems.length > 1 ? 's' : ''}`, W - M, y, { align: 'right' });
  y += 10;
  doc.setDrawColor(INK); doc.setLineWidth(1);
  doc.line(M, y, W - M, y);
  y += 16;
  doc.setLineWidth(0.5);

  // === LINE ITEMS ===
  payload.lineItems.forEach(li => {
    // page break check
    if (y > H - 220) { doc.addPage(); y = M; }

    // Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(INK);
    doc.text(li.name.toUpperCase(), M, y);
    // Qty on right
    doc.setFontSize(11);
    doc.setTextColor(GREY_MID);
    doc.text(`× ${li.qty}`, W - M, y, { align: 'right' });
    y += 14;

    // Description (wrapped)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(INK_SOFT);
    const descWidth = W - 2 * M - 120;
    const descLines = doc.splitTextToSize(li.description.replace(/\n/g, ' · '), descWidth);
    doc.text(descLines, M, y);
    const descBlockH = descLines.length * 11;
    y += descBlockH + 4;

    // Unit specs row
    doc.setFontSize(8);
    let xCursor = M;
    const spec = (label, val) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(INK_MUTE);
      doc.text(label, xCursor, y);
      const lw = doc.getTextWidth(label) + 8;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(INK);
      doc.text(val, xCursor + lw, y);
      xCursor += lw + doc.getTextWidth(val) + 22;
    };
    spec('UNIT PRICE', fmtZAR2(li.unitPrice));
    spec('PER MONTH', fmtZAR2(li.unitRent));
    spec('AREA', fmtSqm(li.unitSqm) + ' sqm');
    y += 18;

    // Subtotal block on right
    const subY = y - 36;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(INK);
    doc.text(fmtZAR2(li.lineTotal), W - M, subY, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(INK_MUTE);
    doc.text(fmtZAR2(li.lineRent) + ' / month', W - M, subY + 12, { align: 'right' });
    doc.text(fmtSqm(li.lineSqm) + ' sqm', W - M, subY + 22, { align: 'right' });

    // Divider
    y += 4;
    doc.setDrawColor(LINE);
    doc.line(M, y, W - M, y);
    y += 12;
  });

  // === TOTALS BLOCK ===
  // Reserve space for totals (118pt) + what-happens-next (76pt) + footer (40pt).
  // If they won't all fit, start a new page so they stay together.
  if (y + 234 > H) { doc.addPage(); y = M; }
  y += 8;
  const tH = 110;
  doc.setFillColor(INK);
  doc.roundedRect(M, y, W - 2 * M, tH, 4, 4, 'F');

  // Top accent stripe (gradient simulated as solid grey light)
  doc.setFillColor(GREY_LIGHT);
  doc.rect(M, y, W - 2 * M, 3, 'F');

  const tColW = (W - 2 * M) / 3;
  const tCells = [
    ['TOTAL PURCHASE', fmtZAR2(payload.totals.purchase), 'Excludes VAT, delivery & installation'],
    ['OR PER MONTH', fmtZAR2(payload.totals.rental), '36-month rental, indicative'],
    ['FLOOR AREA', fmtSqm(payload.totals.sqm) + ' sqm', 'Allow ~15% for circulation']
  ];
  tCells.forEach((c, i) => {
    const x = M + 24 + i * tColW;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor('#999999');
    doc.text(c[0], x, y + 24, { charSpace: 1.5 });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(i === 0 ? GREY_LIGHT : '#FFFFFF');
    doc.text(c[1], x, y + 56);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor('#888888');
    doc.text(c[2], x, y + 76);
  });
  y += tH + 28;

  // === WHAT HAPPENS NEXT === (always fits — space reserved before totals)
  doc.setFillColor(BG_PANEL);
  doc.roundedRect(M, y, W - 2 * M, 60, 4, 4, 'F');
  doc.setFillColor(GREY_MID);
  doc.rect(M, y, 3, 60, 'F'); // accent stripe
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(INK);
  doc.text('WHAT HAPPENS NEXT', M + 18, y + 18, { charSpace: 1.5 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(INK_SOFT);
  const nextLines = doc.splitTextToSize(
    'A consultant will contact you within one business day to confirm specifications, lead time (typically 4–6 weeks), and arrange a site walkthrough if needed. Final pricing is confirmed once finishes and any custom requirements are agreed.',
    W - 2 * M - 36
  );
  doc.text(nextLines, M + 18, y + 32);
  y += 76;

  // === FOOTER ===
  const footY = H - 32;
  doc.setDrawColor(LINE);
  doc.line(M, footY - 14, W - M, footY - 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(INK_MUTE);
  doc.text('X-FURNITURE · OFFICE PLANNER · ' + payload.reference, M, footY, { charSpace: 1 });
  doc.text('www.xfurniture.co.za · +27 64 521 0662', W - M, footY, { align: 'right', charSpace: 1 });

  return doc.output('blob');
}

// X mark drawn from the SVG path, scaled to a given size
function drawXmark(doc, x, y, size) {
  const s = size / 100;
  // Front stroke (lighter grey)
  doc.setFillColor('#C8C8C8');
  doc.lines([
    [(8 - 22) * s, 0],          // top edge
    [(68 - 8) * s, (92 - 8) * s], // down-right
    [(82 - 68) * s, 0],         // top edge of bottom-right
    [(22 - 82) * s, (8 - 92) * s] // up-left back to start
  ], x + 22 * s, y, [1, 1], 'F', true);
  // Back stroke (darker grey)
  doc.setFillColor('#888888');
  doc.lines([
    [(92 - 78) * s, 0],
    [(32 - 92) * s, (92 - 8) * s],
    [(18 - 32) * s, 0],
    [(78 - 18) * s, (8 - 92) * s]
  ], x + 78 * s, y, [1, 1], 'F', true);
}

function triggerPdfDownload(blob, ref) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `xfurniture-quote-${ref}.pdf`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1000);
}

