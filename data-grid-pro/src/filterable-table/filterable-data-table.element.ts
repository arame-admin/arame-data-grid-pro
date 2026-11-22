import {
  Density,
  FilterCriterion,
  FilterType,
  FilterableColumnDef,
  FilterableTableEventPayloads,
  FilterableTableOptions,
  ServerFilterQueryParams,
  SortCriterion
} from './types.js';
import { filterRows, isFilterActive, resolveValue } from './filter-engine.js';

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
  attrs?: Record<string, string | boolean | number>
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tagName);
  if (className) el.className = className;
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (typeof value === 'boolean') {
        if (value) el.setAttribute(key, '');
        else el.removeAttribute(key);
      } else {
        el.setAttribute(key, String(value));
      }
    }
  }
  return el;
}

function removeAllChildren(parent: HTMLElement): void {
  while (parent.firstChild) parent.removeChild(parent.firstChild);
}

export class FilterableDataTable<T = Record<string, any>> extends HTMLElement {
  static get observedAttributes() {
    return ['density'];
  }

  private _rows: T[] = [];
  private _columns: FilterableColumnDef<T>[] = [];
  private _options: FilterableTableOptions<T> = {
    rowIdKey: 'id',
    density: 'comfortable',
    showGlobalSearch: true,
    searchPlaceholder: 'Search records...',
    searchDebounceMs: 250,
    emptyMessage: 'No matching records found.'
  };

  private _globalSearch = '';
  private _filtersMap = new Map<string, FilterCriterion>();
  private _sortCriteria: SortCriterion[] = [];

  // Async / Server-Side State
  private _isLoading = false;
  private _abortController: AbortController | null = null;
  private _debounceTimer: any = null;
  private _currentRequestId = 0;

  // DOM Elements
  private containerEl!: HTMLElement;
  private loadingBarEl!: HTMLElement;
  private toolbarEl!: HTMLElement;
  private tableContainerEl!: HTMLElement;
  private tableEl!: HTMLTableElement;
  private theadEl!: HTMLTableSectionElement;
  private tbodyEl!: HTMLTableSectionElement;

  constructor() {
    super();
  }

  get rows(): T[] {
    return this._rows;
  }
  set rows(val: T[]) {
    this._rows = Array.isArray(val) ? val : [];
    this.renderBody();
  }

  get columns(): FilterableColumnDef<T>[] {
    return this._columns;
  }
  set columns(val: FilterableColumnDef<T>[]) {
    this._columns = Array.isArray(val) ? val : [];
    this.render();
  }

  get options(): FilterableTableOptions<T> {
    return this._options;
  }
  set options(opts: Partial<FilterableTableOptions<T>>) {
    this._options = { ...this._options, ...opts };
    if (this._options.density) {
      this.setAttribute('density', this._options.density);
    }
    if (this._options.serverSide && this._options.serverDataLoader) {
      this.triggerServerFetch();
    } else {
      this.render();
    }
  }

  get activeFilterCount(): number {
    let count = 0;
    this._filtersMap.forEach((f) => {
      if (isFilterActive(f.value)) count++;
    });
    return count;
  }

  connectedCallback(): void {
    if (!this.containerEl) {
      this.initDOM();
    }
    if (this._options.density) {
      this.setAttribute('density', this._options.density);
    }
    if (this._options.serverSide && this._options.serverDataLoader) {
      this.triggerServerFetch();
    } else {
      this.render();
    }
  }

  disconnectedCallback(): void {
    if (this._abortController) this._abortController.abort();
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
  }

  attributeChangedCallback(name: string, _oldVal: string, newVal: string): void {
    if (name === 'density' && newVal) {
      this._options.density = newVal as Density;
    }
  }

  private initDOM(): void {
    this.containerEl = createElement('div', 'ft-wrapper');
    this.loadingBarEl = createElement('div', 'ft-loading-bar');
    this.loadingBarEl.style.display = 'none';

    this.toolbarEl = createElement('div', 'ft-toolbar');
    this.tableContainerEl = createElement('div', 'ft-table-container');
    this.tableEl = createElement('table', 'ft-table');
    this.theadEl = createElement('thead', 'ft-thead');
    this.tbodyEl = createElement('tbody', 'ft-tbody');

    this.tableEl.appendChild(this.theadEl);
    this.tableEl.appendChild(this.tbodyEl);
    this.tableContainerEl.appendChild(this.tableEl);

    this.containerEl.appendChild(this.loadingBarEl);
    this.containerEl.appendChild(this.toolbarEl);
    this.containerEl.appendChild(this.tableContainerEl);
    this.appendChild(this.containerEl);
  }

