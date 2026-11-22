import { BaseTableOptions, SortCriterion } from '../common/base-table-types.js';

export type { Density, SortCriterion } from '../common/base-table-types.js';

export type EditorType = 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'custom';

export interface SelectEditorOption {
  label: string;
  value: string | number;
}

export interface CustomEditorParams<T = any> {
  value: any;
  row: T;
  column: EditableColumnDef<T>;
  onCommit: (newValue: any) => void;
  onCancel: () => void;
  setError: (errorMsg: string | null) => void;
}

export type CellValidator<T = any> = (
  newValue: any,
  oldValue: any,
  row: T,
  column: EditableColumnDef<T>
) => string | null | undefined | Promise<string | null | undefined>;

export interface EditorConfig<T = any> {
  type: EditorType;
  options?: SelectEditorOption[]; // For 'select' editor
  min?: number;                    // For 'number' editor
  max?: number;
  step?: number;
  placeholder?: string;
  customEditor?: (params: CustomEditorParams<T>) => HTMLElement;
}

export interface EditableColumnDef<T = Record<string, any>> {
  id: string;
  header: string;
  field?: keyof T | string;
  width?: string;
  minWidth?: number;
  sortable?: boolean;        // default: true
  editable?: boolean;        // default: false
  editor?: EditorConfig<T>;
  validator?: CellValidator<T>;
  formatter?: (value: any, row: T) => string;
  renderer?: (value: any, row: T, index: number) => HTMLElement | string;
  comparator?: (a: any, b: any, rowA: T, rowB: T) => number;
}

export type CellSaveHandler<T = any> = (payload: {
  rowId: string | number;
  columnId: string;
  oldValue: any;
  newValue: any;
  row: T;
}) => Promise<void> | void;

export interface EditableTableOptions<T = Record<string, any>> extends BaseTableOptions<T> {
  optimisticUpdates?: boolean;   // default: true (rolls back on save error)
  onSave?: CellSaveHandler<T>;
  editOnSingleClick?: boolean;   // default: false (requires double click or Enter key)
}

export interface EditableTableEventPayloads<T = Record<string, any>> {
  'editable-table:edit-start': { rowId: string | number; columnId: string; value: any; row: T };
  'editable-table:change': { rowId: string | number; columnId: string; currentValue: any; row: T };
  'editable-table:save': { rowId: string | number; columnId: string; oldValue: any; newValue: any; row: T };
  'editable-table:cancel': { rowId: string | number; columnId: string; value: any; row: T };
  'editable-table:validation-error': { rowId: string | number; columnId: string; error: string; invalidValue: any; row: T };
  'editable-table:save-error': { rowId: string | number; columnId: string; error: Error | any; attemptedValue: any; row: T };
  'editable-table:page': { pageIndex: number; pageSize: number; totalPages: number; totalRows: number };
  'editable-table:sort': { criteria: SortCriterion[] };
  'editable-table:search': { query: string };
  'editable-table:loading': { loading: boolean };
}
