import {
  Density,
  DetailRendererResult,
  ExpandableTableColumn,
  ExpandableTableEventPayloads,
  ExpandableTableOptions
} from './types.js';
import {
  BaseTableController,
  createElement,
  removeAllChildren,
  resolveValue
} from '../common/base-table-controller.js';

export class ExpandableDataTable<T = Record<string, any>> extends HTMLElement {
  static get observedAttributes() {
    return ['density'];
  }

  private _rows: T[] = [];
  private _columns: ExpandableTableColumn<T>[] = [];
  private _options: ExpandableTableOptions<T> = {
    rowIdKey: 'id',
    density: 'comfortable',
    multiExpand: true,
    expandOnRowClick: true,
    ignoreClickSelectors: ['button', 'input', 'a', 'select', 'textarea', '[data-no-expand]'],
    animations: { enabled: true, duration: 200, easing: 'ease-in-out' }
  };

  private _controller!: BaseTableController<T>;
  private _expandedIds = new Set<string | number>();

  // Async detail cache & active request abort controllers
  private _asyncCache = new Map<string | number, DetailRendererResult>();
  private _asyncLoading = new Set<string | number>();
  private _asyncErrors = new Map<string | number, Error>();
  private _abortControllers = new Map<string | number, AbortController>();

  // DOM Elements
  private containerEl!: HTMLElement;
  private toolbarEl!: HTMLElement;
  private tableContainerEl!: HTMLElement;
  private tableEl!: HTMLTableElement;
  private theadEl!: HTMLTableSectionElement;
  private tbodyEl!: HTMLTableSectionElement;
  private footerEl!: HTMLElement;

  constructor() {
    super();
  }

  get rows(): T[] {
    return this._rows;
  }
  set rows(val: T[]) {
    this._rows = Array.isArray(val) ? val : [];
    this.render();
  }

  get columns(): ExpandableTableColumn<T>[] {
    return this._columns;
  }
  set columns(val: ExpandableTableColumn<T>[]) {
    this._columns = Array.isArray(val) ? val : [];
    this.render();
  }

  get options(): ExpandableTableOptions<T> {
    return this._options;
  }
  set options(opts: Partial<ExpandableTableOptions<T>>) {
    this._options = {
      ...this._options,
      ...opts,
      animations: { ...this._options.animations, ...opts.animations }
    };
    if (this._options.density) {
      this.setAttribute('density', this._options.density);
    }
    if (this._controller && this._options.serverSide && this._options.serverDataLoader) {
      this._controller.triggerServerLoad();
    } else {
      this.render();
    }
  }

  get expandedRowIds(): (string | number)[] {
    return Array.from(this._expandedIds);
  }

  connectedCallback(): void {
    if (!this.containerEl) {
      this.initDOM();
    }
    if (this._options.density) {
      this.setAttribute('density', this._options.density);
    }
    this.render();
  }

  disconnectedCallback(): void {
    this._abortControllers.forEach((ctrl) => ctrl.abort());
    this._abortControllers.clear();
  }

  attributeChangedCallback(name: string, _oldVal: string, newVal: string): void {
    if (name === 'density' && newVal) {
      this._options.density = newVal as Density;
    }
  }

  private initDOM(): void {
    this.containerEl = createElement('div', 'xt-wrapper');
    this.toolbarEl = createElement('div', 'xt-toolbar');
    this.tableContainerEl = createElement('div', 'xt-table-container');
    this.tableEl = createElement('table', 'xt-table', { role: 'grid' });
    this.theadEl = createElement('thead', 'xt-thead');
    this.tbodyEl = createElement('tbody', 'xt-tbody');
    this.footerEl = createElement('div', 'xt-pagination-footer');

    this.tableEl.appendChild(this.theadEl);
    this.tableEl.appendChild(this.tbodyEl);
    this.tableContainerEl.appendChild(this.tableEl);

    this.containerEl.appendChild(this.toolbarEl);
    this.containerEl.appendChild(this.tableContainerEl);
    this.containerEl.appendChild(this.footerEl);
    this.appendChild(this.containerEl);

    this._controller = new BaseTableController<T>(
      () => this._options,
      () => this.render(),
      (name, detail) => this.forwardControllerEvent(name, detail)
    );
  }

  private forwardControllerEvent(name: string, detail: unknown): void {
    const map: Record<string, keyof ExpandableTableEventPayloads<T>> = {
      'table:page': 'expandable-table:page',
      'table:sort': 'expandable-table:sort',
      'table:search': 'expandable-table:search',
      'table:loading': 'expandable-table:loading',
      'table:error': 'expandable-table:error'
    };
    const mapped = map[name];
    if (mapped) {
      this.dispatchGridEvent(mapped, detail as ExpandableTableEventPayloads<T>[typeof mapped]);
    }
  }

  private dispatchGridEvent<K extends keyof ExpandableTableEventPayloads<T>>(
    eventName: K,
    detail: ExpandableTableEventPayloads<T>[K]
  ): void {
    this.dispatchEvent(
      new CustomEvent(eventName, {
        detail,
        bubbles: true,
        composed: true
      })
    );
  }

