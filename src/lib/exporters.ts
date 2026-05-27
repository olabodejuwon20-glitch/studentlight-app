// CSV + print-to-PDF helpers
export const escapeHtml = (v: any) => {
  const s = v === null || v === undefined ? "" : String(v);
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
};
export const safeHtml = escapeHtml;

export function downloadCSV(filename: string, rows: Array<Record<string, any>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => escape(r[h])).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function printToPDF(title: string, html: string) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title>
  <style>
    body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;padding:32px;}
    h1{font-size:22px;margin:0 0 4px;} .sub{color:#64748b;font-size:12px;margin-bottom:24px;}
    table{width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;}
    th,td{padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:left;}
    th{background:#f8fafc;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#475569;}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px;}
    .card{border:1px solid #e2e8f0;border-radius:10px;padding:12px;}
    .label{font-size:11px;color:#64748b;text-transform:uppercase;}
    .value{font-size:20px;font-weight:700;margin-top:2px;}
    @media print{ body{padding:16px;} }
  </style></head><body>${html}
  <script>window.onload=()=>{setTimeout(()=>window.print(),250);};</script>
  </body></html>`);
  w.document.close();
}

export function tableHTML(headers: string[], rows: Array<Array<string | number>>) {
  return `<table><thead><tr>${headers.map(h=>`<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
  <tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}