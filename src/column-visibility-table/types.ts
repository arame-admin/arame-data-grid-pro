import { BaseTableOptions, SortCriterion } from '../common/base-table-types.js';

export type { Density, SortCriterion } from '../common/base-table-types.js';

export interface ColumnVisibilityDef<T = Record<string, any>> {
  id: string;
  header: string;
  field?: keyof T | string;
  width?: string;
  minWidth?: number;
  sortable?: boolean;        // default: true
  visible?: boolean;        // default: true
  required?: boolean;       // default: false
  formatter?: (value: any, row: T) => string;
  renderer?: (value: any, row: T, index: number) => HTMLElement | string;
  comparator?: (a: any, b: any, rowA: T, rowB: T) => number;
}

export interface ColumnVisibilityTableOptions<T = Record<string, any>> extends BaseTableOptions<T> {
  storageKey?: string;
  menuButtonLabel?: string; // default: 'Columns'
}

export interface ColumnVisibilityEventPayloads<T = Record<string, any>> {
  'column-visibility:change': {
    columnId: string;
    visible: boolean;
    visibleColumnIds: string[];
  };
  'column-visibility:reset': {
    visibleColumnIds: string[];
  };
  'column-visibility:sort': {
    criteria: SortCriterion[];
  };
  'column-visibility:page': {
    pageIndex: number;
    pageSize: number;
    totalPages: number;
    totalRows: number;
  };
  'column-visibility:search': {
    query: string;
  };
  'column-visibility:loading': {
    loading: boolean;
  };
  'column-visibility:error': {
    error: Error | any;
  };
}
