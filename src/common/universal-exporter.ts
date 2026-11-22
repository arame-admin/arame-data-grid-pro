export interface CsvColumnMapping<T = Record<string, unknown>> {
  id: string;
  header: string;
  field?: keyof T | string;
  formatter?: (value: unknown, row: T) => string;
}

export interface UniversalCsvExportOptions<T = Record<string, unknown>> {
  filename?: string;
  columns?: CsvColumnMapping<T>[];
  /**
   * Custom delimiter (default: ',')
   */
  delimiter?: string;
  /**
   * Custom line break (default: '\r\n')
   */
  lineBreak?: string;
  /**
   * Whether to trigger automatic browser download (default: true).
   * If false, only returns the CSV string.
   */
  download?: boolean;
  /**
   * Server-side export hook: if provided, fetches all rows from server instead of current page
   */
  serverFetchAll?: () => Promise<T[]>;
}

export function escapeCsvValue(val: unknown, delimiter = ','): string {
  if (val === null || val === undefined) return '';
  let str = String(val);
  let forceQuote = false;
  // Mitigate CSV Formula Injection (CWE-1236): prefix risky formula characters with a single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
    forceQuote = true;
  }
  // If string contains delimiter, newline, or quotes, enclose in quotes and escape internal quotes
  if (
    forceQuote ||
    str.includes(delimiter) ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCsvString<T = Record<string, unknown>>(
  rows: T[],
  columns: CsvColumnMapping<T>[],
  options?: { delimiter?: string; lineBreak?: string }
): string {
  const delim = options?.delimiter || ',';
  const lb = options?.lineBreak || '\r\n';

  const headers = columns.map((col) => escapeCsvValue(col.header, delim));
  const lines: string[] = [headers.join(delim)];

  for (const row of rows) {
    const rowValues = columns.map((col) => {
      let rawVal: unknown;
      if (col.field) {
        const fieldStr = String(col.field);
        if (fieldStr.includes('.')) {
          rawVal = fieldStr.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), row as any);
        } else {
          rawVal = (row as any)[fieldStr];
        }
      }
      const formatted = col.formatter ? col.formatter(rawVal, row) : rawVal;
      return escapeCsvValue(formatted, delim);
    });
    lines.push(rowValues.join(delim));
  }

  return lines.join(lb);
}

export async function triggerCsvExport<T = Record<string, unknown>>(
  currentRows: T[],
  columns: CsvColumnMapping<T>[],
  options?: UniversalCsvExportOptions<T>
): Promise<string> {
  let exportRows = currentRows;

  // If serverFetchAll is provided, fetch all remote records
  if (options?.serverFetchAll) {
    exportRows = await options.serverFetchAll();
  }

  const csvContent = generateCsvString(exportRows, columns, options);

  if (options?.download !== false && typeof document !== 'undefined') {
    const filename = options?.filename || 'table-export.csv';
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

  return csvContent;
}
