export type SortDirection = 'asc' | 'desc' | null;

export interface SortCriterion {
  columnId: string;
  direction: 'asc' | 'desc';
}

export type Density = 'compact' | 'comfortable' | 'spacious';
export type MobileLayout = 'scroll' | 'card';

export interface FilterCriterion {
  columnId: string;
  value: string;
  operator?: 'contains' | 'equals' | 'startsWith' | 'endsWith';
}

export interface PaginationState {
  pageIndex: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
}

// --- Server-side Query & Result Types ---
export interface ServerQueryParams {
  pageIndex: number;
  pageSize: number;
  globalSearch: string;
  sortCriteria: SortCriterion[];
  filters: FilterCriterion[];
  signal: AbortSignal;
}

export interface ServerQueryResult<T = Record<string, any>> {
  rows: T[];
  totalRows: number;
}

export type ServerDataLoader<T = Record<string, any>> = (
  params: ServerQueryParams
) => Promise<ServerQueryResult<T>>;

// --- Editing Types ---
export interface CellEditValidator<T = any> {
  (newValue: any, oldValue: any, row: T, column: ColumnDef<T>): string | null | undefined; // null/undefined if valid, error message string if invalid
}

export interface CustomEditorParams<T = any> {
  value: any;
  row: T;
  column: ColumnDef<T>;
  onCommit: (newValue: any) => void;
  onCancel: () => void;
}

export interface ColumnDef<T = Record<string, any>> {
  id: string;
  header: string;
  field?: keyof T | string;
  width?: string;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  filterable?: boolean;
  resizable?: boolean;
  reorderable?: boolean;
  editable?: boolean;
  validator?: CellEditValidator<T>;
  customEditor?: (params: CustomEditorParams<T>) => HTMLElement;
  pinned?: 'left' | 'right' | null;
  priority?: number; // 1 (highest - always show on mobile) to 5 (hide on mobile)
  visible?: boolean;
  formatter?: (value: any, row: T) => string;
  renderer?: (value: any, row: T, index: number) => HTMLElement | string;
  comparator?: (a: any, b: any, rowA: T, rowB: T) => number;
  calculate?: (row: T) => any;
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count' | ((values: any[], rows: T[]) => any);
  aggregationFormatter?: (value: any) => string;
}

// --- State Persistence Options ---
export interface StatePersistenceOptions {
  enabled?: boolean;
  key?: string; // default: 'arame-grid-state'
  storage?: 'localStorage' | 'sessionStorage';
  saveSort?: boolean;
  saveFilter?: boolean;
  saveColumnWidths?: boolean;
  saveColumnVisibility?: boolean;
  saveColumnOrder?: boolean;
}

// --- Animation Configuration ---
export interface AnimationOptions {
  enabled?: boolean;
  duration?: number; // ms, default: 250
  easing?: string;   // default: 'ease-out'
}

// --- Grid Configuration Options ---
export interface GridOptions<T = Record<string, any>> {
  rowIdKey?: string;
  /** Enable global search input. Default: true */
  searchable?: boolean;
  /** Enable pagination footer. Default: true */
  pagination?: boolean;
  /** Rows per page when pagination is enabled. Default: 10 */
  pageSize?: number;
  /** Enable header click sorting. Default: true */
  sorting?: boolean;
  multiSort?: boolean;
  selectable?: boolean;
  multiSelect?: boolean;
  expandable?: boolean;
  virtualize?: boolean;
  rowHeight?: number;
  density?: Density;
  mobileLayout?: MobileLayout;
  
  // Server-side
  serverSide?: boolean;
  serverDataLoader?: ServerDataLoader<T>;
  searchDebounceMs?: number; // default: 300
  keepPreviousDataWhileLoading?: boolean; // default: true

  // Drag & Drop
  rowReordering?: boolean;
  columnReordering?: boolean;
  allowRowReorderWhenSorted?: boolean; // default: false

  // Editing & Deletion
  editable?: boolean;
  deletable?: boolean;
  confirmDelete?: boolean; // default: true
  deleteConfirmMessage?: (row: T) => string;

  // Sorting Animations
  animations?: AnimationOptions;

  // Resizing, Pinning & Aggregations
  resizable?: boolean; // Enable interactive column resizing
  stickyFirstColumn?: boolean;
  stickyActions?: boolean; // Freeze Actions column to the right edge
  stickyColumnWidth?: string;
  footerAggregations?: boolean; // Pinned summary footer (SUM, AVG, etc.)
  statePersistence?: StatePersistenceOptions;

  // Custom Skeletons & Renderers
  skeletonCount?: number;
  loadingRenderer?: () => HTMLElement | string;
  rowDetailRenderer?: (row: T) => HTMLElement | string;
  emptyMessage?: string;
  errorMessage?: string;
}

// --- Typed Event Payloads ---
export interface GridEventPayloads<T = Record<string, any>> {
  'pdg:sort': { criteria: SortCriterion[] };
  'pdg:filter': { filters: Record<string, string>; globalSearch: string };
  'pdg:select': { selectedIds: (string | number)[]; selectedRows: T[] };
  'pdg:page': { pageIndex: number; pageSize: number };
  'pdg:row-expand': { rowId: string | number; expanded: boolean; row: T };
  'pdg:column-visibility': { columnId: string; visible: boolean };

  // Server & Loading Events
  'pdg:loading': { loading: boolean; isInitial: boolean; isRefresh: boolean };
  'pdg:error': { error: Error | any; queryParams?: ServerQueryParams };

  // Drag & Drop Events
  'pdg:row-reorder': { fromIndex: number; toIndex: number; row: T; rows: T[] };
  'pdg:column-reorder': { fromIndex: number; toIndex: number; column: ColumnDef<T>; columns: ColumnDef<T>[] };

  // Edit & Delete Events
  'pdg:edit-start': { rowId: string | number; columnId: string; row: T; value: any };
  'pdg:edit-save': { rowId: string | number; columnId: string; row: T; oldValue: any; newValue: any };
  'pdg:edit-cancel': { rowId: string | number; columnId: string; row: T; value: any };
  'pdg:edit-validation-error': { rowId: string | number; columnId: string; row: T; error: string; invalidValue: any };
  'pdg:delete': { rowId: string | number; row: T };
}
