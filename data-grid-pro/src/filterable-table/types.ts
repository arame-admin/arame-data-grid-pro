import { BaseTableOptions, BaseTableQueryParams, SortCriterion } from '../common/base-table-types.js';

export type { Density, SortCriterion } from '../common/base-table-types.js';

export type FilterType = 'text' | 'select' | 'multi-select' | 'number-range' | 'date-range' | 'custom';

export interface SelectFilterOption {
  label: string;
  value: string | number;
}

export interface NumberRangeValue {
  min?: number;
  max?: number;
}

export interface DateRangeValue {
  start?: string;
  end?: string;
}

export type ColumnFilterValue = string | (string | number)[] | NumberRangeValue | DateRangeValue | any;

export interface FilterCriterion {
  columnId: string;
  type: FilterType;
  value: ColumnFilterValue;
}

export interface CustomFilterControlParams<T = any> {
  column: FilterableColumnDef<T>;
  currentValue: any;
  onChange: (val: any) => void;
  onClear: () => void;
}

export interface FilterConfig<T = any> {
  type: FilterType;
  placeholder?: string;
  options?: SelectFilterOption[];
  customControl?: (params: CustomFilterControlParams<T>) => HTMLElement;
}

export interface FilterableColumnDef<T = Record<string, any>> {
  id: string;
  header: string;
  field?: keyof T | string;
  width?: string;
  minWidth?: number;
  sortable?: boolean;        // default: true
  filter?: FilterConfig<T>;
  formatter?: (value: any, row: T) => string;
  renderer?: (value: any, row: T, index: number) => HTMLElement | string;
  comparator?: (a: any, b: any, rowA: T, rowB: T) => number;
}

export interface FilterableTableOptions<T = Record<string, any>> extends BaseTableOptions<T> {
  /** @deprecated Prefer search.enabled — kept for backward compatibility */
  showGlobalSearch?: boolean;
  /** @deprecated Prefer search.placeholder */
  searchPlaceholder?: string;
  /** @deprecated Prefer search.debounceMs */
  searchDebounceMs?: number;
}

/** Server query params including active column filters */
export interface ServerFilterQueryParams extends BaseTableQueryParams {
  filters: FilterCriterion[];
}

export interface FilterableTableEventPayloads<T = Record<string, any>> {
  'filter-table:filter-change': {
    filters: FilterCriterion[];
    globalSearch: string;
    activeFilterCount: number;
  };
  'filter-table:filter-clear': {
    columnId?: string;
    remainingFilters: FilterCriterion[];
  };
  'filter-table:loading': { loading: boolean };
  'filter-table:error': { error: Error | any };
  'filter-table:sort': { criteria: SortCriterion[] };
  'filter-table:page': { pageIndex: number; pageSize: number; totalPages: number; totalRows: number };
  'filter-table:search': { query: string };
}
