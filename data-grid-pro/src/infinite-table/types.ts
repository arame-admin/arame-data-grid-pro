import { SortRule } from '../common/base-table-types.js';

export type InfinitePaginationMode = 'offset' | 'cursor';

export interface CursorPaginationParams {
  mode: 'cursor';
  cursor?: string | null;
  limit: number;
}

export interface OffsetPaginationParams {
  mode: 'offset';
  offset: number;
  limit: number;
  page: number;
}

export type InfinitePageParams = CursorPaginationParams | OffsetPaginationParams;

export interface InfiniteDataRequest<T = any> {
  pagination: InfinitePageParams;
  searchTerm?: string;
  sortRule?: SortRule<T> | null;
  columnFilters?: Record<string, any>;
  signal: AbortSignal;
}

export interface InfiniteBatchResult<T = any> {
  rows: T[];
  totalRows?: number;
  hasMore: boolean;
  nextCursor?: string | null;
}

export type InfiniteDataLoader<T = any> = (
  request: InfiniteDataRequest<T>
) => Promise<InfiniteBatchResult<T>>;

export interface InfiniteTableColumn<T = any> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: 'text' | 'select' | 'number';
  filterOptions?: Array<{ label: string; value: any }>;
  width?: string;
  minWidth?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T, index: number) => HTMLElement | string;
}

export interface VirtualizationOptions {
  enabled: boolean;
  rowHeight: number;      // Fixed row height in px (mandatory for virtualization)
  overscanCount?: number; // Extra rows rendered above/below viewport (default: 5)
  viewportHeight?: number;// Fixed container height in px (e.g., 400px, 600px)
}

export interface InfiniteScrollConfig<T = any> {
  enabled?: boolean;                      // Defaults to true
  paginationMode?: InfinitePaginationMode; // 'offset' | 'cursor', default 'offset'
  batchSize?: number;                     // Default 25
  prefetchThresholdPx?: number;           // Distance from bottom to trigger prefetch (default 150px)
  rowIdKey?: keyof T | string;            // Primary key for deduplication (default 'id')
  dataLoader?: InfiniteDataLoader<T>;     // Async batch data loader
  virtualization?: VirtualizationOptions; // Optional DOM virtualization
  manualLoadMode?: boolean;               // If true, shows "Load more" button instead of auto-scroll
  retryDelayMs?: number;                  // Default 0 (instant user retry)
}

export interface InfiniteTableLoadBatchDetail<T = any> {
  batchIndex: number;
  params: InfinitePageParams;
  loadedCount: number;
  totalLoaded: number;
  totalAvailable?: number;
  hasMore: boolean;
}

export interface InfiniteTableCompleteDetail<T = any> {
  totalLoaded: number;
  totalAvailable?: number;
}

export interface InfiniteTableErrorDetail {
  error: Error | any;
  params: InfinitePageParams;
  retry: () => void;
}
