import { SortRule } from '../common/base-table-types.js';

export type HeaderFilterType = 'text' | 'select' | 'multi-select' | 'number-range' | 'date-range' | 'custom';

export interface SelectOption {
  label: string;
  value: unknown;
}

export interface NumberRangeValue {
  min?: number;
  max?: number;
}

export interface DateRangeValue {
  start?: string; // ISO date string YYYY-MM-DD
  end?: string;   // ISO date string YYYY-MM-DD
}

export type FilterValue = string | number | string[] | NumberRangeValue | DateRangeValue | unknown;

export type CustomFilterPredicate<T = Record<string, unknown>> = (
  rowValue: unknown,
  filterValue: FilterValue,
  row: T
) => boolean;

export interface ColumnFilterConfig<T = Record<string, unknown>> {
  type: HeaderFilterType;
  placeholder?: string;
  options?: SelectOption[]; // For select & multi-select
  debounceMs?: number;      // Default 300ms for text, 0 for select/multi-select
  predicate?: CustomFilterPredicate<T>; // Custom client-side filter logic
  ariaLabel?: string;
  renderControl?: (
    currentValue: FilterValue,
    onFilterChange: (val: FilterValue) => void
  ) => HTMLElement; // Custom filter input renderer
}

export interface HeaderFilterTableColumn<T = Record<string, unknown>> {
  key: keyof T | string;
  header: string;
  width?: string;
  minWidth?: string;
  sortable?: boolean; // Default true
  align?: 'left' | 'center' | 'right';
  filter?: ColumnFilterConfig<T> | false; // Direct in-header filter configuration
  render?: (value: unknown, row: T, index: number) => HTMLElement | string;
}

export interface HeaderFilterDataLoaderRequest<T = Record<string, unknown>> {
  page: number;
  pageSize: number;
  searchTerm?: string;
  sortRule?: SortRule<T> | null;
  filters: Record<string, FilterValue>;
  signal: AbortSignal;
}

export interface HeaderFilterDataLoaderResult<T = Record<string, unknown>> {
  rows: T[];
  totalRows: number;
}

export type HeaderFilterDataLoader<T = Record<string, unknown>> = (
  request: HeaderFilterDataLoaderRequest<T>
) => Promise<HeaderFilterDataLoaderResult<T>>;

export interface HeaderFilterTableOptions<T = Record<string, unknown>> {
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
  dataLoader?: HeaderFilterDataLoader<T>;
  theme?: 'light' | 'dark' | 'auto';
}

export interface HeaderFilterChangeEventDetail {
  columnKey: string;
  filterValue: FilterValue;
  activeFilters: Record<string, FilterValue>;
}

export interface HeaderFiltersClearEventDetail {
  clearedColumnKey?: string; // If undefined, all filters were cleared
  activeFilters: Record<string, FilterValue>;
}