  private dispatchGridEvent<K extends keyof FilterableTableEventPayloads<T>>(
    eventName: K,
    detail: FilterableTableEventPayloads<T>[K]
  ): void {
    this.dispatchEvent(
      new CustomEvent(eventName, {
        detail,
        bubbles: true,
        composed: true
      })
    );
  }

  public setFilter(columnId: string, value: any): void {
    const col = this._columns.find((c) => c.id === columnId);
    if (!col || !col.filter) return;

    this._filtersMap.set(columnId, {
      columnId,
      type: col.filter.type,
      value
    });

    this.onFiltersMutated();
  }

  public clearFilter(columnId: string): void {
    this._filtersMap.delete(columnId);
    const remaining = Array.from(this._filtersMap.values()).filter((f) => isFilterActive(f.value));
    this.dispatchGridEvent('filter-table:filter-clear', { columnId, remainingFilters: remaining });
    this.onFiltersMutated();
  }

  public clearAllFilters(): void {
    this._filtersMap.clear();
    this._globalSearch = '';
    const searchInput = this.toolbarEl.querySelector('.ft-search-input') as HTMLInputElement;
    if (searchInput) searchInput.value = '';

    this.dispatchGridEvent('filter-table:filter-clear', { remainingFilters: [] });
    this.onFiltersMutated();
  }

  private onFiltersMutated(): void {
    const activeFilters = Array.from(this._filtersMap.values()).filter((f) => isFilterActive(f.value));
    this.dispatchGridEvent('filter-table:filter-change', {
      filters: activeFilters,
      globalSearch: this._globalSearch,
      activeFilterCount: this.activeFilterCount
    });

    if (this._options.serverSide) {
      if (this._debounceTimer) clearTimeout(this._debounceTimer);
      const delay = this._options.searchDebounceMs ?? 250;
      this._debounceTimer = setTimeout(() => this.triggerServerFetch(), delay);
    } else {
      this.renderToolbar();
      this.renderBody();
    }
  }

  private async triggerServerFetch(): Promise<void> {
    if (!this._options.serverSide || !this._options.serverDataLoader) return;

    if (this._abortController) this._abortController.abort();
    this._abortController = new AbortController();
    const signal = this._abortController.signal;
    const reqId = ++this._currentRequestId;

    this._isLoading = true;
    this.loadingBarEl.style.display = 'block';
    this.dispatchGridEvent('filter-table:loading', { loading: true });

    const activeFilters = Array.from(this._filtersMap.values()).filter((f) => isFilterActive(f.value));

    const params: ServerFilterQueryParams = {
      pageIndex: 0,
      pageSize: this._rows.length || 25,
      globalSearch: this._globalSearch,
      filters: activeFilters,
      sortCriteria: [...this._sortCriteria],
      signal
    };

    try {
      const res = await this._options.serverDataLoader(params);
      if (reqId !== this._currentRequestId || signal.aborted) return;
      this._rows = res.rows;
    } catch (err: any) {
      if (err.name === 'AbortError' || signal.aborted) return;
      this.dispatchGridEvent('filter-table:error', { error: err });
    } finally {
      if (reqId === this._currentRequestId) {
        this._isLoading = false;
        this.loadingBarEl.style.display = 'none';
        this.dispatchGridEvent('filter-table:loading', { loading: false });
        this.renderBody();
      }
    }
  }

  public render(): void {
    if (!this.containerEl) return;
    this.renderToolbar();
    this.renderHeader();
    this.renderBody();
  }

