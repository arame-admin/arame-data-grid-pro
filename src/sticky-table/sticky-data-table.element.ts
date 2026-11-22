import {
  Density,
  StickyTableColumn,
  StickyTableEventPayloads,
  StickyTableOptions
} from './types.js';
import {
  BaseTableController,
  createElement,
  removeAllChildren,
  resolveValue
} from '../common/base-table-controller.js';

export class StickyDataTable<T = Record<string, unknown>> extends HTMLElement {
  static get observedAttributes() {
    return ['sticky-first-column', 'density', 'dir'];
  }

  private _rows: T[] = [];
  private _columns: StickyTableColumn<T>[] = [];
  private _options: StickyTableOptions<T> = {
    rowIdKey: 'id',
    stickyFirstColumn: true,
    stickyColumnWidth: '220px',
    selectable: false,
    multiSelect: true,
    density: 'comfortable',
    emptyMessage: 'No records available.'
  };

  private _controller!: BaseTableController<T>;
  private _selectedIds = new Set<string | number>();
  private _isScrolled = false;

  // DOM Elements
  private containerEl!: HTMLElement;
  private toolbarEl!: HTMLElement;
  private viewportEl!: HTMLElement;
  private tableEl!: HTMLTableElement;
  private theadEl!: HTMLTableSectionElement;
  private tbodyEl!: HTMLTableSectionElement;
  private footerEl!: HTMLElement;

  // Listeners & Observers
  private scrollHandler?: (e: Event) => void;
  private activeResizingCol?: { col: StickyTableColumn<T>; startX: number; startWidth: number; thEl: HTMLElement } | null = null;
  private onMouseMoveHandler?: (e: MouseEvent) => void;
  private onMouseUpHandler?: () => void;

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

  get columns(): StickyTableColumn<T>[] {
    return this._columns;
  }
  set columns(val: StickyTableColumn<T>[]) {
    this._columns = Array.isArray(val) ? val : [];
    this.render();
  }

  get options(): StickyTableOptions<T> {
    return this._options;
  }
  set options(opts: Partial<StickyTableOptions<T>>) {
    this._options = { ...this._options, ...opts };
    this.syncAttributes();
    if (this._controller && this._options.serverSide && this._options.serverDataLoader) {
      this._controller.triggerServerLoad();
    } else {
      this.render();
    }
  }

  connectedCallback(): void {
    if (!this.containerEl) {
      this.initDOM();
    }
    this.syncAttributes();
    this.setupEventListeners();
    this.render();
  }

  disconnectedCallback(): void {
    if (this.scrollHandler && this.viewportEl) {
      this.viewportEl.removeEventListener('scroll', this.scrollHandler);
    }
    if (this.onMouseMoveHandler) {
      window.removeEventListener('mousemove', this.onMouseMoveHandler);
    }
    if (this.onMouseUpHandler) {
      window.removeEventListener('mouseup', this.onMouseUpHandler);
    }
  }

  attributeChangedCallback(name: string, _oldVal: string, newVal: string): void {
    if (name === 'sticky-first-column') {
      this._options.stickyFirstColumn = newVal !== 'false';
      this.render();
    }
    if (name === 'density' && newVal) {
      this._options.density = newVal as Density;
    }
  }

  private syncAttributes(): void {
    this.setAttribute('sticky-first-column', this._options.stickyFirstColumn !== false ? 'true' : 'false');
    if (this._options.density) {
      this.setAttribute('density', this._options.density);
    }
  }

  private initDOM(): void {
    this.containerEl = createElement('div', 'st-wrapper');
    this.toolbarEl = createElement('div', 'st-toolbar');
    this.viewportEl = createElement('div', 'st-scroll-viewport');
    this.tableEl = createElement('table', 'st-table');
    this.theadEl = createElement('thead', 'st-thead');
    this.tbodyEl = createElement('tbody', 'st-tbody');
    this.footerEl = createElement('div', 'st-pagination-footer');

    this.tableEl.appendChild(this.theadEl);
    this.tableEl.appendChild(this.tbodyEl);
    this.viewportEl.appendChild(this.tableEl);

    this.containerEl.appendChild(this.toolbarEl);
    this.containerEl.appendChild(this.viewportEl);
    this.containerEl.appendChild(this.footerEl);
    this.appendChild(this.containerEl);

    this._controller = new BaseTableController<T>(
      () => this._options,
      () => this.render(),
      (name, detail) => this.forwardControllerEvent(name, detail)
    );
  }

