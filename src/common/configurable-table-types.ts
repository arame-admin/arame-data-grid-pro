import { GridOptions } from '../types.js';

export interface UnifiedFeatureSettings {
  // Core Grid Features
  pagination: boolean;
  pageSize: number;
  sorting: boolean;
  multiSort: boolean;
  globalSearch: boolean;
  density: 'compact' | 'comfortable' | 'spacious';
  animations: boolean;

  // Selection & Bulk Actions
  selectable: boolean;
  multiSelect: boolean;

  // Drag and Drop
  rowReordering: boolean;
  columnReordering: boolean;

  // Inline Editing & Deletion
  editable: boolean;
  deletable: boolean;

  // Row Expansion
  expandable: boolean;

  // Data Source & Virtualization
  serverSide: boolean;
  virtualize: boolean;
  skeletonLoading: boolean;

  // Sticky Columns
  stickyFirstColumn: boolean;
  stickyLastColumn: boolean;

  // Theme
  theme: 'light' | 'dark' | 'auto';
}

export const defaultUnifiedSettings: UnifiedFeatureSettings = {
  pagination: true,
  pageSize: 8,
  sorting: true,
  multiSort: false,
  globalSearch: true,
  density: 'comfortable',
  animations: true,
  selectable: true,
  multiSelect: true,
  rowReordering: true,
  columnReordering: true,
  editable: true,
  deletable: true,
  expandable: true,
  serverSide: false,
  virtualize: false,
  skeletonLoading: false,
  stickyFirstColumn: false,
  stickyLastColumn: false,
  theme: 'light'
};

/**
 * Maps unified feature settings to `GridOptions` for `<pro-data-grid>`.
 */
export function buildGridOptionsFromSettings<T = Record<string, unknown>>(
  settings: UnifiedFeatureSettings,
  serverDataLoader?: import('../types.js').ServerDataLoader<T>,
  rowDetailRenderer?: (row: T) => HTMLElement | string
): GridOptions<T> {
  return {
    density: settings.density,
    pagination: settings.pagination,
    pageSize: settings.pageSize,
    searchable: settings.globalSearch,
    sorting: settings.sorting,
    multiSort: settings.multiSort,
    selectable: settings.selectable,
    multiSelect: settings.selectable && settings.multiSelect,
    rowReordering: settings.rowReordering,
    columnReordering: settings.columnReordering,
    editable: settings.editable,
    deletable: settings.deletable,
    expandable: settings.expandable,
    virtualize: settings.virtualize,
    rowHeight: settings.density === 'compact' ? 36 : settings.density === 'spacious' ? 60 : 48,
    stickyFirstColumn: settings.stickyFirstColumn,
    stickyActions: settings.stickyLastColumn,
    serverSide: settings.serverSide,
    serverDataLoader: settings.serverSide ? serverDataLoader : undefined,
    rowDetailRenderer: settings.expandable ? rowDetailRenderer : undefined,
    animations: {
      enabled: settings.animations,
      duration: 250
    }
  };
}
