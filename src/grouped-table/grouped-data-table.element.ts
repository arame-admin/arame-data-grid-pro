import {
  Density,
  GroupRecord,
  GroupedTableColumn,
  GroupedTableEventPayloads,
  GroupedTableOptions
} from './types.js';
import {
  buildGroupHierarchy,
  flattenGroups,
  resolveValue
} from './group-engine.js';
import {
  BaseTableController,
  createElement,
  removeAllChildren
} from '../common/base-table-controller.js';

export class GroupedDataTable<T = Record<string, unknown>> extends HTMLElement {
  static get observedAttributes() {
    return ['density'];
  }

  private _rows: T[] = [];
  private _columns: GroupedTableColumn<T>[] = [];
  private _options: GroupedTableOptions<T> = {
    rowIdKey: 'id',
    density: 'comfortable',
    grouping: {
      groupBy: [],
      defaultExpanded: true,
      paginationMode: 'rows',
      showAggregatesInHeader: true
    },
    emptyMessage: 'No matching records found.'
  };

  private _controller!: BaseTableController<T>;
  private _expandedGroups = new Map<string, boolean>();

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

  get columns(): GroupedTableColumn<T>[] {
    return this._columns;
  }
  set columns(val: GroupedTableColumn<T>[]) {
    this._columns = Array.isArray(val) ? val : [];
    this.render();
  }

