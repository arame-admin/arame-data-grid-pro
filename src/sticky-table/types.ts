import { BaseTableOptions, SortCriterion } from '../common/base-table-types.js';

export type { Density, SortCriterion } from '../common/base-table-types.js';

export interface StickyTableColumn<T = Record<string, unknown>> {
  id: string;
  header: string;
  field?: keyof T | string;
  width?: string;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;        // default: true (inherits from options.sorting)
  resizable?: boolean;
  formatter?: (value: unknown, row: T) => string;
  renderer?: (value: unknown, row: T, index: number) => HTMLElement | string;
  comparator?: (a: unknown, b: unknown, rowA: T, rowB: T) => number;
}

export interface StickyTableOptions<T = Record<string, unknown>> extends BaseTableOptions<T> {
  stickyFirstColumn?: boolean;   // default: true
  stickyColumnWidth?: string;     // default: '220px'
  selectable?: boolean;           // default: false
  multiSelect?: boolean;          // default: true
}

export interface StickyTableEventPayloads<T = Record<string, unknown>> {
  'sticky-table:sort': { criteria: SortCriterion[] };
  'sticky-table:select': { selectedIds: (string | number)[]; selectedRows: T[] };
  'sticky-table:scroll': { scrollLeft: number; isScrolled: boolean };
  'sticky-table:column-resize': { columnId: string; width: number };
  'sticky-table:page': { pageIndex: number; pageSize: number; totalPages: number; totalRows: number };
  'sticky-table:search': { query: string };
  'sticky-table:loading': { loading: boolean };
  'sticky-table:error': { error: Error | unknown };
}
