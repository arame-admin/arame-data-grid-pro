import { BaseTableOptions, SortCriterion } from '../common/base-table-types.js';

export type { Density, SortCriterion } from '../common/base-table-types.js';

export type AggregateType = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'custom';

export type CustomAggregateFn<T = Record<string, unknown>> = (rows: T[], field: keyof T | string) => any;

export interface AggregateConfig<T = Record<string, unknown>> {
  type: AggregateType;
  customFn?: CustomAggregateFn<T>;
  formatter?: (val: unknown) => string;
  label?: string; // e.g. "Total" or "Avg"
}

export interface GroupedTableColumn<T = Record<string, unknown>> {
  id: string;
  header: string;
  field?: keyof T | string;
  width?: string;
  minWidth?: number;
  sortable?: boolean;        // default: true
  groupable?: boolean;       // default: true
  aggregate?: AggregateConfig<T>;
  formatter?: (value: unknown, row: T) => string;
  renderer?: (value: unknown, row: T, index: number) => HTMLElement | string;
  comparator?: (a: unknown, b: unknown, rowA: T, rowB: T) => number;
}

export type GroupPaginationMode = 'rows' | 'groups'; // 'rows' paginates raw rows; 'groups' keeps groups intact per page

export interface GroupRecord<T = Record<string, unknown>> {
  key: string;              // unique path e.g. "Electronics" or "Electronics > Mobile"
  columnId: string;
  value: unknown;
  level: number;            // 0 for top level, 1 for nested
  rows: T[];
  subGroups?: GroupRecord<T>[];
  aggregates: Record<string, unknown>;
  expanded: boolean;
}

export interface GroupingOptions<T = Record<string, unknown>> {
  groupBy?: string[];                  // array of column IDs e.g. ['department', 'team']
  defaultExpanded?: boolean;           // default: true
  paginationMode?: GroupPaginationMode; // default: 'rows'
  showAggregatesInHeader?: boolean;    // default: true
}

export interface GroupedTableOptions<T = Record<string, unknown>> extends BaseTableOptions<T> {
  grouping?: GroupingOptions<T>;
}

export interface GroupedTableEventPayloads<T = Record<string, unknown>> {
  'grouped-table:group-toggle': { groupKey: string; expanded: boolean; level: number; rowCount: number };
  'grouped-table:expand-all': { expandedCount: number };
  'grouped-table:collapse-all': { collapsedCount: number };
  'grouped-table:group-change': { groupBy: string[] };
  'grouped-table:sort': { criteria: SortCriterion[] };
  'grouped-table:page': { pageIndex: number; pageSize: number; totalPages: number; totalRows: number };
  'grouped-table:search': { query: string };
  'grouped-table:loading': { loading: boolean };
}
