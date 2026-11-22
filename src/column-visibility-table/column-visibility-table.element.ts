import {
  ColumnVisibilityDef,
  ColumnVisibilityEventPayloads,
  ColumnVisibilityTableOptions,
  Density
} from './types.js';
import {
  BaseTableController,
  createElement,
  removeAllChildren,
  resolveValue
} from '../common/base-table-controller.js';

export class ColumnVisibilityTable<T = Record<string, unknown>> extends HTMLElement {
  static get observedAttributes() {
    return ['density'];
  }

  private _rows: T[] = [];
  private _columns: ColumnVisibilityDef<T>[] = [];
  private _options: ColumnVisibilityTableOptions<T> = {
    rowIdKey: 'id',
    density: 'comfortable',
    menuButtonLabel: 'Columns',
    emptyMessage: 'No matching records found.'
  };

  private _controller!: BaseTableController<T>;
  private _visibleMap = new Map<string, boolean>();
  private _isMenuOpen = false;

  // DOM Elements
  private containerEl!: HTMLElement;
  private toolbarEl!: HTMLElement;
  private menuWrapperEl!: HTMLElement;
  private menuBtnEl!: HTMLButtonElement;
  private menuDropdownEl!: HTMLElement;
  private tableContainerEl!: HTMLElement;
  private tableEl!: HTMLTableElement;
  private theadEl!: HTMLTableSectionElement;
  private tbodyEl!: HTMLTableSectionElement;
  private footerEl!: HTMLElement;

  private onDocumentClickHandler?: (e: MouseEvent) => void;
  private onKeyDownHandler?: (e: KeyboardEvent) => void;

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

  get columns(): ColumnVisibilityDef<T>[] {
    return this._columns;
  }
  set columns(val: ColumnVisibilityDef<T>[]) {
    this._columns = Array.isArray(val) ? val : [];
    this.initVisibilityMap();
    this.loadPersistedVisibility();
    this.render();
  }

  get options(): ColumnVisibilityTableOptions<T> {
    return this._options;
  }
  set options(opts: Partial<ColumnVisibilityTableOptions<T>>) {
    this._options = { ...this._options, ...opts };
    if (this._options.density) {
      this.setAttribute('density', this._options.density);
    }
    if (opts.storageKey) {
      this.loadPersistedVisibility();
    }
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
    this.setupListeners();
    this.render();
  }

  disconnectedCallback(): void {
    if (this.onDocumentClickHandler) {
      document.removeEventListener('click', this.onDocumentClickHandler);
    }
    if (this.onKeyDownHandler) {
      document.removeEventListener('keydown', this.onKeyDownHandler);
    }
  }

  attributeChangedCallback(name: string, _oldVal: string, newVal: string): void {
    if (name === 'density' && newVal) {
      this._options.density = newVal as Density;
    }
  }

  private initVisibilityMap(): void {
    this._visibleMap.clear();
    this._columns.forEach((col) => {
      // Required columns are always strictly visible
      const isVis = col.required ? true : col.visible !== false;
      this._visibleMap.set(col.id, isVis);
    });
  }

  private loadPersistedVisibility(): void {
    if (!this._options.storageKey || typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(this._options.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, boolean>;
        this._columns.forEach((col) => {
          if (col.required) {
            this._visibleMap.set(col.id, true);
          } else if (typeof parsed[col.id] === 'boolean') {
            this._visibleMap.set(col.id, parsed[col.id]);
          }
        });
      }
    } catch {
      // Ignore localStorage read errors (e.g. security sandboxes)
    }
  }

  private persistVisibility(): void {
    if (!this._options.storageKey || typeof window === 'undefined') return;
    try {
      const obj: Record<string, boolean> = {};
      this._visibleMap.forEach((v, k) => (obj[k] = v));
      localStorage.setItem(this._options.storageKey, JSON.stringify(obj));
    } catch {
      // Ignore localStorage write errors
    }
  }

