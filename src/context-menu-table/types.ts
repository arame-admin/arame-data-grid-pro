import { BaseTableOptions, SortCriterion } from '../common/base-table-types.js';

export type { Density, SortCriterion } from '../common/base-table-types.js';

// --- Column Header Menu Types ---
export interface HeaderMenuItem<T = any> {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  action: (column: ContextMenuColumnDef<T>, table: any) => void;
}

export interface ContextMenuColumnDef<T = Record<string, any>> {
  id: string;
  header: string;
  field?: keyof T | string;
  width?: string;
  minWidth?: number;
  sortable?: boolean;        // default: true
  visible?: boolean;         // default: true
  required?: boolean;        // default: false (if true, cannot be hidden in column menu)
  pinned?: 'left' | 'right' | null;
  headerMenuItems?: HeaderMenuItem<T>[];
  formatter?: (value: any, row: T) => string;
  renderer?: (value: any, row: T, index: number) => HTMLElement | string;
  comparator?: (a: any, b: any, rowA: T, rowB: T) => number;
}

// --- Row Context Menu Types ---
export interface RowContextMenuItem<T = any> {
  id: string;
  label?: string;            // Omit or leave empty if isSeparator is true
  icon?: string;
  isSeparator?: boolean;
  disabled?: boolean | ((row: T) => boolean);
  isDestructive?: boolean;
  confirmMessage?: string | ((row: T) => string);
  action?: (row: T, table: any) => void;
}

export interface RowContextMenuConfig<T = any> {
  enabled?: boolean;         // default: true
  items?: RowContextMenuItem<T>[];
  showActionButton?: boolean; // default: true (adds an accessible "⋮" button column for touch/keyboard)
}

export interface ContextMenuTableOptions<T = Record<string, any>> extends BaseTableOptions<T> {
  rowContextMenu?: RowContextMenuConfig<T>;
  enableColumnHeaderMenu?: boolean; // default: true
}

export interface ContextMenuTableEventPayloads<T = Record<string, any>> {
  'menu-table:header-menu-open': { columnId: string };
  'menu-table:row-context-menu-open': { rowId: string | number; row: T; clientX: number; clientY: number };
  'menu-table:row-menu-action': { actionId: string; rowId: string | number; row: T };
  'menu-table:column-visibility-change': { columnId: string; visible: boolean; visibleColumnIds: string[] };
  'menu-table:column-pin': { columnId: string; pinned: 'left' | 'right' | null };
  'menu-table:page': { pageIndex: number; pageSize: number; totalPages: number; totalRows: number };
  'menu-table:sort': { criteria: SortCriterion[] };
  'menu-table:search': { query: string };
  'menu-table:loading': { loading: boolean };
}
