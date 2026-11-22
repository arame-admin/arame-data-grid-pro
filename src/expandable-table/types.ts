import { BaseTableOptions, SortCriterion } from '../common/base-table-types.js';

export type { Density, SortCriterion } from '../common/base-table-types.js';

export interface ExpandableTableColumn<T = Record<string, unknown>> {
  id: string;
  header: string;
  field?: keyof T | string;
  width?: string;
  minWidth?: number;
  sortable?: boolean;        // default: true
  formatter?: (value: unknown, row: T) => string;
  renderer?: (value: unknown, row: T, index: number) => HTMLElement | string;
  comparator?: (a: unknown, b: unknown, rowA: T, rowB: T) => number;
}

export type DetailRendererResult = HTMLElement | string;
export type SyncDetailRenderer<T> = (row: T) => DetailRendererResult;
export type AsyncDetailRenderer<T> = (row: T, signal: AbortSignal) => Promise<DetailRendererResult>;

export interface ExpandAnimationOptions {
  enabled?: boolean;
  duration?: number;
  easing?: string;
}

export interface ExpandableTableOptions<T = Record<string, unknown>> extends BaseTableOptions<T> {
  multiExpand?: boolean;                     // default: true
  expandOnRowClick?: boolean;                // default: true
  ignoreClickSelectors?: string[];          // default: ['button', 'input', 'a', 'select', 'textarea', '[data-no-expand]']
  animations?: ExpandAnimationOptions;
  detailRenderer?: SyncDetailRenderer<T>;
  asyncDetailRenderer?: AsyncDetailRenderer<T>;
  loadingMessage?: string;
}

export interface ExpandableTableEventPayloads<T = Record<string, unknown>> {
  'expandable-table:expand': { rowId: string | number; row: T };
  'expandable-table:collapse': { rowId: string | number; row: T };
  'expandable-table:toggle': { rowId: string | number; expanded: boolean; row: T };
  'expandable-table:async-load-start': { rowId: string | number; row: T };
  'expandable-table:async-load-success': { rowId: string | number; row: T };
  'expandable-table:async-load-error': { rowId: string | number; row: T; error: Error | unknown };
  'expandable-table:sort': { criteria: SortCriterion[] };
  'expandable-table:page': { pageIndex: number; pageSize: number; totalPages: number; totalRows: number };
  'expandable-table:search': { query: string };
  'expandable-table:loading': { loading: boolean };
  'expandable-table:error': { error: Error | unknown };
}
