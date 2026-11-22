import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  ReactNode,
  useId,
  useState
} from 'react';
import { createPortal } from 'react-dom';
import '../ui/pro-data-grid.element.js';
import type { ProDataGrid } from '../ui/pro-data-grid.element.js';
import type {
  ColumnDef,
  GridOptions,
  SortCriterion,
  GridEventPayloads
} from '../types.js';

/**
 * Extended ColumnDef supporting first-class React JSX Node returns in cell renderer
 */
export interface ReactColumnDef<T = Record<string, unknown>>
  extends Omit<ColumnDef<T>, 'renderer'> {
  renderer?: (
    value: unknown,
    row: T,
    index: number
  ) => ReactNode | HTMLElement | string;
}

/**
 * Extended GridOptions supporting first-class React JSX Node returns in action column & row details
 */
export interface ReactGridOptions<T = Record<string, unknown>>
  extends Omit<GridOptions<T>, 'actions' | 'rowDetailRenderer'> {
  actions?: {
    header?: string;
    width?: string;
    pinned?: 'left' | 'right';
    render?: (row: T, index: number) => ReactNode | HTMLElement | string;
  };
  rowDetailRenderer?: (row: T) => ReactNode | HTMLElement | string;
}

export interface ProDataGridProps<T = Record<string, unknown>> {
  rows: T[];
  columns: ReactColumnDef<T>[];
  options?: ReactGridOptions<T>;
  className?: string;
  style?: React.CSSProperties;

  // Event Callbacks
  onSort?: (criteria: SortCriterion[]) => void;
  onPageChange?: (pageIndex: number, pageSize: number) => void;
  onSelectionChange?: (selectedRows: T[], selectedIds: (string | number)[]) => void;
  onFilter?: (filters: Record<string, string>, globalSearch: string) => void;
  onRowExpand?: (row: T, expanded: boolean, rowId: string | number) => void;
  onRowReorder?: (fromIndex: number, toIndex: number, row: T, rows: T[]) => void;
  onColumnReorder?: (fromIndex: number, toIndex: number, column: ColumnDef<T>) => void;
  onAction?: (action: string, row: T, rowId: string | number) => void;
  onError?: (error: Error | unknown) => void;
}

export interface ProDataGridRef<T = Record<string, unknown>> {
  element: ProDataGrid<T> | null;
  goToPage: (page: number) => void;
  getSelectedRows: () => T[];
  selectAll: () => void;
  clearSelection: () => void;
  refresh: () => void;
}

interface PortalEntry {
  id: string;
  container: HTMLElement;
  node: ReactNode;
}

