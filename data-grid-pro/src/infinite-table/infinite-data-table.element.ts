import {
  InfiniteTableColumn,
  InfiniteScrollConfig,
  InfinitePageParams,
  InfiniteDataLoader,
  InfiniteDataRequest,
  InfiniteBatchResult,
  InfiniteTableLoadBatchDetail,
  InfiniteTableCompleteDetail,
  InfiniteTableErrorDetail
} from './types.js';
import { SortRule } from '../common/base-table-types.js';
import { computeVirtualRange } from './virtual-scroller.js';

export class InfiniteDataTableElement<T = any> extends HTMLElement {
  private _columns: InfiniteTableColumn<T>[] = [];
  private _allRows: T[] = []; // In-memory accumulated rows
  private _config: InfiniteScrollConfig<T> = {
    enabled: true,
    paginationMode: 'offset',
    batchSize: 25,
    prefetchThresholdPx: 150,
    rowIdKey: 'id',
    manualLoadMode: false
  };

  // State
  private _isLoading = false;
  private _hasMore = true;
  private _nextCursor: string | null = null;
  private _offset = 0;
  private _page = 1;
  private _searchTerm = '';
  private _sortRule: SortRule<T> | null = null;
  private _error: Error | null = null;
  private _totalAvailable: number | undefined = undefined;

  // AbortController for cancelable requests
  private _abortController: AbortController | null = null;
  // Request sequence counter to discard stale out-of-order responses
  private _requestId = 0;

  // Client-side fallback pagination state (used when infiniteScroll.enabled === false)
  private _clientPage = 1;
  private _clientPageSize = 10;

  // DOM Elements
  private _container!: HTMLDivElement;
  private _viewport!: HTMLDivElement;
  private _table!: HTMLTableElement;
  private _thead!: HTMLTableSectionElement;
  private _tbody!: HTMLTableSectionElement;
  private _sentinel!: HTMLDivElement;
  private _footerStatus!: HTMLDivElement;
  private _toolbar!: HTMLDivElement;
  private _searchInput!: HTMLInputElement;
  private _countBadge!: HTMLElement;
  private _paginationBar!: HTMLDivElement;

  // Observers & Listeners
  private _intersectionObserver: IntersectionObserver | null = null;
  private _boundOnScroll: (() => void) | null = null;

