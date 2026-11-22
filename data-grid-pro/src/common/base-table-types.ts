import type { TableLocale } from './table-localization.js';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortCriterion {
  columnId: string;
  direction: 'asc' | 'desc';
}

/** Single-column sort used by Shadow DOM table variants (key-based columns) */
export interface SortRule<T = any> {
  column: keyof T | string;
  direction: 'asc' | 'desc';
}

export type Density = 'compact' | 'comfortable' | 'spacious';

export interface PaginationConfig {
  enabled?: boolean;         // default: true
  pageIndex?: number;        // default: 0
  pageSize?: number;         // default: 10
  pageSizes?: number[];      // default: [10, 25, 50, 100]
}

export interface SearchConfig {
  enabled?: boolean;         // default: true
  placeholder?: string;      // default: 'Search records...'
  debounceMs?: number;       // default: 250
}

export interface SortingConfig {
  enabled?: boolean;         // default: true
  multiSort?: boolean;       // default: false
}

export interface BaseTableQueryParams {
  pageIndex: number;
  pageSize: number;
  globalSearch: string;
  sortCriteria: SortCriterion[];
  signal: AbortSignal;
  extra?: Record<string, any>;
}

export interface BaseTableQueryResult<T = Record<string, any>> {
  rows: T[];
  totalRows: number;
}

export type BaseTableDataLoader<T = Record<string, any>> = (
  params: BaseTableQueryParams
) => Promise<BaseTableQueryResult<T>>;

export interface BaseTableOptions<T = Record<string, any>> {
  rowIdKey?: string;
  density?: Density;
  
  // Enabled by default across all tables
  pagination?: PaginationConfig;
  search?: SearchConfig;
  sorting?: SortingConfig;

  /** Optional locale strings for search, pagination, selection, and export UI */
  locale?: Partial<TableLocale>;

  // Server-side support
  serverSide?: boolean;
  serverDataLoader?: BaseTableDataLoader<T>;

  emptyMessage?: string;
  errorMessage?: string;
}

export interface BaseTableEventPayloads<T = Record<string, any>> {
  'table:page': { pageIndex: number; pageSize: number; totalPages: number; totalRows: number };
  'table:sort': { criteria: SortCriterion[] };
  'table:search': { query: string };
  'table:loading': { loading: boolean };
  'table:error': { error: Error | any };
}