function ProDataGridInner<T extends Record<string, unknown> = Record<string, unknown>>(
  props: ProDataGridProps<T>,
  ref: React.ForwardedRef<ProDataGridRef<T>>
) {
  const {
    rows,
    columns,
    options,
    className,
    style,
    onSort,
    onPageChange,
    onSelectionChange,
    onFilter,
    onRowExpand,
    onRowReorder,
    onColumnReorder,
    onAction,
    onError
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const gridInstanceRef = useRef<ProDataGrid<T> | null>(null);
  const [portals, setPortals] = useState<PortalEntry[]>([]);
  const portalRegistry = useRef<Map<string, PortalEntry>>(new Map());
  const instanceId = useId();

  // Expose imperative API to parent components
  useImperativeHandle(ref, () => ({
    get element() {
      return gridInstanceRef.current;
    },
    goToPage(page: number) {
      gridInstanceRef.current?.goToPage(page);
    },
    getSelectedRows() {
      return gridInstanceRef.current?.getSelectedRows() || [];
    },
    selectAll() {
      gridInstanceRef.current?.selectAll();
    },
    clearSelection() {
      gridInstanceRef.current?.clearSelection();
    },
    refresh() {
      gridInstanceRef.current?.render();
    }
  }));

  // Bridge column renderers to React portals if they return ReactNodes / JSX
  const transformedColumns = React.useMemo(() => {
    return columns.map((col) => {
      const origRenderer = col.renderer;
      if (!origRenderer) return col as ColumnDef<T>;

      const bridgeRenderer = (val: unknown, row: T, idx: number) => {
        const result = origRenderer(val, row, idx);

        // Native DOM or string
        if (result instanceof HTMLElement || typeof result === 'string') {
          return result;
        }

        // React JSX Node: mount inside a DOM portal mount point
        const portalContainer = document.createElement('div');
        portalContainer.className = 'pdg-react-cell-portal';
        portalContainer.style.display = 'contents';

        const portalKey = `${instanceId}-cell-${String(col.id || col.field)}-${idx}`;
        portalRegistry.current.set(portalKey, {
          id: portalKey,
          container: portalContainer,
          node: result as ReactNode
        });

        // Queue portal sync on animation frame
        queueMicrotask(() => {
          setPortals(Array.from(portalRegistry.current.values()));
        });

        return portalContainer;
      };

      return {
        ...col,
        renderer: bridgeRenderer
      } as ColumnDef<T>;
    });
  }, [columns, instanceId]);

  // Bridge Action column renderer to React portals if provided
  const transformedOptions = React.useMemo(() => {
    if (!options) return undefined;
    const transformed: GridOptions<T> = { ...(options as unknown as GridOptions<T>) };

    if (options.actions?.render) {
      const origActionRender = options.actions.render;
      transformed.actions = {
        ...options.actions,
        render: (row: T, idx: number) => {
          const actRes = origActionRender(row, idx);
          if (actRes instanceof HTMLElement || typeof actRes === 'string') {
            return actRes;
          }

          const actionContainer = document.createElement('div');
          actionContainer.className = 'pdg-react-action-portal';
          actionContainer.style.display = 'contents';

          const actionKey = `${instanceId}-action-${idx}`;
          portalRegistry.current.set(actionKey, {
            id: actionKey,
            container: actionContainer,
            node: actRes as ReactNode
          });

          queueMicrotask(() => {
            setPortals(Array.from(portalRegistry.current.values()));
          });

          return actionContainer;
        }
      };
    }

    if (options.rowDetailRenderer) {
      const origDetailRender = options.rowDetailRenderer;
      transformed.rowDetailRenderer = (row: T) => {
        const detailRes = origDetailRender(row);
        if (detailRes instanceof HTMLElement || typeof detailRes === 'string') {
          return detailRes;
        }

        const detailContainer = document.createElement('div');
        detailContainer.className = 'pdg-react-detail-portal';

        const detailKey = `${instanceId}-detail-${Math.random().toString(36).substring(2, 7)}`;
        portalRegistry.current.set(detailKey, {
          id: detailKey,
          container: detailContainer,
          node: detailRes as ReactNode
        });

        queueMicrotask(() => {
          setPortals(Array.from(portalRegistry.current.values()));
        });

        return detailContainer;
      };
    }

    return transformed;
  }, [options, instanceId]);

  // Synchronize element creation & updates
  useEffect(() => {
    if (!containerRef.current) return;

    let grid = gridInstanceRef.current;
    if (!grid) {
      grid = document.createElement('pro-data-grid') as ProDataGrid<T>;
      gridInstanceRef.current = grid;
      containerRef.current.appendChild(grid);
    }

    if (transformedOptions) {
      grid.options = transformedOptions;
    }
    grid.columns = transformedColumns;
    grid.rows = rows;
  }, [rows, transformedColumns, transformedOptions]);

  // Bridge custom events to React callbacks
  useEffect(() => {
    const grid = gridInstanceRef.current;
    if (!grid) return;

    const handleSort = (e: Event) => {
      const detail = (e as CustomEvent<GridEventPayloads<T>['pdg:sort']>).detail;
      onSort?.(detail.criteria);
    };

    const handlePage = (e: Event) => {
      const detail = (e as CustomEvent<GridEventPayloads<T>['pdg:page']>).detail;
      onPageChange?.(detail.pageIndex, detail.pageSize);
    };

    const handleSelect = (e: Event) => {
      const detail = (e as CustomEvent<GridEventPayloads<T>['pdg:select']>).detail;
      onSelectionChange?.(detail.selectedRows, detail.selectedIds);
    };

    const handleFilter = (e: Event) => {
      const detail = (e as CustomEvent<GridEventPayloads<T>['pdg:filter']>).detail;
      onFilter?.(detail.filters, detail.globalSearch);
    };

    const handleExpand = (e: Event) => {
      const detail = (e as CustomEvent<GridEventPayloads<T>['pdg:row-expand']>).detail;
      onRowExpand?.(detail.row, detail.expanded, detail.rowId);
    };

    const handleRowReorder = (e: Event) => {
      const detail = (e as CustomEvent<GridEventPayloads<T>['pdg:row-reorder']>).detail;
      onRowReorder?.(detail.fromIndex, detail.toIndex, detail.row, detail.rows);
    };

    const handleColReorder = (e: Event) => {
      const detail = (e as CustomEvent<GridEventPayloads<T>['pdg:column-reorder']>).detail;
      onColumnReorder?.(detail.fromIndex, detail.toIndex, detail.column);
    };

    const handleAction = (e: Event) => {
      const detail = (e as CustomEvent<GridEventPayloads<T>['pdg:action']>).detail;
      onAction?.(detail.action, detail.row, detail.rowId);
    };

    const handleError = (e: Event) => {
      const detail = (e as CustomEvent<GridEventPayloads<T>['pdg:error']>).detail;
      onError?.(detail.error);
    };

    grid.addEventListener('pdg:sort', handleSort);
    grid.addEventListener('pdg:page', handlePage);
    grid.addEventListener('pdg:select', handleSelect);
    grid.addEventListener('pdg:filter', handleFilter);
    grid.addEventListener('pdg:row-expand', handleExpand);
    grid.addEventListener('pdg:row-reorder', handleRowReorder);
    grid.addEventListener('pdg:column-reorder', handleColReorder);
    grid.addEventListener('pdg:action', handleAction);
    grid.addEventListener('pdg:error', handleError);

    return () => {
      grid.removeEventListener('pdg:sort', handleSort);
      grid.removeEventListener('pdg:page', handlePage);
      grid.removeEventListener('pdg:select', handleSelect);
      grid.removeEventListener('pdg:filter', handleFilter);
      grid.removeEventListener('pdg:row-expand', handleExpand);
      grid.removeEventListener('pdg:row-reorder', handleRowReorder);
      grid.removeEventListener('pdg:column-reorder', handleColReorder);
      grid.removeEventListener('pdg:action', handleAction);
      grid.removeEventListener('pdg:error', handleError);
    };
  }, [
    onSort,
    onPageChange,
    onSelectionChange,
    onFilter,
    onRowExpand,
    onRowReorder,
    onColumnReorder,
    onAction,
    onError
  ]);

  return (
    <div
      ref={containerRef}
      className={`arame-data-grid-react-wrapper ${className || ''}`.trim()}
      style={style}
    >
      {portals.map((p) =>
        p.container ? createPortal(p.node, p.container, p.id) : null
      )}
    </div>
  );
}

export const ProDataGridReact = forwardRef(ProDataGridInner) as <
  T extends Record<string, unknown> = Record<string, unknown>
>(
  props: ProDataGridProps<T> & { ref?: React.ForwardedRef<ProDataGridRef<T>> }
) => React.ReactElement;

export default ProDataGridReact;