  private forwardControllerEvent(name: string, detail: unknown): void {
    const map: Record<string, keyof StickyTableEventPayloads<T>> = {
      'table:page': 'sticky-table:page',
      'table:sort': 'sticky-table:sort',
      'table:search': 'sticky-table:search',
      'table:loading': 'sticky-table:loading',
      'table:error': 'sticky-table:error'
    };
    const mapped = map[name];
    if (mapped) {
      this.dispatchTableEvent(mapped, detail as StickyTableEventPayloads<T>[typeof mapped]);
    }
  }

  private setupEventListeners(): void {
    this.scrollHandler = () => {
      const scrollPos = Math.abs(this.viewportEl.scrollLeft);
      const isScrolledNow = scrollPos > 2;
      if (this._isScrolled !== isScrolledNow) {
        this._isScrolled = isScrolledNow;
        if (this._isScrolled) {
          this.viewportEl.classList.add('st-is-scrolled');
        } else {
          this.viewportEl.classList.remove('st-is-scrolled');
        }
        this.dispatchTableEvent('sticky-table:scroll', {
          scrollLeft: this.viewportEl.scrollLeft,
          isScrolled: this._isScrolled
        });
      }
    };
    this.viewportEl.addEventListener('scroll', this.scrollHandler, { passive: true });

    // Global resize listeners
    this.onMouseMoveHandler = (e: MouseEvent) => {
      if (!this.activeResizingCol) return;
      const isRTL = this.isRTL();
      const deltaX = (e.clientX - this.activeResizingCol.startX) * (isRTL ? -1 : 1);
      const newWidth = Math.max(
        this.activeResizingCol.col.minWidth || 80,
        this.activeResizingCol.startWidth + deltaX
      );
      this.activeResizingCol.col.width = `${newWidth}px`;
      this.activeResizingCol.thEl.style.width = `${newWidth}px`;
      this.activeResizingCol.thEl.style.minWidth = `${newWidth}px`;

      this.dispatchTableEvent('sticky-table:column-resize', {
        columnId: this.activeResizingCol.col.id,
        width: newWidth
      });
    };

    this.onMouseUpHandler = () => {
      if (this.activeResizingCol) {
        document.body.classList.remove('st-resizing');
        this.activeResizingCol = null;
        this.renderBody(); // Re-render body cells with updated widths
      }
    };

    window.addEventListener('mousemove', this.onMouseMoveHandler);
    window.addEventListener('mouseup', this.onMouseUpHandler);
  }

  private isRTL(): boolean {
    return this.getAttribute('dir') === 'rtl' || document.documentElement.dir === 'rtl';
  }

