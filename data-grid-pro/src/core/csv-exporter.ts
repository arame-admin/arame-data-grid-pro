import { ColumnDef } from '../types.js';
import { resolveValue } from './data-engine.js';

function sanitizeCSVValue(val: unknown): string {
  if (val == null) return '';
  let str = String(val);
  // Mitigate CSV Formula Injection: prefix formula triggers with a single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export function exportToCSV<T>(
  rows: T[],
  columns: ColumnDef<T>[],
  filename = 'export.csv'
): void {
  const visibleColumns = columns.filter((col) => col.visible !== false && col.field);
  
  const headers = visibleColumns.map((col) => sanitizeCSVValue(col.header));
  const lines: string[] = [headers.join(',')];

  for (const row of rows) {
    const values = visibleColumns.map((col) => {
      const val = col.formatter 
        ? col.formatter(resolveValue(row, col.field), row)
        : resolveValue(row, col.field);
      return sanitizeCSVValue(val);
    });
    lines.push(values.join(','));
  }

  const csvContent = lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.setAttribute('download', filename);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