  get options(): GroupedTableOptions<T> {
    return this._options;
  }
  set options(opts: Partial<GroupedTableOptions<T>>) {
    this._options = {
      ...this._options,
      ...opts,
      grouping: { ...this._options.grouping, ...opts.grouping }
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
    if (this._options.density) {
      this.setAttribute('density', this._options.density);
    }
    this.render();
  }

  attributeChangedCallback(name: string, _oldVal: string, newVal: string): void {
    if (name === 'density' && newVal) {
      this._options.density = newVal as Density;
    }
  }

  private initDOM(): void {
    this.containerEl = createElement('div', 'gt-wrapper');
    this.toolbarEl = createElement('div', 'gt-toolbar');
    this.tableContainerEl = createElement('div', 'gt-table-container');
    this.tableEl = createElement('table', 'gt-table');
    this.theadEl = createElement('thead', 'gt-thead');
    this.tbodyEl = createElement('tbody', 'gt-tbody');
    this.footerEl = createElement('div', 'gt-pagination-footer');

    this.tableEl.appendChild(this.theadEl);
    this.tableEl.appendChild(this.tbodyEl);
    this.tableContainerEl.appendChild(this.tableEl);

    this.containerEl.appendChild(this.toolbarEl);
    this.containerEl.appendChild(this.tableContainerEl);
    this.containerEl.appendChild(this.footerEl);
    this.appendChild(this.containerEl);

    // Initialize BaseTableController for default pagination, sorting, search & serverDataLoader
    this._controller = new BaseTableController<T>(
      () => this._options,
      () => this.render(),
      (name, detail) => this.dispatchGridEvent(name as any, detail)
    );
  }

  private dispatchGridEvent<K extends keyof GroupedTableEventPayloads<T>>(
    eventName: K,
    detail: GroupedTableEventPayloads<T>[K]
  ): void {
    this.dispatchEvent(
      new CustomEvent(eventName, {
        detail,
        bubbles: true,
        composed: true
      })
    );
  }

  public setGroupBy(groupBy: string[]): void {
    this._options.grouping = { ...this._options.grouping, groupBy };
    this._expandedGroups.clear();
    this.dispatchGridEvent('grouped-table:group-change', { groupBy });
    this.render();
  }

  public toggleGroup(group: GroupRecord<T>): void {
    const nextState = !group.expanded;
    this._expandedGroups.set(group.key, nextState);
    this.dispatchGridEvent('grouped-table:group-toggle', {
      groupKey: group.key,
      expanded: nextState,
      level: group.level,
      rowCount: group.rows.length
    });
    this.render();
  }

  public expandAllGroups(): void {
    let count = 0;
    this._expandedGroups.forEach((_, k) => {
      this._expandedGroups.set(k, true);
      count++;
    });
    // Set default expanded for any not yet initialized
    this._options.grouping!.defaultExpanded = true;
    this.dispatchGridEvent('grouped-table:expand-all', { expandedCount: count });
    this.render();
  }

  public collapseAllGroups(): void {
    let count = 0;
    this._expandedGroups.forEach((_, k) => {
      this._expandedGroups.set(k, false);
      count++;
    });
    this._options.grouping!.defaultExpanded = false;
    this.dispatchGridEvent('grouped-table:collapse-all', { collapsedCount: count });
    this.render();
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

    // Left: Search
    const left = createElement('div', 'gt-toolbar-left');
    if (this._options.search?.enabled !== false) {
      const searchInput = createElement('input', 'gt-search-input', {
        type: 'search',
        placeholder: this._options.search?.placeholder || 'Search records...',
        value: this._controller.globalSearch,
        'aria-label': 'Search grouped table'
      }) as HTMLInputElement;

      searchInput.addEventListener('input', () => {
        this._controller.setGlobalSearch(searchInput.value);
      });
      left.appendChild(searchInput);
    }

    // Right: Expand/Collapse All
    const right = createElement('div', 'gt-toolbar-right');
    const groupCols = this._options.grouping?.groupBy || [];
    if (groupCols.length > 0) {
      const expAllBtn = createElement('button', 'gt-btn', { type: 'button' });
      expAllBtn.textContent = 'Expand all';
      expAllBtn.addEventListener('click', () => this.expandAllGroups());

      const colAllBtn = createElement('button', 'gt-btn', { type: 'button' });
      colAllBtn.textContent = 'Collapse all';
      colAllBtn.addEventListener('click', () => this.collapseAllGroups());

      right.appendChild(expAllBtn);
      right.appendChild(colAllBtn);
    }

    this.toolbarEl.appendChild(left);
    this.toolbarEl.appendChild(right);
  }

  private renderHeader(): void {
    removeAllChildren(this.theadEl);
    const tr = createElement('tr', 'gt-header-row');

    this._columns.forEach((col) => {
      const th = createElement('th', 'gt-th');
      if (col.width) th.style.width = col.width;

      const inner = createElement('div', 'gt-th-inner');
      const titleSpan = createElement('span');
      titleSpan.textContent = col.header;
      inner.appendChild(titleSpan);

      const isSortable = col.sortable !== false && this._options.sorting?.enabled !== false;
      if (isSortable) {
        th.classList.add('gt-sortable');
        const active = this._controller.sortCriteria.find((c) => c.columnId === col.id);
        const icon = createElement('span', 'gt-sort-icon');
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

    // 1. Filter, Search, and Sort raw rows
    let processedRows = this._options.serverSide
      ? this._rows
      : this._controller.processClientData(this._rows, this._columns as any);

    const groupCols = this._options.grouping?.groupBy || [];
    const totalCols = this._columns.length;

    // A. Un-grouped fallback
    if (groupCols.length === 0) {
      if (processedRows.length === 0) {
        const tr = createElement('tr', 'gt-row');
        const td = createElement('td', 'gt-td', { colspan: totalCols });
        td.style.textAlign = 'center';
        td.textContent = this._options.emptyMessage || 'No matching records found.';
        tr.appendChild(td);
        this.tbodyEl.appendChild(tr);
        return;
      }

      processedRows.forEach((row, i) => {
        const tr = createElement('tr', 'gt-row');
        this._columns.forEach((col) => {
          const td = createElement('td', 'gt-td');
          if (col.width) td.style.width = col.width;
          const val = resolveValue(row, col.field);
          if (col.formatter) td.textContent = col.formatter(val, row);
          else td.textContent = val == null ? '' : String(val);
          tr.appendChild(td);
        });
        this.tbodyEl.appendChild(tr);
      });
      return;
    }

    // B. Grouped Rendering
    const groupTree = buildGroupHierarchy(
      processedRows,
      groupCols,
      this._columns,
      this._expandedGroups
    );

    if (groupTree.length === 0) {
      const tr = createElement('tr', 'gt-row');
      const td = createElement('td', 'gt-td', { colspan: totalCols });
      td.style.textAlign = 'center';
      td.textContent = this._options.emptyMessage || 'No matching records found.';
      tr.appendChild(td);
      this.tbodyEl.appendChild(tr);
      return;
    }

    const flattened = flattenGroups(groupTree);

    for (const item of flattened) {
      if (item.type === 'group-header') {
        const { group } = item;
        const trGroup = createElement(
          'tr',
          `gt-group-header-row ${group.expanded ? 'gt-group-expanded' : ''}`,
          {
            'data-level': group.level,
            tabindex: '0',
            role: 'row',
            'aria-expanded': group.expanded ? 'true' : 'false'
          }
        );

        trGroup.addEventListener('click', () => this.toggleGroup(group));
        trGroup.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.toggleGroup(group);
          }
        });

        const tdGroup = createElement('td', 'gt-group-header-td', { colspan: totalCols });
        const inner = createElement('div', 'gt-group-header-inner');
        inner.style.paddingLeft = `${group.level * 1.5}rem`;

        const chevron = createElement('span', 'gt-group-chevron');
        chevron.textContent = '▶';
        inner.appendChild(chevron);

        const groupColDef = this._columns.find((c) => c.id === group.columnId);
        const groupLabel = createElement('span');
        groupLabel.textContent = `${groupColDef?.header || group.columnId}: ${group.value}`;
        inner.appendChild(groupLabel);

        const badge = createElement('span', 'gt-group-badge-count');
        badge.textContent = `${group.rows.length} records`;
        inner.appendChild(badge);

        // Aggregates rendered inline in group header
        if (this._options.grouping?.showAggregatesInHeader !== false) {
          const aggContainer = createElement('div', 'gt-group-aggregates');
          this._columns.forEach((col) => {
            if (col.aggregate && group.aggregates[col.id] !== undefined) {
              const aggItem = createElement('span', 'gt-aggregate-item');
              const val = group.aggregates[col.id];
              const formattedVal = col.aggregate.formatter
                ? col.aggregate.formatter(val)
                : typeof val === 'number'
                ? val.toLocaleString(undefined, { maximumFractionDigits: 2 })
                : val;
              aggItem.innerHTML = `${col.aggregate.label || col.aggregate.type.toUpperCase()}: <strong>${formattedVal}</strong>`;
              aggContainer.appendChild(aggItem);
            }
          });
          inner.appendChild(aggContainer);
        }

        tdGroup.appendChild(inner);
        trGroup.appendChild(tdGroup);
        this.tbodyEl.appendChild(trGroup);
      } else {
        // Data Row
        const { row, group } = item;
        const tr = createElement('tr', 'gt-row');

        this._columns.forEach((col, idx) => {
          const td = createElement('td', 'gt-td');
          if (col.width) td.style.width = col.width;

          // Indent the first column according to group nesting level
          if (idx === 0) {
            td.style.paddingLeft = `calc(var(--gt-cell-px) + ${(group.level + 1) * 1.5}rem)`;
          }

          const val = resolveValue(row, col.field);
          if (col.renderer) {
            const res = col.renderer(val, row, 0);
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

  private renderFooter(): void {
    this._controller.renderPaginationFooter(this.footerEl);
  }
}

export function defineGroupedDataTable(tagName = 'grouped-data-table'): void {
  if (typeof window !== 'undefined' && !window.customElements.get(tagName)) {
    window.customElements.define(tagName, GroupedDataTable);
  }
}
