import {
  ColumnDef,
  Density,
  FilterCriterion,
  GridEventPayloads,
  GridOptions,
  MobileLayout,
  PaginationState,
  ServerQueryParams,
  SortCriterion
} from '../types.js';
import { filterRows, paginateRows, resolveValue, sortRows } from '../core/data-engine.js';
import { exportToCSV } from '../core/csv-exporter.js';
import { computeVirtualSlice } from '../core/virtualizer.js';
import { createElement, removeAllChildren } from './dom-utils.js';

export class ProDataGrid<T = Record<string, any>> extends HTMLElement {
  static get observedAttributes() {
    return ['density', 'mobile-layout'];
  }

  // --- Internal Grid State ---
  private _rows: T[] = [];
  private _columns: ColumnDef<T>[] = [];
  private _options: GridOptions<T> = {
    rowIdKey: 'id',
    searchable: true,
    pagination: true,
    pageSize: 10,
    sorting: true,
    multiSort: false,
    selectable: false,
    multiSelect: true,
    expandable: false,
    virtualize: false,
    rowHeight: 48,
    density: 'comfortable',
    mobileLayout: 'scroll',
    searchDebounceMs: 300,
    keepPreviousDataWhileLoading: true,
    rowReordering: false,
    columnReordering: false,
    allowRowReorderWhenSorted: false,
    editable: false,
    deletable: false,
    confirmDelete: true,
    animations: {
      enabled: true,
      duration: 250,
      easing: 'ease-out'
    }
  };

  private _sortCriteria: SortCriterion[] = [];
  private _columnFilters: FilterCriterion[] = [];
  private _globalSearch = '';
  private _pagination: PaginationState = {
    pageIndex: 0,
    pageSize: 10,
    totalRows: 0,
    totalPages: 1
  };
  private _selectedIds = new Set<string | number>();
  private _expandedIds = new Set<string | number>();

  // --- Server-side & Async Loading State ---
  private _isLoading = false;
  private _isInitialLoad = true;
  private _loadError: Error | null = null;
  private _abortController: AbortController | null = null;
  private _searchDebounceTimer: any = null;
  private _currentRequestId = 0;

  // --- In-place Editing State ---
  private _editingCell: { rowId: string | number; columnId: string; initialValue: any } | null = null;

  // --- Drag and Drop State ---
  private _draggedColIndex: number | null = null;
  private _draggedRowIndex: number | null = null;
  private _justDroppedRowId: string | number | null = null;
  private _justDroppedColId: string | null = null;
  private _liveAnnouncerEl: HTMLElement | null = null;

  // --- FLIP Animation Positions Cache ---
  private _previousRowRects = new Map<string | number, DOMRect>();

  // --- DOM References ---
  private containerEl!: HTMLElement;
  private refreshIndicatorEl!: HTMLElement;
  private errorBannerEl!: HTMLElement;
  private toolbarEl!: HTMLElement;
  private tableContainerEl!: HTMLElement;
  private tableEl!: HTMLTableElement;
  private theadEl!: HTMLTableSectionElement;
  private tbodyEl!: HTMLTableSectionElement;
  private tfootEl!: HTMLTableSectionElement;
  private footerEl!: HTMLElement;
  private virtualSpacerEl?: HTMLElement;

  // --- Cleanup Hooks ---
  private resizeObserver?: ResizeObserver;
  private scrollHandler?: (e: Event) => void;

  constructor() {
    super();
  }

  // --- Public Properties ---
  get rows(): T[] {
    return this._rows;
  }
  set rows(value: T[]) {
    this._rows = Array.isArray(value) ? value : [];
    if (!this._options.serverSide) {
      this._pagination.pageIndex = 0;
    }
    this.render();
  }

  get columns(): ColumnDef<T>[] {
    return this._columns;
  }
  set columns(value: ColumnDef<T>[]) {
    this._columns = Array.isArray(value) ? value : [];
    this.render();
  }

  get options(): GridOptions<T> {
    return this._options;
  }
  set options(opts: Partial<GridOptions<T>>) {
    this._options = {
      ...this._options,
      ...opts,
      animations: { ...this._options.animations, ...opts.animations }
    };
    if (typeof this._options.pageSize === 'number' && this._options.pageSize > 0) {
      this._pagination.pageSize = this._options.pageSize;
    }
    if (this._options.density) {
      this.setAttribute('density', this._options.density);
    }
    if (this._options.mobileLayout) {
      this.setAttribute('mobile-layout', this._options.mobileLayout);
    }
    if (this._options.serverSide && this._options.serverDataLoader) {
      this.triggerServerLoad(true);
    } else {
      this.render();
    }
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  // --- Lifecycle Callbacks ---
  connectedCallback(): void {
    if (!this.containerEl) {
      this.initLayout();
    }
    this.setupListeners();
    this.restoreState();
    if (this._options.serverSide && this._options.serverDataLoader) {
      this.triggerServerLoad(true);
    } else {
      this.render();
    }
  }

  disconnectedCallback(): void {
    if (this._abortController) {
      this._abortController.abort();
    }
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.scrollHandler && this.tableContainerEl) {
      this.tableContainerEl.removeEventListener('scroll', this.scrollHandler);
    }
  }

  attributeChangedCallback(name: string, _oldVal: string, newVal: string): void {
    if (name === 'density' && newVal) {
      this._options.density = newVal as Density;
    }
    if (name === 'mobile-layout' && newVal) {
      this._options.mobileLayout = newVal as MobileLayout;
    }
  }

  // --- Initial Layout Setup ---
  private initLayout(): void {
    this.containerEl = createElement('div', 'pdg-wrapper');
    this.refreshIndicatorEl = createElement('div', 'pdg-refresh-indicator');
    this.refreshIndicatorEl.style.display = 'none';

    this.errorBannerEl = createElement('div', 'pdg-error-banner');
    this.errorBannerEl.style.display = 'none';

    this.toolbarEl = createElement('div', 'pdg-toolbar');
    this.tableContainerEl = createElement('div', 'pdg-table-container');
    this.tableEl = createElement('table', 'pdg-table');
    this.theadEl = createElement('thead', 'pdg-thead');
    this.tbodyEl = createElement('tbody', 'pdg-tbody');
    this.tfootEl = createElement('tfoot', 'pdg-tfoot');
    this.footerEl = createElement('div', 'pdg-footer');

    this.tableEl.appendChild(this.theadEl);
    this.tableEl.appendChild(this.tbodyEl);
    this.tableEl.appendChild(this.tfootEl);
    this.tableContainerEl.appendChild(this.tableEl);

    this.containerEl.appendChild(this.refreshIndicatorEl);
    this.containerEl.appendChild(this.errorBannerEl);
    this.containerEl.appendChild(this.toolbarEl);
    this.containerEl.appendChild(this.tableContainerEl);
    this.containerEl.appendChild(this.footerEl);

    // Live region for screen reader announcements
    this._liveAnnouncerEl = createElement('div', 'pdg-sr-only', {
      'aria-live': 'polite',
      'aria-atomic': 'true',
      role: 'status'
    });
    this._liveAnnouncerEl.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
    this.containerEl.appendChild(this._liveAnnouncerEl);

    this.appendChild(this.containerEl);
  }