  private renderToolbar(): void {
    removeAllChildren(this.toolbarEl);

    // Left: Global Search
    const left = createElement('div', 'ft-toolbar-left');
    if (this._options.showGlobalSearch !== false) {
      const searchInput = createElement('input', 'ft-search-input', {
        type: 'search',
        placeholder: this._options.searchPlaceholder || 'Search records...',
        value: this._globalSearch,
        'aria-label': 'Search records globally'
      }) as HTMLInputElement;

      searchInput.addEventListener('input', () => {
        this._globalSearch = searchInput.value;
        this.onFiltersMutated();
      });
      left.appendChild(searchInput);
    }

    // Right: Active Filter Badge & Clear All button
    const right = createElement('div', 'ft-toolbar-right');
    const count = this.activeFilterCount;
    if (count > 0 || this._globalSearch.trim().length > 0) {
      const badge = createElement('span', 'ft-badge-filter-count');
      badge.textContent = `${count} filter${count === 1 ? '' : 's'} active`;
      right.appendChild(badge);

      const clearBtn = createElement('button', 'ft-btn-clear-all', { type: 'button' });
      clearBtn.textContent = 'Clear all';
      clearBtn.addEventListener('click', () => this.clearAllFilters());
      right.appendChild(clearBtn);
    }

    this.toolbarEl.appendChild(left);
    this.toolbarEl.appendChild(right);
  }

  private renderHeader(): void {
    removeAllChildren(this.theadEl);

    // Row 1: Column Headers with Sorting
    const trHead = createElement('tr', 'ft-header-row');
    this._columns.forEach((col) => {
      const th = createElement('th', 'ft-th');
      if (col.width) th.style.width = col.width;

      const inner = createElement('div', 'ft-th-inner');
      const title = createElement('span');
      title.textContent = col.header;
      inner.appendChild(title);

      if (col.sortable) {
        th.classList.add('ft-sortable');
        const active = this._sortCriteria.find((c) => c.columnId === col.id);
        const icon = createElement('span', 'ft-sort-icon');
        icon.textContent = active?.direction === 'asc' ? ' ▲' : active?.direction === 'desc' ? ' ▼' : ' ⇅';
        inner.appendChild(icon);

        th.addEventListener('click', () => {
          const cur = this._sortCriteria.find((c) => c.columnId === col.id);
          let next: 'asc' | 'desc' | null = 'asc';
          if (cur && cur.direction === 'asc') next = 'desc';
          else if (cur && cur.direction === 'desc') next = null;

          this._sortCriteria = next ? [{ columnId: col.id, direction: next }] : [];
          this.dispatchGridEvent('filter-table:sort', { criteria: [...this._sortCriteria] });
          if (this._options.serverSide) this.triggerServerFetch();
          else this.render();
        });
      }

      th.appendChild(inner);
      trHead.appendChild(th);
    });
    this.theadEl.appendChild(trHead);

    // Row 2: Per-Column Filter Input Controls
    const trFilter = createElement('tr', 'ft-filter-row');
    this._columns.forEach((col) => {
      const th = createElement('th');
      if (col.width) th.style.width = col.width;

      if (col.filter) {
        const wrap = createElement('div', 'ft-filter-control-wrap');
        this.renderColumnFilterControl(wrap, col);
        th.appendChild(wrap);
      }
      trFilter.appendChild(th);
    });
    this.theadEl.appendChild(trFilter);
  }