  public toggleRow(rowId: string | number, row?: T): void {
    const isExpanded = this._expandedIds.has(rowId);
    const targetRow = row || this._rows.find((r) => this.getRowId(r) === rowId);
    if (!targetRow) return;

    if (isExpanded) {
      this.collapseRow(rowId, targetRow);
    } else {
      this.expandRow(rowId, targetRow);
    }
  }

  public expandRow(rowId: string | number, row?: T): void {
    const targetRow = row || this._rows.find((r) => this.getRowId(r) === rowId);
    if (!targetRow) return;

    // Single-expansion mode check
    if (!this._options.multiExpand) {
      this._expandedIds.forEach((id) => {
        if (id !== rowId) {
          const otherRow = this._rows.find((r) => this.getRowId(r) === id);
          if (otherRow) {
            this._expandedIds.delete(id);
            this.dispatchGridEvent('expandable-table:collapse', { rowId: id, row: otherRow });
          }
        }
      });
      this._expandedIds.clear();
    }

    this._expandedIds.add(rowId);
    this.dispatchGridEvent('expandable-table:expand', { rowId, row: targetRow });
    this.dispatchGridEvent('expandable-table:toggle', { rowId, expanded: true, row: targetRow });

    // Handle Async Detail Loading
    if (this._options.asyncDetailRenderer && !this._asyncCache.has(rowId)) {
      this.triggerAsyncLoad(rowId, targetRow);
    }

    this.render();
  }

  public collapseRow(rowId: string | number, row?: T): void {
    const targetRow = row || this._rows.find((r) => this.getRowId(r) === rowId);
    if (!targetRow) return;

    if (this._abortControllers.has(rowId)) {
      this._abortControllers.get(rowId)!.abort();
      this._abortControllers.delete(rowId);
    }

    this._expandedIds.delete(rowId);
    this.dispatchGridEvent('expandable-table:collapse', { rowId, row: targetRow });
    this.dispatchGridEvent('expandable-table:toggle', { rowId, expanded: false, row: targetRow });
    this.render();
  }

  private async triggerAsyncLoad(rowId: string | number, row: T): Promise<void> {
    if (!this._options.asyncDetailRenderer) return;

    const ctrl = new AbortController();
    this._abortControllers.set(rowId, ctrl);
    this._asyncLoading.add(rowId);
    this._asyncErrors.delete(rowId);

    this.dispatchGridEvent('expandable-table:async-load-start', { rowId, row });

    try {
      const res = await this._options.asyncDetailRenderer(row, ctrl.signal);
      if (ctrl.signal.aborted) return;
      this._asyncCache.set(rowId, res);
      this.dispatchGridEvent('expandable-table:async-load-success', { rowId, row });
    } catch (err: any) {
      if (err.name === 'AbortError' || ctrl.signal.aborted) return;
      this._asyncErrors.set(rowId, err);
      this.dispatchGridEvent('expandable-table:async-load-error', { rowId, row, error: err });
    } finally {
      this._asyncLoading.delete(rowId);
      this._abortControllers.delete(rowId);
      this.render();
    }
  }

  public render(): void {
    if (!this.containerEl) return;
    this.renderToolbar();
    this.renderHeader();
    this.renderBody();
    this.renderFooter();
  }

  private renderToolbar(): void {
    removeAllChildren(this.toolbarEl);
    if (this._options.search?.enabled === false) return;

    const searchInput = createElement('input', 'xt-search-input', {
      type: 'search',
      placeholder: this._options.search?.placeholder || 'Search records...',
      value: this._controller.globalSearch,
      'aria-label': 'Search records'
    }) as HTMLInputElement;

    searchInput.addEventListener('input', () => {
      this._controller.setGlobalSearch(searchInput.value);
    });
    this.toolbarEl.appendChild(searchInput);
  }

  private renderFooter(): void {
    this._controller.renderPaginationFooter(this.footerEl);
  }

  private renderHeader(): void {
    removeAllChildren(this.theadEl);
    const tr = createElement('tr', 'xt-header-row');

    // Expansion Column Header Spacer
    const thExp = createElement('th', 'xt-th xt-th-expand');
    thExp.style.width = '48px';
    thExp.setAttribute('aria-label', 'Row expansion controls');
    tr.appendChild(thExp);

    this._columns.forEach((col) => {
      const th = createElement('th', 'xt-th');
      if (col.width) th.style.width = col.width;

      const inner = createElement('div', 'xt-th-inner');
      const titleSpan = createElement('span');
      titleSpan.textContent = col.header;
      inner.appendChild(titleSpan);

      const isSortable = col.sortable !== false && this._options.sorting?.enabled !== false;
      if (isSortable) {
        th.classList.add('xt-sortable');
        const active = this._controller.sortCriteria.find((c) => c.columnId === col.id);
        const icon = createElement('span', 'xt-sort-icon');
        icon.textContent = active?.direction === 'asc' ? ' ▲' : active?.direction === 'desc' ? ' ▼' : ' ⇅';
        inner.appendChild(icon);

        th.addEventListener('click', () => {
          this._controller.handleSort(col.id, this._columns as any);
        });
      }

      th.appendChild(inner);
      tr.appendChild(th);
    });

    this.theadEl.appendChild(tr);
  }