  static get observedAttributes(): string[] {
    return ['search-term', 'batch-size', 'manual-mode', 'disabled'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this.renderInitialStructure();
    this.setupEventListeners();
    this.setupScrollAndObserver();
    
    // Initial fetch if data loader is provided
    if (this._config.dataLoader) {
      this.resetAndFetch();
    } else {
      this.refreshTable();
    }
  }

  disconnectedCallback(): void {
    this.teardownScrollAndObserver();
    if (this._abortController) {
      this._abortController.abort();
    }
  }

  attributeChangedCallback(name: string, _oldVal: string | null, newVal: string | null): void {
    if (name === 'search-term' && newVal !== null) {
      this.setSearchTerm(newVal);
    } else if (name === 'batch-size' && newVal !== null) {
      const parsed = parseInt(newVal, 10);
      if (!isNaN(parsed) && parsed > 0) {
        this._config.batchSize = parsed;
      }
    } else if (name === 'manual-mode') {
      this._config.manualLoadMode = newVal !== null && newVal !== 'false';
      this.renderFooter();
    } else if (name === 'disabled') {
      this._config.enabled = newVal === null || newVal === 'false';
      this.setupScrollAndObserver();
      this.refreshTable();
    }
  }

  // --- Getters and Setters ---

  get columns(): InfiniteTableColumn<T>[] {
    return this._columns;
  }

  set columns(cols: InfiniteTableColumn<T>[]) {
    this._columns = cols;
    if (this.isConnected) {
      this.renderHeader();
      this.refreshTable();
    }
  }

  get data(): T[] {
    return this._allRows;
  }

  set data(rows: T[]) {
    this._allRows = rows || [];
    this.refreshTable();
  }

  get config(): InfiniteScrollConfig<T> {
    return this._config;
  }

  set config(cfg: Partial<InfiniteScrollConfig<T>>) {
    const hadLoader = !!this._config.dataLoader;
    this._config = { ...this._config, ...cfg };
    if (this.isConnected) {
      this.setupScrollAndObserver();
      // Fetch when a dataLoader is newly provided or replaced after mount
      if (this._config.dataLoader && (!hadLoader || cfg.dataLoader)) {
        this.resetAndFetch();
      } else {
        this.refreshTable();
      }
    }
  }

  get dataLoader(): InfiniteDataLoader<T> | undefined {
    return this._config.dataLoader;
  }

  set dataLoader(loader: InfiniteDataLoader<T> | undefined) {
    this._config.dataLoader = loader;
    if (this.isConnected) {
      this.resetAndFetch();
    }
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  get hasMore(): boolean {
    return this._hasMore;
  }

  // --- Search & Sort Methods ---

  public setSearchTerm(term: string): void {
    if (this._searchTerm === term) return;
    this._searchTerm = term;
    if (this._searchInput && this._searchInput.value !== term) {
      this._searchInput.value = term;
    }
    this.onQueryChanged();
  }

  public setSortRule(sort: SortRule<T> | null): void {
    this._sortRule = sort;
    this.renderHeader();
    this.onQueryChanged();
  }

  private onQueryChanged(): void {
    if (this._config.dataLoader) {
      // Server-side loader: reset accumulated records and fetch fresh batch
      this.resetAndFetch();
    } else {
      // Client-side array: reset scroll and refresh
      if (this._viewport) this._viewport.scrollTop = 0;
      this._clientPage = 1;
      this.refreshTable();
    }
  }

  public resetAndFetch(): void {
    // Abort active fetch if any
    if (this._abortController) {
      this._abortController.abort();
    }
    this._allRows = [];
    this._offset = 0;
    this._page = 1;
    this._nextCursor = null;
    this._hasMore = true;
    this._error = null;
    this._clientPage = 1;

    if (this._viewport) {
      this._viewport.scrollTop = 0;
    }

    this.refreshTable();
    this.fetchNextBatch();
  }

  public retry(): void {
    if (this._error) {
      this._error = null;
      this.renderFooter();
      this.fetchNextBatch();
    }
  }

  public async fetchNextBatch(): Promise<void> {
    if (!this._config.enabled) return;
    if (this._isLoading || !this._hasMore) return;
    if (!this._config.dataLoader) return;

    this._isLoading = true;
    this._error = null;
    this.renderFooter();

    const currentReqId = ++this._requestId;
    this._abortController = new AbortController();
    const signal = this._abortController.signal;

    const limit = this._config.batchSize || 25;
    const paginationParams: InfinitePageParams =
      this._config.paginationMode === 'cursor'
        ? { mode: 'cursor', cursor: this._nextCursor, limit }
        : { mode: 'offset', offset: this._offset, limit, page: this._page };

    const request: InfiniteDataRequest<T> = {
      pagination: paginationParams,
      searchTerm: this._searchTerm,
      sortRule: this._sortRule,
      signal
    };

    try {
      const result: InfiniteBatchResult<T> = await this._config.dataLoader(request);

      // Guard against stale out-of-order responses or aborts
      if (currentReqId !== this._requestId || signal.aborted) {
        return;
      }

      const rowIdKey = (this._config.rowIdKey || 'id') as keyof T;
      const seenIds = new Set(this._allRows.map((r) => r[rowIdKey]));

      // Deduplicate against already-loaded rows and within the same batch
      const uniqueNewRows: T[] = [];
      for (const row of result.rows) {
        const id = row[rowIdKey];
        if (seenIds.has(id)) continue;
        seenIds.add(id);
        uniqueNewRows.push(row);
      }

      this._allRows = [...this._allRows, ...uniqueNewRows];
      this._hasMore = result.hasMore;
      this._nextCursor = result.nextCursor || null;
      this._totalAvailable = result.totalRows;

      // Update offsets for next call
      this._offset += result.rows.length;
      this._page += 1;
      this._isLoading = false;

      this.refreshTable();
      this.renderFooter();

      // Dispatch load-batch event
      const batchDetail: InfiniteTableLoadBatchDetail<T> = {
        batchIndex: this._page - 1,
        params: paginationParams,
        loadedCount: uniqueNewRows.length,
        totalLoaded: this._allRows.length,
        totalAvailable: this._totalAvailable,
        hasMore: this._hasMore
      };
      this.dispatchEvent(new CustomEvent('infinite-table:load-batch', { detail: batchDetail, bubbles: true, composed: true }));

      if (!this._hasMore) {
        const completeDetail: InfiniteTableCompleteDetail<T> = {
          totalLoaded: this._allRows.length,
          totalAvailable: this._totalAvailable
        };
        this.dispatchEvent(new CustomEvent('infinite-table:complete', { detail: completeDetail, bubbles: true, composed: true }));
      }
    } catch (err: any) {
      if (signal.aborted || currentReqId !== this._requestId) {
        return;
      }
      this._isLoading = false;
      this._error = err instanceof Error ? err : new Error(String(err));
      this.renderFooter();

      const errorDetail: InfiniteTableErrorDetail = {
        error: this._error,
        params: paginationParams,
        retry: () => this.retry()
      };
      this.dispatchEvent(new CustomEvent('infinite-table:error', { detail: errorDetail, bubbles: true, composed: true }));
    }
  }

  // --- Rendering UI ---

  private renderInitialStructure(): void {
    const shadow = this.shadowRoot!;
    shadow.innerHTML = `
      <style>
        /* Embed inline styles or load stylesheet */
        ${this.getCssContent()}
      </style>
      <div class="ift-container">
        <div class="ift-toolbar">
          <div class="ift-search-wrapper">
            <svg class="ift-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <input type="text" class="ift-search-input" placeholder="Search records..." aria-label="Search records" />
          </div>
          <div class="ift-toolbar-actions">
            <span class="ift-badge ift-count-badge">0 records</span>
          </div>
        </div>

        <div class="ift-viewport" tabindex="0" role="region" aria-label="Scrollable Table Data">
          <table class="ift-table">
            <thead class="ift-thead">
              <tr class="ift-header-row"></tr>
            </thead>
            <tbody class="ift-tbody"></tbody>
          </table>
          <div class="ift-sentinel"></div>
        </div>

        <div class="ift-footer-status"></div>
        <div class="ift-pagination-bar" style="display: none;"></div>
      </div>
    `;

    this._container = shadow.querySelector('.ift-container') as HTMLDivElement;
    this._toolbar = shadow.querySelector('.ift-toolbar') as HTMLDivElement;
    this._searchInput = shadow.querySelector('.ift-search-input') as HTMLInputElement;
    this._countBadge = shadow.querySelector('.ift-count-badge') as HTMLElement;
    this._viewport = shadow.querySelector('.ift-viewport') as HTMLDivElement;
    this._table = shadow.querySelector('.ift-table') as HTMLTableElement;
    this._thead = shadow.querySelector('.ift-thead') as HTMLTableSectionElement;
    this._tbody = shadow.querySelector('.ift-tbody') as HTMLTableSectionElement;
    this._sentinel = shadow.querySelector('.ift-sentinel') as HTMLDivElement;
    this._footerStatus = shadow.querySelector('.ift-footer-status') as HTMLDivElement;
    this._paginationBar = shadow.querySelector('.ift-pagination-bar') as HTMLDivElement;

    // Apply viewport height if virtualization is configured
    if (this._config.virtualization?.viewportHeight) {
      this._viewport.style.maxHeight = `${this._config.virtualization.viewportHeight}px`;
      this._viewport.style.height = `${this._config.virtualization.viewportHeight}px`;
    }

    this.renderHeader();
  }

  private setupEventListeners(): void {
    // Search input
    let debounceTimer: any = null;
    this._searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const target = e.target as HTMLInputElement;
        this.setSearchTerm(target.value.trim());
      }, 250);
    });
  }

  private setupScrollAndObserver(): void {
    this.teardownScrollAndObserver();

    if (!this._config.enabled) {
      // Fallback pagination mode
      return;
    }

    // Scroll listener for bottom threshold prefetching and virtualization
    this._boundOnScroll = () => {
      this.handleScroll();
    };
    this._viewport.addEventListener('scroll', this._boundOnScroll, { passive: true });

    // IntersectionObserver for sentinel element (if not manual mode)
    if (!this._config.manualLoadMode && typeof IntersectionObserver !== 'undefined') {
      const threshold = this._config.prefetchThresholdPx || 150;
      this._intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting && !this._isLoading && this._hasMore) {
            this.fetchNextBatch();
          }
        },
        {
          root: this._viewport,
          rootMargin: `0px 0px ${threshold}px 0px`,
          threshold: 0.01
        }
      );
      this._intersectionObserver.observe(this._sentinel);
    }
  }

  private teardownScrollAndObserver(): void {
    if (this._boundOnScroll && this._viewport) {
      this._viewport.removeEventListener('scroll', this._boundOnScroll);
      this._boundOnScroll = null;
    }
    if (this._intersectionObserver) {
      this._intersectionObserver.disconnect();
      this._intersectionObserver = null;
    }
  }

  private handleScroll(): void {
    // If virtualization is enabled, re-calculate and re-render visible range
    if (this._config.virtualization?.enabled) {
      this.renderVirtualRows();
    }

    // Proximity check to bottom
    if (!this._config.manualLoadMode && !this._isLoading && this._hasMore) {
      const { scrollTop, scrollHeight, clientHeight } = this._viewport;
      const threshold = this._config.prefetchThresholdPx || 150;
      if (scrollHeight - (scrollTop + clientHeight) <= threshold) {
        this.fetchNextBatch();
      }
    }
  }

  private renderHeader(): void {
    const headerRow = this._thead.querySelector('.ift-header-row') as HTMLTableRowElement;
    if (!headerRow) return;
    headerRow.innerHTML = '';

    for (const col of this._columns) {
      const th = document.createElement('th');
      th.className = 'ift-th';
      if (col.sortable !== false) {
        th.classList.add('sortable');
      }
      if (col.width) th.style.width = col.width;
      if (col.minWidth) th.style.minWidth = col.minWidth;
      if (col.align) th.style.textAlign = col.align;

      const inner = document.createElement('div');
      inner.className = 'ift-th-inner';

      const label = document.createElement('span');
      label.textContent = col.header;
      inner.appendChild(label);

      if (col.sortable !== false) {
        const sortIcon = document.createElement('span');
        sortIcon.className = 'ift-sort-icon';
        const isSorted = this._sortRule?.column === col.key;
        if (isSorted && this._sortRule?.direction === 'asc') {
          sortIcon.innerHTML = '▲';
        } else if (isSorted && this._sortRule?.direction === 'desc') {
          sortIcon.innerHTML = '▼';
        } else {
          sortIcon.innerHTML = '↕';
          sortIcon.style.opacity = '0.3';
        }
        inner.appendChild(sortIcon);

        th.addEventListener('click', () => {
          let nextDir: 'asc' | 'desc' = 'asc';
          if (this._sortRule?.column === col.key) {
            nextDir = this._sortRule.direction === 'asc' ? 'desc' : 'asc';
          }
          this.setSortRule({ column: col.key, direction: nextDir });
        });
      }

      th.appendChild(inner);
      headerRow.appendChild(th);
    }
  }

  private getFilteredAndSortedRows(): T[] {
    // If server-side dataLoader is present, filtering and sorting is handled remotely
    if (this._config.dataLoader) {
      return this._allRows;
    }

    let result = [...this._allRows];

    // Client search
    if (this._searchTerm) {
      const q = this._searchTerm.toLowerCase();
      result = result.filter(row => {
        return Object.values(row as any).some(val =>
          String(val).toLowerCase().includes(q)
        );
      });
    }

    // Client sort
    if (this._sortRule) {
      const { column, direction } = this._sortRule;
      result.sort((a, b) => {
        const valA = (a as any)[column];
        const valB = (b as any)[column];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        const comp = valA > valB ? 1 : -1;
        return direction === 'asc' ? comp : -comp;
      });
    }

    return result;
  }

  private refreshTable(): void {
    const isInfinite = this._config.enabled !== false;

    // Toggle pagination vs infinite scrolling footer
    if (isInfinite) {
      this._sentinel.style.display = 'block';
      this._footerStatus.style.display = 'flex';
      this._paginationBar.style.display = 'none';
      
      if (this._config.virtualization?.enabled) {
        this.renderVirtualRows();
      } else {
        this.renderAllLoadedRows();
      }
      this.renderFooter();
    } else {
      // Disabled infinite scrolling -> Standard Numbered Pagination fallback
      this._sentinel.style.display = 'none';
      this._footerStatus.style.display = 'none';
      this._paginationBar.style.display = 'flex';
      this.renderPagedRows();
      this.renderPaginationBar();
    }

    // Update count badge
    const count = this._allRows.length;
    const total = this._totalAvailable !== undefined ? ` / ${this._totalAvailable}` : '';
    this._countBadge.textContent = `${count}${total} records`;
  }

  private renderAllLoadedRows(): void {
    this._tbody.innerHTML = '';
    const rows = this.getFilteredAndSortedRows();

    if (rows.length === 0 && !this._isLoading) {
      this.renderEmptyRow();
      return;
    }

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < rows.length; i++) {
      fragment.appendChild(this.createRowElement(rows[i], i));
    }
    this._tbody.appendChild(fragment);
  }

  private renderVirtualRows(): void {
    const rows = this.getFilteredAndSortedRows();
    const virt = this._config.virtualization!;
    const rowHeight = virt.rowHeight || 44;
    const overscan = virt.overscanCount ?? 5;
    const viewportHeight = this._viewport.clientHeight || virt.viewportHeight || 400;
    const scrollTop = this._viewport.scrollTop;

    const range = computeVirtualRange(scrollTop, viewportHeight, rows.length, rowHeight, overscan);

    this._tbody.innerHTML = '';

    if (rows.length === 0 && !this._isLoading) {
      this.renderEmptyRow();
      return;
    }

    // Top spacer row
    if (range.topPadding > 0) {
      const topTr = document.createElement('tr');
      topTr.className = 'ift-spacer-row';
      const td = document.createElement('td');
      td.colSpan = this._columns.length || 1;
      td.style.height = `${range.topPadding}px`;
      topTr.appendChild(td);
      this._tbody.appendChild(topTr);
    }

    // Visible rows
    const fragment = document.createDocumentFragment();
    for (let i = range.startIndex; i < range.endIndex; i++) {
      const rowEl = this.createRowElement(rows[i], i);
      rowEl.style.height = `${rowHeight}px`;
      fragment.appendChild(rowEl);
    }
    this._tbody.appendChild(fragment);

    // Bottom spacer row
    if (range.bottomPadding > 0) {
      const bottomTr = document.createElement('tr');
      bottomTr.className = 'ift-spacer-row';
      const td = document.createElement('td');
      td.colSpan = this._columns.length || 1;
      td.style.height = `${range.bottomPadding}px`;
      bottomTr.appendChild(td);
      this._tbody.appendChild(bottomTr);
    }
  }

  private renderPagedRows(): void {
    this._tbody.innerHTML = '';
    const rows = this.getFilteredAndSortedRows();

    if (rows.length === 0) {
      this.renderEmptyRow();
      return;
    }

    const pageSize = this._clientPageSize;
    const startIndex = (this._clientPage - 1) * pageSize;
    const pageRows = rows.slice(startIndex, startIndex + pageSize);

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < pageRows.length; i++) {
      fragment.appendChild(this.createRowElement(pageRows[i], startIndex + i));
    }
    this._tbody.appendChild(fragment);
  }

  private renderPaginationBar(): void {
    const rows = this.getFilteredAndSortedRows();
    const totalItems = rows.length;
    const pageSize = this._clientPageSize;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    if (this._clientPage > totalPages) {
      this._clientPage = totalPages;
    }

    const start = totalItems === 0 ? 0 : (this._clientPage - 1) * pageSize + 1;
    const end = Math.min(this._clientPage * pageSize, totalItems);

    this._paginationBar.innerHTML = `
      <div class="ift-pagination-info">
        Showing <strong>${start}</strong> to <strong>${end}</strong> of <strong>${totalItems}</strong> entries
      </div>
      <div class="ift-pagination-nav">
        <button class="ift-page-btn prev-btn" ${this._clientPage <= 1 ? 'disabled' : ''}>Previous</button>
        <span class="ift-page-btn active">${this._clientPage}</span>
        <button class="ift-page-btn next-btn" ${this._clientPage >= totalPages ? 'disabled' : ''}>Next</button>
      </div>
    `;

    const prevBtn = this._paginationBar.querySelector('.prev-btn');
    const nextBtn = this._paginationBar.querySelector('.next-btn');

    prevBtn?.addEventListener('click', () => {
      if (this._clientPage > 1) {
        this._clientPage--;
        this.refreshTable();
      }
    });

    nextBtn?.addEventListener('click', () => {
      if (this._clientPage < totalPages) {
        this._clientPage++;
        this.refreshTable();
      }
    });
  }

  private createRowElement(row: T, index: number): HTMLTableRowElement {
    const tr = document.createElement('tr');
    tr.className = `ift-tr ${index % 2 === 1 ? 'alt' : ''}`;

    for (const col of this._columns) {
      const td = document.createElement('td');
      td.className = 'ift-td';
      if (col.align) td.style.textAlign = col.align;

      const rawVal = (row as any)[col.key];
      if (col.render) {
        const customRender = col.render(rawVal, row, index);
        if (customRender instanceof HTMLElement) {
          td.appendChild(customRender);
        } else {
          td.innerHTML = String(customRender ?? '');
        }
      } else {
        td.textContent = rawVal !== undefined && rawVal !== null ? String(rawVal) : '—';
      }
      tr.appendChild(td);
    }

    return tr;
  }

  private renderEmptyRow(): void {
    const tr = document.createElement('tr');
    tr.className = 'ift-tr';
    const td = document.createElement('td');
    td.className = 'ift-td';
    td.colSpan = this._columns.length || 1;
    td.style.textAlign = 'center';
    td.style.padding = '2rem 1rem';
    td.style.color = 'var(--ift-text-muted)';
    td.textContent = 'No records found';
    tr.appendChild(td);
    this._tbody.appendChild(tr);
  }

  private renderFooter(): void {
    if (!this._config.enabled) {
      this._footerStatus.innerHTML = '';
      return;
    }

    // 1. Error state with retry
    if (this._error) {
      this._footerStatus.innerHTML = `
        <div class="ift-error-bar" role="alert">
          <span>Failed to load records: ${this._error.message || 'Network error'}</span>
          <button class="ift-btn ift-btn-retry">Retry</button>
        </div>
      `;
      const retryBtn = this._footerStatus.querySelector('.ift-btn-retry');
      retryBtn?.addEventListener('click', () => this.retry());
      return;
    }

    // 2. Loading state
    if (this._isLoading) {
      this._footerStatus.innerHTML = `
        <div class="ift-loading-state" role="status">
          <span class="ift-spinner"></span>
          <span>Loading more records...</span>
        </div>
      `;
      return;
    }

    // 3. Manual "Load more" button mode
    if (this._config.manualLoadMode && this._hasMore) {
      this._footerStatus.innerHTML = `
        <button class="ift-btn ift-btn-primary ift-load-more-btn">Load more records</button>
      `;
      const loadBtn = this._footerStatus.querySelector('.ift-load-more-btn');
      loadBtn?.addEventListener('click', () => this.fetchNextBatch());
      return;
    }

    // 4. Completed all records
    if (!this._hasMore && this._allRows.length > 0) {
      this._footerStatus.innerHTML = `
        <div class="ift-end-message">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
          </svg>
          <span>All ${this._allRows.length} records loaded</span>
        </div>
      `;
      return;
    }

    // Default clean
    this._footerStatus.innerHTML = '';
  }

  private getCssContent(): string {
    return `
      :host {
        display: block;
        width: 100%;
        --ift-primary: #3b82f6;
        --ift-primary-hover: #2563eb;
        --ift-primary-light: #eff6ff;
        --ift-bg: #ffffff;
        --ift-header-bg: #f8fafc;
        --ift-row-hover: #f1f5f9;
        --ift-row-alt: #fdfdfe;
        --ift-border-color: #e2e8f0;
        --ift-text-main: #0f172a;
        --ift-text-muted: #64748b;
        --ift-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        --ift-font-size: 0.875rem;
        --ift-line-height: 1.25rem;
        --ift-border-radius: 0.5rem;
        --ift-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
        --ift-error-color: #ef4444;
        --ift-error-bg: #fef2f2;
      }
      .ift-container {
        font-family: var(--ift-font-family);
        font-size: var(--ift-font-size);
        line-height: var(--ift-line-height);
        color: var(--ift-text-main);
        background-color: var(--ift-bg);
        border: 1px solid var(--ift-border-color);
        border-radius: var(--ift-border-radius);
        box-shadow: var(--ift-shadow);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        position: relative;
        width: 100%;
      }
      .ift-toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        gap: 0.75rem;
        border-bottom: 1px solid var(--ift-border-color);
        background-color: var(--ift-bg);
      }
      .ift-search-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        min-width: 240px;
        max-width: 380px;
        flex: 1;
      }
      .ift-search-icon {
        position: absolute;
        left: 0.625rem;
        width: 1rem;
        height: 1rem;
        color: var(--ift-text-muted);
        pointer-events: none;
      }
      .ift-search-input {
        width: 100%;
        padding: 0.375rem 0.625rem 0.375rem 2rem;
        font-size: var(--ift-font-size);
        border: 1px solid var(--ift-border-color);
        border-radius: 0.375rem;
        outline: none;
        background-color: var(--ift-bg);
        color: var(--ift-text-main);
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .ift-search-input:focus {
        border-color: var(--ift-primary);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
      }
      .ift-toolbar-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8125rem;
        color: var(--ift-text-muted);
      }
      .ift-badge {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.5rem;
        border-radius: 9999px;
        background-color: var(--ift-header-bg);
        border: 1px solid var(--ift-border-color);
        font-weight: 500;
        font-size: 0.75rem;
      }
      .ift-viewport {
        overflow-y: auto;
        overflow-x: auto;
        position: relative;
        width: 100%;
        max-height: 520px;
      }
      .ift-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        text-align: left;
      }
      .ift-thead {
        position: sticky;
        top: 0;
        z-index: 10;
        background-color: var(--ift-header-bg);
        box-shadow: 0 1px 0 var(--ift-border-color);
      }
      .ift-th {
        padding: 0.75rem 1rem;
        font-weight: 600;
        color: var(--ift-text-main);
        background-color: var(--ift-header-bg);
        border-bottom: 1px solid var(--ift-border-color);
        white-space: nowrap;
        user-select: none;
      }
      .ift-th.sortable {
        cursor: pointer;
        transition: background-color 0.15s ease;
      }
      .ift-th.sortable:hover {
        background-color: #f1f5f9;
      }
      .ift-th-inner {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
      }
      .ift-sort-icon {
        font-size: 0.75rem;
        color: var(--ift-text-muted);
      }
      .ift-td {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--ift-border-color);
        white-space: nowrap;
        vertical-align: middle;
      }
      .ift-tr {
        background-color: var(--ift-bg);
        transition: background-color 0.15s ease;
      }
      .ift-tr:hover {
        background-color: var(--ift-row-hover);
      }
      .ift-tr.alt {
        background-color: var(--ift-row-alt);
      }
      .ift-tr.alt:hover {
        background-color: var(--ift-row-hover);
      }
      .ift-spacer-row td {
        padding: 0 !important;
        border: none !important;
        line-height: 0 !important;
        height: 0 !important;
      }
      .ift-sentinel {
        height: 1px;
        width: 100%;
        pointer-events: none;
      }
      .ift-footer-status {
        padding: 0.75rem 1rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        background-color: var(--ift-bg);
        border-top: 1px solid var(--ift-border-color);
      }
      .ift-spinner {
        display: inline-block;
        width: 1.125rem;
        height: 1.125rem;
        border: 2px solid rgba(59, 130, 246, 0.2);
        border-radius: 50%;
        border-top-color: var(--ift-primary);
        animation: ift-spin 0.7s linear infinite;
      }
      @keyframes ift-spin {
        to { transform: rotate(360deg); }
      }
      .ift-loading-state {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--ift-text-muted);
        font-size: 0.8125rem;
      }
      .ift-error-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.5rem 0.875rem;
        background-color: var(--ift-error-bg);
        color: var(--ift-error-color);
        border-radius: 0.375rem;
        border: 1px solid #fecaca;
        font-size: 0.8125rem;
        width: 100%;
        max-width: 480px;
      }
      .ift-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.375rem 0.875rem;
        font-size: 0.8125rem;
        font-weight: 500;
        border-radius: 0.375rem;
        cursor: pointer;
        border: 1px solid transparent;
        transition: all 0.15s ease;
      }
      .ift-btn-primary {
        background-color: var(--ift-primary);
        color: white;
      }
      .ift-btn-primary:hover {
        background-color: var(--ift-primary-hover);
      }
      .ift-btn-retry {
        background-color: #fee2e2;
        color: #b91c1c;
        border-color: #fca5a5;
      }
      .ift-btn-retry:hover {
        background-color: #fecaca;
      }
      .ift-end-message {
        color: var(--ift-text-muted);
        font-size: 0.8125rem;
        display: flex;
        align-items: center;
        gap: 0.375rem;
      }
      .ift-pagination-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        border-top: 1px solid var(--ift-border-color);
        background-color: var(--ift-bg);
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .ift-pagination-info {
        font-size: 0.8125rem;
        color: var(--ift-text-muted);
      }
      .ift-pagination-nav {
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }
      .ift-page-btn {
        padding: 0.25rem 0.625rem;
        min-width: 2rem;
        height: 2rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--ift-border-color);
        background: var(--ift-bg);
        color: var(--ift-text-main);
        border-radius: 0.375rem;
        cursor: pointer;
        font-size: 0.8125rem;
        font-weight: 500;
      }
      .ift-page-btn:hover:not(:disabled) {
        background-color: var(--ift-row-hover);
      }
      .ift-page-btn.active {
        background-color: var(--ift-primary);
        color: #ffffff;
        border-color: var(--ift-primary);
      }
      .ift-page-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('infinite-data-table')) {
  customElements.define('infinite-data-table', InfiniteDataTableElement);
}
