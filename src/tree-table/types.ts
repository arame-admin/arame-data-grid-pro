import { SortRule } from '../common/base-table-types.js';

export type TreePaginationMode = 'root-nodes' | 'flattened-rows';

export type SelectionCascadeMode = 'independent' | 'cascade-all' | 'cascade-down';

export interface TreeTableColumn<T = Record<string, unknown>> {
  key: keyof T | string;
  header: string;
  width?: string;
  minWidth?: string;
  sortable?: boolean; // Default true
  align?: 'left' | 'center' | 'right';
  isTreeColumn?: boolean; // If true, this column hosts indent & expand/collapse toggle
  render?: (value: unknown, row: T, index: number, nodeMeta: TreeNodeMeta<T>) => HTMLElement | string;
}

export interface TreeNodeMeta<T = Record<string, unknown>> {
  id: string;
  level: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  isIndeterminate?: boolean;
  parentPath: string[]; // Ancestor IDs
  childIds: string[];
}

export interface FlattenedTreeNode<T = Record<string, unknown>> {
  data: T;
  meta: TreeNodeMeta<T>;
}

export interface TreeDataOptions<T = Record<string, unknown>> {
  idAccessor?: (row: T) => string; // Default: row.id
  childrenAccessor?: (row: T) => T[] | undefined; // Default: row.children
  treeColumnKey?: string; // Default: first column
  defaultExpandedAll?: boolean; // Default false
  defaultExpandedDepth?: number; // Default 1 (root level expanded)
  expandTransitionMs?: number; // Default 150ms
  stickyParentRows?: boolean; // Default true
  
  // Selection
  selection?: {
    enabled?: boolean; // Default true
    mode?: SelectionCascadeMode; // Default 'cascade-all'
  };

  // Drag and Drop Reordering
  dragAndDrop?: {
    enabled?: boolean; // Default true
    allowReparenting?: boolean; // Default true
    canDrop?: (draggedNode: TreeNodeMeta<T>, targetNode: TreeNodeMeta<T>, dropPosition: 'before' | 'inside' | 'after') => boolean;
  };

  // Pagination
  pagination?: {
    enabled?: boolean; // Default true
    pageSize?: number; // Default 10
    pageSizeOptions?: number[]; // Default [5, 10, 25, 50]
    mode?: TreePaginationMode; // Default 'root-nodes'
  };

  // Sorting
  sorting?: {
    enabled?: boolean; // Default true
    initialSort?: SortRule<T> | null;
  };

  // Search
  search?: {
    enabled?: boolean; // Default true
    placeholder?: string;
  };

  // Export
  export?: {
    fileName?: string;
    includeCollapsedDescendants?: boolean; // Default false
    includeHierarchyPath?: boolean; // Default true
  };

  dataLoader?: TreeDataLoader<T>;
  theme?: 'light' | 'dark' | 'auto';
}

export interface TreeDataLoaderRequest<T = Record<string, unknown>> {
  page: number;
  pageSize: number;
  searchTerm?: string;
  sortRule?: SortRule<T> | null;
  expandedIds: string[];
  signal: AbortSignal;
}

export interface TreeDataLoaderResult<T = Record<string, unknown>> {
  rows: T[];
  totalRootNodes?: number;
  totalFlattenedRows?: number;
}

export type TreeDataLoader<T = Record<string, unknown>> = (
  request: TreeDataLoaderRequest<T>
) => Promise<TreeDataLoaderResult<T>>;

export interface TreeReorderDetail<T = Record<string, unknown>> {
  draggedId: string;
  targetId: string;
  position: 'before' | 'inside' | 'after';
  updatedTree: T[];
}

export interface TreeSelectionDetail<T = Record<string, unknown>> {
  selectedIds: string[];
  lastToggledId: string;
  isSelected: boolean;
}

export interface TreeExpansionDetail<T = Record<string, unknown>> {
  nodeId: string;
  isExpanded: boolean;
  expandedIds: string[];
}

export interface TreeExportCsvOptions {
  fileName?: string;
  includeCollapsed?: boolean;
  includeHierarchyPath?: boolean;
}
