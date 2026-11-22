import {
  ContextMenuColumnDef,
  ContextMenuTableEventPayloads,
  ContextMenuTableOptions,
  Density,
  RowContextMenuItem
} from './types.js';
import {
  BaseTableController,
  createElement,
  removeAllChildren,
  resolveValue
} from '../common/base-table-controller.js';

export class ContextMenuDataTable<T = Record<string, unknown>> extends HTMLElement {
  static get observedAttributes() {
    return ['density'];
  }

  private _rows: T[] = [];
  private _columns: ContextMenuColumnDef<T>[] = [];
  private _options: ContextMenuTableOptions<T> = {
    rowIdKey: 'id',
    density: 'comfortable',
    enableColumnHeaderMenu: true,
    rowContextMenu: {
      enabled: true,
      showActionButton: true,
      items: []
    },
    emptyMessage: 'No matching records found.'
  };

  private _controller!: BaseTableController<T>;
  private _visibleMap = new Map<string, boolean>();

  // Active Menu State
  private _activeMenu: {
    type: 'header' | 'row';
    el: HTMLElement;
    targetId: string | number;
  } | null = null;

  // DOM Elements
  private containerEl!: HTMLElement;
  private toolbarEl!: HTMLElement;
  private tableContainerEl!: HTMLElement;
  private tableEl!: HTMLTableElement;
  private theadEl!: HTMLTableSectionElement;
  private tbodyEl!: HTMLTableSectionElement;
  private footerEl!: HTMLElement;
  private menuPopupEl!: HTMLElement;

  private onDocumentClickListener?: (e: MouseEvent) => void;
  private onKeyDownListener?: (e: KeyboardEvent) => void;

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

  get columns(): ContextMenuColumnDef<T>[] {
    return this._columns;
  }
  set columns(val: ContextMenuColumnDef<T>[]) {
    this._columns = Array.isArray(val) ? val : [];
    this.initVisibility();
    this.render();
  }

