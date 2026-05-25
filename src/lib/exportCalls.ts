import type { CallLog } from '@/data/callLogs';

/** Export call logs as .xls (Excel-compatible HTML table). */
export function exportCallLogsToXls(rows: CallLog[], filename = 'call-logs.xls') {
  const escape = (v: string | number) =>
    String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const header = ['Date', 'Time', 'Contact', 'Number', 'Direction', 'Duration (sec)'];
  const body = rows
    .map(
      (r) =>
        `<tr><td>${escape(r.date)}</td><td>${escape(r.time)}</td><td>${escape(r.contact)}</td><td>${escape(r.phoneNumber)}</td><td>${escape(r.direction)}</td><td>${escape(r.duration)}</td></tr>`
    )
    .join('');

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="UTF-8"></head>
<body><table border="1"><thead><tr>${header.map((h) => `<th>${escape(h)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></body></html>`;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function filterCallsByDays(rows: CallLog[], days: number): CallLog[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return rows.filter((r) => r.date >= cutoffStr);
}
