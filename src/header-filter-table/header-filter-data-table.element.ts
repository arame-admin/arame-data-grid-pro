import {
  HeaderFilterTableColumn,
  HeaderFilterTableOptions,
  FilterValue,
  HeaderFilterChangeEventDetail,
  HeaderFiltersClearEventDetail
} from './types.js';
import { SortRule } from '../common/base-table-types.js';
import { applyClientFilters, isFilterActive } from './filter-engine.js';

export class HeaderFilterDataTableElement<T = Record<string, unknown>> extends HTMLElement {
  private _columns: HeaderFilterTableColumn<T>[] = [];
  private _allRows: T[] = []; // In-memory data
  private _activeFilters: Record<string, FilterValue> = {};
  private _options: HeaderFilterTableOptions<T> = {
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
      placeholder: 'Search all fields...'
    },
    resizableColumns: true
  };

  // State
  private _currentPage = 1;
  private _pageSize = 10;
  private _searchTerm = '';
  private _sortRule: SortRule<T> | null = null;
  private _totalRows = 0;
  private _isLoading = false;
  private _errorMessage: string | null = null;

  // Debounce timers per column
  private _debounceTimers: Map<string, any> = new Map();

  // Async request sequence counter to cancel stale responses
  private _requestId = 0;
  private _abortController: AbortController | null = null;

  // DOM references
  private _container!: HTMLDivElement;
  private _viewport!: HTMLDivElement;
  private _table!: HTMLTableElement;
  private _thead!: HTMLTableSectionElement;
  private _tbody!: HTMLTableSectionElement;
  private _toolbar!: HTMLDivElement;
  private _searchInput!: HTMLInputElement;
  private _metaBadge!: HTMLElement;
  private _filterCountBadge!: HTMLElement;
  private _clearAllBtn!: HTMLButtonElement;
  private _paginationBar!: HTMLDivElement;
  private _loadingOverlay!: HTMLDivElement;
  private _errorBanner!: HTMLDivElement;

  // Resizing state
  private _resizingColIndex: number | null = null;
  private _resizingStartX = 0;
  private _resizingStartWidth = 0;

  static get observedAttributes(): string[] {
    return ['search-term', 'page', 'page-size', 'theme'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this.renderDomStructure();
    this.setupEventListeners();

    if (this._options.dataLoader) {
      this.fetchServerData();
    } else {
      this.refresh();
    }
  }

  disconnectedCallback(): void {
    if (this._abortController) {
      this._abortController.abort();
    }
    this._debounceTimers.forEach(t => clearTimeout(t));
    this._debounceTimers.clear();
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
    }
  }

  // --- Public API ---

  get columns(): HeaderFilterTableColumn<T>[] {
    return this._columns;
  }

  set columns(cols: HeaderFilterTableColumn<T>[]) {
    this._columns = cols || [];
    if (this.isConnected) {
      this.renderHeader();
      this.refresh();
    }
  }

  get data(): T[] {
    return this._allRows;
  }

  set data(rows: T[]) {
    this._allRows = rows || [];
    if (this.isConnected) {
      this.refresh();
    }
  }

  get options(): HeaderFilterTableOptions<T> {
    return this._options;
  }

  set options(opts: Partial<HeaderFilterTableOptions<T>>) {
    this._options = {
      ...this._options,
      ...opts,
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

  get activeFilters(): Record<string, FilterValue> {
    return { ...this._activeFilters };
  }

  // --- Filtering Methods ---

  public setFilterValue(columnKey: string, value: FilterValue, debounce: boolean = false): void {
    const col = this._columns.find(c => String(c.key) === columnKey);
    const debounceMs = col?.filter ? (col.filter.debounceMs ?? 300) : 300;

    if (debounce && debounceMs > 0) {
      if (this._debounceTimers.has(columnKey)) {
        clearTimeout(this._debounceTimers.get(columnKey));
      }
      const timer = setTimeout(() => {
        this.applyFilterInternal(columnKey, value);
        this._debounceTimers.delete(columnKey);
      }, debounceMs);
      this._debounceTimers.set(columnKey, timer);
    } else {
      this.applyFilterInternal(columnKey, value);
    }
  }

  private applyFilterInternal(columnKey: string, value: FilterValue): void {
    if (!isFilterActive(value)) {
      delete this._activeFilters[columnKey];
    } else {
      this._activeFilters[columnKey] = value;
    }

    // Reset to page 1 on filter change
    this._currentPage = 1;

    // Dispatch event
    const detail: HeaderFilterChangeEventDetail = {
      columnKey,
      filterValue: value,
      activeFilters: this.activeFilters
    };
    this.dispatchEvent(
      new CustomEvent('header-filter:change', { detail, bubbles: true, composed: true })
    );

    this.updateActiveFilterUI();

    if (this._options.dataLoader) {
      this.fetchServerData();
    } else {
      this.refresh();
    }
  }

  public clearFilter(columnKey: string): void {
    if (columnKey in this._activeFilters) {
      delete this._activeFilters[columnKey];
      this._currentPage = 1;

      // Reset DOM input in header
      const th = this._thead.querySelector(`th[data-col-key="${columnKey}"]`);
      if (th) {
        const input = th.querySelector('.hft-filter-input, .hft-filter-select') as any;
        if (input) input.value = '';
        const rangeMin = th.querySelector('.hft-range-min') as HTMLInputElement;
        const rangeMax = th.querySelector('.hft-range-max') as HTMLInputElement;
        if (rangeMin) rangeMin.value = '';
        if (rangeMax) rangeMax.value = '';
      }

      const detail: HeaderFiltersClearEventDetail = {
        clearedColumnKey: columnKey,
        activeFilters: this.activeFilters
      };
      this.dispatchEvent(
        new CustomEvent('header-filter:clear', { detail, bubbles: true, composed: true })
      );

      this.updateActiveFilterUI();

      if (this._options.dataLoader) {
        this.fetchServerData();
      } else {
        this.refresh();
      }
    }
  }

  public clearAllFilters(): void {
    this._activeFilters = {};
    this._currentPage = 1;

    // Reset all header filter inputs
    const inputs = this._thead.querySelectorAll('.hft-filter-input, .hft-filter-select');
    inputs.forEach((inp: Element) => { (inp as HTMLInputElement).value = ''; });
    const rangeInputs = this._thead.querySelectorAll('.hft-range-input');
    rangeInputs.forEach((inp: Element) => { (inp as HTMLInputElement).value = ''; });

    const detail: HeaderFiltersClearEventDetail = {
      activeFilters: {}
    };
    this.dispatchEvent(
      new CustomEvent('header-filter:clear', { detail, bubbles: true, composed: true })
    );

    this.updateActiveFilterUI();

    if (this._options.dataLoader) {
      this.fetchServerData();
    } else {
      this.refresh();
    }
  }

  public setSearchTerm(term: string): void {
    if (this._searchTerm === term) return;
    this._searchTerm = term;
    if (this._searchInput && this._searchInput.value !== term) {
      this._searchInput.value = term;
    }
    this._currentPage = 1;

    if (this._options.dataLoader) {
      this.fetchServerData();
    } else {
      this.refresh();
    }
  }

  public setSortRule(sort: SortRule<T> | null): void {
    this._sortRule = sort;
    this.renderHeader();

    if (this._options.dataLoader) {
      this.fetchServerData();
    } else {
      this.refresh();
    }
  }

  public setPage(page: number): void {
    const maxPage = Math.max(1, Math.ceil(this._totalRows / this._pageSize));
    const target = Math.max(1, Math.min(page, maxPage));
    if (this._currentPage === target) return;

    this._currentPage = target;
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

    if (this._options.dataLoader) {
      this.fetchServerData();
    } else {
      this.refresh();
    }
  }

  // --- Server-side Data Loader ---

  private async fetchServerData(): Promise<void> {
    if (!this._options.dataLoader) return;

    if (this._abortController) {
      this._abortController.abort();
    }
    this._abortController = new AbortController();
    const signal = this._abortController.signal;
    const currentReqId = ++this._requestId;

    this.setLoading(true);
    this.setError(null);

    try {
      const response = await this._options.dataLoader({
        page: this._currentPage,
        pageSize: this._pageSize,
        searchTerm: this._searchTerm,
        sortRule: this._sortRule,
        filters: this.activeFilters,
        signal
      });

      if (currentReqId !== this._requestId || signal.aborted) {
        return; // Stale response discarded
      }

      this._allRows = response.rows || [];
      this._totalRows = response.totalRows || 0;
      this.renderBodyRows();
      this.renderPaginationBar();
      this.updateMetaInfo();
    } catch (err: unknown) {
      if (signal.aborted || currentReqId !== this._requestId) return;
      const errorObj = err as Error;
      this.setError(errorObj?.message || 'Error loading records');
    } finally {
      if (currentReqId === this._requestId) {
        this.setLoading(false);
      }
    }
  }

  private setLoading(loading: boolean): void {
    this._isLoading = loading;
    if (this._loadingOverlay) {
      this._loadingOverlay.style.display = loading ? 'flex' : 'none';
    }
  }

  private setError(msg: string | null): void {
    this._errorMessage = msg;
    if (this._errorBanner) {
      if (msg) {
        this._errorBanner.style.display = 'flex';
        this._errorBanner.innerHTML = `
          <span>${msg}</span>
          <button class="hft-btn" id="hft-retry-btn">Retry</button>
        `;
        this._errorBanner.querySelector('#hft-retry-btn')?.addEventListener('click', () => {
          this.fetchServerData();
        });
      } else {
        this._errorBanner.style.display = 'none';
      }
    }
  }

  // --- Rendering Architecture ---

  private renderDomStructure(): void {
    const shadow = this.shadowRoot!;
    shadow.innerHTML = `
      <style>
        ${this.getInlineStyles()}
      </style>
      <div class="hft-container">
        <div class="hft-loading-overlay" style="display: none;">
          <div class="hft-spinner"></div>
          <span>Loading data...</span>
        </div>

        <div class="hft-error-banner" style="display: none;"></div>

        <div class="hft-toolbar">
          <div class="hft-search-wrapper">
            <svg class="hft-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <input type="text" class="hft-search-input" placeholder="${this._options.search?.placeholder || 'Search all fields...'}" />
          </div>
          <div class="hft-toolbar-actions">
            <span class="hft-badge hft-filter-count-badge" style="display: none;">0 active filters</span>
            <button class="hft-btn hft-btn-clear-all" style="display: none;">Clear all filters</button>
            <span class="hft-badge hft-meta-badge">0 records</span>
          </div>
        </div>

        <div class="hft-viewport" tabindex="0" role="region" aria-label="Filtered Data Table">
          <table class="hft-table">
            <thead class="hft-thead">
              <tr class="hft-header-tr"></tr>
            </thead>
            <tbody class="hft-tbody"></tbody>
          </table>
        </div>

        <div class="hft-pagination"></div>
      </div>
    `;

    this._container = shadow.querySelector('.hft-container') as HTMLDivElement;
    this._viewport = shadow.querySelector('.hft-viewport') as HTMLDivElement;
    this._table = shadow.querySelector('.hft-table') as HTMLTableElement;
    this._thead = shadow.querySelector('.hft-thead') as HTMLTableSectionElement;
    this._tbody = shadow.querySelector('.hft-tbody') as HTMLTableSectionElement;
    this._toolbar = shadow.querySelector('.hft-toolbar') as HTMLDivElement;
    this._searchInput = shadow.querySelector('.hft-search-input') as HTMLInputElement;
    this._metaBadge = shadow.querySelector('.hft-meta-badge') as HTMLElement;
    this._filterCountBadge = shadow.querySelector('.hft-filter-count-badge') as HTMLElement;
    this._clearAllBtn = shadow.querySelector('.hft-btn-clear-all') as HTMLButtonElement;
    this._paginationBar = shadow.querySelector('.hft-pagination') as HTMLDivElement;
    this._loadingOverlay = shadow.querySelector('.hft-loading-overlay') as HTMLDivElement;
    this._errorBanner = shadow.querySelector('.hft-error-banner') as HTMLDivElement;

    if (this._options.search?.enabled === false) {
      this._toolbar.style.display = 'none';
    }

    this.renderHeader();
  }

  private setupEventListeners(): void {
    let searchDebounce: ReturnType<typeof setTimeout> | null = null;
    this._searchInput.addEventListener('input', (e) => {
      if (searchDebounce) clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        const val = (e.target as HTMLInputElement).value.trim();
        this.setSearchTerm(val);
      }, 250);
    });

    this._clearAllBtn.addEventListener('click', () => {
      this.clearAllFilters();
    });
  }

  private renderHeader(): void {
    const headerTr = this._thead.querySelector('.hft-header-tr') as HTMLTableRowElement;
    if (!headerTr) return;
    headerTr.innerHTML = '';

    this._columns.forEach((col, idx) => {
      const th = document.createElement('th');
      th.className = 'hft-th';
      th.setAttribute('data-col-key', String(col.key));
      th.setAttribute('data-col-index', String(idx));

      if (col.width) th.style.width = col.width;
      if (col.minWidth) th.style.minWidth = col.minWidth;
      if (col.align) th.style.textAlign = col.align;

      if (isFilterActive(this._activeFilters[String(col.key)])) {
        th.classList.add('filtered');
      }

      // 1. Header Label & Sort Controls
      const headerRow = document.createElement('div');
      headerRow.className = 'hft-th-header-row';

      const titleEl = document.createElement('div');
      titleEl.className = 'hft-th-title';
      titleEl.innerHTML = `<span>${col.header}</span>`;

      if (col.sortable !== false && this._options.sorting?.enabled !== false) {
        const sortIcon = document.createElement('span');
        sortIcon.className = 'hft-sort-icon';
        if (this._sortRule?.column === col.key) {
          sortIcon.textContent = this._sortRule.direction === 'asc' ? '▲' : '▼';
        } else {
          sortIcon.textContent = '↕';
          sortIcon.style.opacity = '0.35';
        }
        titleEl.appendChild(sortIcon);

        titleEl.addEventListener('click', () => {
          let nextDir: 'asc' | 'desc' = 'asc';
          if (this._sortRule?.column === col.key) {
            nextDir = this._sortRule.direction === 'asc' ? 'desc' : 'asc';
          }
          this.setSortRule({ column: col.key, direction: nextDir });
        });
      }

      headerRow.appendChild(titleEl);
      th.appendChild(headerRow);

      // 2. In-Header Filter Control (if configured)
      if (col.filter !== false && col.filter) {
        const filterContainer = document.createElement('div');
        filterContainer.className = 'hft-filter-container';

        this.renderColumnFilterControl(col, filterContainer);
        th.appendChild(filterContainer);
      }

      // 3. Resizer handle
      if (this._options.resizableColumns !== false) {
        const resizer = document.createElement('div');
        resizer.className = 'hft-resizer';
        resizer.addEventListener('mousedown', (e) => this.startColumnResize(e, idx, th));
        th.appendChild(resizer);
      }

      headerTr.appendChild(th);
    });
  }

  private renderColumnFilterControl(col: HeaderFilterTableColumn<T>, container: HTMLElement): void {
    const filterCfg = col.filter;
    if (!filterCfg) return;

    const colKey = String(col.key);
    const activeVal = this._activeFilters[colKey];
    const isFiltered = isFilterActive(activeVal);

    // Custom renderer hook
    if (typeof filterCfg.renderControl === 'function') {
      const customEl = filterCfg.renderControl(activeVal, (newVal) => {
        this.setFilterValue(colKey, newVal, false);
      });
      container.appendChild(customEl);
      return;
    }

    switch (filterCfg.type) {
      case 'text': {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = `hft-filter-input ${isFiltered ? 'active' : ''}`;
        input.placeholder = filterCfg.placeholder || `Filter ${col.header}...`;
        input.setAttribute('aria-label', filterCfg.ariaLabel || `Filter by ${col.header}`);
        input.value = activeVal !== undefined && activeVal !== null ? String(activeVal) : '';

        input.addEventListener('input', (e) => {
          const val = (e.target as HTMLInputElement).value;
          this.setFilterValue(colKey, val, true);
        });

        container.appendChild(input);

        if (isFiltered) {
          const clearBtn = this.createClearFilterButton(colKey);
          container.appendChild(clearBtn);
        }
        break;
      }

      case 'select': {
        const select = document.createElement('select');
        select.className = `hft-filter-select ${isFiltered ? 'active' : ''}`;
        select.setAttribute('aria-label', filterCfg.ariaLabel || `Filter by ${col.header}`);

        // Default 'All' option
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = filterCfg.placeholder || 'All';
        select.appendChild(defaultOpt);

        const options = filterCfg.options || [];
        options.forEach(opt => {
          const el = document.createElement('option');
          el.value = String(opt.value);
          el.textContent = opt.label;
          if (String(opt.value) === String(activeVal)) {
            el.selected = true;
          }
          select.appendChild(el);
        });

        select.addEventListener('change', (e) => {
          const val = (e.target as HTMLSelectElement).value;
          this.setFilterValue(colKey, val, false);
        });

        container.appendChild(select);
        if (isFiltered) {
          container.appendChild(this.createClearFilterButton(colKey));
        }
        break;
      }

      case 'multi-select': {
        const wrap = document.createElement('div');
        wrap.className = 'hft-multi-select-wrap';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `hft-multi-select-btn ${isFiltered ? 'active' : ''}`;
        const selectedList = (activeVal as string[]) || [];
        btn.innerHTML = `<span>${selectedList.length > 0 ? `${selectedList.length} selected` : 'Select...'}</span><span>▾</span>`;

        const dropdown = document.createElement('div');
        dropdown.className = 'hft-multi-select-dropdown';
        dropdown.style.display = 'none';

        const options = filterCfg.options || [];
        options.forEach(opt => {
          const label = document.createElement('label');
          label.className = 'hft-multi-select-option';
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.value = String(opt.value);
          checkbox.checked = selectedList.includes(String(opt.value));

          checkbox.addEventListener('change', () => {
            const currentSelected = new Set((this._activeFilters[colKey] as string[]) || []);
            if (checkbox.checked) {
              currentSelected.add(String(opt.value));
            } else {
              currentSelected.delete(String(opt.value));
            }
            this.setFilterValue(colKey, Array.from(currentSelected), false);
          });

          label.appendChild(checkbox);
          label.appendChild(document.createTextNode(opt.label));
          dropdown.appendChild(label);
        });

        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          dropdown.style.display = dropdown.style.display === 'none' ? 'flex' : 'none';
        });

        // Close on outside click
        window.addEventListener('click', () => {
          dropdown.style.display = 'none';
        });

        wrap.appendChild(btn);
        wrap.appendChild(dropdown);
        container.appendChild(wrap);

        if (isFiltered) {
          container.appendChild(this.createClearFilterButton(colKey));
        }
        break;
      }

      case 'number-range': {
        const rangeWrap = document.createElement('div');
        rangeWrap.className = 'hft-range-wrapper';

        const nrVal = (activeVal as any) || {};

        const minInp = document.createElement('input');
        minInp.type = 'number';
        minInp.className = 'hft-range-input hft-range-min';
        minInp.placeholder = 'Min';
        minInp.value = nrVal.min !== undefined ? nrVal.min : '';

        const sep = document.createElement('span');
        sep.className = 'hft-range-separator';
        sep.textContent = '-';

        const maxInp = document.createElement('input');
        maxInp.type = 'number';
        maxInp.className = 'hft-range-input hft-range-max';
        maxInp.placeholder = 'Max';
        maxInp.value = nrVal.max !== undefined ? nrVal.max : '';

        const emitRange = () => {
          const min = minInp.value !== '' ? Number(minInp.value) : undefined;
          const max = maxInp.value !== '' ? Number(maxInp.value) : undefined;
          this.setFilterValue(colKey, { min, max }, true);
        };

        minInp.addEventListener('input', emitRange);
        maxInp.addEventListener('input', emitRange);

        rangeWrap.appendChild(minInp);
        rangeWrap.appendChild(sep);
        rangeWrap.appendChild(maxInp);
        container.appendChild(rangeWrap);

        if (isFiltered) {
          container.appendChild(this.createClearFilterButton(colKey));
        }
        break;
      }

      case 'date-range': {
        const dateWrap = document.createElement('div');
        dateWrap.className = 'hft-range-wrapper';

        const drVal = (activeVal as any) || {};

        const startInp = document.createElement('input');
        startInp.type = 'date';
        startInp.className = 'hft-range-input';
        startInp.value = drVal.start || '';

        const sep = document.createElement('span');
        sep.className = 'hft-range-separator';
        sep.textContent = '-';

        const endInp = document.createElement('input');
        endInp.type = 'date';
        endInp.className = 'hft-range-input';
        endInp.value = drVal.end || '';

        const emitDateRange = () => {
          this.setFilterValue(colKey, { start: startInp.value || undefined, end: endInp.value || undefined }, false);
        };

        startInp.addEventListener('change', emitDateRange);
        endInp.addEventListener('change', emitDateRange);

        dateWrap.appendChild(startInp);
        dateWrap.appendChild(sep);
        dateWrap.appendChild(endInp);
        container.appendChild(dateWrap);

        if (isFiltered) {
          container.appendChild(this.createClearFilterButton(colKey));
        }
        break;
      }
    }
  }

  private createClearFilterButton(colKey: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hft-filter-clear-btn';
    btn.setAttribute('aria-label', `Clear filter for ${colKey}`);
    btn.title = 'Clear column filter';
    btn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
      </svg>
    `;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.clearFilter(colKey);
    });
    return btn;
  }

  private startColumnResize(e: MouseEvent, colIndex: number, th: HTMLTableCellElement): void {
    e.preventDefault();
    e.stopPropagation();

    this._resizingColIndex = colIndex;
    this._resizingStartX = e.pageX;
    this._resizingStartWidth = th.offsetWidth;

    const resizer = th.querySelector('.hft-resizer');
    resizer?.classList.add('resizing');

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (this._resizingColIndex === null) return;
      const diff = moveEvent.pageX - this._resizingStartX;
      const newWidth = Math.max(80, this._resizingStartWidth + diff);
      th.style.width = `${newWidth}px`;
      this._columns[colIndex].width = `${newWidth}px`;
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

  private updateActiveFilterUI(): void {
    const activeCount = Object.keys(this._activeFilters).length;

    if (activeCount > 0) {
      this._filterCountBadge.style.display = 'inline-flex';
      this._filterCountBadge.classList.add('active-filter-indicator');
      this._filterCountBadge.textContent = `${activeCount} filter${activeCount > 1 ? 's' : ''} active`;
      this._clearAllBtn.style.display = 'inline-flex';
    } else {
      this._filterCountBadge.style.display = 'none';
      this._filterCountBadge.classList.remove('active-filter-indicator');
      this._clearAllBtn.style.display = 'none';
    }

    // Refresh header active highlights
    this._columns.forEach(col => {
      const th = this._thead.querySelector(`th[data-col-key="${String(col.key)}"]`);
      if (th) {
        if (isFilterActive(this._activeFilters[String(col.key)])) {
          th.classList.add('filtered');
        } else {
          th.classList.remove('filtered');
        }
      }
    });
  }

  private getDisplayRows(): T[] {
    // If in server-side mode, dataLoader already provided the sliced page
    if (this._options.dataLoader) {
      return this._allRows;
    }

    // 1. Client-side filtering (search term + active header filters)
    let filtered = applyClientFilters(this._allRows, this._columns, this._activeFilters, this._searchTerm);

    // 2. Client-side sorting
    if (this._sortRule && this._options.sorting?.enabled !== false) {
      const { column, direction } = this._sortRule;
      filtered.sort((a, b) => {
        const valA = (a as any)[column];
        const valB = (b as any)[column];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        const comp = valA > valB ? 1 : -1;
        return direction === 'asc' ? comp : -comp;
      });
    }

    this._totalRows = filtered.length;

    // 3. Client-side pagination
    if (this._options.pagination?.enabled !== false) {
      const start = (this._currentPage - 1) * this._pageSize;
      return filtered.slice(start, start + this._pageSize);
    }

    return filtered;
  }

  private refresh(): void {
    this.renderBodyRows();
    this.renderPaginationBar();
    this.updateMetaInfo();
    this.updateActiveFilterUI();
  }

  private renderBodyRows(): void {
    this._tbody.innerHTML = '';
    const displayRows = this.getDisplayRows();

    if (displayRows.length === 0) {
      const tr = document.createElement('tr');
      tr.className = 'hft-tr';
      const td = document.createElement('td');
      td.className = 'hft-td';
      td.colSpan = this._columns.length || 1;
      td.style.textAlign = 'center';
      td.style.padding = '2.5rem 1rem';
      td.style.color = 'var(--hft-text-muted)';
      td.textContent = 'No matching records found';
      tr.appendChild(td);
      this._tbody.appendChild(tr);
      return;
    }

    const fragment = document.createDocumentFragment();

    displayRows.forEach((row, rIdx) => {
      const tr = document.createElement('tr');
      tr.className = `hft-tr ${rIdx % 2 === 1 ? 'alt' : ''}`;

      this._columns.forEach(col => {
        const td = document.createElement('td');
        td.className = 'hft-td';
        if (col.align) td.style.textAlign = col.align;

        const val = (row as any)[col.key];

        if (col.render) {
          const rendered = col.render(val, row, rIdx);
          if (rendered instanceof HTMLElement) {
            td.appendChild(rendered);
          } else {
            td.innerHTML = String(rendered ?? '');
          }
        } else {
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
      <div class="hft-pagination-info">
        Showing <strong>${start}</strong> to <strong>${end}</strong> of <strong>${totalItems}</strong> entries
      </div>
      <div class="hft-pagination-controls">
        <select class="hft-pagination-size-select" aria-label="Rows per page">
          ${optionsHtml}
        </select>
        <div class="hft-pagination-nav">
          <button class="hft-page-btn prev-btn" ${this._currentPage <= 1 ? 'disabled' : ''}>Previous</button>
          <span class="hft-page-btn active" style="cursor: default;">${this._currentPage}</span>
          <button class="hft-page-btn next-btn" ${this._currentPage >= totalPages ? 'disabled' : ''}>Next</button>
        </div>
      </div>
    `;

    this._paginationBar.querySelector('.prev-btn')?.addEventListener('click', () => this.setPage(this._currentPage - 1));
    this._paginationBar.querySelector('.next-btn')?.addEventListener('click', () => this.setPage(this._currentPage + 1));
    this._paginationBar.querySelector('.hft-pagination-size-select')?.addEventListener('change', (e) => {
      this.setPageSize(Number((e.target as HTMLSelectElement).value));
    });
  }

  private updateMetaInfo(): void {
    if (this._metaBadge) {
      this._metaBadge.textContent = `${this._totalRows} records`;
    }
  }

  private getInlineStyles(): string {
    return `
      :host {
        display: block;
        width: 100%;
        --hft-primary: #3b82f6;
        --hft-primary-hover: #2563eb;
        --hft-primary-light: #eff6ff;
        --hft-primary-border: #93c5fd;
        --hft-bg: #ffffff;
        --hft-header-bg: #f8fafc;
        --hft-row-hover: #f1f5f9;
        --hft-row-alt: #fdfdfe;
        --hft-border-color: #e2e8f0;
        --hft-text-main: #0f172a;
        --hft-text-muted: #64748b;
        --hft-filter-active-bg: #eff6ff;
        --hft-filter-active-border: #3b82f6;
        --hft-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        --hft-font-size: 0.875rem;
        --hft-line-height: 1.25rem;
        --hft-border-radius: 0.5rem;
        --hft-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
        --hft-transition: 0.15s ease;
      }
      :host([theme="dark"]) {
        --hft-primary: #60a5fa;
        --hft-primary-hover: #3b82f6;
        --hft-primary-light: #1e293b;
        --hft-primary-border: #2563eb;
        --hft-bg: #0f172a;
        --hft-header-bg: #1e293b;
        --hft-row-hover: #1e293b;
        --hft-row-alt: #0b1120;
        --hft-border-color: #334155;
        --hft-text-main: #f8fafc;
        --hft-text-muted: #94a3b8;
        --hft-filter-active-bg: #1e293b;
        --hft-filter-active-border: #60a5fa;
        --hft-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.3);
      }
      .hft-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        font-family: var(--hft-font-family);
        font-size: var(--hft-font-size);
        line-height: var(--hft-line-height);
        color: var(--hft-text-main);
        background-color: var(--hft-bg);
        border: 1px solid var(--hft-border-color);
        border-radius: var(--hft-border-radius);
        box-shadow: var(--hft-shadow);
        overflow: hidden;
        position: relative;
      }
      .hft-toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        gap: 0.75rem;
        border-bottom: 1px solid var(--hft-border-color);
        background-color: var(--hft-bg);
      }
      .hft-search-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        min-width: 240px;
        max-width: 360px;
        flex: 1;
      }
      .hft-search-icon {
        position: absolute;
        left: 0.625rem;
        width: 1rem;
        height: 1rem;
        color: var(--hft-text-muted);
        pointer-events: none;
      }
      .hft-search-input {
        width: 100%;
        padding: 0.375rem 0.625rem 0.375rem 2rem;
        font-size: var(--hft-font-size);
        border: 1px solid var(--hft-border-color);
        border-radius: 0.375rem;
        outline: none;
        background-color: var(--hft-bg);
        color: var(--hft-text-main);
      }
      .hft-search-input:focus {
        border-color: var(--hft-primary);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
      }
      .hft-toolbar-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .hft-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.35rem 0.75rem;
        font-size: 0.8125rem;
        font-weight: 500;
        border-radius: 0.375rem;
        border: 1px solid var(--hft-border-color);
        background-color: var(--hft-bg);
        color: var(--hft-text-main);
        cursor: pointer;
      }
      .hft-btn:hover:not(:disabled) {
        background-color: var(--hft-row-hover);
      }
      .hft-btn-clear-all {
        color: #ef4444;
        border-color: #fca5a5;
        background-color: #fef2f2;
      }
      .hft-btn-clear-all:hover {
        background-color: #fee2e2;
      }
      .hft-badge {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.5rem;
        border-radius: 9999px;
        background-color: var(--hft-header-bg);
        border: 1px solid var(--hft-border-color);
        font-weight: 500;
        font-size: 0.75rem;
        color: var(--hft-text-muted);
      }
      .hft-badge.active-filter-indicator {
        background-color: var(--hft-primary-light);
        border-color: var(--hft-primary-border);
        color: var(--hft-primary);
        font-weight: 600;
      }
      .hft-viewport {
        overflow-x: auto;
        overflow-y: auto;
        position: relative;
        width: 100%;
        max-height: 560px;
      }
      .hft-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        text-align: left;
      }
      .hft-thead {
        position: sticky;
        top: 0;
        z-index: 20;
        background-color: var(--hft-header-bg);
      }
      .hft-th {
        padding: 0.625rem 0.75rem;
        font-weight: 600;
        color: var(--hft-text-main);
        background-color: var(--hft-header-bg);
        border-bottom: 1px solid var(--hft-border-color);
        white-space: nowrap;
        vertical-align: top;
        position: relative;
        user-select: none;
      }
      .hft-th.filtered {
        background-color: var(--hft-filter-active-bg);
      }
      .hft-th-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        margin-bottom: 0.375rem;
      }
      .hft-th-title {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        cursor: pointer;
        flex: 1;
      }
      .hft-sort-icon {
        font-size: 0.75rem;
        color: var(--hft-text-muted);
      }
      .hft-resizer {
        position: absolute;
        right: 0;
        top: 0;
        bottom: 0;
        width: 5px;
        cursor: col-resize;
        user-select: none;
        z-index: 25;
      }
      .hft-resizer:hover, .hft-resizer.resizing {
        background-color: var(--hft-primary);
      }
      .hft-filter-container {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        position: relative;
        width: 100%;
      }
      .hft-filter-input,
      .hft-filter-select {
        width: 100%;
        padding: 0.25rem 0.45rem;
        font-size: 0.8125rem;
        font-family: inherit;
        border: 1px solid var(--hft-border-color);
        border-radius: 0.25rem;
        background-color: var(--hft-bg);
        color: var(--hft-text-main);
        outline: none;
      }
      .hft-filter-input:focus,
      .hft-filter-select:focus {
        border-color: var(--hft-primary);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
      }
      .hft-filter-input.active,
      .hft-filter-select.active {
        border-color: var(--hft-filter-active-border);
        background-color: var(--hft-filter-active-bg);
      }
      .hft-range-wrapper {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        width: 100%;
      }
      .hft-range-input {
        width: 50%;
        padding: 0.25rem 0.35rem;
        font-size: 0.75rem;
        border: 1px solid var(--hft-border-color);
        border-radius: 0.25rem;
        background-color: var(--hft-bg);
        color: var(--hft-text-main);
        outline: none;
      }
      .hft-range-separator {
        font-size: 0.75rem;
        color: var(--hft-text-muted);
      }
      .hft-filter-clear-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.15rem;
        color: var(--hft-text-muted);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 0.25rem;
      }
      .hft-filter-clear-btn:hover {
        color: #ef4444;
      }
      .hft-multi-select-wrap {
        position: relative;
        width: 100%;
      }
      .hft-multi-select-btn {
        width: 100%;
        text-align: left;
        padding: 0.25rem 0.45rem;
        font-size: 0.8125rem;
        border: 1px solid var(--hft-border-color);
        border-radius: 0.25rem;
        background-color: var(--hft-bg);
        color: var(--hft-text-main);
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
      }
      .hft-multi-select-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        width: 180px;
        max-height: 180px;
        overflow-y: auto;
        background-color: var(--hft-bg);
        border: 1px solid var(--hft-border-color);
        border-radius: 0.375rem;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.15);
        z-index: 50;
        padding: 0.375rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .hft-multi-select-option {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.2rem 0.35rem;
        font-size: 0.8125rem;
        cursor: pointer;
        border-radius: 0.25rem;
      }
      .hft-multi-select-option:hover {
        background-color: var(--hft-row-hover);
      }
      .hft-tr {
        background-color: var(--hft-bg);
      }
      .hft-tr:hover {
        background-color: var(--hft-row-hover);
      }
      .hft-tr.alt {
        background-color: var(--hft-row-alt);
      }
      .hft-tr.alt:hover {
        background-color: var(--hft-row-hover);
      }
      .hft-td {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--hft-border-color);
        white-space: nowrap;
        vertical-align: middle;
      }
      .hft-pagination {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        border-top: 1px solid var(--hft-border-color);
        background-color: var(--hft-bg);
        flex-wrap: wrap;
        gap: 0.75rem;
      }
      .hft-pagination-info {
        font-size: 0.8125rem;
        color: var(--hft-text-muted);
      }
      .hft-pagination-controls {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .hft-pagination-size-select {
        padding: 0.25rem 0.5rem;
        font-size: 0.8125rem;
        border: 1px solid var(--hft-border-color);
        border-radius: 0.375rem;
        background-color: var(--hft-bg);
        color: var(--hft-text-main);
        outline: none;
      }
      .hft-pagination-nav {
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }
      .hft-page-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.3rem 0.625rem;
        font-size: 0.8125rem;
        font-weight: 500;
        border-radius: 0.375rem;
        border: 1px solid var(--hft-border-color);
        background-color: var(--hft-bg);
        color: var(--hft-text-main);
        cursor: pointer;
      }
      .hft-page-btn:hover:not(:disabled) {
        background-color: var(--hft-row-hover);
      }
      .hft-page-btn.active {
        background-color: var(--hft-primary);
        color: #ffffff;
        border-color: var(--hft-primary);
      }
      .hft-page-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .hft-loading-overlay {
        position: absolute;
        inset: 0;
        background-color: rgba(255, 255, 255, 0.65);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 50;
        gap: 0.5rem;
      }
      .hft-spinner {
        width: 1.5rem;
        height: 1.5rem;
        border: 2px solid rgba(59, 130, 246, 0.2);
        border-radius: 50%;
        border-top-color: var(--hft-primary);
        animation: hft-spin 0.6s linear infinite;
      }
      @keyframes hft-spin {
        to { transform: rotate(360deg); }
      }
      .hft-error-banner {
        padding: 0.625rem 1rem;
        background-color: #fef2f2;
        border-bottom: 1px solid #fecaca;
        color: #dc2626;
        font-size: 0.8125rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('header-filter-data-table')) {
  customElements.define('header-filter-data-table', HeaderFilterDataTableElement);
}
