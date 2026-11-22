import { SortCriterion } from './base-table-types.js';

/**
 * Complete, serializable state representation for any data table variant.
 */
export interface TableState<T = any> {
  pagination: {
    pageIndex: number;
    pageSize: number;
    totalRows?: number;
  };
  sorting: {
    criteria: SortCriterion[];
  };
  search: {
    query: string;
  };
  filters: {
    columnFilters: Record<string, any>;
    advancedExpression?: any;
  };
  selection: {
    selectedRowIds: string[];
    selectAllMode?: boolean; // When true, represents selection of all filtered items
  };
  columns: {
    order: string[];              // List of column IDs in current displayed order
    visibility: Record<string, boolean>; // columnId -> isVisible
    widths: Record<string, number | string>; // columnId -> width px
  };
  extra?: Record<string, any>;
}

/**
 * Storage adapter interface for pluggable state persistence (localStorage, sessionStorage, server DB, URL query, etc.)
 */
export interface StateStorageAdapter {
  load(key: string): Promise<Partial<TableState> | null> | Partial<TableState> | null;
  save(key: string, state: TableState): Promise<void> | void;
  clear?(key: string): Promise<void> | void;
}

/**
 * Built-in LocalStorage Adapter
 */
export class LocalStorageStateAdapter implements StateStorageAdapter {
  load(key: string): Partial<TableState> | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.warn(`[LocalStorageStateAdapter] Failed to load key "${key}":`, e);
      return null;
    }
  }

  save(key: string, state: TableState): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.warn(`[LocalStorageStateAdapter] Failed to save key "${key}":`, e);
    }
  }

  clear(key: string): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[LocalStorageStateAdapter] Failed to clear key "${key}":`, e);
    }
  }
}

/**
 * Optional URL Search Params State Adapter for synchronizing table state with browser address bar
 */
export class UrlSearchParamsStateAdapter implements StateStorageAdapter {
  constructor(private prefix = 'tbl_') {}

  load(): Partial<TableState> | null {
    if (typeof window === 'undefined' || !window.location) return null;
    try {
      const params = new URLSearchParams(window.location.search);
      const state: Partial<TableState> = {};

      const page = params.get(`${this.prefix}page`);
      const size = params.get(`${this.prefix}size`);
      if (page !== null || size !== null) {
        state.pagination = {
          pageIndex: page ? Math.max(0, parseInt(page, 10)) : 0,
          pageSize: size ? parseInt(size, 10) : 10
        };
      }

      const q = params.get(`${this.prefix}q`);
      if (q !== null) {
        state.search = { query: q };
      }

      const sort = params.get(`${this.prefix}sort`);
      if (sort) {
        // format: "colId:asc,col2:desc"
        const criteria: SortCriterion[] = sort.split(',').map((part) => {
          const [columnId, dir] = part.split(':');
          return { columnId, direction: dir === 'desc' ? 'desc' : 'asc' };
        });
        state.sorting = { criteria };
      }

      return state;
    } catch {
      return null;
    }
  }

  save(_key: string, state: TableState): void {
    if (typeof window === 'undefined' || !window.history || !window.location) return;
    try {
      const url = new URL(window.location.href);
      if (state.pagination) {
        url.searchParams.set(`${this.prefix}page`, String(state.pagination.pageIndex));
        url.searchParams.set(`${this.prefix}size`, String(state.pagination.pageSize));
      }
      if (state.search?.query) {
        url.searchParams.set(`${this.prefix}q`, state.search.query);
      } else {
        url.searchParams.delete(`${this.prefix}q`);
      }
      if (state.sorting?.criteria && state.sorting.criteria.length > 0) {
        const sortStr = state.sorting.criteria.map((c) => `${c.columnId}:${c.direction}`).join(',');
        url.searchParams.set(`${this.prefix}sort`, sortStr);
      } else {
        url.searchParams.delete(`${this.prefix}sort`);
      }
      window.history.replaceState(null, '', url.toString());
    } catch {
      // Non-blocking in non-browser or sandbox contexts
    }
  }
}
