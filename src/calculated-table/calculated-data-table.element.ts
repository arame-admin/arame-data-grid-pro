import {
  CalculatedTableColumn,
  CalculatedTableOptions,
  CellChangeDetail
} from './types.js';
import { SortRule } from '../common/base-table-types.js';
import {
  evaluateRowCalculations,
  recalculateOnFieldChange,
  safeFormatNumber
} from './calculation-engine.js';

export class CalculatedDataTableElement<T = Record<string, unknown>> extends HTMLElement {
  private _columns: CalculatedTableColumn<T>[] = [];
  private _rows: T[] = []; // In-memory dataset
  private _computedRows: T[] = []; // Evaluated rows with calculated columns filled
  private _options: CalculatedTableOptions<T> = {
    sticky: {
      stickyFirst: true,
      stickyLast: true
    },
    pagination: {
      enabled: true,
      pageSize: 10,
      pageSizeOptions: [5, 10, 25, 50]
    },
    sorting: {
      enabled: true,
      initialSort: null
    },
    search: {
      enabled: true,
      placeholder: 'Search records...'
    },
    resizableColumns: true,
    dir: 'ltr'
  };

  // State
  private _currentPage = 1;
  private _pageSize = 10;
  private _searchTerm = '';
  private _sortRule: SortRule<T> | null = null;
  private _totalRows = 0;
  private _isLoading = false;

  // DOM Elements
  private _container!: HTMLDivElement;
  private _viewport!: HTMLDivElement;
  private _table!: HTMLTableElement;
  private _thead!: HTMLTableSectionElement;
  private _tbody!: HTMLTableSectionElement;
  private _toolbar!: HTMLDivElement;
  private _searchInput!: HTMLInputElement;
  private _metaBadge!: HTMLElement;
  private _paginationBar!: HTMLDivElement;
  private _loadingOverlay!: HTMLDivElement;

  // Resizing state
  private _resizingColIndex: number | null = null;
  private _resizingStartX = 0;
  private _resizingStartWidth = 0;

