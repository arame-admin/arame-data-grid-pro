import { SortRule } from '../common/base-table-types.js';

export type LogicalOperator = 'AND' | 'OR';

export type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'between'
  | 'in'
  | 'notIn'
  // Date-specific
  | 'dateBefore'
  | 'dateAfter'
  | 'dateOn'
  | 'dateBetween'
  | 'dateRelative' // e.g. 'last7Days', 'last30Days', 'thisMonth', 'today'
  | 'custom';

export type RelativeDatePreset = 'today' | 'yesterday' | 'last7Days' | 'last30Days' | 'thisMonth' | 'lastMonth' | 'thisYear';

export interface FilterRangeValue {
  min?: number | string;
  max?: number | string;
  start?: string | number | Date;
  end?: string | number | Date;
  [key: string]: unknown;
}

export interface FilterRule {
  id: string;
  field: string;
  operator: FilterOperator;
  value: FilterRangeValue | string | number | boolean | string[] | unknown;
  customOperatorName?: string;
}

export interface FilterExpressionGroup {
  id: string;
  logic: LogicalOperator; // 'AND' | 'OR'
  rules: (FilterRule | FilterExpressionGroup)[];
}

export interface SavedFilterPreset {
  id: string;
  name: string;
  isDefault?: boolean;
  isRemovable?: boolean;
  expression: FilterExpressionGroup;
  searchTerm?: string;
}

export interface QuickFilterOption {
  id: string;
  label: string;
  expression: FilterExpressionGroup;
}

export interface CascadingFilterConfig<T = Record<string, unknown>> {
  parentField: string;
  getOptions: (parentValue: unknown, allActiveRules: FilterRule[]) => Array<{ label: string; value: unknown }>;
}

export interface CustomFilterOperator<T = Record<string, unknown>> {
  name: string;
  label: string;
  applicableTypes: ('string' | 'number' | 'date' | 'boolean' | 'select')[];
  predicate: (fieldValue: unknown, ruleValue: unknown, row: T) => boolean;
  validate?: (value: unknown) => string | null; // Returns error message if invalid
}

export interface AdvancedFilterColumn<T = Record<string, unknown>> {
  key: keyof T | string;
  header: string;
  type?: 'string' | 'number' | 'date' | 'boolean' | 'select';
  width?: string;
  minWidth?: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  options?: Array<{ label: string; value: unknown }>; // For select type
  cascading?: CascadingFilterConfig<T>;
  min?: number; // For number sliders
  max?: number;
  step?: number;
  render?: (value: unknown, row: T, index: number) => HTMLElement | string;
}

export interface AdvancedFilterDataLoaderRequest<T = Record<string, unknown>> {
  page: number;
  pageSize: number;
  searchTerm?: string;
  sortRule?: SortRule<T> | null;
  expression: FilterExpressionGroup;
  serializedQuery?: string;
  signal: AbortSignal;
}

export interface AdvancedFilterDataLoaderResult<T = Record<string, unknown>> {
  rows: T[];
  totalRows: number;
}

export type AdvancedFilterDataLoader<T = Record<string, unknown>> = (
  request: AdvancedFilterDataLoaderRequest<T>
) => Promise<AdvancedFilterDataLoaderResult<T>>;

export interface AdvancedFilterTableOptions<T = Record<string, unknown>> {
  presets?: SavedFilterPreset[];
  activePresetId?: string;
  quickFilters?: QuickFilterOption[];
  persistPresetsKey?: string; // If provided, persists custom user presets to localStorage
  customOperators?: CustomFilterOperator<T>[];
  debounceMs?: number; // Default 300ms
  pagination?: {
    enabled?: boolean;
    pageSize?: number;
    pageSizeOptions?: number[];
  };
  sorting?: {
    enabled?: boolean;
    initialSort?: SortRule<T> | null;
  };
  search?: {
    enabled?: boolean;
    placeholder?: string;
  };
  dataLoader?: AdvancedFilterDataLoader<T>;
  theme?: 'light' | 'dark' | 'auto';
}

export interface PresetChangeEventDetail {
  preset: SavedFilterPreset | null;
  expression: FilterExpressionGroup;
}

export interface ExpressionChangeEventDetail {
  expression: FilterExpressionGroup;
  flatRules: FilterRule[];
  activeChips: Array<{ id: string; label: string; rule: FilterRule }>;
}
