import { SortRule } from '../common/base-table-types.js';

export type CalculationFn<T = Record<string, unknown>, R = unknown> = (row: T, index: number) => R;

export type FormatterFn<R = unknown> = (value: R, row: Record<string, unknown>) => string | HTMLElement;

export interface StickyColumnsConfig {
  stickyFirst?: boolean; // Default true
  stickyLast?: boolean;  // Default true
}

export interface CalculatedTableColumn<T = any, R = any> {
  key: keyof T | string;
  header: string;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  sortable?: boolean; // Default true
  align?: 'left' | 'center' | 'right';
  editable?: boolean; // If source column is editable
  editorType?: 'text' | 'number' | 'select';
  editorOptions?: Array<{ label: string; value: unknown }>;
  
  // Calculated column properties
  calculate?: CalculationFn<T, R>; // Strongly-typed calculation function. Safe, non-eval.
  dependencies?: Array<keyof T | string>; // List of row fields that trigger re-calculation
  readOnly?: boolean; // Default true for calculated columns
  formatter?: FormatterFn<R>; // Custom formatting for calculated output
  render?: (value: unknown, row: T, index: number) => HTMLElement | string; // Custom cell renderer
}

export interface CalculatedDataLoaderRequest<T = Record<string, unknown>> {
  page: number;
  pageSize: number;
  searchTerm?: string;
  sortRule?: SortRule<T> | null;
}

export interface CalculatedDataLoaderResult<T = Record<string, unknown>> {
  rows: T[];
  totalRows: number;
}

export type CalculatedDataLoader<T = Record<string, unknown>> = (
  request: CalculatedDataLoaderRequest<T>
) => Promise<CalculatedDataLoaderResult<T>>;

export interface CalculatedTableOptions<T = Record<string, unknown>> {
  sticky?: StickyColumnsConfig; // Sticky first and last config
  pagination?: {
    enabled?: boolean; // Default true
    pageSize?: number; // Default 10
    pageSizeOptions?: number[]; // Default [5, 10, 25, 50]
  };
  sorting?: {
    enabled?: boolean; // Default true
    initialSort?: SortRule<T> | null;
  };
  search?: {
    enabled?: boolean; // Default true
    placeholder?: string;
  };
  resizableColumns?: boolean; // Default true
  dataLoader?: CalculatedDataLoader<T>; // Server-side data loader
  virtualization?: {
    enabled: boolean;
    rowHeight: number;
    viewportHeight?: number;
    overscan?: number;
  };
  dir?: 'ltr' | 'rtl'; // RTL support
}

export interface CellChangeDetail<T = Record<string, unknown>> {
  rowIndex: number;
  rowId: string | number;
  columnKey: string;
  oldValue: unknown;
  newValue: unknown;
  updatedRow: T;
  recalculatedFields: string[];
}

export interface CalculatedTableEventMap<T = Record<string, unknown>> {
  'calculated-table:cell-change': CustomEvent<CellChangeDetail<T>>;
  'calculated-table:page-change': CustomEvent<{ page: number; pageSize: number }>;
  'calculated-table:sort-change': CustomEvent<SortRule<T> | null>;
  'calculated-table:search-change': CustomEvent<{ searchTerm: string }>;
}