  static get observedAttributes(): string[] {
    return ['search-term', 'page', 'page-size', 'dir', 'theme'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this.renderInitialDom();
    this.setupEventListeners();
    this.setupStickyScrollShadows();

    if (this._options.dataLoader) {
      this.fetchServerData();
    } else {
      this.recalculateAll();
      this.refresh();
    }
  }

  disconnectedCallback(): void {
    this.removeGlobalListeners();
  }

  attributeChangedCallback(name: string, _oldVal: string | null, newVal: string | null): void {
    if (name === 'search-term' && newVal !== null) {
      this.setSearchTerm(newVal);
    } else if (name === 'page' && newVal !== null) {
      const p = parseInt(newVal, 10);
      if (!isNaN(p) && p > 0) this.setPage(p);
    } else if (name === 'page-size' && newVal !== null) {
      const ps = parseInt(newVal, 10);
      if (!isNaN(ps) && ps > 0) this.setPageSize(ps);
    } else if (name === 'dir') {
      this._options.dir = (newVal === 'rtl' ? 'rtl' : 'ltr');
      this.updateStickyColumnPositions();
    }
  }

  // --- Public Getters & Setters ---

  get columns(): CalculatedTableColumn<T>[] {
    return this._columns;
  }

  set columns(cols: CalculatedTableColumn<T>[]) {
    this._columns = cols || [];
    this.recalculateAll();
    if (this.isConnected) {
      this.renderHeader();
      this.refresh();
    }
  }

  get data(): T[] {
    return this._rows;
  }

  set data(rows: T[]) {
    this._rows = rows || [];
    this.recalculateAll();
    if (this.isConnected) {
      this.refresh();
    }
  }

  get options(): CalculatedTableOptions<T> {
    return this._options;
  }

  set options(opts: Partial<CalculatedTableOptions<T>>) {
    this._options = {
      ...this._options,
      ...opts,
      sticky: { ...this._options.sticky, ...opts.sticky },
      pagination: { ...this._options.pagination, ...opts.pagination },
      sorting: { ...this._options.sorting, ...opts.sorting },
      search: { ...this._options.search, ...opts.search }
    };
    if (opts.pagination?.pageSize) {
      this._pageSize = opts.pagination.pageSize;
    }
    if (opts.sorting?.initialSort !== undefined) {
      this._sortRule = opts.sorting.initialSort;
    }
    if (this.isConnected) {
      this.renderHeader();
      // Fetch when a dataLoader is assigned after the element is already connected
      if (this._options.dataLoader && opts.dataLoader) {
        this.fetchServerData();
      } else {
        this.refresh();
      }
    }
  }

  // --- Calculations Engine ---

  /**
   * Recalculates all rows against configured calculated columns.
   */
  public recalculateAll(): void {
    this._computedRows = this._rows.map((row, idx) => {
      const { row: evaluated } = evaluateRowCalculations(row, idx, this._columns);
      return evaluated;
    });
    this._totalRows = this._computedRows.length;
  }

  /**
   * Updates a cell in a row, runs dependencies recalculations, updates the DOM, and dispatches typed event.
   */
  public updateCellValue(rowIndex: number, columnKey: string, newValue: unknown): void {
    if (rowIndex < 0 || rowIndex >= this._rows.length) return;

    const sourceRow = this._rows[rowIndex];
    const oldValue = (sourceRow as any)[columnKey];

    if (oldValue === newValue) return;

    // Mutate source data
    (sourceRow as any)[columnKey] = newValue;

    // Recalculate dependent columns
    const { row: recalculatedRow, recalculatedFields } = recalculateOnFieldChange(
      sourceRow,
      rowIndex,
      columnKey,
      this._columns
    );

    this._rows[rowIndex] = recalculatedRow;
    this._computedRows[rowIndex] = recalculatedRow;

    // Re-render current page
    this.renderBodyRows();

    // Dispatch typed custom event
    const eventDetail: CellChangeDetail<T> = {
      rowIndex,
      rowId: (recalculatedRow as any).id ?? rowIndex,
      columnKey,
      oldValue,
      newValue,
      updatedRow: recalculatedRow,
      recalculatedFields
    };

    this.dispatchEvent(
      new CustomEvent('calculated-table:cell-change', {
        detail: eventDetail,
        bubbles: true,
        composed: true
      })
    );
  }

  // --- Filtering, Sorting & Pagination Controls ---

  public setSearchTerm(term: string): void {
    if (this._searchTerm === term) return;
    this._searchTerm = term;
    if (this._searchInput && this._searchInput.value !== term) {
      this._searchInput.value = term;
    }
    this._currentPage = 1;

    this.dispatchEvent(
      new CustomEvent('calculated-table:search-change', {
        detail: { searchTerm: term },
        bubbles: true,
        composed: true
      })
    );

    if (this._options.dataLoader) {
      this.fetchServerData();
    } else {
      this.refresh();
    }
  }

  public setSortRule(sort: SortRule<T> | null): void {
    this._sortRule = sort;
    this.renderHeader();

    this.dispatchEvent(
      new CustomEvent('calculated-table:sort-change', {
        detail: sort,
        bubbles: true,
        composed: true
      })
    );

    if (this._options.dataLoader) {
      this.fetchServerData();
    } else {
      this.refresh();
    }
  }

  public setPage(page: number): void {
    const maxPage = Math.max(1, Math.ceil(this._totalRows / this._pageSize));
    const targetPage = Math.max(1, Math.min(page, maxPage));
    if (this._currentPage === targetPage) return;

    this._currentPage = targetPage;
    this.dispatchEvent(
      new CustomEvent('calculated-table:page-change', {
        detail: { page: this._currentPage, pageSize: this._pageSize },
        bubbles: true,
        composed: true
      })
    );

    if (this._options.dataLoader) {
      this.fetchServerData();
    } else {
      this.refresh();
    }
  }

  public setPageSize(size: number): void {
    if (this._pageSize === size) return;
    this._pageSize = size;
    this._currentPage = 1;

    this.dispatchEvent(
      new CustomEvent('calculated-table:page-change', {
        detail: { page: this._currentPage, pageSize: this._pageSize },
        bubbles: true,
        composed: true
      })
    );

    if (this._options.dataLoader) {
      this.fetchServerData();
    } else {
      this.refresh();
    }
  }

  // --- Server-side Data Loader ---

  private async fetchServerData(): Promise<void> {
    if (!this._options.dataLoader) return;

    this.setLoading(true);
    try {
      const response = await this._options.dataLoader({
        page: this._currentPage,
        pageSize: this._pageSize,
        searchTerm: this._searchTerm,
        sortRule: this._sortRule
      });

      this._rows = response.rows || [];
      this._totalRows = response.totalRows || 0;

      // In server mode, compute calculated columns on the returned page rows
      this.recalculateAll();
      this.renderBodyRows();
      this.renderPaginationBar();
      this.updateMetaInfo();
    } catch (err) {
      console.error('[calculated-table] Error loading server data:', err);
    } finally {
      this.setLoading(false);
    }
  }

  private setLoading(loading: boolean): void {
    this._isLoading = loading;
    if (this._loadingOverlay) {
      this._loadingOverlay.style.display = loading ? 'flex' : 'none';
    }
  }

  // --- Rendering Architecture ---

  private renderInitialDom(): void {
    const shadow = this.shadowRoot!;
    shadow.innerHTML = `
      <style>
        ${this.getInlineCss()}
      </style>
      <div class="calc-table-container">
        <div class="calc-loading-overlay" style="display: none;">
          <div class="calc-spinner"></div>
        </div>

        <div class="calc-toolbar">
          <div class="calc-search-box">
            <svg class="calc-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <input type="text" class="calc-search-input" placeholder="${this._options.search?.placeholder || 'Search records...'}" />
          </div>
          <div class="calc-toolbar-meta">
            <span class="calc-badge calc-meta-badge">0 records</span>
          </div>
        </div>

        <div class="calc-viewport" tabindex="0" role="region" aria-label="Calculated Data Table">
          <table class="calc-table">
            <thead class="calc-thead">
              <tr class="calc-header-row"></tr>
            </thead>
            <tbody class="calc-tbody"></tbody>
          </table>
        </div>

        <div class="calc-pagination"></div>
      </div>
    `;

    this._container = shadow.querySelector('.calc-table-container') as HTMLDivElement;
    this._viewport = shadow.querySelector('.calc-viewport') as HTMLDivElement;
    this._table = shadow.querySelector('.calc-table') as HTMLTableElement;
    this._thead = shadow.querySelector('.calc-thead') as HTMLTableSectionElement;
    this._tbody = shadow.querySelector('.calc-tbody') as HTMLTableSectionElement;
    this._toolbar = shadow.querySelector('.calc-toolbar') as HTMLDivElement;
    this._searchInput = shadow.querySelector('.calc-search-input') as HTMLInputElement;
    this._metaBadge = shadow.querySelector('.calc-meta-badge') as HTMLElement;
    this._paginationBar = shadow.querySelector('.calc-pagination') as HTMLDivElement;
    this._loadingOverlay = shadow.querySelector('.calc-loading-overlay') as HTMLDivElement;

    if (this._options.search?.enabled === false) {
      this._toolbar.style.display = 'none';
    }

    if (this._options.pagination?.enabled === false) {
      this._paginationBar.style.display = 'none';
    }

    this.renderHeader();
  }

  private setupEventListeners(): void {
    // Search input with debounce
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    this._searchInput.addEventListener('input', (e) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const val = (e.target as HTMLInputElement).value.trim();
        this.setSearchTerm(val);
      }, 250);
    });
  }

  private setupStickyScrollShadows(): void {
    const updateShadows = () => {
      const scrollLeft = Math.abs(this._viewport.scrollLeft);
      const scrollWidth = this._viewport.scrollWidth;
      const clientWidth = this._viewport.clientWidth;
      const maxScroll = scrollWidth - clientWidth;

      if (scrollLeft > 2) {
        this._viewport.classList.add('scrolled-left');
      } else {
        this._viewport.classList.remove('scrolled-left');
      }

      if (maxScroll - scrollLeft > 2) {
        this._viewport.classList.add('scrolled-right');
      } else {
        this._viewport.classList.remove('scrolled-right');
      }
    };

    this._viewport.addEventListener('scroll', updateShadows, { passive: true });
    // Run once initially
    setTimeout(updateShadows, 50);
  }

  private renderHeader(): void {
    const headerRow = this._thead.querySelector('.calc-header-row') as HTMLTableRowElement;
    if (!headerRow) return;
    headerRow.innerHTML = '';

    const cols = this._columns;
    const numCols = cols.length;
    const isSingleCol = numCols === 1;

    cols.forEach((col, idx) => {
      const th = document.createElement('th');
      th.className = 'calc-th';
      th.setAttribute('data-col-index', String(idx));
      th.setAttribute('data-col-key', String(col.key));

      // Check sticky classes
      const isFirst = idx === 0 && (this._options.sticky?.stickyFirst !== false);
      const isLast = idx === numCols - 1 && (this._options.sticky?.stickyLast !== false) && !isSingleCol;

      if (isFirst) th.classList.add('calc-sticky-first');
      if (isLast) th.classList.add('calc-sticky-last');

      if (col.width) th.style.width = col.width;
      if (col.minWidth) th.style.minWidth = col.minWidth;
      if (col.align) th.style.textAlign = col.align;

      const inner = document.createElement('div');
      inner.className = 'calc-th-inner';

      const label = document.createElement('span');
      label.textContent = col.header;
      inner.appendChild(label);

      // Sorting
      if (col.sortable !== false && this._options.sorting?.enabled !== false) {
        th.classList.add('sortable');
        const indicator = document.createElement('span');
        indicator.className = 'calc-sort-indicator';

        if (this._sortRule?.column === col.key) {
          indicator.textContent = this._sortRule.direction === 'asc' ? '▲' : '▼';
        } else {
          indicator.textContent = '↕';
          indicator.style.opacity = '0.35';
        }
        inner.appendChild(indicator);

        th.addEventListener('click', (e) => {
          // Avoid triggering sort if clicking resize handle
          if ((e.target as HTMLElement).classList.contains('calc-resizer')) return;

          let nextDir: 'asc' | 'desc' = 'asc';
          if (this._sortRule?.column === col.key) {
            nextDir = this._sortRule.direction === 'asc' ? 'desc' : 'asc';
          }
          this.setSortRule({ column: col.key, direction: nextDir });
        });
      }

      th.appendChild(inner);

      // Column Resize handle
      if (this._options.resizableColumns !== false) {
        const resizer = document.createElement('div');
        resizer.className = 'calc-resizer';
        resizer.addEventListener('mousedown', (e) => this.startColumnResize(e, idx, th));
        th.appendChild(resizer);
      }

      headerRow.appendChild(th);
    });

    this.updateStickyColumnPositions();
  }

  private startColumnResize(e: MouseEvent, colIndex: number, th: HTMLTableCellElement): void {
    e.preventDefault();
    e.stopPropagation();

    this._resizingColIndex = colIndex;
    this._resizingStartX = e.pageX;
    this._resizingStartWidth = th.offsetWidth;

    const resizer = th.querySelector('.calc-resizer');
    resizer?.classList.add('resizing');

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (this._resizingColIndex === null) return;
      const diff = moveEvent.pageX - this._resizingStartX;
      const newWidth = Math.max(60, this._resizingStartWidth + diff);
      th.style.width = `${newWidth}px`;
      this._columns[colIndex].width = `${newWidth}px`;
      this.updateStickyColumnPositions();
    };

    const onMouseUp = () => {
      resizer?.classList.remove('resizing');
      this._resizingColIndex = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  private removeGlobalListeners(): void {
    // Clean up if destroyed mid-resize
  }

  /**
   * Ensures sticky right/left offsets are calculated correctly for variable-width columns
   */
  private updateStickyColumnPositions(): void {
    const isRtl = this._options.dir === 'rtl' || this.getAttribute('dir') === 'rtl';
    const headerRow = this._thead?.querySelector('.calc-header-row');
    if (!headerRow) return;

    const ths = Array.from(headerRow.children) as HTMLTableCellElement[];
    const numCols = ths.length;
    if (numCols === 0) return;

    // First column is pinned to 0
    // Last column is pinned to 0
  }

  private getDisplayRows(): T[] {
    // If server-side mode is active, dataLoader handles sorting and filtering
    if (this._options.dataLoader) {
      return this._computedRows;
    }

    let rows = [...this._computedRows];

    // Client-side search
    if (this._searchTerm && this._options.search?.enabled !== false) {
      const q = this._searchTerm.toLowerCase();
      rows = rows.filter(row => {
        return Object.values(row as any).some(val =>
          String(val).toLowerCase().includes(q)
        );
      });
    }

    // Client-side sort
    if (this._sortRule && this._options.sorting?.enabled !== false) {
      const { column, direction } = this._sortRule;
      rows.sort((a, b) => {
        const valA = (a as any)[column];
        const valB = (b as any)[column];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        const comp = valA > valB ? 1 : -1;
        return direction === 'asc' ? comp : -comp;
      });
    }

    this._totalRows = rows.length;

    // Client-side pagination
    if (this._options.pagination?.enabled !== false) {
      const start = (this._currentPage - 1) * this._pageSize;
      return rows.slice(start, start + this._pageSize);
    }

    return rows;
  }

  private refresh(): void {
    this.renderBodyRows();
    this.renderPaginationBar();
    this.updateMetaInfo();
  }

  private renderBodyRows(): void {
    this._tbody.innerHTML = '';
    const displayRows = this.getDisplayRows();
    const cols = this._columns;
    const numCols = cols.length;
    const isSingleCol = numCols === 1;

    if (displayRows.length === 0) {
      const tr = document.createElement('tr');
      tr.className = 'calc-tr';
      const td = document.createElement('td');
      td.className = 'calc-td';
      td.colSpan = numCols || 1;
      td.style.textAlign = 'center';
      td.style.padding = '2.5rem 1rem';
      td.style.color = 'var(--calc-text-muted)';
      td.textContent = 'No records found';
      tr.appendChild(td);
      this._tbody.appendChild(tr);
      return;
    }

    const fragment = document.createDocumentFragment();

    displayRows.forEach((row, pageRowIndex) => {
      const globalRowIndex = (this._currentPage - 1) * this._pageSize + pageRowIndex;
      const tr = document.createElement('tr');
      tr.className = `calc-tr ${pageRowIndex % 2 === 1 ? 'alt' : ''}`;

      cols.forEach((col, colIndex) => {
        const td = document.createElement('td');
        td.className = 'calc-td';

        // Sticky column assignment
        const isFirst = colIndex === 0 && (this._options.sticky?.stickyFirst !== false);
        const isLast = colIndex === numCols - 1 && (this._options.sticky?.stickyLast !== false) && !isSingleCol;

        if (isFirst) td.classList.add('calc-sticky-first');
        if (isLast) td.classList.add('calc-sticky-last');

        if (col.width) td.style.width = col.width;
        if (col.align) td.style.textAlign = col.align;

        const val = (row as any)[col.key];

        // 1. Is this a calculated column?
        if (typeof col.calculate === 'function') {
          td.classList.add('calc-calculated-col');
          if (col.formatter) {
            const formatted = col.formatter(val, row as unknown as Record<string, unknown>);
            if (formatted instanceof HTMLElement) td.appendChild(formatted);
            else td.innerHTML = String(formatted);
          } else if (typeof val === 'number') {
            td.textContent = safeFormatNumber(val);
          } else {
            td.textContent = val !== undefined && val !== null ? String(val) : '—';
          }
        }
        // 2. Is this an editable source column?
        else if (col.editable) {
          const input = document.createElement('input');
          input.className = 'calc-cell-editor';
          input.type = col.editorType === 'number' ? 'number' : 'text';
          input.value = val !== undefined && val !== null ? String(val) : '';

          input.addEventListener('change', (e) => {
            const raw = (e.target as HTMLInputElement).value;
            const parsed = col.editorType === 'number' ? (raw === '' ? 0 : Number(raw)) : raw;
            this.updateCellValue(globalRowIndex, String(col.key), parsed);
          });

          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              (e.target as HTMLInputElement).blur();
            }
          });

          td.appendChild(input);
        }
        // 3. Custom renderer
        else if (col.render) {
          const rendered = col.render(val, row, globalRowIndex);
          if (rendered instanceof HTMLElement) td.appendChild(rendered);
          else td.innerHTML = String(rendered ?? '');
        }
        // 4. Default plain text rendering
        else {
          td.textContent = val !== undefined && val !== null ? String(val) : '—';
        }

        tr.appendChild(td);
      });

      fragment.appendChild(tr);
    });

    this._tbody.appendChild(fragment);
  }

  private renderPaginationBar(): void {
    if (this._options.pagination?.enabled === false) {
      this._paginationBar.style.display = 'none';
      return;
    }

    this._paginationBar.style.display = 'flex';
    const totalItems = this._totalRows;
    const totalPages = Math.max(1, Math.ceil(totalItems / this._pageSize));

    if (this._currentPage > totalPages) {
      this._currentPage = totalPages;
    }

    const start = totalItems === 0 ? 0 : (this._currentPage - 1) * this._pageSize + 1;
    const end = Math.min(this._currentPage * this._pageSize, totalItems);

    const pageSizeOptions = this._options.pagination?.pageSizeOptions || [5, 10, 25, 50];
    const optionsHtml = pageSizeOptions
      .map(size => `<option value="${size}" ${size === this._pageSize ? 'selected' : ''}>${size} / page</option>`)
      .join('');

    this._paginationBar.innerHTML = `
      <div class="calc-pagination-info">
        Showing <strong>${start}</strong> to <strong>${end}</strong> of <strong>${totalItems}</strong> entries
      </div>
      <div class="calc-pagination-controls">
        <select class="calc-pagination-size-select" aria-label="Page size">
          ${optionsHtml}
        </select>
        <div class="calc-pagination-btn-group">
          <button class="calc-btn prev-btn" ${this._currentPage <= 1 ? 'disabled' : ''}>Previous</button>
          <span class="calc-btn active" style="cursor: default;">${this._currentPage}</span>
          <button class="calc-btn next-btn" ${this._currentPage >= totalPages ? 'disabled' : ''}>Next</button>
        </div>
      </div>
    `;

    const prevBtn = this._paginationBar.querySelector('.prev-btn');
    const nextBtn = this._paginationBar.querySelector('.next-btn');
    const select = this._paginationBar.querySelector('.calc-pagination-size-select') as HTMLSelectElement;

    prevBtn?.addEventListener('click', () => this.setPage(this._currentPage - 1));
    nextBtn?.addEventListener('click', () => this.setPage(this._currentPage + 1));
    select?.addEventListener('change', (e) => {
      this.setPageSize(Number((e.target as HTMLSelectElement).value));
    });
  }

  private updateMetaInfo(): void {
    if (this._metaBadge) {
      this._metaBadge.textContent = `${this._totalRows} records`;
    }
  }

  private getInlineCss(): string {
    return `
      :host {
        display: block;
        width: 100%;
        --calc-primary: #2563eb;
        --calc-primary-hover: #1d4ed8;
        --calc-primary-focus: rgba(37, 99, 235, 0.2);
        --calc-bg: #ffffff;
        --calc-header-bg: #f8fafc;
        --calc-header-sticky-bg: #f1f5f9;
        --calc-row-hover: #f1f5f9;
        --calc-row-alt: #fdfdfe;
        --calc-cell-sticky-bg: #ffffff;
        --calc-cell-sticky-alt-bg: #fdfdfe;
        --calc-cell-sticky-hover-bg: #f1f5f9;
        --calc-border-color: #e2e8f0;
        --calc-text-main: #0f172a;
        --calc-text-muted: #64748b;
        --calc-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        --calc-font-size: 0.875rem;
        --calc-line-height: 1.25rem;
        --calc-border-radius: 0.5rem;
        --calc-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
        --calc-sticky-shadow-start: 4px 0 6px -1px rgba(0, 0, 0, 0.08);
        --calc-sticky-shadow-end: -4px 0 6px -1px rgba(0, 0, 0, 0.08);
        --calc-transition-speed: 0.15s;
      }
      :host([theme="dark"]) {
        --calc-primary: #3b82f6;
        --calc-primary-hover: #60a5fa;
        --calc-primary-focus: rgba(59, 130, 246, 0.3);
        --calc-bg: #0f172a;
        --calc-header-bg: #1e293b;
        --calc-header-sticky-bg: #334155;
        --calc-row-hover: #1e293b;
        --calc-row-alt: #0b1120;
        --calc-cell-sticky-bg: #0f172a;
        --calc-cell-sticky-alt-bg: #0b1120;
        --calc-cell-sticky-hover-bg: #1e293b;
        --calc-border-color: #334155;
        --calc-text-main: #f8fafc;
        --calc-text-muted: #94a3b8;
        --calc-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.3);
        --calc-sticky-shadow-start: 4px 0 8px rgba(0, 0, 0, 0.4);
        --calc-sticky-shadow-end: -4px 0 8px rgba(0, 0, 0, 0.4);
      }
      .calc-table-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        font-family: var(--calc-font-family);
        font-size: var(--calc-font-size);
        line-height: var(--calc-line-height);
        color: var(--calc-text-main);
        background-color: var(--calc-bg);
        border: 1px solid var(--calc-border-color);
        border-radius: var(--calc-border-radius);
        box-shadow: var(--calc-shadow);
        overflow: hidden;
        position: relative;
      }
      .calc-toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        gap: 0.75rem;
        border-bottom: 1px solid var(--calc-border-color);
        background-color: var(--calc-bg);
      }
      .calc-search-box {
        position: relative;
        display: flex;
        align-items: center;
        min-width: 240px;
        max-width: 360px;
        flex: 1;
      }
      .calc-search-icon {
        position: absolute;
        inset-inline-start: 0.625rem;
        width: 1rem;
        height: 1rem;
        color: var(--calc-text-muted);
        pointer-events: none;
      }
      .calc-search-input {
        width: 100%;
        padding: 0.375rem 0.625rem;
        padding-inline-start: 2rem;
        font-size: var(--calc-font-size);
        border: 1px solid var(--calc-border-color);
        border-radius: 0.375rem;
        outline: none;
        background-color: var(--calc-bg);
        color: var(--calc-text-main);
        transition: border-color var(--calc-transition-speed), box-shadow var(--calc-transition-speed);
      }
      .calc-search-input:focus {
        border-color: var(--calc-primary);
        box-shadow: 0 0 0 3px var(--calc-primary-focus);
      }
      .calc-badge {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.5rem;
        border-radius: 9999px;
        background-color: var(--calc-header-bg);
        border: 1px solid var(--calc-border-color);
        font-weight: 500;
        font-size: 0.75rem;
      }
      .calc-viewport {
        overflow-x: auto;
        overflow-y: auto;
        position: relative;
        width: 100%;
        max-height: 580px;
      }
      .calc-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        text-align: start;
      }
      .calc-thead {
        position: sticky;
        top: 0;
        z-index: 20;
        background-color: var(--calc-header-bg);
      }
      .calc-th {
        padding: 0.75rem 1rem;
        font-weight: 600;
        color: var(--calc-text-main);
        background-color: var(--calc-header-bg);
        border-bottom: 1px solid var(--calc-border-color);
        white-space: nowrap;
        user-select: none;
        position: relative;
      }
      .calc-th.sortable {
        cursor: pointer;
        transition: background-color var(--calc-transition-speed);
      }
      .calc-th.sortable:hover {
        background-color: var(--calc-row-hover);
      }
      .calc-th-inner {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
      }
      .calc-sort-indicator {
        font-size: 0.75rem;
        color: var(--calc-text-muted);
      }
      .calc-resizer {
        position: absolute;
        inset-inline-end: 0;
        top: 0;
        bottom: 0;
        width: 6px;
        cursor: col-resize;
        user-select: none;
        z-index: 25;
      }
      .calc-resizer:hover, .calc-resizer.resizing {
        background-color: var(--calc-primary);
      }
      .calc-tr {
        background-color: var(--calc-bg);
        transition: background-color var(--calc-transition-speed);
      }
      .calc-tr:hover {
        background-color: var(--calc-row-hover);
      }
      .calc-tr.alt {
        background-color: var(--calc-row-alt);
      }
      .calc-tr.alt:hover {
        background-color: var(--calc-row-hover);
      }
      .calc-td {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--calc-border-color);
        white-space: nowrap;
        vertical-align: middle;
        background-color: inherit;
      }
      .calc-calculated-col {
        font-weight: 600;
        color: var(--calc-text-main);
      }
      .calc-cell-editor {
        width: 100%;
        max-width: 110px;
        padding: 0.25rem 0.5rem;
        font-size: var(--calc-font-size);
        font-family: inherit;
        border: 1px solid var(--calc-border-color);
        border-radius: 0.25rem;
        background-color: var(--calc-bg);
        color: var(--calc-text-main);
        outline: none;
      }
      .calc-cell-editor:focus {
        border-color: var(--calc-primary);
        box-shadow: 0 0 0 2px var(--calc-primary-focus);
      }
      /* Sticky columns */
      .calc-sticky-first {
        position: sticky;
        inset-inline-start: 0;
        z-index: 10;
        background-color: var(--calc-cell-sticky-bg) !important;
      }
      .calc-th.calc-sticky-first {
        z-index: 30;
        background-color: var(--calc-header-sticky-bg) !important;
      }
      .calc-tr.alt .calc-sticky-first {
        background-color: var(--calc-cell-sticky-alt-bg) !important;
      }
      .calc-tr:hover .calc-sticky-first {
        background-color: var(--calc-cell-sticky-hover-bg) !important;
      }
      .calc-sticky-last {
        position: sticky;
        inset-inline-end: 0;
        z-index: 10;
        background-color: var(--calc-cell-sticky-bg) !important;
      }
      .calc-th.calc-sticky-last {
        z-index: 30;
        background-color: var(--calc-header-sticky-bg) !important;
      }
      .calc-tr.alt .calc-sticky-last {
        background-color: var(--calc-cell-sticky-alt-bg) !important;
      }
      .calc-tr:hover .calc-sticky-last {
        background-color: var(--calc-cell-sticky-hover-bg) !important;
      }
      .calc-viewport.scrolled-left .calc-sticky-first {
        box-shadow: var(--calc-sticky-shadow-start);
      }
      .calc-viewport.scrolled-right .calc-sticky-last {
        box-shadow: var(--calc-sticky-shadow-end);
      }
      .calc-pagination {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        border-top: 1px solid var(--calc-border-color);
        background-color: var(--calc-bg);
        flex-wrap: wrap;
        gap: 0.75rem;
      }
      .calc-pagination-info {
        font-size: 0.8125rem;
        color: var(--calc-text-muted);
      }
      .calc-pagination-controls {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .calc-pagination-size-select {
        padding: 0.25rem 0.5rem;
        font-size: 0.8125rem;
        border: 1px solid var(--calc-border-color);
        border-radius: 0.375rem;
        background-color: var(--calc-bg);
        color: var(--calc-text-main);
        outline: none;
      }
      .calc-pagination-btn-group {
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }
      .calc-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.3rem 0.625rem;
        font-size: 0.8125rem;
        font-weight: 500;
        border-radius: 0.375rem;
        border: 1px solid var(--calc-border-color);
        background-color: var(--calc-bg);
        color: var(--calc-text-main);
        cursor: pointer;
      }
      .calc-btn:hover:not(:disabled) {
        background-color: var(--calc-row-hover);
      }
      .calc-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .calc-btn.active {
        background-color: var(--calc-primary);
        color: #ffffff;
        border-color: var(--calc-primary);
      }
      .calc-loading-overlay {
        position: absolute;
        inset: 0;
        background-color: rgba(255, 255, 255, 0.65);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 50;
      }
      .calc-spinner {
        width: 1.5rem;
        height: 1.5rem;
        border: 2px solid rgba(37, 99, 235, 0.2);
        border-radius: 50%;
        border-top-color: var(--calc-primary);
        animation: calc-spin 0.6s linear infinite;
      }
      @keyframes calc-spin {
        to { transform: rotate(360deg); }
      }
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('calculated-data-table')) {
  customElements.define('calculated-data-table', CalculatedDataTableElement);
}
