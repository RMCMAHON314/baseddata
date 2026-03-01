// BOMB-10 — Multi-format export system (CSV, JSON, XLSX, PDF)
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function dateSuffix() {
  return new Date().toISOString().split('T')[0];
}

export function useExportCSV() {
  const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(h => {
          const val = row[h];
          const str = val === null || val === undefined ? '' : String(val);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        }).join(',')
      ),
    ].join('\n');

    downloadBlob(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }), `${filename}_${dateSuffix()}.csv`);
    toast.success(`Exported ${data.length} rows as CSV`);
  };

  return { exportToCSV };
}

export function useExportJSON() {
  const exportToJSON = (data: unknown, filename: string) => {
    const json = JSON.stringify(data, null, 2);
    downloadBlob(new Blob([json], { type: 'application/json' }), `${filename}_${dateSuffix()}.json`);
    toast.success('Exported as JSON');
  };
  return { exportToJSON };
}

export function useExportXLSX() {
  const exportToXLSX = (data: Record<string, unknown>[], filename: string, sheetName = 'Data') => {
    if (!data || data.length === 0) return;
    const wb = XLSX.utils.book_new();

    // Cover sheet with metadata
    const coverData = [
      ['Based Data — Export Report'],
      [''],
      ['Generated', new Date().toLocaleString()],
      ['Records', data.length],
      ['Source', 'Based Data Intelligence Platform'],
    ];
    const coverSheet = XLSX.utils.aoa_to_sheet(coverData);
    coverSheet['!cols'] = [{ wch: 20 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, coverSheet, 'Summary');

    // Data sheet
    const ws = XLSX.utils.json_to_sheet(data);
    // Auto-width columns
    const cols = Object.keys(data[0]).map(key => {
      const maxLen = Math.max(key.length, ...data.slice(0, 100).map(r => String(r[key] ?? '').length));
      return { wch: Math.min(maxLen + 2, 50) };
    });
    ws['!cols'] = cols;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${filename}_${dateSuffix()}.xlsx`);
    toast.success(`Exported ${data.length} rows as XLSX`);
  };
  return { exportToXLSX };
}

export function useExportPDF() {
  const exportToPDF = (title: string, sections: { heading: string; content: string }[]) => {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
<style>
body{font-family:'Helvetica Neue',Arial,sans-serif;margin:40px;color:#0F172A}
.header{border-bottom:3px solid #3B82F6;padding-bottom:16px;margin-bottom:24px}
.logo{font-size:24px;font-weight:bold;color:#3B82F6}
.subtitle{color:#64748B;margin-top:4px;font-size:14px}
.section{margin:24px 0}
.section-title{font-size:16px;font-weight:bold;border-bottom:1px solid #E2E8F0;padding-bottom:8px;margin-bottom:12px}
.content{font-size:13px;line-height:1.6;color:#334155;white-space:pre-wrap}
.footer{margin-top:40px;border-top:1px solid #E2E8F0;padding-top:12px;color:#94A3B8;font-size:11px;text-align:center}
</style></head><body>
<div class="header"><div class="logo">📊 ${title}</div><div class="subtitle">Generated ${new Date().toLocaleString()} — Based Data Intelligence Platform</div></div>
${sections.map(s => `<div class="section"><div class="section-title">${s.heading}</div><div class="content">${s.content}</div></div>`).join('')}
<div class="footer">Based Data Intelligence Platform — ${new Date().toISOString()}</div>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (w) setTimeout(() => { w.print(); }, 500);
    toast.success('PDF report ready — use Print dialog to save');
  };
  return { exportToPDF };
}

// Combined hook for convenience
export function useExport() {
  const { exportToCSV } = useExportCSV();
  const { exportToJSON } = useExportJSON();
  const { exportToXLSX } = useExportXLSX();
  const { exportToPDF } = useExportPDF();
  return { exportToCSV, exportToJSON, exportToXLSX, exportToPDF };
}
