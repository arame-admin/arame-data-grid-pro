import { ColumnDef, FilterCriterion, SortCriterion } from '../types.js';

export function resolveValue<T>(row: T, fieldPath?: keyof T | string): any {
  if (!fieldPath || !row || typeof row !== 'object') return undefined;
  const path = String(fieldPath);
  if (!path.includes('.')) {
    if (path === '__proto__' || path === 'constructor' || path === 'prototype') return undefined;
    return (row as any)[path];
  }
  const parts = path.split('.');
  let current: any = row;
  for (const part of parts) {
    if (part === '__proto__' || part === 'constructor' || part === 'prototype') return undefined;
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}

export function filterRows<T>(
  rows: T[],
  filters: FilterCriterion[],
  globalSearch: string,
  columns: ColumnDef<T>[]
): T[] {
  const normalizedGlobal = globalSearch.trim().toLowerCase();
  const searchFields = normalizedGlobal
    ? columns.filter((col) => col.field).map((col) => col.field!)
    : [];

  const activeFilters = filters
    .map((filter) => {
      const trimmed = filter.value.trim().toLowerCase();
      if (!trimmed) return null;
      const col = columns.find((c) => c.id === filter.columnId);
      if (!col || !col.field) return null;
      return {
        field: col.field,
        operator: filter.operator || 'contains',
        targetVal: trimmed
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);

  if (!normalizedGlobal && activeFilters.length === 0) {
    return rows;
  }

  return rows.filter((row) => {
    // 1. Global Search Check
    if (normalizedGlobal) {
      let matchAny = false;
      for (const field of searchFields) {
        const val = resolveValue(row, field);
        if (val != null && String(val).toLowerCase().includes(normalizedGlobal)) {
          matchAny = true;
          break;
        }
      }
      if (!matchAny) return false;
    }

    // 2. Column-Level Filters
    for (const filter of activeFilters) {
      const rawVal = resolveValue(row, filter.field);
      const strVal = rawVal == null ? '' : String(rawVal).toLowerCase();

      switch (filter.operator) {
        case 'equals':
          if (strVal !== filter.targetVal) return false;
          break;
        case 'startsWith':
          if (!strVal.startsWith(filter.targetVal)) return false;
          break;
        case 'endsWith':
          if (!strVal.endsWith(filter.targetVal)) return false;
          break;
        case 'contains':
        default:
          if (!strVal.includes(filter.targetVal)) return false;
          break;
      }
    }
    return true;
  });
}

export function sortRows<T>(
  rows: T[],
  criteria: SortCriterion[],
  columns: ColumnDef<T>[]
): T[] {
  if (!criteria.length) return rows;

  const colMap = new Map(columns.map((c) => [c.id, c]));
  const activeCriteria = criteria
    .map((crit) => {
      const col = colMap.get(crit.columnId);
      if (!col || !col.field) return null;
      return { crit, col };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  if (!activeCriteria.length) return rows;

  return [...rows].sort((a, b) => {
    for (const { crit, col } of activeCriteria) {
      const valA = resolveValue(a, col.field);
      const valB = resolveValue(b, col.field);

      let comparison = 0;
      if (col.comparator) {
        comparison = col.comparator(valA, valB, a, b);
      } else {
        if (valA === valB) continue;
        if (valA == null && valB == null) comparison = 0;
        else if (valA == null) comparison = -1;
        else if (valB == null) comparison = 1;
        else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else {
          comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true });
        }
      }

      if (comparison !== 0) {
        return crit.direction === 'asc' ? comparison : -comparison;
      }
    }
    return 0;
  });
}

export function paginateRows<T>(
  rows: T[],
  pageIndex: number,
  pageSize: number
): { pagedRows: T[]; totalPages: number; totalRows: number } {
  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const clampedPage = Math.max(0, Math.min(pageIndex, totalPages - 1));
  const startIndex = clampedPage * pageSize;
  const pagedRows = rows.slice(startIndex, startIndex + pageSize);

  return { pagedRows, totalPages, totalRows };
}
