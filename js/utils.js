  const fmtZAR = n => 'R ' + Math.round(n).toLocaleString('en-ZA');
  const fmtZAR2 = n => 'R ' + n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtSqm = n => (Math.round(n * 10) / 10).toLocaleString('en-ZA');

  function escape(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }
