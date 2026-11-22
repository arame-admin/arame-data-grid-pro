import {
  HeaderFilterTableColumn,
  FilterValue,
  NumberRangeValue,
  DateRangeValue
} from './types.js';

/**
 * Checks if a filter value is considered active (non-empty).
 */
export function isFilterActive(value: FilterValue): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') {
    const nr = value as NumberRangeValue;
    if (nr.min !== undefined && nr.min !== null) return true;
    if (nr.max !== undefined && nr.max !== null) return true;
    const dr = value as DateRangeValue;
    if (dr.start || dr.end) return true;
    return Object.values(value).some(v => v !== null && v !== undefined && v !== '');
  }
  return true;
}

/**
 * Evaluates whether a row matches a column's filter.
 */
export function matchColumnFilter<T = Record<string, unknown>>(
  row: T,
  col: HeaderFilterTableColumn<T>,
  filterValue: FilterValue
): boolean {
  if (!isFilterActive(filterValue)) return true;

  const rawVal = (row as any)[col.key];

  // If consumer supplied a custom predicate, use it
  if (col.filter && typeof col.filter.predicate === 'function') {
    return col.filter.predicate(rawVal, filterValue, row);
  }

  const filterType = col.filter ? col.filter.type : 'text';

  switch (filterType) {
    case 'text': {
      if (rawVal === null || rawVal === undefined) return false;
      const strVal = String(rawVal).toLowerCase();
      const searchStr = String(filterValue).toLowerCase().trim();
      return strVal.includes(searchStr);
    }

    case 'select': {
      if (filterValue === '__ALL__' || filterValue === '') return true;
      return String(rawVal) === String(filterValue);
    }

    case 'multi-select': {
      const selected = filterValue as string[];
      if (!selected || selected.length === 0) return true;
      if (Array.isArray(rawVal)) {
        return rawVal.some(v => selected.includes(String(v)));
      }
      return selected.includes(String(rawVal));
    }

    case 'number-range': {
      const { min, max } = filterValue as NumberRangeValue;
      const numVal = Number(rawVal);
      if (isNaN(numVal)) return false;
      if (min !== undefined && min !== null && !isNaN(min) && numVal < min) return false;
      if (max !== undefined && max !== null && !isNaN(max) && numVal > max) return false;
      return true;
    }

    case 'date-range': {
      const { start, end } = filterValue as DateRangeValue;
      if (!rawVal) return false;
      const rowDate = new Date(rawVal).getTime();
      if (isNaN(rowDate)) return false;
      if (start) {
        const startDate = new Date(start).getTime();
        if (!isNaN(startDate) && rowDate < startDate) return false;
      }
      if (end) {
        // Set to end of day
        const endDate = new Date(end).setHours(23, 59, 59, 999);
        if (!isNaN(endDate) && rowDate > endDate) return false;
      }
      return true;
    }

    default:
      return true;
  }
}

/**
 * Filters a dataset against both global search term and all active column header filters.
 */
export function applyClientFilters<T = Record<string, unknown>>(
  rows: T[],
  columns: HeaderFilterTableColumn<T>[],
  activeFilters: Record<string, FilterValue>,
  searchTerm?: string
): T[] {
  let result = rows;

  // 1. Global Search Term
  if (searchTerm && searchTerm.trim() !== '') {
    const q = searchTerm.toLowerCase().trim();
    result = result.filter(row => {
      return Object.values(row as any).some(val => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(q);
      });
    });
  }

  // 2. Active Header Filters
  const activeColEntries = Object.entries(activeFilters).filter(([_, val]) => isFilterActive(val));
  if (activeColEntries.length === 0) {
    return result;
  }

  const colMap = new Map<string, HeaderFilterTableColumn<T>>();
  columns.forEach(c => colMap.set(String(c.key), c));

  return result.filter(row => {
    for (const [key, filterVal] of activeColEntries) {
      const col = colMap.get(key);
      if (col && !matchColumnFilter(row, col, filterVal)) {
        return false;
      }
    }
    return true;
  });
}
