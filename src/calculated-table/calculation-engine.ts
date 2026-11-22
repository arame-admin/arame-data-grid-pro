import { CalculatedTableColumn } from './types.js';

export interface EvaluatedRowResult<T = any> {
  row: T;
  recalculatedFields: string[];
}

/**
 * Safely computes calculated columns for a single row without eval or Function.
 * Returns a cloned row with calculated values populated and the list of computed keys.
 */
export function evaluateRowCalculations<T = any>(
  row: T,
  rowIndex: number,
  columns: CalculatedTableColumn<T>[]
): EvaluatedRowResult<T> {
  const updatedRow: any = { ...row };
  const recalculatedFields: string[] = [];

  for (const col of columns) {
    if (typeof col.calculate === 'function') {
      try {
        const result = col.calculate(updatedRow, rowIndex);
        updatedRow[col.key] = result;
        recalculatedFields.push(String(col.key));
      } catch (err) {
        // Predictable, graceful fallback on error
        console.warn(`[calculated-table] Error evaluating column '${String(col.key)}':`, err);
        updatedRow[col.key] = NaN;
        recalculatedFields.push(String(col.key));
      }
    }
  }

  return {
    row: updatedRow as T,
    recalculatedFields
  };
}

/**
 * Re-evaluates columns that depend on modified source fields, cascading through
 * dependent calculated columns (e.g. quantity → subtotal → taxAmount → total).
 */
export function recalculateOnFieldChange<T = any>(
  row: T,
  rowIndex: number,
  changedKey: string,
  columns: CalculatedTableColumn<T>[]
): EvaluatedRowResult<T> {
  const updatedRow: any = { ...row };
  const recalculatedFields: string[] = [];
  const dirty = new Set<string>([changedKey]);
  const pending = columns.filter((col) => typeof col.calculate === 'function');
  const maxPasses = pending.length + 1;

  for (let pass = 0; pass < maxPasses && dirty.size > 0; pass++) {
    let progressed = false;

    for (const col of pending) {
      const key = String(col.key);
      if (recalculatedFields.includes(key)) continue;

      const deps = col.dependencies;
      // If dependencies omitted, recalculate on any change in the first pass only
      const isDependent = !deps
        ? pass === 0
        : deps.some((d) => dirty.has(String(d)));

      if (!isDependent) continue;

      try {
        const result = col.calculate!(updatedRow, rowIndex);
        updatedRow[col.key] = result;
        recalculatedFields.push(key);
        dirty.add(key);
        progressed = true;
      } catch (err) {
        console.warn(`[calculated-table] Error re-evaluating column '${key}':`, err);
        updatedRow[col.key] = NaN;
        recalculatedFields.push(key);
        dirty.add(key);
        progressed = true;
      }
    }

    if (!progressed) break;
  }

  return {
    row: updatedRow as T,
    recalculatedFields
  };
}

/**
 * Helper to safely format numbers (currency, percentage, decimals)
 */
export function safeFormatNumber(
  value: any,
  options?: {
    decimals?: number;
    prefix?: string;
    suffix?: string;
    fallback?: string;
  }
): string {
  const fallback = options?.fallback ?? '—';
  if (value === null || value === undefined || isNaN(value)) {
    return fallback;
  }
  const num = Number(value);
  if (!isFinite(num)) {
    return fallback;
  }

  const decimals = options?.decimals ?? 2;
  const formatted = num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  const prefix = options?.prefix ?? '';
  const suffix = options?.suffix ?? '';
  return `${prefix}${formatted}${suffix}`;
}