  private setupListeners(): void {
    this.scrollHandler = () => {
      if (this._options.virtualize) {
        this.renderBody();
      }
    };
    this.tableContainerEl.addEventListener('scroll', this.scrollHandler, { passive: true });
  }

  // --- Event Dispatcher ---
  private dispatchGridEvent<K extends keyof GridEventPayloads<T>>(
    eventName: K,
    detail: GridEventPayloads<T>[K]
  ): void {
    this.dispatchEvent(
      new CustomEvent(eventName, {
        detail,
        bubbles: true,
        composed: true
      })
    );
  }

  // --- Server-Side Data Loading & Cancellation Pipeline ---
  public async triggerServerLoad(isInitial = false): Promise<void> {
    if (!this._options.serverSide || !this._options.serverDataLoader) return;

    // 1. Abort previous pending in-flight requests only (not already-completed ones)
    if (this._abortController && this._isLoading) {
      this._abortController.abort();
    }
    this._abortController = new AbortController();
    const signal = this._abortController.signal;

    const requestId = ++this._currentRequestId;
    this._isLoading = true;
    this._loadError = null;

    const isRefresh = !isInitial;
    this._isInitialLoad = isInitial;

    this.dispatchGridEvent('pdg:loading', {
      loading: true,
      isInitial,
      isRefresh
    });

    this.updateLoadingIndicators();

    const queryParams: ServerQueryParams = {
      pageIndex: this._pagination.pageIndex,
      pageSize: this._pagination.pageSize,
      globalSearch: this._globalSearch,
      sortCriteria: [...this._sortCriteria],
      filters: [...this._columnFilters],
      signal
    };

    try {
      const result = await this._options.serverDataLoader(queryParams);

      // Prevent race conditions / stale out-of-order responses
      if (requestId !== this._currentRequestId || signal.aborted) {
        return;
      }

      this._rows = result.rows;
      this._pagination.totalRows = result.totalRows;
      this._pagination.totalPages = Math.max(1, Math.ceil(result.totalRows / this._pagination.pageSize));
      this._isInitialLoad = false;
    } catch (err: any) {
      if (err.name === 'AbortError' || signal.aborted) {
        return; // Normal cancellation, do not treat as failure
      }
      this._loadError = err;
      this.dispatchGridEvent('pdg:error', { error: err, queryParams });
    } finally {
      if (requestId === this._currentRequestId) {
        this._isLoading = false;
        this.dispatchGridEvent('pdg:loading', {
          loading: false,
          isInitial: false,
          isRefresh: false
        });
        this.updateLoadingIndicators();
        this.render();
      }
    }
  }

  private updateLoadingIndicators(): void {
    if (!this.refreshIndicatorEl) return;
    if (this._isLoading && !this._isInitialLoad) {
      this.refreshIndicatorEl.style.display = 'block';
    } else {
      this.refreshIndicatorEl.style.display = 'none';
    }
  }

  // --- Rendering Pipeline ---
  public render(): void {
    if (!this.containerEl) return;
    this.cacheRowPositions();
    this.renderErrorBanner();
    this.renderToolbar();
    this.renderHeader();
    this.renderBody();
    this.renderFooterAggregations();
    this.renderFooter();
    this.applyRowFLIPAnimations();
  }

  private saveState(): void {
    if (!this._options.statePersistence?.enabled) return;
    const storageType = this._options.statePersistence.storage || 'localStorage';
    const storageKey = this._options.statePersistence.key || 'arame-grid-state';
    const state: Record<string, any> = {};

    if (this._options.statePersistence.saveColumnWidths !== false) {
      state.columnWidths = this._columns.map(c => ({ id: c.id, width: c.width }));
    }
    if (this._options.statePersistence.saveColumnVisibility !== false) {
      state.columnVisibility = this._columns.map(c => ({ id: c.id, visible: c.visible !== false }));
    }
    if (this._options.statePersistence.saveColumnOrder !== false) {
      state.columnOrder = this._columns.map(c => c.id);
    }
    if (this._options.statePersistence.saveSort !== false) {
      state.sortCriteria = this._sortCriteria;
    }
    if (this._options.statePersistence.saveFilter !== false) {
      state.globalSearch = this._globalSearch;
    }

    try {
      const store = storageType === 'sessionStorage' ? sessionStorage : localStorage;
      store.setItem(storageKey, JSON.stringify(state));
    } catch (e) {
      // Storage unavailable or quota exceeded
    }
  }

  private restoreState(): void {
    if (!this._options.statePersistence?.enabled) return;
    const storageType = this._options.statePersistence.storage || 'localStorage';
    const storageKey = this._options.statePersistence.key || 'arame-grid-state';

    try {
      const store = storageType === 'sessionStorage' ? sessionStorage : localStorage;
      const raw = store.getItem(storageKey);
      if (!raw) return;
      const state = JSON.parse(raw);

      if (state.columnWidths && Array.isArray(state.columnWidths)) {
        const widthMap = new Map<string, string>(state.columnWidths.map((w: any) => [w.id, w.width]));
        this._columns.forEach(col => {
          if (widthMap.has(col.id)) col.width = widthMap.get(col.id);
        });
      }

      if (state.columnVisibility && Array.isArray(state.columnVisibility)) {
        const visMap = new Map<string, boolean>(state.columnVisibility.map((v: any) => [v.id, v.visible]));
        this._columns.forEach(col => {
          if (visMap.has(col.id)) col.visible = visMap.get(col.id);
        });
      }

      if (state.columnOrder && Array.isArray(state.columnOrder) && state.columnOrder.length > 0) {
        const colMap = new Map(this._columns.map(c => [c.id, c]));
        const ordered: ColumnDef<T>[] = [];
        state.columnOrder.forEach((cid: string) => {
          if (colMap.has(cid)) {
            ordered.push(colMap.get(cid)!);
            colMap.delete(cid);
          }
        });
        colMap.forEach(c => ordered.push(c));
        this._columns = ordered;
      }

      if (state.sortCriteria && Array.isArray(state.sortCriteria)) {
        this._sortCriteria = state.sortCriteria;
      }

      if (typeof state.globalSearch === 'string') {
        this._globalSearch = state.globalSearch;
      }
    } catch (e) {
      // Ignore parse/storage errors
    }
  }