  private renderBody(): void {
    removeAllChildren(this.tbodyEl);

    const rows = this._options.serverSide
      ? this._rows
      : this._controller.processClientData(this._rows, this._columns as any);

    if (rows.length === 0) {
      const trEmpty = createElement('tr', 'xt-row');
      const tdEmpty = createElement('td', 'xt-td', {
        colspan: this._columns.length + 1
      });
      tdEmpty.style.textAlign = 'center';
      tdEmpty.textContent = 'No records found.';
      trEmpty.appendChild(tdEmpty);
      this.tbodyEl.appendChild(trEmpty);
      return;
    }

    const totalColSpan = this._columns.length + 1;
    const shouldAnimate =
      this._options.animations?.enabled !== false &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowId = this.getRowId(row);
      const isExpanded = this._expandedIds.has(rowId);

      const tr = createElement('tr', `xt-row ${isExpanded ? 'xt-row-expanded' : ''}`, {
        role: 'row',
        tabindex: '0',
        'aria-expanded': isExpanded ? 'true' : 'false',
        'aria-controls': `xt-detail-${rowId}`
      });

      // Accessible Row Click Handler
      if (this._options.expandOnRowClick !== false) {
        tr.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          const ignoreList = this._options.ignoreClickSelectors || [
            'button',
            'input',
            'a',
            'select',
            'textarea',
            '[data-no-expand]'
          ];
          if (ignoreList.some((selector) => target.closest(selector))) {
            return; // Ignore clicks originating from interactive elements
          }
          this.toggleRow(rowId, row);
        });

        // Accessible Keyboard Enter/Space Expansion
        tr.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.tagName === 'A') return;
            e.preventDefault();
            this.toggleRow(rowId, row);
          }
        });
      }

      // Expansion Indicator Button
      const tdExp = createElement('td', 'xt-td xt-td-expand');
      const expandBtn = createElement('button', 'xt-expand-btn', {
        type: 'button',
        'aria-label': isExpanded ? `Collapse row ${rowId}` : `Expand row ${rowId}`,
        'aria-expanded': isExpanded ? 'true' : 'false'
      });
      expandBtn.innerHTML = '▶';
      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleRow(rowId, row);
      });
      tdExp.appendChild(expandBtn);
      tr.appendChild(tdExp);

      // Data Columns
      this._columns.forEach((col) => {
        const td = createElement('td', 'xt-td');
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

      // Render Expanded Content Drawer Directly Beneath Row
      if (isExpanded) {
        const trDetail = createElement('tr', 'xt-detail-row', {
          id: `xt-detail-${rowId}`,
          role: 'region',
          'aria-label': `Details for row ${rowId}`
        });
        const tdDetail = createElement('td', 'xt-detail-td', { colspan: totalColSpan });
        const wrapper = createElement('div', 'xt-detail-wrapper');

        if (shouldAnimate) {
          wrapper.style.transitionDuration = `${this._options.animations?.duration ?? 200}ms`;
          wrapper.style.transitionTimingFunction = this._options.animations?.easing ?? 'ease-in-out';
        }

        const container = createElement('div', 'xt-detail-content');

        // Check for Async loading, error, or resolved content
        if (this._asyncLoading.has(rowId)) {
          const loadingDiv = createElement('div', 'xt-detail-loading');
          const spinner = createElement('div', 'xt-spinner');
          const span = createElement('span');
          span.textContent = this._options.loadingMessage || 'Loading row details...';
          loadingDiv.appendChild(spinner);
          loadingDiv.appendChild(span);
          container.appendChild(loadingDiv);
        } else if (this._asyncErrors.has(rowId)) {
          const errorDiv = createElement('div', 'xt-detail-error');
          errorDiv.textContent =
            this._options.errorMessage || `Failed to load details: ${this._asyncErrors.get(rowId)?.message}`;
          container.appendChild(errorDiv);
        } else {
          let content: DetailRendererResult | undefined = this._asyncCache.get(rowId);
          if (!content && this._options.detailRenderer) {
            content = this._options.detailRenderer(row);
          }

          if (content) {
            if (typeof content === 'string') container.innerHTML = content;
            else container.appendChild(content);
          }
        }

        wrapper.appendChild(container);
        tdDetail.appendChild(wrapper);
        trDetail.appendChild(tdDetail);
        this.tbodyEl.appendChild(trDetail);
      }
    }
  }

  private getRowId(row: T): string | number {
    const key = (this._options.rowIdKey as keyof T) || 'id';
    return (row as any)[key] ?? JSON.stringify(row);
  }
}

export function defineExpandableDataTable(tagName = 'expandable-data-table'): void {
  if (typeof window !== 'undefined' && !window.customElements.get(tagName)) {
    window.customElements.define(tagName, ExpandableDataTable);
  }
}