  private renderColumnFilterControl(container: HTMLElement, col: FilterableColumnDef<T>): void {
    const fConfig = col.filter!;
    const curVal = this._filtersMap.get(col.id)?.value;

    if (fConfig.customControl) {
      const customEl = fConfig.customControl({
        column: col,
        currentValue: curVal,
        onChange: (val) => this.setFilter(col.id, val),
        onClear: () => this.clearFilter(col.id)
      });
      container.appendChild(customEl);
      return;
    }

    switch (fConfig.type) {
      case 'text': {
        const input = createElement('input', 'ft-input', {
          type: 'search',
          placeholder: fConfig.placeholder || `Filter ${col.header}...`,
          value: curVal || ''
        }) as HTMLInputElement;
        input.addEventListener('input', () => this.setFilter(col.id, input.value));
        container.appendChild(input);
        break;
      }
      case 'select': {
        const select = createElement('select', 'ft-select') as HTMLSelectElement;
        const optDefault = createElement('option');
        optDefault.value = '';
        optDefault.textContent = fConfig.placeholder || 'All';
        select.appendChild(optDefault);

        (fConfig.options || []).forEach((opt) => {
          const o = createElement('option');
          o.value = String(opt.value);
          o.textContent = opt.label;
          if (String(opt.value) === String(curVal)) o.selected = true;
          select.appendChild(o);
        });
        select.addEventListener('change', () => this.setFilter(col.id, select.value));
        container.appendChild(select);
        break;
      }
      case 'number-range': {
        const group = createElement('div', 'ft-range-group');
        const minVal = curVal ? (curVal as any).min : '';
        const maxVal = curVal ? (curVal as any).max : '';

        const minInput = createElement('input', 'ft-input', {
          type: 'number',
          placeholder: 'Min',
          value: minVal != null ? String(minVal) : ''
        }) as HTMLInputElement;

        const maxInput = createElement('input', 'ft-input', {
          type: 'number',
          placeholder: 'Max',
          value: maxVal != null ? String(maxVal) : ''
        }) as HTMLInputElement;

        const updateRange = () => {
          this.setFilter(col.id, { min: minInput.value, max: maxInput.value });
        };
        minInput.addEventListener('input', updateRange);
        maxInput.addEventListener('input', updateRange);

        group.appendChild(minInput);
        group.appendChild(maxInput);
        container.appendChild(group);
        break;
      }
      case 'date-range': {
        const group = createElement('div', 'ft-range-group');
        const startVal = curVal ? (curVal as any).start : '';
        const endVal = curVal ? (curVal as any).end : '';

        const startInput = createElement('input', 'ft-input', {
          type: 'date',
          value: startVal || ''
        }) as HTMLInputElement;

        const endInput = createElement('input', 'ft-input', {
          type: 'date',
          value: endVal || ''
        }) as HTMLInputElement;

        const updateDate = () => {
          this.setFilter(col.id, { start: startInput.value, end: endInput.value });
        };
        startInput.addEventListener('change', updateDate);
        endInput.addEventListener('change', updateDate);

        group.appendChild(startInput);
        group.appendChild(endInput);
        container.appendChild(group);
        break;
      }
    }
  }

  private renderBody(): void {
    removeAllChildren(this.tbodyEl);

    // If client-side mode, run local filtering and sorting
    let rowsToDisplay = this._rows;
    if (!this._options.serverSide) {
      const activeFilters = Array.from(this._filtersMap.values()).filter((f) => isFilterActive(f.value));
      rowsToDisplay = filterRows(this._rows, activeFilters, this._globalSearch, this._columns);

      if (this._sortCriteria.length > 0) {
        const crit = this._sortCriteria[0];
        const col = this._columns.find((c) => c.id === crit.columnId);
        if (col && col.field) {
          rowsToDisplay = [...rowsToDisplay].sort((a, b) => {
            const valA = resolveValue(a, col.field);
            const valB = resolveValue(b, col.field);
            if (valA < valB) return crit.direction === 'asc' ? -1 : 1;
            if (valA > valB) return crit.direction === 'asc' ? 1 : -1;
            return 0;
          });
        }
      }
    }

    if (rowsToDisplay.length === 0) {
      const trEmpty = createElement('tr', 'ft-row');
      const tdEmpty = createElement('td', 'ft-td', { colspan: this._columns.length });
      tdEmpty.style.textAlign = 'center';
      tdEmpty.textContent = this._options.emptyMessage || 'No matching records found.';
      trEmpty.appendChild(tdEmpty);
      this.tbodyEl.appendChild(trEmpty);
      return;
    }

    for (let i = 0; i < rowsToDisplay.length; i++) {
      const row = rowsToDisplay[i];
      const tr = createElement('tr', 'ft-row');

      this._columns.forEach((col) => {
        const td = createElement('td', 'ft-td');
        if (col.width) td.style.width = col.width;
        const val = resolveValue(row, col.field);

        if (col.renderer) {
          const res = col.renderer(val, row, i);
          if (typeof res === 'string') td.innerHTML = res;
          else td.appendChild(res);
        } else if (col.formatter) {
          td.textContent = col.formatter(val, row);
        } else {
          td.textContent = val == null ? '' : String(val);
        }
        tr.appendChild(td);
      });

      this.tbodyEl.appendChild(tr);
    }
  }
}

export function defineFilterableDataTable(tagName = 'filterable-data-table'): void {
  if (typeof window !== 'undefined' && !window.customElements.get(tagName)) {
    window.customElements.define(tagName, FilterableDataTable);
  }
}