  private initDOM(): void {
    this.containerEl = createElement('div', 'cvt-wrapper');
    this.toolbarEl = createElement('div', 'cvt-toolbar');
    this.menuWrapperEl = createElement('div', 'cvt-menu-wrapper');

    this.menuBtnEl = createElement('button', 'cvt-btn', {
      type: 'button',
      'aria-haspopup': 'true',
      'aria-expanded': 'false'
    }) as HTMLButtonElement;

    this.menuDropdownEl = createElement('div', 'cvt-dropdown-menu', {
      role: 'menu',
      'aria-label': 'Select visible columns'
    });

    this.menuWrapperEl.appendChild(this.menuBtnEl);
    this.menuWrapperEl.appendChild(this.menuDropdownEl);

    this.tableContainerEl = createElement('div', 'cvt-table-container');
    this.tableEl = createElement('table', 'cvt-table');
    this.theadEl = createElement('thead', 'cvt-thead');
    this.tbodyEl = createElement('tbody', 'cvt-tbody');
    this.footerEl = createElement('div', 'cvt-pagination-footer');

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
    const map: Record<string, keyof ColumnVisibilityEventPayloads<T>> = {
      'table:page': 'column-visibility:page',
      'table:sort': 'column-visibility:sort',
      'table:search': 'column-visibility:search',
      'table:loading': 'column-visibility:loading',
      'table:error': 'column-visibility:error'
    };
    const mapped = map[name];
    if (mapped) {
      this.dispatchGridEvent(mapped, detail as ColumnVisibilityEventPayloads<T>[typeof mapped]);
    }
  }