  private renderFooterAggregations(): void {
    removeAllChildren(this.tfootEl);
    if (!this._options.footerAggregations) {
      this.tfootEl.style.display = 'none';
      return;
    }
    this.tfootEl.style.display = 'table-footer-group';

    const { processed } = this.getProcessedData();
    const tr = createElement('tr', 'pdg-tfoot-row');

    if (this._options.rowReordering) {
      const td = createElement('td', 'pdg-td');
      tr.appendChild(td);
    }
    if (this._options.selectable) {
      const td = createElement('td', 'pdg-td');
      tr.appendChild(td);
    }
    if (this._options.expandable) {
      const td = createElement('td', 'pdg-td');
      tr.appendChild(td);
    }

    let renderedColIdx = 0;
    this._columns.forEach(col => {
      if (col.visible === false) return;
      renderedColIdx++;

      const td = createElement('td', 'pdg-td');
      if (col.width) td.style.width = col.width;

      if (col.aggregation) {
        const values = processed.map(r => resolveValue(r, col.field)).filter(v => v != null);
        let result: any = 0;

        if (col.aggregation === 'sum') {
          result = values.reduce((acc, v) => acc + (Number(v) || 0), 0);
        } else if (col.aggregation === 'avg') {
          const sum = values.reduce((acc, v) => acc + (Number(v) || 0), 0);
          result = values.length ? sum / values.length : 0;
        } else if (col.aggregation === 'count') {
          result = values.length;
        } else if (col.aggregation === 'min') {
          result = values.length ? Math.min(...values.map(v => Number(v) || 0)) : 0;
        } else if (col.aggregation === 'max') {
          result = values.length ? Math.max(...values.map(v => Number(v) || 0)) : 0;
        } else if (typeof col.aggregation === 'function') {
          result = col.aggregation(values, processed);
        }

        const labelSpan = createElement('span', 'pdg-agg-label');
        labelSpan.textContent = typeof col.aggregation === 'string' ? col.aggregation.toUpperCase() : 'TOTAL';

        const valSpan = createElement('span', 'pdg-agg-value');
        if (col.aggregationFormatter) {
          valSpan.textContent = col.aggregationFormatter(result);
        } else if (col.formatter) {
          valSpan.textContent = col.formatter(result, {} as T);
        } else if (typeof result === 'number') {
          valSpan.textContent = Number.isInteger(result) ? result.toLocaleString() : result.toFixed(2);
        } else {
          valSpan.textContent = String(result);
        }

        td.appendChild(labelSpan);
        td.appendChild(valSpan);
      } else if (renderedColIdx === 1) {
        const labelSpan = createElement('span', 'pdg-agg-label');
        labelSpan.textContent = 'SUMMARY';
        const valSpan = createElement('span');
        valSpan.style.fontSize = '0.8rem';
        valSpan.style.color = 'var(--pdg-text-muted)';
        valSpan.textContent = `${processed.length} matching rows`;
        td.appendChild(labelSpan);
        td.appendChild(valSpan);
      } else {
        td.textContent = '—';
        td.style.color = 'var(--pdg-text-muted)';
        td.style.fontSize = '0.8rem';
      }

      tr.appendChild(td);
    });

    if (this._options.deletable) {
      const td = createElement('td', 'pdg-td');
      tr.appendChild(td);
    }

    this.tfootEl.appendChild(tr);
  }

  private cacheRowPositions(): void {
    this._previousRowRects.clear();
    const shouldAnimate =
      this._options.animations?.enabled !== false &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!shouldAnimate) return;