  get options(): ContextMenuTableOptions<T> {
    return this._options;
  }
  set options(opts: Partial<ContextMenuTableOptions<T>>) {
    this._options = {
      ...this._options,
      ...opts,
      rowContextMenu: { ...this._options.rowContextMenu, ...opts.rowContextMenu }
    };
    if (this._options.density) {
      this.setAttribute('density', this._options.density);
    }
    if (this._options.serverSide && this._options.serverDataLoader) {
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
    if (this.onDocumentClickListener) document.removeEventListener('click', this.onDocumentClickListener);
    if (this.onKeyDownListener) document.removeEventListener('keydown', this.onKeyDownListener);
  }

  attributeChangedCallback(name: string, _oldVal: string, newVal: string): void {
    if (name === 'density' && newVal) {
      this._options.density = newVal as Density;
    }
  }

  private initVisibility(): void {
    this._visibleMap.clear();
    this._columns.forEach((col) => {
      this._visibleMap.set(col.id, col.required ? true : col.visible !== false);
    });
  }

  private initDOM(): void {
    this.containerEl = createElement('div', 'cmt-wrapper');
    this.toolbarEl = createElement('div', 'cmt-toolbar');
    this.tableContainerEl = createElement('div', 'cmt-table-container');
    this.tableEl = createElement('table', 'cmt-table');
    this.theadEl = createElement('thead', 'cmt-thead');
    this.tbodyEl = createElement('tbody', 'cmt-tbody');
    this.footerEl = createElement('div', 'cmt-pagination-footer');

    this.tableEl.appendChild(this.theadEl);
    this.tableEl.appendChild(this.tbodyEl);
    this.tableContainerEl.appendChild(this.tableEl);

    this.menuPopupEl = createElement('div', 'cmt-menu-popup', { role: 'menu', tabindex: '-1' });

    this.containerEl.appendChild(this.toolbarEl);
    this.containerEl.appendChild(this.tableContainerEl);
    this.containerEl.appendChild(this.footerEl);
    this.containerEl.appendChild(this.menuPopupEl);
    this.appendChild(this.containerEl);

    this._controller = new BaseTableController<T>(
      () => this._options,
      () => {
        this.closeActiveMenu();
        this.render();
      },
      (name, detail) => this.dispatchGridEvent(name as any, detail)
    );
  }

  private setupListeners(): void {
    this.onDocumentClickListener = (e: MouseEvent) => {
      if (this._activeMenu && !this.menuPopupEl.contains(e.target as Node)) {
        this.closeActiveMenu();
      }
    };
    document.addEventListener('click', this.onDocumentClickListener);

    this.onKeyDownListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this._activeMenu) {
        this.closeActiveMenu();
      }
    };
    document.addEventListener('keydown', this.onKeyDownListener);
  }

  private dispatchGridEvent<K extends keyof ContextMenuTableEventPayloads<T>>(
    eventName: K,
    detail: ContextMenuTableEventPayloads<T>[K]
  ): void {
    this.dispatchEvent(
      new CustomEvent(eventName, {
        detail,
        bubbles: true,
        composed: true
      })
    );
  }

  public closeActiveMenu(): void {
    this._activeMenu = null;
    this.menuPopupEl.classList.remove('cmt-open');
    removeAllChildren(this.menuPopupEl);
  }

  // --- Open Column Header Menu ---
  public openHeaderMenu(column: ContextMenuColumnDef<T>, triggerBtn: HTMLElement): void {
    this.closeActiveMenu();
    this.dispatchGridEvent('menu-table:header-menu-open', { columnId: column.id });

    removeAllChildren(this.menuPopupEl);

    // 1. Sort Actions
    if (column.sortable !== false) {
      const sortAscBtn = createElement('button', 'cmt-menu-item', { type: 'button' });
      sortAscBtn.innerHTML = '▲ Sort Ascending';
      sortAscBtn.addEventListener('click', () => {
        this._controller.sortCriteria = [{ columnId: column.id, direction: 'asc' }];
        this._controller.handleSort(column.id, this._columns as any);
        this.closeActiveMenu();
      });

      const sortDescBtn = createElement('button', 'cmt-menu-item', { type: 'button' });
      sortDescBtn.innerHTML = '▼ Sort Descending';
      sortDescBtn.addEventListener('click', () => {
        this._controller.sortCriteria = [{ columnId: column.id, direction: 'desc' }];
        this._controller.handleSort(column.id, this._columns as any);
        this.closeActiveMenu();
      });

      this.menuPopupEl.appendChild(sortAscBtn);
      this.menuPopupEl.appendChild(sortDescBtn);
      this.menuPopupEl.appendChild(createElement('div', 'cmt-menu-separator'));
    }

    // 2. Hide Column Action (if not required)
    if (!column.required) {
      const hideBtn = createElement('button', 'cmt-menu-item', { type: 'button' });
      hideBtn.innerHTML = '👁 Hide this column';
      hideBtn.addEventListener('click', () => {
        this._visibleMap.set(column.id, false);
        this.dispatchGridEvent('menu-table:column-visibility-change', {
          columnId: column.id,
          visible: false,
          visibleColumnIds: this.getVisibleColumns().map((c) => c.id)
        });
        this.closeActiveMenu();
        this.render();
      });
      this.menuPopupEl.appendChild(hideBtn);
      this.menuPopupEl.appendChild(createElement('div', 'cmt-menu-separator'));
    }

    // 3. Custom Header Menu Items
    if (column.headerMenuItems && column.headerMenuItems.length > 0) {
      column.headerMenuItems.forEach((item) => {
        const customBtn = createElement('button', 'cmt-menu-item', {
          type: 'button',
          disabled: Boolean(item.disabled)
        });
        customBtn.textContent = `${item.icon ? item.icon + ' ' : ''}${item.label}`;
        customBtn.addEventListener('click', () => {
          item.action(column, this);
          this.closeActiveMenu();
        });
        this.menuPopupEl.appendChild(customBtn);
      });
      this.menuPopupEl.appendChild(createElement('div', 'cmt-menu-separator'));
    }

    // 4. Built-in "Columns" Visibility Section
    const subhead = createElement('div', 'cmt-menu-subhead');
    subhead.textContent = 'Toggle Columns';
    this.menuPopupEl.appendChild(subhead);

    this._columns.forEach((col) => {
      const isVisible = this._visibleMap.get(col.id) !== false;
      const isReq = col.required === true;

      const chkLabel = createElement('label', 'cmt-menu-chk-item');
      const chk = createElement('input', '', { type: 'checkbox', disabled: isReq }) as HTMLInputElement;
      chk.checked = isVisible;

      chk.addEventListener('change', () => {
        if (isReq) return;
        this._visibleMap.set(col.id, chk.checked);
        this.dispatchGridEvent('menu-table:column-visibility-change', {
          columnId: col.id,
          visible: chk.checked,
          visibleColumnIds: this.getVisibleColumns().map((c) => c.id)
        });
        this.render();
      });

      const span = createElement('span');
      span.textContent = col.header;
      chkLabel.appendChild(chk);
      chkLabel.appendChild(span);

      if (isReq) {
        const b = createElement('span', 'cmt-badge-req');
        b.textContent = 'Required';
        chkLabel.appendChild(b);
      }
      this.menuPopupEl.appendChild(chkLabel);
    });

    // Position menu popup near header trigger button
    const rect = triggerBtn.getBoundingClientRect();
    this.positionMenuPopup(rect.left, rect.bottom + 4);
    this._activeMenu = { type: 'header', el: triggerBtn, targetId: column.id };
  }

  // --- Open Row Context Menu ---
  public openRowContextMenu(row: T, x: number, y: number): void {
    if (this._options.rowContextMenu?.enabled === false) return;
    this.closeActiveMenu();

    const rowId = this.getRowId(row);
    this.dispatchGridEvent('menu-table:row-context-menu-open', {
      rowId,
      row,
      clientX: x,
      clientY: y
    });

    removeAllChildren(this.menuPopupEl);

    const items = this._options.rowContextMenu?.items || [];
    items.forEach((item) => {
      if (item.isSeparator) {
        this.menuPopupEl.appendChild(createElement('div', 'cmt-menu-separator'));
        return;
      }

      const isDisabled = typeof item.disabled === 'function' ? item.disabled(row) : Boolean(item.disabled);
      const btn = createElement('button', `cmt-menu-item ${item.isDestructive ? 'cmt-menu-item-destructive' : ''}`, {
        type: 'button',
        disabled: isDisabled
      });

      btn.textContent = `${item.icon ? item.icon + ' ' : ''}${item.label || ''}`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (item.isDestructive) {
          const msg = typeof item.confirmMessage === 'function' ? item.confirmMessage(row) : (item.confirmMessage || 'Are you sure you want to perform this action?');
          if (!window.confirm(msg)) return;
        }

        this.dispatchGridEvent('menu-table:row-menu-action', {
          actionId: item.id,
          rowId,
          row
        });

        if (item.action) item.action(row, this);
        this.closeActiveMenu();
      });

      this.menuPopupEl.appendChild(btn);
    });

    this.positionMenuPopup(x, y);
    this._activeMenu = { type: 'row', el: this.tableEl, targetId: rowId };
  }

  private positionMenuPopup(x: number, y: number): void {
    this.menuPopupEl.classList.add('cmt-open');
    this.menuPopupEl.style.left = '0px';
    this.menuPopupEl.style.top = '0px';

    const menuW = this.menuPopupEl.offsetWidth || 210;
    const menuH = this.menuPopupEl.offsetHeight || 200;

    const winW = window.innerWidth;
    const winH = window.innerHeight;

    let posX = x;
    let posY = y;

    // Prevent horizontal overflow off-screen
    if (posX + menuW > winW - 10) posX = winW - menuW - 10;
    if (posX < 10) posX = 10;

    // Prevent vertical overflow
    if (posY + menuH > winH - 10) posY = winH - menuH - 10;
    if (posY < 10) posY = 10;

    this.menuPopupEl.style.left = `${posX}px`;
    this.menuPopupEl.style.top = `${posY}px`;

    // Accessible focus to first interactive button
    const firstBtn = this.menuPopupEl.querySelector('button:not(:disabled)') as HTMLElement;
    if (firstBtn) firstBtn.focus();
  }

  private getVisibleColumns(): ContextMenuColumnDef<T>[] {
    return this._columns.filter((col) => this._visibleMap.get(col.id) !== false);
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

    const searchInput = createElement('input', 'cmt-search-input', {
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

  private renderHeader(): void {
    removeAllChildren(this.theadEl);
    const tr = createElement('tr', 'cmt-header-row');
    const visibleCols = this.getVisibleColumns();

    visibleCols.forEach((col) => {
      const th = createElement('th', 'cmt-th');
      if (col.width) th.style.width = col.width;

      const inner = createElement('div', 'cmt-th-inner');

      // Title & Sorting
      const titleSpan = createElement('span', 'cmt-th-title');
      titleSpan.textContent = col.header;

      const isSortable = col.sortable !== false && this._options.sorting?.enabled !== false;
      if (isSortable) {
        titleSpan.addEventListener('click', () => {
          this._controller.handleSort(col.id, this._columns as any);
        });
        const active = this._controller.sortCriteria.find((c) => c.columnId === col.id);
        const icon = createElement('span', 'cmt-sort-icon');
        icon.textContent = active?.direction === 'asc' ? ' ▲' : active?.direction === 'desc' ? ' ▼' : ' ⇅';
        titleSpan.appendChild(icon);
      }
      inner.appendChild(titleSpan);

      // Header Menu Button
      if (this._options.enableColumnHeaderMenu !== false) {
        const menuBtn = createElement('button', 'cmt-th-menu-trigger', {
          type: 'button',
          'aria-label': `${col.header} menu`,
          'aria-haspopup': 'menu'
        });
        menuBtn.innerHTML = '⋮';
        menuBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openHeaderMenu(col, menuBtn);
        });
        inner.appendChild(menuBtn);
      }

      th.appendChild(inner);
      tr.appendChild(th);
    });

    // Row Action Menu Column Spacer Header
    if (this._options.rowContextMenu?.enabled !== false && this._options.rowContextMenu?.showActionButton !== false) {
      const thAction = createElement('th', 'cmt-th cmt-th-actions');
      thAction.style.width = '44px';
      tr.appendChild(thAction);
    }

    this.theadEl.appendChild(tr);
  }

  private renderBody(): void {
    removeAllChildren(this.tbodyEl);
    const visibleCols = this.getVisibleColumns();

    const rowsToDisplay = this._options.serverSide
      ? this._rows
      : this._controller.processClientData(this._rows, this._columns as any);

    if (rowsToDisplay.length === 0) {
      const trEmpty = createElement('tr', 'cmt-row');
      const tdEmpty = createElement('td', 'cmt-td', {
        colspan: visibleCols.length + 1
      });
      tdEmpty.style.textAlign = 'center';
      tdEmpty.textContent = this._options.emptyMessage || 'No matching records found.';
      trEmpty.appendChild(tdEmpty);
      this.tbodyEl.appendChild(trEmpty);
      return;
    }

    for (let i = 0; i < rowsToDisplay.length; i++) {
      const row = rowsToDisplay[i];
      const rowId = this.getRowId(row);
      const tr = createElement('tr', 'cmt-row', { tabindex: '0' });

      // Right-Click Context Menu Trigger (Only suppresses default browser menu when row menu is active)
      if (this._options.rowContextMenu?.enabled !== false && (this._options.rowContextMenu?.items?.length ?? 0) > 0) {
        tr.addEventListener('contextmenu', (e: MouseEvent) => {
          e.preventDefault();
          this.openRowContextMenu(row, e.clientX, e.clientY);
        });
      }

      // Column Values
      visibleCols.forEach((col) => {
        const td = createElement('td', 'cmt-td');
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

      // Accessible Row Action "⋮" Button
      if (this._options.rowContextMenu?.enabled !== false && this._options.rowContextMenu?.showActionButton !== false) {
        const tdAction = createElement('td', 'cmt-td cmt-td-actions');
        const actBtn = createElement('button', 'cmt-row-action-btn', {
          type: 'button',
          'aria-label': `Row actions for ${rowId}`,
          'aria-haspopup': 'menu'
        });
        actBtn.innerHTML = '⋮';
        actBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const rect = actBtn.getBoundingClientRect();
          this.openRowContextMenu(row, rect.left - 150, rect.bottom + 4);
        });
        tdAction.appendChild(actBtn);
        tr.appendChild(tdAction);
      }

      this.tbodyEl.appendChild(tr);
    }
  }

  private renderFooter(): void {
    this._controller.renderPaginationFooter(this.footerEl);
  }

  private getRowId(row: T): string | number {
    const key = (this._options.rowIdKey as keyof T) || 'id';
    return (row as any)[key] ?? JSON.stringify(row);
  }
}

export function defineContextMenuDataTable(tagName = 'context-menu-data-table'): void {
  if (typeof window !== 'undefined' && !window.customElements.get(tagName)) {
    window.customElements.define(tagName, ContextMenuDataTable);
  }
}