  private setupListeners(): void {
    this.menuBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMenu();
    });

    this.onDocumentClickHandler = (e: MouseEvent) => {
      if (this._isMenuOpen && !this.menuWrapperEl.contains(e.target as Node)) {
        this.closeMenu();
      }
    };
    document.addEventListener('click', this.onDocumentClickHandler);

    this.onKeyDownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this._isMenuOpen) {
        this.closeMenu();
        this.menuBtnEl.focus();
      }
    };
    document.addEventListener('keydown', this.onKeyDownHandler);
  }

  private toggleMenu(): void {
    if (this._isMenuOpen) this.closeMenu();
    else this.openMenu();
  }

  private openMenu(): void {
    this._isMenuOpen = true;
    this.menuBtnEl.setAttribute('aria-expanded', 'true');
    this.menuDropdownEl.classList.add('cvt-open');
    this.renderMenu();
  }

  private closeMenu(): void {
    this._isMenuOpen = false;
    this.menuBtnEl.setAttribute('aria-expanded', 'false');
    this.menuDropdownEl.classList.remove('cvt-open');
  }

  private dispatchGridEvent<K extends keyof ColumnVisibilityEventPayloads<T>>(
    eventName: K,
    detail: ColumnVisibilityEventPayloads<T>[K]
  ): void {
    this.dispatchEvent(
      new CustomEvent(eventName, {
        detail,
        bubbles: true,
        composed: true
      })
    );
  }

  public setColumnVisibility(columnId: string, visible: boolean): void {
    const col = this._columns.find((c) => c.id === columnId);
    if (!col || col.required) return; // Prevent hiding required columns

    this._visibleMap.set(columnId, visible);
    this.persistVisibility();

    const visibleIds = this.getVisibleColumns().map((c) => c.id);
    this.dispatchGridEvent('column-visibility:change', {
      columnId,
      visible,
      visibleColumnIds: visibleIds
    });

    this.render();
  }

  public showAllColumns(): void {
    this._columns.forEach((c) => this._visibleMap.set(c.id, true));
    this.persistVisibility();
    this.dispatchGridEvent('column-visibility:reset', {
      visibleColumnIds: this._columns.map((c) => c.id)
    });
    this.render();
  }

  public hideOptionalColumns(): void {
    this._columns.forEach((c) => {
      this._visibleMap.set(c.id, c.required === true);
    });
    this.persistVisibility();
    this.dispatchGridEvent('column-visibility:reset', {
      visibleColumnIds: this.getVisibleColumns().map((c) => c.id)
    });
    this.render();
  }

  private getVisibleColumns(): ColumnVisibilityDef<T>[] {
    return this._columns.filter((c) => this._visibleMap.get(c.id) !== false);
  }

  public render(): void {
    if (!this.containerEl) return;
    this.renderToolbar();
    this.renderMenu();
    this.renderHeader();
    this.renderBody();
    this.renderFooter();
  }

  private renderToolbar(): void {
    removeAllChildren(this.toolbarEl);

    if (this._options.search?.enabled !== false) {
      const searchInput = createElement('input', 'cvt-search-input', {
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

    this.menuBtnEl.innerHTML = `⚙ <span>${this._options.menuButtonLabel || 'Columns'}</span> ▾`;
    this.toolbarEl.appendChild(this.menuWrapperEl);
  }

  private renderFooter(): void {
    this._controller.renderPaginationFooter(this.footerEl);
  }

  private renderMenu(): void {
    removeAllChildren(this.menuDropdownEl);

    // Quick Actions: Show All / Hide Optional
    const actionsRow = createElement('div', 'cvt-menu-actions');
    const showAllBtn = createElement('button', 'cvt-action-btn', { type: 'button' });
    showAllBtn.textContent = 'Show all';
    showAllBtn.addEventListener('click', () => this.showAllColumns());

    const hideOptBtn = createElement('button', 'cvt-action-btn', { type: 'button' });
    hideOptBtn.textContent = 'Hide optional';
    hideOptBtn.addEventListener('click', () => this.hideOptionalColumns());

    actionsRow.appendChild(showAllBtn);
    actionsRow.appendChild(hideOptBtn);
    this.menuDropdownEl.appendChild(actionsRow);

    // List of Checkboxes
    const listEl = createElement('div', 'cvt-menu-list');

    this._columns.forEach((col) => {
      const isVisible = this._visibleMap.get(col.id) !== false;
      const isRequired = col.required === true;

      const item = createElement(
        'label',
        `cvt-menu-item ${isRequired ? 'cvt-item-required' : ''}`
      );

      const chk = createElement('input', 'cvt-menu-checkbox', {
        type: 'checkbox',
        disabled: isRequired
      }) as HTMLInputElement;
      chk.checked = isVisible;

      chk.addEventListener('change', () => {
        this.setColumnVisibility(col.id, chk.checked);
      });

      const labelText = createElement('span');
      labelText.textContent = col.header;

      item.appendChild(chk);
      item.appendChild(labelText);

      if (isRequired) {
        const badge = createElement('span', 'cvt-badge-required');
        badge.textContent = 'Required';
        item.appendChild(badge);
      }

      listEl.appendChild(item);
    });

    this.menuDropdownEl.appendChild(listEl);
  }

  private renderHeader(): void {
    removeAllChildren(this.theadEl);
    const tr = createElement('tr', 'cvt-header-row');
    const visibleCols = this.getVisibleColumns();

    visibleCols.forEach((col) => {
      const th = createElement('th', 'cvt-th');
      if (col.width) th.style.width = col.width;

      const inner = createElement('div', 'cvt-th-inner');
      const title = createElement('span');
      title.textContent = col.header;
      inner.appendChild(title);

      const isSortable = col.sortable !== false && this._options.sorting?.enabled !== false;
      if (isSortable) {
        th.classList.add('cvt-sortable');
        const active = this._controller.sortCriteria.find((c) => c.columnId === col.id);
        const icon = createElement('span', 'cvt-sort-icon');
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
    const visibleCols = this.getVisibleColumns();
    const rows = this._options.serverSide
      ? this._rows
      : this._controller.processClientData(this._rows, this._columns as any);

    if (rows.length === 0) {
      const trEmpty = createElement('tr', 'cvt-row');
      const tdEmpty = createElement('td', 'cvt-td', { colspan: Math.max(1, visibleCols.length) });
      tdEmpty.style.textAlign = 'center';
      tdEmpty.textContent = this._options.emptyMessage || 'No matching records found.';
      trEmpty.appendChild(tdEmpty);
      this.tbodyEl.appendChild(trEmpty);
      return;
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const tr = createElement('tr', 'cvt-row');

      visibleCols.forEach((col) => {
        const td = createElement('td', 'cvt-td');
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

export function defineColumnVisibilityTable(tagName = 'column-visibility-table'): void {
  if (typeof window !== 'undefined' && !window.customElements.get(tagName)) {
    window.customElements.define(tagName, ColumnVisibilityTable);
  }
}