  private dispatchTableEvent<K extends keyof StickyTableEventPayloads<T>>(
    eventName: K,
    detail: StickyTableEventPayloads<T>[K]
  ): void {
    this.dispatchEvent(
      new CustomEvent(eventName, {
        detail,
        bubbles: true,
        composed: true
      })
    );
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

    const searchInput = createElement('input', 'st-search-input', {
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
    const tr = createElement('tr', 'st-header-row');

    const isSticky = this._options.stickyFirstColumn !== false;

    // Selection Header Column (if enabled, selection column becomes the sticky column)
    if (this._options.selectable) {
      const thSel = createElement('th', `st-th st-th-select ${isSticky ? 'st-col-sticky' : ''}`);
      thSel.style.width = '48px';
      thSel.style.minWidth = '48px';

      if (this._options.multiSelect) {
        const chk = createElement('input', 'st-checkbox', {
          type: 'checkbox',
          'aria-label': 'Select all rows'
        }) as HTMLInputElement;
        const rows = this._rows;
        chk.checked = rows.length > 0 && this._selectedIds.size === rows.length;
        chk.indeterminate = this._selectedIds.size > 0 && this._selectedIds.size < rows.length;
        chk.addEventListener('change', () => {
          if (chk.checked) {
            rows.forEach((r) => this._selectedIds.add(this.getRowId(r)));
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

    // Column Headers
    this._columns.forEach((col, idx) => {
      // If selectable is false, the first user column (idx === 0) is sticky
      const isThisStickyCol = isSticky && !this._options.selectable && idx === 0;
      const th = createElement(
        'th',
        `st-th ${isThisStickyCol ? 'st-col-sticky' : ''}`
      );

      const targetWidth = col.width || (isThisStickyCol ? this._options.stickyColumnWidth || '220px' : '160px');
      th.style.width = targetWidth;
      th.style.minWidth = `${col.minWidth || 80}px`;

      const inner = createElement('div', 'st-th-inner');
      const titleSpan = createElement('span', 'st-th-title');
      titleSpan.textContent = col.header;
      inner.appendChild(titleSpan);

      const isSortable = col.sortable !== false && this._options.sorting?.enabled !== false;
      if (isSortable) {
        th.classList.add('st-sortable');
        const activeSort = this._controller.sortCriteria.find((c) => c.columnId === col.id);
        const icon = createElement('span', 'st-sort-icon');
        icon.textContent = activeSort?.direction === 'asc' ? ' ▲' : activeSort?.direction === 'desc' ? ' ▼' : ' ⇅';
        inner.appendChild(icon);

        th.addEventListener('click', () => {
          this._controller.handleSort(col.id, this._columns as any);
        });
      }

      th.appendChild(inner);

      // Column Resizing
      if (col.resizable !== false) {
        const resizer = createElement('div', 'st-resizer');
        resizer.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          e.preventDefault();
          document.body.classList.add('st-resizing');
          this.activeResizingCol = {
            col,
            startX: e.clientX,
            startWidth: th.getBoundingClientRect().width,
            thEl: th
          };
        });
        th.appendChild(resizer);
      }

      tr.appendChild(th);
    });

    this.theadEl.appendChild(tr);
  }

  private renderBody(): void {
    removeAllChildren(this.tbodyEl);
    const rowsToDisplay = this._options.serverSide
      ? this._rows
      : this._controller.processClientData(this._rows, this._columns as any);

    if (rowsToDisplay.length === 0) {
      const trEmpty = createElement('tr', 'st-row st-row-empty');
      const tdEmpty = createElement('td', 'st-td', {
        colspan: this._columns.length + (this._options.selectable ? 1 : 0)
      });
      tdEmpty.style.textAlign = 'center';
      tdEmpty.textContent = this._options.emptyMessage || 'No records available.';
      trEmpty.appendChild(tdEmpty);
      this.tbodyEl.appendChild(trEmpty);
      return;
    }

    const isSticky = this._options.stickyFirstColumn !== false;

    for (let i = 0; i < rowsToDisplay.length; i++) {
      const row = rowsToDisplay[i];
      const rowId = this.getRowId(row);
      const isSelected = this._selectedIds.has(rowId);

      const tr = createElement('tr', `st-row ${isSelected ? 'st-row-selected' : ''}`);
      tr.setAttribute('data-row-id', String(rowId));

      // Selection Body Cell
      if (this._options.selectable) {
        const tdSel = createElement('td', `st-td st-td-select ${isSticky ? 'st-col-sticky' : ''}`);
        tdSel.style.width = '48px';
        tdSel.style.minWidth = '48px';

        const chk = createElement('input', 'st-checkbox', {
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

      // Column Values
      this._columns.forEach((col, idx) => {
        const isThisStickyCol = isSticky && !this._options.selectable && idx === 0;
        const td = createElement(
          'td',
          `st-td ${isThisStickyCol ? 'st-col-sticky' : ''}`
        );

        if (col.width) {
          td.style.width = col.width;
          td.style.minWidth = col.width;
        }

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

  private getRowId(row: T): string | number {
    const key = (this._options.rowIdKey as keyof T) || 'id';
    return (row as any)[key] ?? JSON.stringify(row);
  }

  private dispatchSelection(): void {
    const selectedRows = this._rows.filter((r) => this._selectedIds.has(this.getRowId(r)));
    this.dispatchTableEvent('sticky-table:select', {
      selectedIds: Array.from(this._selectedIds),
      selectedRows
    });
  }
}

export function defineStickyDataTable(tagName = 'sticky-data-table'): void {
  if (typeof window !== 'undefined' && !window.customElements.get(tagName)) {
    window.customElements.define(tagName, StickyDataTable);
  }
}