    const existingRows = this.tbodyEl.querySelectorAll('.pdg-row[data-row-id]');
    existingRows.forEach((el) => {
      const id = el.getAttribute('data-row-id');
      if (id) {
        this._previousRowRects.set(id, el.getBoundingClientRect());
      }
    });
  }

  private applyRowFLIPAnimations(): void {
    const shouldAnimate =
      this._options.animations?.enabled !== false &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!shouldAnimate || this._previousRowRects.size === 0) return;

    const duration = this._options.animations?.duration ?? 250;
    const easing = this._options.animations?.easing ?? 'ease-out';

    const currentRows = this.tbodyEl.querySelectorAll('.pdg-row[data-row-id]');
    currentRows.forEach((el) => {
      const id = el.getAttribute('data-row-id');
      if (!id) return;
      const prevRect = this._previousRowRects.get(id);
      if (!prevRect) return;

      const currentRect = el.getBoundingClientRect();
      const deltaY = prevRect.top - currentRect.top;

      if (deltaY !== 0) {
        const rowEl = el as HTMLElement;
        rowEl.style.transition = 'none';
        rowEl.style.transform = `translateY(${deltaY}px)`;

        requestAnimationFrame(() => {
          rowEl.style.transition = `transform ${duration}ms ${easing}`;
          rowEl.style.transform = '';
          const cleanUp = () => {
            rowEl.style.transition = '';
            rowEl.removeEventListener('transitionend', cleanUp);
          };
          rowEl.addEventListener('transitionend', cleanUp);
        });
      }
    });
  }

  private renderErrorBanner(): void {
    if (this._loadError) {
      this.errorBannerEl.style.display = 'flex';
      removeAllChildren(this.errorBannerEl);
      const span = createElement('span');
      span.textContent =
        this._options.errorMessage || `Error loading data: ${this._loadError.message || this._loadError}`;
      const retryBtn = createElement('button', 'pdg-btn pdg-btn-sm', { type: 'button' });
      retryBtn.textContent = 'Retry';
      retryBtn.addEventListener('click', () => this.triggerServerLoad(false));

      this.errorBannerEl.appendChild(span);
      this.errorBannerEl.appendChild(retryBtn);
    } else {
      this.errorBannerEl.style.display = 'none';
    }
  }

  private getProcessedData(): { processed: T[]; totalFilteredCount: number } {
    if (this._options.serverSide) {
      return {
        processed: this._rows,
        totalFilteredCount: this._pagination.totalRows || this._rows.length
      };
    }

    const searchTerm = this._options.searchable === false ? '' : this._globalSearch;
    const filtered = filterRows(
      this._rows,
      this._columnFilters,
      searchTerm,
      this._columns
    );

    const sorted =
      this._options.sorting === false
        ? filtered
        : sortRows(filtered, this._sortCriteria, this._columns);
    return { processed: sorted, totalFilteredCount: sorted.length };
  }

  private renderToolbar(): void {
    removeAllChildren(this.toolbarEl);

    const left = createElement('div', 'pdg-toolbar-left');
    if (this._options.searchable !== false) {
      const searchInput = createElement('input', 'pdg-search-input', {
        type: 'search',
        placeholder: 'Search all columns...',
        value: this._globalSearch,
        'aria-label': 'Search records'
      });

      searchInput.addEventListener('input', (e) => {
        this._globalSearch = (e.target as HTMLInputElement).value;
        this._pagination.pageIndex = 0; // Reset to first page on search

        if (this._options.serverSide) {
          if (this._searchDebounceTimer) clearTimeout(this._searchDebounceTimer);
          const debounceMs = this._options.searchDebounceMs ?? 300;
          this._searchDebounceTimer = setTimeout(() => {
            this.triggerServerLoad(false);
          }, debounceMs);
        } else {
          this.render();
        }

        const currentFilters: Record<string, string> = {};
        this._columnFilters.forEach((f) => (currentFilters[f.columnId] = f.value));
        this.dispatchGridEvent('pdg:filter', {
          filters: currentFilters,
          globalSearch: this._globalSearch
        });
      });
      left.appendChild(searchInput);
    }

    const right = createElement('div', 'pdg-toolbar-right');
    const exportBtn = createElement('button', 'pdg-btn', { type: 'button' });
    exportBtn.textContent = 'Export CSV';
    exportBtn.addEventListener('click', () => {
      const { processed } = this.getProcessedData();
      exportToCSV(processed, this._columns);
    });
    right.appendChild(exportBtn);

    this.toolbarEl.appendChild(left);
    this.toolbarEl.appendChild(right);
  }

  private renderHeader(): void {
    removeAllChildren(this.theadEl);
    const tr = createElement('tr', 'pdg-header-row');

    // Row Reordering Drag Handle Header Spacer
    if (this._options.rowReordering) {
      const thDrag = createElement('th', 'pdg-th pdg-th-drag');
      thDrag.style.width = '36px';
      tr.appendChild(thDrag);
    }

    // Selection Header Column
    if (this._options.selectable) {
      const thSel = createElement('th', 'pdg-th pdg-th-select');
      thSel.style.width = '40px';
      if (this._options.multiSelect) {
        const chk = createElement('input', 'pdg-checkbox', {
          type: 'checkbox',
          'aria-label': 'Select all rows'
        }) as HTMLInputElement;
        const { processed } = this.getProcessedData();
        chk.checked = processed.length > 0 && this._selectedIds.size === processed.length;
        chk.indeterminate =
          this._selectedIds.size > 0 && this._selectedIds.size < processed.length;
        chk.addEventListener('change', () => {
          if (chk.checked) {
            processed.forEach((r) => this._selectedIds.add(this.getRowId(r)));
          } else {
            this._selectedIds.clear();
          }
          this.dispatchSelection();
          this.renderBody();
        });
        thSel.appendChild(chk);
      }
      tr.appendChild(thSel);
    }

    // Expandable column header spacer
    if (this._options.expandable) {
      const thExp = createElement('th', 'pdg-th pdg-th-expand');
      thExp.style.width = '40px';
      tr.appendChild(thExp);
    }

    // Column Headers (with Column Drag & Drop Reordering)
    this._columns.forEach((col, colIdx) => {
      if (col.visible === false) return;
      const th = createElement('th', 'pdg-th');
      th.setAttribute('data-col-index', String(colIdx));
      if (col.width) th.style.width = col.width;

      if (this._justDroppedColId === col.id) {
        th.classList.add('pdg-drop-success');
      }

      const inner = createElement('div', 'pdg-th-inner');

      // Column Reorder Drag & Drop Handlers
      if (this._options.columnReordering && col.reorderable !== false) {
        th.classList.add('pdg-th-draggable');
        th.setAttribute('draggable', 'true');
        th.setAttribute('tabindex', '0');
        th.setAttribute('aria-description', 'Press Left or Right arrow to reorder column');

        th.addEventListener('dragstart', (e) => {
          this._draggedColIndex = colIdx;
          th.classList.add('pdg-th-dragging');
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(colIdx));
          }
          this.announceLive(`Started dragging column ${col.header}. Move over a column to reorder.`);
        });

        th.addEventListener('dragend', () => {
          this._draggedColIndex = null;
          this.theadEl.querySelectorAll('.pdg-th').forEach((h) => {
            h.classList.remove('pdg-th-dragging', 'pdg-drag-over-left', 'pdg-drag-over-right', 'pdg-drag-not-allowed');
          });
        });

        th.addEventListener('dragover', (e) => {
          e.preventDefault();
          if (this._draggedColIndex === null) return;

          if (this._draggedColIndex === colIdx) {
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'none';
            th.classList.add('pdg-drag-not-allowed');
            th.classList.remove('pdg-drag-over-left', 'pdg-drag-over-right');
            return;
          }

          if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
          th.classList.remove('pdg-drag-not-allowed');

          const rect = th.getBoundingClientRect();
          const relX = e.clientX - rect.left;
          if (relX < rect.width / 2) {
            th.classList.add('pdg-drag-over-left');
            th.classList.remove('pdg-drag-over-right');
          } else {
            th.classList.add('pdg-drag-over-right');
            th.classList.remove('pdg-drag-over-left');
          }
        });

        th.addEventListener('dragleave', () => {
          th.classList.remove('pdg-drag-over-left', 'pdg-drag-over-right', 'pdg-drag-not-allowed');
        });

        th.addEventListener('drop', (e) => {
          e.preventDefault();
          const fromCol = this._draggedColIndex;
          th.classList.remove('pdg-drag-over-left', 'pdg-drag-over-right', 'pdg-drag-not-allowed', 'pdg-th-dragging');

          if (fromCol != null && fromCol !== colIdx) {
            const rect = th.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            let targetIdx = relX < rect.width / 2 ? colIdx : colIdx + 1;
            if (fromCol < targetIdx) targetIdx--;
            targetIdx = Math.max(0, Math.min(targetIdx, this._columns.length - 1));

            if (targetIdx !== fromCol) {
              this.reorderColumn(fromCol, targetIdx);
            }
          }
          this._draggedColIndex = null;
        });

        // Accessible Keyboard Reordering
        th.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowLeft' && colIdx > 0) {
            e.preventDefault();
            this.reorderColumn(colIdx, colIdx - 1);
          } else if (e.key === 'ArrowRight' && colIdx < this._columns.length - 1) {
            e.preventDefault();
            this.reorderColumn(colIdx, colIdx + 1);
          }
        });
      }

      const titleSpan = createElement('span', 'pdg-th-title');
      titleSpan.textContent = col.header;
      inner.appendChild(titleSpan);

      if (col.sortable && this._options.sorting !== false) {
        th.classList.add('pdg-sortable');
        const activeSort = this._sortCriteria.find((c) => c.columnId === col.id);
        const iconSpan = createElement('span', 'pdg-sort-icon');
        iconSpan.textContent =
          activeSort?.direction === 'asc' ? ' ▲' : activeSort?.direction === 'desc' ? ' ▼' : ' ⇅';
        inner.appendChild(iconSpan);

        th.addEventListener('click', () => this.handleSortClick(col.id));
      }

      th.appendChild(inner);

      // Interactive Column Resizer Handle
      if (this._options.resizable !== false && col.resizable !== false) {
        const resizer = createElement('div', 'pdg-col-resizer', {
          title: 'Drag to resize, double click to auto-fit'
        });

        resizer.addEventListener('mousedown', (e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          resizer.classList.add('is-resizing');
          const startX = e.pageX;
          const startWidth = th.offsetWidth;

          const onMouseMove = (moveEvent: MouseEvent) => {
            const diff = moveEvent.pageX - startX;
            const newWidth = Math.max(col.minWidth || 70, startWidth + diff);
            th.style.width = `${newWidth}px`;
            col.width = `${newWidth}px`;
          };

          const onMouseUp = () => {
            resizer.classList.remove('is-resizing');
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            this.saveState();
            this.announceLive(`Resized column ${col.header} to ${th.offsetWidth}px`);
          };

          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        });

        resizer.addEventListener('dblclick', (e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          let maxChars = col.header.length;
          for (const r of this._rows) {
            const val = resolveValue(r, col.field);
            if (val != null) {
              const len = String(val).length;
              if (len > maxChars) maxChars = len;
            }
          }
          const autoFitWidth = Math.max(col.minWidth || 80, Math.min(col.maxWidth || 500, maxChars * 10 + 40));
          th.style.width = `${autoFitWidth}px`;
          col.width = `${autoFitWidth}px`;
          this.saveState();
          this.announceLive(`Auto-fitted column ${col.header} to ${autoFitWidth}px`);
        });

        th.appendChild(resizer);
      }

      tr.appendChild(th);
    });

    // Row Actions Header (Delete / Edit)
    if (this._options.deletable) {
      const thActions = createElement('th', 'pdg-th pdg-th-actions');
      thActions.style.width = '70px';
      thActions.textContent = 'Actions';
      tr.appendChild(thActions);
    }

    this.theadEl.appendChild(tr);
  }

  private reorderColumn(fromIdx: number, toIdx: number): void {
    const movedCol = this._columns[fromIdx];
    const newCols = [...this._columns];
    newCols.splice(fromIdx, 1);
    newCols.splice(toIdx, 0, movedCol);
    this._columns = newCols;

    this._justDroppedColId = movedCol.id;
    setTimeout(() => {
      this._justDroppedColId = null;
      this.theadEl.querySelectorAll('.pdg-th.pdg-drop-success').forEach((th) => {
        th.classList.remove('pdg-drop-success');
      });
    }, 600);

    this.announceLive(`Moved column ${movedCol.header} to position ${toIdx + 1} of ${newCols.length}.`);

    this.dispatchGridEvent('pdg:column-reorder', {
      fromIndex: fromIdx,
      toIndex: toIdx,
      column: movedCol,
      columns: newCols
    });
    this.render();
  }

  private announceLive(message: string): void {
    if (!this._liveAnnouncerEl) return;
    this._liveAnnouncerEl.textContent = '';
    setTimeout(() => {
      if (this._liveAnnouncerEl) {
        this._liveAnnouncerEl.textContent = message;
      }
    }, 50);
  }

  private handleSortClick(columnId: string): void {
    if (this._options.sorting === false) return;

    const existingIndex = this._sortCriteria.findIndex((c) => c.columnId === columnId);
    let nextDir: 'asc' | 'desc' | null = 'asc';

    if (existingIndex > -1) {
      const current = this._sortCriteria[existingIndex];
      if (current.direction === 'asc') nextDir = 'desc';
      else if (current.direction === 'desc') nextDir = null;
    }

    if (this._options.multiSort) {
      if (nextDir === null) {
        this._sortCriteria.splice(existingIndex, 1);
      } else if (existingIndex > -1) {
        this._sortCriteria[existingIndex].direction = nextDir;
      } else {
        this._sortCriteria.push({ columnId, direction: nextDir });
      }
    } else {
      this._sortCriteria = nextDir ? [{ columnId, direction: nextDir }] : [];
    }

    this.dispatchGridEvent('pdg:sort', { criteria: [...this._sortCriteria] });

    if (this._options.serverSide) {
      this.triggerServerLoad(false);
    } else {
      this.render();
    }
  }

  private renderBody(): void {
    removeAllChildren(this.tbodyEl);

    // Initial Loading Skeleton State
    if (this._isLoading && this._isInitialLoad && !this._options.keepPreviousDataWhileLoading) {
      this.renderLoadingSkeletons();
      return;
    }

    const { processed, totalFilteredCount } = this.getProcessedData();

    if (processed.length === 0) {
      const trEmpty = createElement('tr', 'pdg-row pdg-row-empty');
      const totalColSpan =
        this._columns.length +
        (this._options.selectable ? 1 : 0) +
        (this._options.expandable ? 1 : 0) +
        (this._options.rowReordering ? 1 : 0) +
        (this._options.deletable ? 1 : 0);
      const tdEmpty = createElement('td', 'pdg-td', { colspan: totalColSpan });
      tdEmpty.style.textAlign = 'center';
      tdEmpty.textContent = this._options.emptyMessage || 'No matching records found.';
      trEmpty.appendChild(tdEmpty);
      this.tbodyEl.appendChild(trEmpty);
      return;
    }

    let rowsToRender: T[] = [];
    if (this._options.virtualize) {
      const rowH = this._options.rowHeight || 48;
      const vportH = this.tableContainerEl.clientHeight || 400;
      const sTop = this.tableContainerEl.scrollTop;

      const { startIndex, endIndex, topOffset, totalHeight } = computeVirtualSlice(
        sTop,
        vportH,
        processed.length,
        rowH
      );

      rowsToRender = processed.slice(startIndex, endIndex + 1);

      if (!this.virtualSpacerEl) {
        this.virtualSpacerEl = createElement('div', 'pdg-virtual-spacer');
        this.tableContainerEl.appendChild(this.virtualSpacerEl);
      }
      this.virtualSpacerEl.style.height = `${totalHeight}px`;
      this.tableEl.style.transform = `translateY(${topOffset}px)`;
    } else if (this._options.serverSide) {
      rowsToRender = processed;
    } else if (this._options.pagination === false) {
      rowsToRender = processed;
      this._pagination.totalPages = 1;
      this._pagination.totalRows = totalFilteredCount;
    } else {
      const { pagedRows, totalPages } = paginateRows(
        processed,
        this._pagination.pageIndex,
        this._pagination.pageSize
      );
      rowsToRender = pagedRows;
      this._pagination.totalPages = totalPages;
      this._pagination.totalRows = totalFilteredCount;
    }

    // Guard against row reordering when server-side sorted
    const isRowReorderActive =
      this._options.rowReordering &&
      (!this._sortCriteria.length || this._options.allowRowReorderWhenSorted);

    for (let i = 0; i < rowsToRender.length; i++) {
      const row = rowsToRender[i];
      const rowId = this.getRowId(row);
      const isSelected = this._selectedIds.has(rowId);
      const isExpanded = this._expandedIds.has(rowId);

      const isDroppedTarget = this._justDroppedRowId === rowId;
      const tr = createElement('tr', `pdg-row ${isSelected ? 'pdg-row-selected' : ''} ${isDroppedTarget ? 'pdg-drop-success' : ''}`);
      tr.setAttribute('data-row-id', String(rowId));

      // Row Reordering Drag & Drop
      if (this._options.rowReordering) {
        const tdDrag = createElement('td', 'pdg-td pdg-td-drag');
        if (isRowReorderActive) {
          const handle = createElement('span', 'pdg-drag-handle', {
            draggable: 'true',
            tabindex: '0',
            'aria-label': 'Drag or press Up/Down to reorder row'
          });
          handle.innerHTML = '⋮⋮';

          handle.addEventListener('dragstart', (e) => {
            this._draggedRowIndex = i;
            tr.classList.add('pdg-row-dragging');
            handle.classList.add('is-grabbing');
            if (e.dataTransfer) {
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', String(i));
            }
            this.announceLive(`Started dragging row ${i + 1}. Move over a row to reorder.`);
          });

          handle.addEventListener('dragend', () => {
            this._draggedRowIndex = null;
            handle.classList.remove('is-grabbing');
            this.tbodyEl.querySelectorAll('.pdg-row').forEach((r) => {
              r.classList.remove('pdg-row-dragging', 'pdg-drag-over-top', 'pdg-drag-over-bottom', 'pdg-drag-not-allowed');
            });
          });

          tr.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (this._draggedRowIndex === null) return;

            if (this._draggedRowIndex === i) {
              if (e.dataTransfer) e.dataTransfer.dropEffect = 'none';
              tr.classList.add('pdg-drag-not-allowed');
              tr.classList.remove('pdg-drag-over-top', 'pdg-drag-over-bottom');
              return;
            }

            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
            tr.classList.remove('pdg-drag-not-allowed');

            const rect = tr.getBoundingClientRect();
            const relY = e.clientY - rect.top;
            if (relY < rect.height / 2) {
              tr.classList.add('pdg-drag-over-top');
              tr.classList.remove('pdg-drag-over-bottom');
            } else {
              tr.classList.add('pdg-drag-over-bottom');
              tr.classList.remove('pdg-drag-over-top');
            }
          });

          tr.addEventListener('dragleave', () => {
            tr.classList.remove('pdg-drag-over-top', 'pdg-drag-over-bottom', 'pdg-drag-not-allowed');
          });

          tr.addEventListener('drop', (e) => {
            e.preventDefault();
            const fromIdx = this._draggedRowIndex;
            tr.classList.remove('pdg-drag-over-top', 'pdg-drag-over-bottom', 'pdg-drag-not-allowed', 'pdg-row-dragging');

            if (fromIdx != null && fromIdx !== i) {
              const rect = tr.getBoundingClientRect();
              const relY = e.clientY - rect.top;
              let targetIdx = relY < rect.height / 2 ? i : i + 1;
              if (fromIdx < targetIdx) targetIdx--;
              targetIdx = Math.max(0, Math.min(targetIdx, rowsToRender.length - 1));

              if (targetIdx !== fromIdx) {
                this.reorderRow(fromIdx, targetIdx);
              }
            }
            this._draggedRowIndex = null;
          });

          handle.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp' && i > 0) {
              e.preventDefault();
              this.reorderRow(i, i - 1);
            } else if (e.key === 'ArrowDown' && i < rowsToRender.length - 1) {
              e.preventDefault();
              this.reorderRow(i, i + 1);
            }
          });

          tdDrag.appendChild(handle);
        } else {
          tdDrag.title = 'Row reordering is disabled while active sort is applied.';
        }
        tr.appendChild(tdDrag);
      }

      // Selection Checkbox
      if (this._options.selectable) {
        const tdSel = createElement('td', 'pdg-td pdg-td-select');
        const chk = createElement('input', 'pdg-checkbox', {
          type: 'checkbox',
          'aria-label': `Select row ${rowId}`
        }) as HTMLInputElement;
        chk.checked = isSelected;
        chk.addEventListener('change', () => {
          if (!this._options.multiSelect) {
            this._selectedIds.clear();
          }
          if (chk.checked) this._selectedIds.add(rowId);
          else this._selectedIds.delete(rowId);

          this.dispatchSelection();
          this.render();
        });
        tdSel.appendChild(chk);
        tr.appendChild(tdSel);
      }

      // Expand/Collapse Button
      if (this._options.expandable) {
        const tdExp = createElement('td', 'pdg-td pdg-td-expand');
        const btnExp = createElement('button', 'pdg-btn pdg-btn-sm', {
          type: 'button',
          'aria-label': isExpanded ? 'Collapse row' : 'Expand row'
        });
        btnExp.textContent = isExpanded ? '▼' : '▶';
        btnExp.addEventListener('click', () => {
          if (isExpanded) this._expandedIds.delete(rowId);
          else this._expandedIds.add(rowId);

          this.dispatchGridEvent('pdg:row-expand', {
            rowId,
            expanded: !isExpanded,
            row
          });
          this.renderBody();
        });
        tdExp.appendChild(btnExp);
        tr.appendChild(tdExp);
      }

      // Column Values & In-place Cell Editing
      for (const col of this._columns) {
        if (col.visible === false) continue;
        const td = createElement('td', 'pdg-td', { 'data-header': col.header });
        const val = resolveValue(row, col.field);

        const isEditingThisCell =
          this._editingCell &&
          this._editingCell.rowId === rowId &&
          this._editingCell.columnId === col.id;

        if (isEditingThisCell) {
          td.classList.add('pdg-cell-editing');
          this.renderCellEditor(td, row, col, val);
        } else {
          const isEditable = this._options.editable && col.editable !== false;
          if (isEditable) {
            td.classList.add('pdg-cell-editable');
            td.setAttribute('tabindex', '0');
            td.setAttribute('aria-label', `${col.header}: ${val}. Double click or press Enter to edit`);
            td.addEventListener('dblclick', () => this.startCellEdit(rowId, col.id, row, val));
            td.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                this.startCellEdit(rowId, col.id, row, val);
              }
            });
          }

          if (col.renderer) {
            const rendered = col.renderer(val, row, i);
            if (typeof rendered === 'string') td.innerHTML = rendered;
            else td.appendChild(rendered);
          } else if (col.formatter) {
            td.textContent = col.formatter(val, row);
          } else {
            td.textContent = val == null ? '' : String(val);
          }
        }

        tr.appendChild(td);
      }

      // Actions Column (Delete button)
      if (this._options.deletable) {
        const tdActions = createElement('td', 'pdg-td pdg-td-actions');
        const deleteBtn = createElement('button', 'pdg-btn pdg-btn-sm pdg-btn-danger', {
          type: 'button',
          'aria-label': `Delete row ${rowId}`
        });
        deleteBtn.textContent = '✕';
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleDeleteRow(rowId, row);
        });
        tdActions.appendChild(deleteBtn);
        tr.appendChild(tdActions);
      }

      this.tbodyEl.appendChild(tr);

      // Render Expanded Row Details
      if (this._options.expandable && isExpanded && this._options.rowDetailRenderer) {
        const trDetail = createElement('tr', 'pdg-detail-row');
        const totalCols =
          this._columns.length +
          (this._options.selectable ? 1 : 0) +
          (this._options.expandable ? 1 : 0) +
          (this._options.rowReordering ? 1 : 0) +
          (this._options.deletable ? 1 : 0);
        const tdDetail = createElement('td', 'pdg-detail-td', { colspan: totalCols });
        const content = this._options.rowDetailRenderer(row);

        if (typeof content === 'string') {
          tdDetail.innerHTML = content;
        } else {
          tdDetail.appendChild(content);
        }
        trDetail.appendChild(tdDetail);
        this.tbodyEl.appendChild(trDetail);
      }
    }
  }

  private reorderRow(fromIdx: number, toIdx: number): void {
    const movedRow = this._rows[fromIdx];
    const newRows = [...this._rows];
    newRows.splice(fromIdx, 1);
    newRows.splice(toIdx, 0, movedRow);
    this._rows = newRows;

    const rowId = this.getRowId(movedRow);
    this._justDroppedRowId = rowId;
    setTimeout(() => {
      this._justDroppedRowId = null;
      this.tbodyEl.querySelectorAll('.pdg-row.pdg-drop-success').forEach((r) => {
        r.classList.remove('pdg-drop-success');
      });
    }, 600);

    this.announceLive(`Moved row ${fromIdx + 1} to position ${toIdx + 1} of ${newRows.length}.`);

    this.dispatchGridEvent('pdg:row-reorder', {
      fromIndex: fromIdx,
      toIndex: toIdx,
      row: movedRow,
      rows: newRows
    });
    this.render();
  }

  // --- In-place Cell Editing Logic ---
  private startCellEdit(
    rowId: string | number,
    columnId: string,
    row: T,
    currentValue: any
  ): void {
    this._editingCell = { rowId, columnId, initialValue: currentValue };
    this.dispatchGridEvent('pdg:edit-start', {
      rowId,
      columnId,
      row,
      value: currentValue
    });
    this.render();
  }

  private renderCellEditor(
    td: HTMLElement,
    row: T,
    col: ColumnDef<T>,
    currentValue: any
  ): void {
    const container = createElement('div', 'pdg-edit-container');

    if (col.customEditor) {
      const customEl = col.customEditor({
        value: currentValue,
        row,
        column: col,
        onCommit: (newVal) => this.saveCellEdit(row, col, newVal),
        onCancel: () => this.cancelCellEdit(row, col)
      });
      container.appendChild(customEl);
      td.appendChild(container);
      return;
    }

    const input = createElement('input', 'pdg-edit-input', {
      type: typeof currentValue === 'number' ? 'number' : 'text',
      value: currentValue == null ? '' : String(currentValue)
    }) as HTMLInputElement;

    const errorMsgSpan = createElement('span', 'pdg-edit-error-msg');
    errorMsgSpan.style.display = 'none';

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const newVal = typeof currentValue === 'number' ? Number(input.value) : input.value;
        const validationErr = col.validator ? col.validator(newVal, currentValue, row, col) : null;
        if (validationErr) {
          errorMsgSpan.textContent = validationErr;
          errorMsgSpan.style.display = 'block';
          this.dispatchGridEvent('pdg:edit-validation-error', {
            rowId: this.getRowId(row),
            columnId: col.id,
            row,
            error: validationErr,
            invalidValue: newVal
          });
          return;
        }
        this.saveCellEdit(row, col, newVal);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.cancelCellEdit(row, col);
      }
    });

    input.addEventListener('blur', () => {
      // Auto-save on blur if unchanged or valid
      const newVal = typeof currentValue === 'number' ? Number(input.value) : input.value;
      if (col.validator) {
        const validationErr = col.validator(newVal, currentValue, row, col);
        if (validationErr) {
          this.cancelCellEdit(row, col);
          return;
        }
      }
      this.saveCellEdit(row, col, newVal);
    });

    container.appendChild(input);
    container.appendChild(errorMsgSpan);
    td.appendChild(container);

    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }

  private cancelCellEdit(row: T, col: ColumnDef<T>): void {
    if (!this._editingCell) return;
    const { rowId, initialValue } = this._editingCell;
    this._editingCell = null;
    this.dispatchGridEvent('pdg:edit-cancel', {
      rowId,
      columnId: col.id,
      row,
      value: initialValue
    });
    this.render();
  }

  private saveCellEdit(row: T, col: ColumnDef<T>, newValue: any): void {
    if (!this._editingCell) return;
    const oldValue = this._editingCell.initialValue;
    const rowId = this._editingCell.rowId;
    this._editingCell = null;

    if (col.field) {
      const fieldPath = String(col.field);
      if (fieldPath !== '__proto__' && fieldPath !== 'constructor' && fieldPath !== 'prototype') {
        if (!fieldPath.includes('.')) {
          (row as any)[fieldPath] = newValue;
        } else {
          const parts = fieldPath.split('.');
          let curr: any = row;
          for (let p = 0; p < parts.length - 1; p++) {
            const part = parts[p];
            if (part === '__proto__' || part === 'constructor' || part === 'prototype') break;
            if (curr[part] == null || typeof curr[part] !== 'object') {
              curr[part] = {};
            }
            curr = curr[part];
          }
          const lastPart = parts[parts.length - 1];
          if (lastPart !== '__proto__' && lastPart !== 'constructor' && lastPart !== 'prototype') {
            curr[lastPart] = newValue;
          }
        }
      }
    }

    // Trigger reactive calculations for dependent formula columns if any
    for (const c of this._columns) {
      if (typeof c.calculate === 'function' && c.field) {
        try {
          (row as any)[c.field] = c.calculate(row);
        } catch (e) {
          // ignore formula calculation errors
        }
      }
    }

    this.dispatchGridEvent('pdg:edit-save', {
      rowId,
      columnId: col.id,
      row,
      oldValue,
      newValue
    });
    this.render();
  }

  // --- Deletion Logic ---
  private handleDeleteRow(rowId: string | number, row: T): void {
    if (this._options.confirmDelete !== false) {
      const msg = this._options.deleteConfirmMessage
        ? this._options.deleteConfirmMessage(row)
        : `Are you sure you want to delete this record?`;
      if (!window.confirm(msg)) return;
    }

    const idKey = this._options.rowIdKey || 'id';
    this._rows = this._rows.filter(r => (r as any)[idKey] !== rowId);
    this._selectedIds.delete(rowId);
    this._expandedIds.delete(rowId);

    this.dispatchGridEvent('pdg:delete', { rowId, row });
    this.render();
  }

  // --- Loading Skeleton View ---
  private renderLoadingSkeletons(): void {
    const count = this._options.skeletonCount || 5;
    const colCount =
      this._columns.length +
      (this._options.selectable ? 1 : 0) +
      (this._options.expandable ? 1 : 0) +
      (this._options.rowReordering ? 1 : 0) +
      (this._options.deletable ? 1 : 0);

    for (let r = 0; r < count; r++) {
      const tr = createElement('tr', 'pdg-row pdg-skeleton-row');
      for (let c = 0; c < colCount; c++) {
        const td = createElement('td', 'pdg-td');
        const skeleton = createElement('div', 'pdg-skeleton-cell');
        td.appendChild(skeleton);
        tr.appendChild(td);
      }
      this.tbodyEl.appendChild(tr);
    }
  }

  private renderFooter(): void {
    removeAllChildren(this.footerEl);
    if (this._options.pagination === false) return;

    const info = createElement('div', 'pdg-pagination-info');
    const total = this._pagination.totalRows;
    const start = total > 0 ? this._pagination.pageIndex * this._pagination.pageSize + 1 : 0;
    const end = Math.min(
      (this._pagination.pageIndex + 1) * this._pagination.pageSize,
      total
    );
    info.textContent = `Showing ${start} to ${end} of ${total} entries (Page ${
      this._pagination.pageIndex + 1
    } of ${this._pagination.totalPages})`;

    const controls = createElement('div', 'pdg-pagination-controls');

    // First Page Button (<<)
    const firstBtn = createElement('button', 'pdg-btn pdg-btn-sm', {
      type: 'button',
      title: 'First Page',
      disabled: this._pagination.pageIndex === 0
    });
    firstBtn.textContent = '«';
    firstBtn.addEventListener('click', () => {
      if (this._pagination.pageIndex > 0) {
        this.goToPage(0);
      }
    });
    controls.appendChild(firstBtn);

    // Previous Page Button (<)
    const prevBtn = createElement('button', 'pdg-btn pdg-btn-sm', {
      type: 'button',
      title: 'Previous Page',
      disabled: this._pagination.pageIndex === 0
    });
    prevBtn.textContent = '‹ Prev';
    prevBtn.addEventListener('click', () => {
      if (this._pagination.pageIndex > 0) {
        this.goToPage(this._pagination.pageIndex - 1);
      }
    });
    controls.appendChild(prevBtn);

    // Page Number Buttons with smart ellipses window
    const totalPages = this._pagination.totalPages;
    const curPage = this._pagination.pageIndex;
    const pageWindow = 2;

    for (let p = 0; p < totalPages; p++) {
      if (
        p === 0 ||
        p === totalPages - 1 ||
        (p >= curPage - pageWindow && p <= curPage + pageWindow)
      ) {
        const pageBtn = createElement('button', 'pdg-btn pdg-btn-sm', {
          type: 'button',
          'aria-label': `Page ${p + 1}`
        });
        pageBtn.textContent = String(p + 1);
        if (p === curPage) {
          pageBtn.classList.add('pdg-btn-active');
          pageBtn.style.backgroundColor = 'var(--pdg-primary)';
          pageBtn.style.color = '#ffffff';
          pageBtn.style.fontWeight = 'bold';
        }
        const targetPage = p;
        pageBtn.addEventListener('click', () => this.goToPage(targetPage));
        controls.appendChild(pageBtn);
      } else if (
        (p === curPage - pageWindow - 1 && p > 0) ||
        (p === curPage + pageWindow + 1 && p < totalPages - 1)
      ) {
        const ellipsis = createElement('span', 'pdg-pagination-ellipsis');
        ellipsis.textContent = '…';
        ellipsis.style.padding = '0 0.35rem';
        ellipsis.style.color = 'var(--pdg-text-muted)';
        controls.appendChild(ellipsis);
      }
    }

    // Next Page Button (>)
    const nextBtn = createElement('button', 'pdg-btn pdg-btn-sm', {
      type: 'button',
      title: 'Next Page',
      disabled: this._pagination.pageIndex >= this._pagination.totalPages - 1
    });
    nextBtn.textContent = 'Next ›';
    nextBtn.addEventListener('click', () => {
      if (this._pagination.pageIndex < this._pagination.totalPages - 1) {
        this.goToPage(this._pagination.pageIndex + 1);
      }
    });
    controls.appendChild(nextBtn);

    // Last Page Button (>>)
    const lastBtn = createElement('button', 'pdg-btn pdg-btn-sm', {
      type: 'button',
      title: 'Last Page',
      disabled: this._pagination.pageIndex >= this._pagination.totalPages - 1
    });
    lastBtn.textContent = '»';
    lastBtn.addEventListener('click', () => {
      if (this._pagination.pageIndex < this._pagination.totalPages - 1) {
        this.goToPage(this._pagination.totalPages - 1);
      }
    });
    controls.appendChild(lastBtn);

    // Page Size Selector
    const sizeSelectWrapper = createElement('div', 'pdg-page-size-selector');
    sizeSelectWrapper.style.marginLeft = '0.5rem';
    sizeSelectWrapper.style.display = 'inline-flex';
    sizeSelectWrapper.style.alignItems = 'center';
    sizeSelectWrapper.style.gap = '0.25rem';
    sizeSelectWrapper.style.fontSize = '0.8125rem';

    const selectEl = createElement('select', 'pdg-select pdg-btn pdg-btn-sm') as HTMLSelectElement;
    [10, 25, 50, 100].forEach((sz) => {
      const opt = createElement('option');
      opt.value = String(sz);
      opt.textContent = `${sz} / page`;
      if (sz === this._pagination.pageSize) opt.selected = true;
      selectEl.appendChild(opt);
    });
    selectEl.addEventListener('change', () => {
      this._pagination.pageSize = Number(selectEl.value);
      this._pagination.pageIndex = 0;
      this.goToPage(0);
    });
    sizeSelectWrapper.appendChild(selectEl);
    controls.appendChild(sizeSelectWrapper);

    this.footerEl.appendChild(info);
    this.footerEl.appendChild(controls);
  }

  public goToPage(index: number): void {
    this._pagination.pageIndex = index;
    this.dispatchGridEvent('pdg:page', {
      pageIndex: this._pagination.pageIndex,
      pageSize: this._pagination.pageSize
    });
    if (this._options.serverSide) {
      this.triggerServerLoad(false);
    } else {
      this.render();
    }
  }

  public getSelectedRows(): T[] {
    return this._rows.filter((r) => this._selectedIds.has(this.getRowId(r)));
  }

  public selectAll(): void {
    const { processed } = this.getProcessedData();
    processed.forEach((r) => this._selectedIds.add(this.getRowId(r)));
    this.dispatchSelection();
    this.render();
  }

  public clearSelection(): void {
    this._selectedIds.clear();
    this.dispatchSelection();
    this.render();
  }

  public deleteSelectedRows(): number {
    const count = this._selectedIds.size;
    if (count === 0) return 0;
    this._rows = this._rows.filter((r) => !this._selectedIds.has(this.getRowId(r)));
    this._selectedIds.clear();
    this.dispatchSelection();
    this.render();
    return count;
  }

  public getSelectedRowsTSV(): string {
    const selected = this.getSelectedRows();
    if (selected.length === 0) return '';
    const visibleCols = this._columns.filter(c => c.visible !== false && c.field);
    const headerRow = visibleCols.map(c => c.header).join('\t');
    const dataRows = selected.map(row => {
      return visibleCols.map(col => {
        let val = resolveValue(row, col.field as string);
        if (val == null) return '';
        return String(val).replace(/[\t\r\n]+/g, ' ');
      }).join('\t');
    });
    return [headerRow, ...dataRows].join('\r\n');
  }

  public async copySelectionToClipboard(): Promise<boolean> {
    const tsv = this.getSelectedRowsTSV();
    if (!tsv) return false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(tsv);
        return true;
      } else if (typeof document !== 'undefined') {
        const ta = document.createElement('textarea');
        ta.value = tsv;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        return true;
      }
    } catch (e) {
      console.error('ProDataGrid: Failed to copy TSV to clipboard', e);
    }
    return false;
  }

  public batchUpdateSelected(updates: Partial<T>): number {
    if (!updates || Object.keys(updates).length === 0) return 0;
    let count = 0;
    this._rows.forEach(r => {
      if (this._selectedIds.has(this.getRowId(r))) {
        Object.assign(r as any, updates);
        count++;
      }
    });
    if (count > 0) {
      this.render();
    }
    return count;
  }

  /** Resets global search and all column filters, then reloads data. */
  public clearAllFilters(): void {
    this._globalSearch = '';
    this._columnFilters = [];
    this._pagination.pageIndex = 0;

    const currentFilters: Record<string, string> = {};
    this.dispatchGridEvent('pdg:filter', {
      filters: currentFilters,
      globalSearch: this._globalSearch
    });

    if (this._options.serverSide) {
      this.triggerServerLoad(false);
    } else {
      this.render();
    }
  }

  // --- Helper Methods ---
  private getRowId(row: T): string | number {
    const key = (this._options.rowIdKey as keyof T) || 'id';
    return (row as any)[key] ?? JSON.stringify(row);
  }

  private dispatchSelection(): void {
    const selectedRows = this._rows.filter((r) => this._selectedIds.has(this.getRowId(r)));
    this.dispatchGridEvent('pdg:select', {
      selectedIds: Array.from(this._selectedIds),
      selectedRows
    });
  }
}

// Safe Custom Element Registration
export function defineProDataGrid(tagName = 'pro-data-grid'): void {
  if (typeof window !== 'undefined' && !window.customElements.get(tagName)) {
    window.customElements.define(tagName, ProDataGrid);
  }
}
