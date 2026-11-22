import { ColumnFilterValue, FilterCriterion, FilterableColumnDef, NumberRangeValue, DateRangeValue } from './types.js';

export function resolveValue<T>(row: T, fieldPath?: keyof T | string): unknown {
  if (!fieldPath || !row || typeof row !== 'object') return undefined;
  const path = String(fieldPath);
  if (!path.includes('.')) {
    if (path === '__proto__' || path === 'constructor' || path === 'prototype') return undefined;
    return (row as any)[path];
  }
  const parts = path.split('.');
  let current: unknown = row;
  for (const part of parts) {
    if (part === '__proto__' || part === 'constructor' || part === 'prototype') return undefined;
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function isFilterActive(val: ColumnFilterValue): boolean {
  if (val == null) return false;
  if (typeof val === 'string') return val.trim().length > 0;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'object') {
    const range = val as NumberRangeValue & DateRangeValue;
    return (
      (range.min != null && range.min !== ('' as any)) ||
      (range.max != null && range.max !== ('' as any)) ||
      Boolean(range.start) ||
      Boolean(range.end)
    );
  }
  return true;
}

export function filterRows<T>(
  rows: T[],
  filters: FilterCriterion[],
  globalSearch: string,
  columns: FilterableColumnDef<T>[]
): T[] {
  const normGlobal = globalSearch.trim().toLowerCase();

  return rows.filter((row) => {
    // 1. Global Search
    if (normGlobal) {
      const matchAny = columns.some((col) => {
        if (!col.field) return false;
        const v = resolveValue(row, col.field);
        return v != null && String(v).toLowerCase().includes(normGlobal);
      });
      if (!matchAny) return false;
    }

    // 2. Per-Column Filters
    for (const f of filters) {
      if (!isFilterActive(f.value)) continue;
      const col = columns.find((c) => c.id === f.columnId);
      if (!col || !col.field) continue;
      const rawVal = resolveValue(row, col.field);

      switch (f.type) {
        case 'text': {
          const strVal = rawVal == null ? '' : String(rawVal).toLowerCase();
          const target = String(f.value).trim().toLowerCase();
          if (!strVal.includes(target)) return false;
          break;
        }
        case 'select': {
          if (String(rawVal) !== String(f.value)) return false;
          break;
        }
        case 'multi-select': {
          const arr = Array.isArray(f.value) ? f.value.map(String) : [];
          if (arr.length > 0 && !arr.includes(String(rawVal))) return false;
          break;
        }
        case 'number-range': {
          const num = Number(rawVal);
          if (isNaN(num)) return false;
          const range = f.value as NumberRangeValue;
          if (range.min != null && range.min !== ('' as any) && num < Number(range.min)) return false;
          if (range.max != null && range.max !== ('' as any) && num > Number(range.max)) return false;
          break;
        }
        case 'date-range': {
          if (!rawVal) return false;
          const rowDate = new Date(rawVal as string | number | Date).getTime();
          if (isNaN(rowDate)) return false;
          const range = f.value as DateRangeValue;
          if (range.start && rowDate < new Date(range.start).getTime()) return false;
          if (range.end && rowDate > new Date(range.end + 'T23:59:59').getTime()) return false;
          break;
        }
      }
    }
    return true;
  });
}
