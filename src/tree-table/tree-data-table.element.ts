import {
  TreeTableColumn,
  TreeDataOptions,
  TreeNodeMeta,
  FlattenedTreeNode,
  TreeReorderDetail,
  TreeSelectionDetail,
  TreeExpansionDetail
} from './types.js';
import { SortRule } from '../common/base-table-types.js';
import {
  flattenTree,
  toggleNodeSelection,
  reorderTreeNodes,
  exportTreeToCsv,
  defaultIdAccessor,
  defaultChildrenAccessor
} from './tree-engine.js';

export class TreeDataTableElement<T = Record<string, unknown>> extends HTMLElement {
  private _columns: TreeTableColumn<T>[] = [];
  private _roots: T[] = []; // Hierarchical root nodes
  private _expandedIds: Set<string> = new Set();
  private _selectedIds: Set<string> = new Set();

  private _options: TreeDataOptions<T> = {
    stickyParentRows: true,
    treeColumnKey: undefined,
    selection: { enabled: true, mode: 'cascade-all' },
    dragAndDrop: { enabled: true, allowReparenting: true },
    pagination: { enabled: true, pageSize: 10, pageSizeOptions: [5, 10, 25, 50], mode: 'root-nodes' },
    sorting: { enabled: true, initialSort: null },
    search: { enabled: true, placeholder: 'Search tree nodes...' },
    export: { fileName: 'tree-export.csv', includeCollapsedDescendants: false, includeHierarchyPath: true }
  };

  // State
  private _currentPage = 1;
  private _pageSize = 10;
  private _searchTerm = '';
  private _sortRule: SortRule<T> | null = null;
  private _totalItems = 0;
  private _isLoading = false;

  // Drag and Drop State
  private _draggedNodeId: string | null = null;
  private _justDroppedNodeId: string | null = null;

  // DOM Elements
  private _container!: HTMLDivElement;
  private _viewport!: HTMLDivElement;
  private _table!: HTMLTableElement;
  private _thead!: HTMLTableSectionElement;
  private _tbody!: HTMLTableSectionElement;
  private _toolbar!: HTMLDivElement;
  private _searchInput!: HTMLInputElement;
  private _metaBadge!: HTMLElement;
  private _expandAllBtn!: HTMLButtonElement;
  private _collapseAllBtn!: HTMLButtonElement;
  private _exportBtn!: HTMLButtonElement;
  private _paginationBar!: HTMLDivElement;
  private _loadingOverlay!: HTMLDivElement;

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

    if (this._options.defaultExpandedAll) {
      this.expandAll();
    }

    if (this._options.dataLoader) {
      this.fetchServerData();
    } else {
      this.refresh();
    }
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

  get columns(): TreeTableColumn<T>[] {
    return this._columns;
  }

  set columns(cols: TreeTableColumn<T>[]) {
    this._columns = cols || [];
    if (this.isConnected) {
      this.renderHeader();
      this.refresh();
    }
  }

  get data(): T[] {
    return this._roots;
  }

  set data(rows: T[]) {
    this._roots = rows || [];
    if (this.isConnected) {
      this.refresh();
    }
  }

  get options(): TreeDataOptions<T> {
    return this._options;
  }

  set options(opts: Partial<TreeDataOptions<T>>) {
    this._options = {
      ...this._options,
      ...opts,
      selection: { ...this._options.selection, ...opts.selection },
      dragAndDrop: { ...this._options.dragAndDrop, ...opts.dragAndDrop },
      pagination: { ...this._options.pagination, ...opts.pagination },
      sorting: { ...this._options.sorting, ...opts.sorting },
      search: { ...this._options.search, ...opts.search },
      export: { ...this._options.export, ...opts.export }
    };
    if (opts.pagination?.pageSize) this._pageSize = opts.pagination.pageSize;
    if (opts.sorting?.initialSort !== undefined) this._sortRule = opts.sorting.initialSort;

    if (this.isConnected) {
      this.renderHeader();
      this.refresh();
    }
  }

  get expandedIds(): string[] {
    return Array.from(this._expandedIds);
  }

  get selectedIds(): string[] {
    return Array.from(this._selectedIds);
  }

  // --- Tree Controls ---

  public toggleExpand(nodeId: string): void {
    const isExpanded = this._expandedIds.has(nodeId);
    if (isExpanded) {
      this._expandedIds.delete(nodeId);
    } else {
      this._expandedIds.add(nodeId);
    }

    const detail: TreeExpansionDetail<T> = {
      nodeId,
      isExpanded: !isExpanded,
      expandedIds: this.expandedIds
    };
    this.dispatchEvent(new CustomEvent('tree-table:expansion-change', { detail, bubbles: true, composed: true }));

    this.refresh();
  }

  public expandAll(): void {
    const getId = this._options.idAccessor || defaultIdAccessor;
    const getChildren = this._options.childrenAccessor || defaultChildrenAccessor;

    const traverse = (nodes: T[]) => {
      for (const n of nodes) {
        const id = getId(n);
        const children = getChildren(n);
        if (children && children.length > 0) {
          this._expandedIds.add(id);
          traverse(children);
        }
      }
    };

    traverse(this._roots);
    this.refresh();
  }

  public collapseAll(): void {
    this._expandedIds.clear();
    this.refresh();
  }

  public toggleSelect(nodeId: string): void {
    this._selectedIds = toggleNodeSelection(this._roots, nodeId, this._selectedIds, this._options);

    const isSelected = this._selectedIds.has(nodeId);
    const detail: TreeSelectionDetail<T> = {
      selectedIds: this.selectedIds,
      lastToggledId: nodeId,
      isSelected
    };
    this.dispatchEvent(new CustomEvent('tree-table:selection-change', { detail, bubbles: true, composed: true }));

    this.refresh();
  }

  public selectAll(): void {
    const getId = this._options.idAccessor || defaultIdAccessor;
    const getChildren = this._options.childrenAccessor || defaultChildrenAccessor;

    const traverse = (nodes: T[]) => {
      for (const n of nodes) {
        this._selectedIds.add(getId(n));
        const children = getChildren(n);
        if (children) traverse(children);
      }
    };
    traverse(this._roots);
    this.refresh();
  }

  public deselectAll(): void {
    this._selectedIds.clear();
    this.refresh();
  }

  public exportCsv(options?: { fileName?: string; includeHierarchyPath?: boolean }): void {
    const flattened = flattenTree(
      this._roots,
      this._expandedIds,
      this._selectedIds,
      this._searchTerm,
      this._sortRule,
      this._options
    );

    const fileName = options?.fileName || this._options.export?.fileName || 'tree-export.csv';
    const includePath = options?.includeHierarchyPath ?? (this._options.export?.includeHierarchyPath !== false);
    const csvContent = exportTreeToCsv(flattened, this._columns, includePath);

    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    this.dispatchEvent(new CustomEvent('tree-table:export', {
      detail: { fileName, rowCount: flattened.length },
      bubbles: true,
      composed: true
    }));
  }

  // --- Filtering, Sorting & Pagination Controls ---

  public setSearchTerm(term: string): void {
    if (this._searchTerm === term) return;
    this._searchTerm = term;
    if (this._searchInput && this._searchInput.value !== term) {
      this._searchInput.value = term;
    }
    this._currentPage = 1;
    this.refresh();
  }

  public setSortRule(sort: SortRule<T> | null): void {
    this._sortRule = sort;
    this.renderHeader();
    this.refresh();
  }

  public setPage(page: number): void {
    const maxPage = Math.max(1, Math.ceil(this._totalItems / this._pageSize));
    const target = Math.max(1, Math.min(page, maxPage));
    if (this._currentPage === target) return;
    this._currentPage = target;
    this.refresh();
  }

  public setPageSize(size: number): void {
    if (this._pageSize === size) return;
    this._pageSize = size;
    this._currentPage = 1;
    this.refresh();
  }

  // --- Server-side Data Loader ---

  private async fetchServerData(): Promise<void> {
    if (!this._options.dataLoader) return;

    this.setLoading(true);
    try {
      const abortCtrl = new AbortController();
      const response = await this._options.dataLoader({
        page: this._currentPage,
        pageSize: this._pageSize,
        searchTerm: this._searchTerm,
        sortRule: this._sortRule,
        expandedIds: this.expandedIds,
        signal: abortCtrl.signal
      });

      this._roots = response.rows || [];
      this._totalItems = response.totalRootNodes || this._roots.length;
      this.refresh();
    } catch (err) {
      console.error('[tree-table] Error loading data:', err);
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

  // --- Rendering Pipeline ---

  private renderDomStructure(): void {
    const shadow = this.shadowRoot!;
    shadow.innerHTML = `
      <style>
        ${this.getInlineStyles()}
      </style>
      <div class="tree-container">
        <div class="tree-loading-overlay" style="display: none;">
          <div class="tree-spinner"></div>
        </div>

        <div class="tree-toolbar">
          <div class="tree-search-wrapper">
            <svg class="tree-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <input type="text" class="tree-search-input" placeholder="${this._options.search?.placeholder || 'Search tree nodes...'}" />
          </div>
          <div class="tree-toolbar-actions">
            <button class="tree-btn tree-btn-expand-all">Expand all</button>
            <button class="tree-btn tree-btn-collapse-all">Collapse all</button>
            <button class="tree-btn tree-btn-export">Export CSV</button>
            <span class="tree-badge tree-meta-badge">0 items</span>
          </div>
        </div>

        <div class="tree-viewport" tabindex="0" role="region" aria-label="Hierarchical Tree Data Table">
          <table class="tree-table">
            <thead class="tree-thead">
              <tr class="tree-header-tr"></tr>
            </thead>
            <tbody class="tree-tbody"></tbody>
          </table>
        </div>

        <div class="tree-pagination"></div>
      </div>
    `;

    this._container = shadow.querySelector('.tree-container') as HTMLDivElement;
    this._viewport = shadow.querySelector('.tree-viewport') as HTMLDivElement;
    this._table = shadow.querySelector('.tree-table') as HTMLTableElement;
    this._thead = shadow.querySelector('.tree-thead') as HTMLTableSectionElement;
    this._tbody = shadow.querySelector('.tree-tbody') as HTMLTableSectionElement;
    this._toolbar = shadow.querySelector('.tree-toolbar') as HTMLDivElement;
    this._searchInput = shadow.querySelector('.tree-search-input') as HTMLInputElement;
    this._metaBadge = shadow.querySelector('.tree-meta-badge') as HTMLElement;
    this._expandAllBtn = shadow.querySelector('.tree-btn-expand-all') as HTMLButtonElement;
    this._collapseAllBtn = shadow.querySelector('.tree-btn-collapse-all') as HTMLButtonElement;
    this._exportBtn = shadow.querySelector('.tree-btn-export') as HTMLButtonElement;
    this._paginationBar = shadow.querySelector('.tree-pagination') as HTMLDivElement;
    this._loadingOverlay = shadow.querySelector('.tree-loading-overlay') as HTMLDivElement;

    this.renderHeader();
  }

  private setupEventListeners(): void {
    let timer: ReturnType<typeof setTimeout> | null = null;
    this._searchInput.addEventListener('input', (e) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        this.setSearchTerm((e.target as HTMLInputElement).value.trim());
      }, 250);
    });

    this._expandAllBtn.addEventListener('click', () => this.expandAll());
    this._collapseAllBtn.addEventListener('click', () => this.collapseAll());
    this._exportBtn.addEventListener('click', () => this.exportCsv());
  }

  private renderHeader(): void {
    const headerTr = this._thead.querySelector('.tree-header-tr') as HTMLTableRowElement;
    if (!headerTr) return;
    headerTr.innerHTML = '';

    // Selection checkbox column if enabled
    if (this._options.selection?.enabled !== false) {
      const thSelect = document.createElement('th');
      thSelect.className = 'tree-th';
      thSelect.style.width = '42px';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'tree-checkbox';
      checkbox.title = 'Toggle select all';
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) this.selectAll();
        else this.deselectAll();
      });
      thSelect.appendChild(checkbox);
      headerTr.appendChild(thSelect);
    }

    this._columns.forEach(col => {
      const th = document.createElement('th');
      th.className = 'tree-th';
      if (col.width) th.style.width = col.width;
      if (col.minWidth) th.style.minWidth = col.minWidth;
      if (col.align) th.style.textAlign = col.align;

      const inner = document.createElement('div');
      inner.className = 'tree-th-inner';

      const label = document.createElement('span');
      label.textContent = col.header;
      inner.appendChild(label);

      if (col.sortable !== false && this._options.sorting?.enabled !== false) {
        th.classList.add('sortable');
        const sortIcon = document.createElement('span');
        sortIcon.className = 'tree-sort-icon';
        if (this._sortRule?.column === col.key) {
          sortIcon.textContent = this._sortRule.direction === 'asc' ? '▲' : '▼';
        } else {
          sortIcon.textContent = '↕';
          sortIcon.style.opacity = '0.35';
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
      headerTr.appendChild(th);
    });
  }

  private getDisplayRows(): FlattenedTreeNode<T>[] {
    const paginationMode = this._options.pagination?.mode || 'root-nodes';

    // Mode 1: Paginate by Root Nodes (Ensures parent is NEVER separated from its visible descendants)
    if (paginationMode === 'root-nodes' && this._options.pagination?.enabled !== false) {
      const start = (this._currentPage - 1) * this._pageSize;
      const pagedRoots = this._roots.slice(start, start + this._pageSize);
      this._totalItems = this._roots.length;

      return flattenTree(
        pagedRoots,
        this._expandedIds,
        this._selectedIds,
        this._searchTerm,
        this._sortRule,
        this._options
      );
    }

    // Mode 2: Paginate by Flattened Rows
    const allFlattened = flattenTree(
      this._roots,
      this._expandedIds,
      this._selectedIds,
      this._searchTerm,
      this._sortRule,
      this._options
    );

    this._totalItems = allFlattened.length;

    if (this._options.pagination?.enabled !== false) {
      const start = (this._currentPage - 1) * this._pageSize;
      return allFlattened.slice(start, start + this._pageSize);
    }

    return allFlattened;
  }

  private refresh(): void {
    this.renderBodyRows();
    this.renderPaginationBar();
    this.updateMetaInfo();
  }

  private renderBodyRows(): void {
    this._tbody.innerHTML = '';
    const displayRows = this.getDisplayRows();

    if (displayRows.length === 0) {
      const tr = document.createElement('tr');
      tr.className = 'tree-tr';
      const td = document.createElement('td');
      td.className = 'tree-td';
      const colSpan = this._columns.length + (this._options.selection?.enabled !== false ? 1 : 0);
      td.colSpan = colSpan || 1;
      td.style.textAlign = 'center';
      td.style.padding = '2.5rem 1rem';
      td.style.color = 'var(--tree-text-muted)';
      td.textContent = 'No records found';
      tr.appendChild(td);
      this._tbody.appendChild(tr);
      return;
    }

    const treeColKey = this._options.treeColumnKey || (this._columns[0]?.key as string);
    const stickyParentEnabled = this._options.stickyParentRows !== false;
    const dndEnabled = this._options.dragAndDrop?.enabled !== false;

    const fragment = document.createDocumentFragment();

    displayRows.forEach((item, rIdx) => {
      const { data, meta } = item;
      const isDroppedTarget = this._justDroppedNodeId === meta.id;
      const tr = document.createElement('tr');
      tr.className = `tree-tr ${meta.isSelected ? 'selected' : ''} ${isDroppedTarget ? 'tree-drop-success' : ''}`;
      tr.setAttribute('data-node-id', meta.id);
      tr.setAttribute('data-level', String(meta.level));

      // Sticky Parent class if this row has expanded children
      if (stickyParentEnabled && meta.hasChildren && meta.isExpanded) {
        tr.classList.add('sticky-parent');
      }

      // Drag and Drop attributes
      if (dndEnabled) {
        tr.draggable = true;
        this.setupRowDragAndDrop(tr, meta);
      }

      // 1. Selection Cell
      if (this._options.selection?.enabled !== false) {
        const tdSelect = document.createElement('td');
        tdSelect.className = 'tree-td';
        tdSelect.style.width = '42px';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'tree-checkbox';
        checkbox.checked = meta.isSelected;
        checkbox.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleSelect(meta.id);
        });

        tdSelect.appendChild(checkbox);
        tr.appendChild(tdSelect);
      }

      // 2. Data Cells
      this._columns.forEach(col => {
        const td = document.createElement('td');
        td.className = 'tree-td';
        if (col.width) td.style.width = col.width;
        if (col.align) td.style.textAlign = col.align;

        const rawVal = (data as any)[col.key];

        // Is this the tree hierarchy column?
        if (String(col.key) === treeColKey || col.isTreeColumn) {
          const wrapper = document.createElement('div');
          wrapper.className = 'tree-cell-wrapper';

          // Level indentation guides
          for (let i = 0; i < meta.level; i++) {
            const guide = document.createElement('span');
            guide.className = 'tree-indent-guide';
            wrapper.appendChild(guide);
          }

          // Drag Handle
          if (dndEnabled) {
            const handle = document.createElement('span');
            handle.className = 'tree-drag-handle';
            handle.title = 'Drag to reorder';
            handle.innerHTML = '⋮⋮';
            wrapper.appendChild(handle);
          }

          // Expand / Collapse Toggle button
          if (meta.hasChildren) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `tree-expander-btn ${meta.isExpanded ? 'expanded' : ''}`;
            btn.setAttribute('aria-label', meta.isExpanded ? 'Collapse row' : 'Expand row');
            btn.innerHTML = '▶';
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              this.toggleExpand(meta.id);
            });
            wrapper.appendChild(btn);
          } else {
            const placeholder = document.createElement('span');
            placeholder.className = 'tree-expander-placeholder';
            wrapper.appendChild(placeholder);
          }

          // Cell value content
          const content = document.createElement('span');
          if (col.render) {
            const res = col.render(rawVal, data, rIdx, meta);
            if (res instanceof HTMLElement) content.appendChild(res);
            else content.innerHTML = String(res ?? '');
          } else {
            content.textContent = rawVal !== undefined && rawVal !== null ? String(rawVal) : '—';
          }
          wrapper.appendChild(content);
          td.appendChild(wrapper);
        } else {
          // Standard Column
          if (col.render) {
            const res = col.render(rawVal, data, rIdx, meta);
            if (res instanceof HTMLElement) td.appendChild(res);
            else td.innerHTML = String(res ?? '');
          } else {
            td.textContent = rawVal !== undefined && rawVal !== null ? String(rawVal) : '—';
          }
        }

        tr.appendChild(td);
      });

      fragment.appendChild(tr);
    });

    this._tbody.appendChild(fragment);
  }

  private setupRowDragAndDrop(tr: HTMLTableRowElement, meta: TreeNodeMeta<T>): void {
    tr.addEventListener('dragstart', (e) => {
      this._draggedNodeId = meta.id;
      tr.classList.add('dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', meta.id);
      }
    });

    tr.addEventListener('dragend', () => {
      this._draggedNodeId = null;
      tr.classList.remove('dragging');
      this.clearDragOverClasses();
    });

    tr.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!this._draggedNodeId) return;

      if (this._draggedNodeId === meta.id) {
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'none';
        this.clearDragOverClasses();
        tr.classList.add('tree-drag-not-allowed');
        return;
      }

      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      tr.classList.remove('tree-drag-not-allowed');

      const rect = tr.getBoundingClientRect();
      const relY = e.clientY - rect.top;

      this.clearDragOverClasses();

      if (relY < rect.height * 0.25) {
        tr.classList.add('drag-over-before');
      } else if (relY > rect.height * 0.75) {
        tr.classList.add('drag-over-after');
      } else {
        tr.classList.add('drag-over-inside');
      }
    });

    tr.addEventListener('dragleave', () => {
      this.clearDragOverClasses();
    });

    tr.addEventListener('drop', (e) => {
      e.preventDefault();
      const draggedId = this._draggedNodeId;
      const targetId = meta.id;
      this.clearDragOverClasses();
      tr.classList.remove('dragging');

      if (!draggedId || draggedId === targetId) return;

      const rect = tr.getBoundingClientRect();
      const relY = e.clientY - rect.top;
      let position: 'before' | 'inside' | 'after' = 'after';

      if (relY < rect.height * 0.25) position = 'before';
      else if (relY > rect.height * 0.75) position = 'after';
      else position = 'inside';

      this._roots = reorderTreeNodes(this._roots, draggedId, targetId, position, this._options);

      this._justDroppedNodeId = draggedId;
      setTimeout(() => {
        this._justDroppedNodeId = null;
        this._tbody.querySelectorAll('.tree-tr.tree-drop-success').forEach(r => {
          r.classList.remove('tree-drop-success');
        });
      }, 600);

      const detail: TreeReorderDetail<T> = {
        draggedId,
        targetId,
        position,
        updatedTree: this._roots
      };
      this.dispatchEvent(new CustomEvent('tree-table:reorder', { detail, bubbles: true, composed: true }));

      this.refresh();
    });
  }

  private clearDragOverClasses(): void {
    const rows = this._tbody.querySelectorAll('.tree-tr');
    rows.forEach(r => {
      r.classList.remove('drag-over-before', 'drag-over-after', 'drag-over-inside', 'tree-drag-not-allowed');
    });
  }

  private renderPaginationBar(): void {
    if (this._options.pagination?.enabled === false) {
      this._paginationBar.style.display = 'none';
      return;
    }

    this._paginationBar.style.display = 'flex';
    const totalPages = Math.max(1, Math.ceil(this._totalItems / this._pageSize));

    if (this._currentPage > totalPages) {
      this._currentPage = totalPages;
    }

    const start = this._totalItems === 0 ? 0 : (this._currentPage - 1) * this._pageSize + 1;
    const end = Math.min(this._currentPage * this._pageSize, this._totalItems);

    const pageSizeOptions = this._options.pagination?.pageSizeOptions || [5, 10, 25, 50];
    const optionsHtml = pageSizeOptions
      .map(size => `<option value="${size}" ${size === this._pageSize ? 'selected' : ''}>${size} / page</option>`)
      .join('');

    const modeText = this._options.pagination?.mode === 'flattened-rows' ? 'rows' : 'root groups';

    this._paginationBar.innerHTML = `
      <div class="tree-pagination-info">
        Showing <strong>${start}</strong> to <strong>${end}</strong> of <strong>${this._totalItems}</strong> ${modeText}
      </div>
      <div class="tree-pagination-controls">
        <select class="tree-pagination-size-select" aria-label="Page size">
          ${optionsHtml}
        </select>
        <div class="tree-pagination-nav">
          <button class="tree-page-btn prev-btn" ${this._currentPage <= 1 ? 'disabled' : ''}>Previous</button>
          <span class="tree-page-btn active" style="cursor: default;">${this._currentPage}</span>
          <button class="tree-page-btn next-btn" ${this._currentPage >= totalPages ? 'disabled' : ''}>Next</button>
        </div>
      </div>
    `;

    this._paginationBar.querySelector('.prev-btn')?.addEventListener('click', () => this.setPage(this._currentPage - 1));
    this._paginationBar.querySelector('.next-btn')?.addEventListener('click', () => this.setPage(this._currentPage + 1));
    this._paginationBar.querySelector('.tree-pagination-size-select')?.addEventListener('change', (e) => {
      this.setPageSize(Number((e.target as HTMLSelectElement).value));
    });
  }

  private updateMetaInfo(): void {
    if (this._metaBadge) {
      const mode = this._options.pagination?.mode === 'flattened-rows' ? 'visible rows' : 'root groups';
      this._metaBadge.textContent = `${this._totalItems} ${mode}`;
    }
  }

  private getInlineStyles(): string {
    return `
      :host {
        display: block;
        width: 100%;
        --tree-primary: #3b82f6;
        --tree-primary-hover: #2563eb;
        --tree-primary-light: #eff6ff;
        --tree-bg: #ffffff;
        --tree-header-bg: #f8fafc;
        --tree-row-hover: #f1f5f9;
        --tree-row-selected: #eff6ff;
        --tree-row-sticky-bg: #ffffff;
        --tree-row-sticky-hover: #f1f5f9;
        --tree-border-color: #e2e8f0;
        --tree-text-main: #0f172a;
        --tree-text-muted: #64748b;
        --tree-indent-guide: #cbd5e1;
        --tree-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        --tree-font-size: 0.875rem;
        --tree-line-height: 1.25rem;
        --tree-border-radius: 0.5rem;
        --tree-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
        --tree-sticky-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08);
        --tree-transition: 0.15s ease;
      }
      :host([theme="dark"]) {
        --tree-primary: #60a5fa;
        --tree-primary-hover: #3b82f6;
        --tree-primary-light: #1e293b;
        --tree-bg: #0f172a;
        --tree-header-bg: #1e293b;
        --tree-row-hover: #1e293b;
        --tree-row-selected: #1e293b;
        --tree-row-sticky-bg: #0f172a;
        --tree-row-sticky-hover: #1e293b;
        --tree-border-color: #334155;
        --tree-text-main: #f8fafc;
        --tree-text-muted: #94a3b8;
        --tree-indent-guide: #475569;
        --tree-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.3);
        --tree-sticky-shadow: 0 4px 10px rgba(0, 0, 0, 0.45);
      }
      .tree-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        font-family: var(--tree-font-family);
        font-size: var(--tree-font-size);
        line-height: var(--tree-line-height);
        color: var(--tree-text-main);
        background-color: var(--tree-bg);
        border: 1px solid var(--tree-border-color);
        border-radius: var(--tree-border-radius);
        box-shadow: var(--tree-shadow);
        overflow: hidden;
        position: relative;
      }
      .tree-toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        gap: 0.75rem;
        border-bottom: 1px solid var(--tree-border-color);
        background-color: var(--tree-bg);
      }
      .tree-search-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        min-width: 240px;
        max-width: 360px;
        flex: 1;
      }
      .tree-search-icon {
        position: absolute;
        left: 0.625rem;
        width: 1rem;
        height: 1rem;
        color: var(--tree-text-muted);
        pointer-events: none;
      }
      .tree-search-input {
        width: 100%;
        padding: 0.375rem 0.625rem 0.375rem 2rem;
        font-size: var(--tree-font-size);
        border: 1px solid var(--tree-border-color);
        border-radius: 0.375rem;
        outline: none;
        background-color: var(--tree-bg);
        color: var(--tree-text-main);
      }
      .tree-search-input:focus {
        border-color: var(--tree-primary);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
      }
      .tree-toolbar-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .tree-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.35rem 0.75rem;
        font-size: 0.8125rem;
        font-weight: 500;
        border-radius: 0.375rem;
        border: 1px solid var(--tree-border-color);
        background-color: var(--tree-bg);
        color: var(--tree-text-main);
        cursor: pointer;
      }
      .tree-btn:hover:not(:disabled) {
        background-color: var(--tree-row-hover);
      }
      .tree-btn-export {
        color: var(--tree-primary);
        border-color: rgba(59, 130, 246, 0.4);
      }
      .tree-badge {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.5rem;
        border-radius: 9999px;
        background-color: var(--tree-header-bg);
        border: 1px solid var(--tree-border-color);
        font-weight: 500;
        font-size: 0.75rem;
        color: var(--tree-text-muted);
      }
      .tree-viewport {
        overflow-x: auto;
        overflow-y: auto;
        position: relative;
        width: 100%;
        max-height: 580px;
      }
      .tree-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        text-align: left;
      }
      .tree-thead {
        position: sticky;
        top: 0;
        z-index: 30;
        background-color: var(--tree-header-bg);
      }
      .tree-th {
        padding: 0.75rem 1rem;
        font-weight: 600;
        color: var(--tree-text-main);
        background-color: var(--tree-header-bg);
        border-bottom: 1px solid var(--tree-border-color);
        white-space: nowrap;
        user-select: none;
      }
      .tree-th.sortable {
        cursor: pointer;
      }
      .tree-th-inner {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
      }
      .tree-sort-icon {
        font-size: 0.75rem;
        color: var(--tree-text-muted);
      }
      .tree-tr {
        background-color: var(--tree-bg);
        transition: background-color var(--tree-transition), box-shadow 0.15s ease, opacity 0.15s ease, transform 0.15s ease;
      }
      .tree-tr:hover {
        background-color: var(--tree-row-hover);
      }
      .tree-tr.selected {
        background-color: var(--tree-row-selected) !important;
      }
      .tree-tr.sticky-parent {
        position: sticky;
        top: 41px;
        z-index: 20;
        background-color: var(--tree-row-sticky-bg) !important;
        box-shadow: var(--tree-sticky-shadow);
      }
      .tree-tr.dragging {
        opacity: 0.65;
        background-color: var(--tree-row-hover) !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px var(--tree-primary);
      }
      .tree-tr.drag-over-before {
        position: relative;
        background-color: rgba(59, 130, 246, 0.05);
      }
      .tree-tr.drag-over-before::before {
        content: '';
        position: absolute;
        top: -2px;
        left: 0;
        right: 0;
        height: 3px;
        background-color: var(--tree-primary);
        box-shadow: 0 0 6px var(--tree-primary);
        z-index: 15;
        pointer-events: none;
        border-radius: 2px;
      }
      .tree-tr.drag-over-after {
        position: relative;
        background-color: rgba(59, 130, 246, 0.05);
      }
      .tree-tr.drag-over-after::after {
        content: '';
        position: absolute;
        bottom: -2px;
        left: 0;
        right: 0;
        height: 3px;
        background-color: var(--tree-primary);
        box-shadow: 0 0 6px var(--tree-primary);
        z-index: 15;
        pointer-events: none;
        border-radius: 2px;
      }
      .tree-tr.drag-over-inside {
        background-color: rgba(59, 130, 246, 0.15) !important;
        outline: 2px dashed var(--tree-primary);
        outline-offset: -2px;
      }
      .tree-tr.tree-drag-not-allowed {
        cursor: not-allowed !important;
        background-color: rgba(239, 68, 68, 0.08) !important;
        outline: 1px dashed #ef4444 !important;
      }
      @keyframes tree-drop-success {
        0% {
          background-color: rgba(16, 185, 129, 0.25);
          box-shadow: inset 0 0 0 2px #10b981;
        }
        100% {
          background-color: transparent;
          box-shadow: none;
        }
      }
      .tree-tr.tree-drop-success {
        animation: tree-drop-success 0.6s ease-out forwards;
      }
      @media (prefers-reduced-motion: reduce) {
        .tree-tr,
        .tree-drop-success,
        .tree-drag-handle,
        .tree-expander-btn {
          animation: none !important;
          transition: none !important;
          transform: none !important;
        }
      }
      .tree-td {
        padding: 0.625rem 1rem;
        border-bottom: 1px solid var(--tree-border-color);
        white-space: nowrap;
        vertical-align: middle;
      }
      .tree-cell-wrapper {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
      }
      .tree-indent-guide {
        display: inline-block;
        width: 1.25rem;
        height: 1rem;
        border-right: 1px dashed var(--tree-indent-guide);
      }
      .tree-expander-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.25rem;
        height: 1.25rem;
        border: 1px solid var(--tree-border-color);
        border-radius: 0.25rem;
        background-color: var(--tree-bg);
        cursor: pointer;
        color: var(--tree-text-muted);
        font-size: 0.7rem;
        transition: transform var(--tree-transition);
        padding: 0;
      }
      .tree-expander-btn.expanded {
        transform: rotate(90deg);
      }
      .tree-expander-placeholder {
        display: inline-block;
        width: 1.25rem;
        height: 1.25rem;
      }
      .tree-drag-handle {
        cursor: grab;
        color: var(--tree-text-muted);
        font-size: 0.85rem;
        margin-right: 0.25rem;
      }
      .tree-checkbox {
        cursor: pointer;
        margin-right: 0.35rem;
      }
      .tree-pagination {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        border-top: 1px solid var(--tree-border-color);
        background-color: var(--tree-bg);
        flex-wrap: wrap;
        gap: 0.75rem;
      }
      .tree-pagination-info {
        font-size: 0.8125rem;
        color: var(--tree-text-muted);
      }
      .tree-pagination-controls {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .tree-pagination-size-select {
        padding: 0.25rem 0.5rem;
        font-size: 0.8125rem;
        border: 1px solid var(--tree-border-color);
        border-radius: 0.375rem;
        background-color: var(--tree-bg);
        color: var(--tree-text-main);
        outline: none;
      }
      .tree-pagination-nav {
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }
      .tree-page-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.3rem 0.625rem;
        font-size: 0.8125rem;
        font-weight: 500;
        border-radius: 0.375rem;
        border: 1px solid var(--tree-border-color);
        background-color: var(--tree-bg);
        color: var(--tree-text-main);
        cursor: pointer;
      }
      .tree-page-btn:hover:not(:disabled) {
        background-color: var(--tree-row-hover);
      }
      .tree-page-btn.active {
        background-color: var(--tree-primary);
        color: #ffffff;
        border-color: var(--tree-primary);
      }
      .tree-page-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .tree-loading-overlay {
        position: absolute;
        inset: 0;
        background-color: rgba(255, 255, 255, 0.65);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 50;
      }
      .tree-spinner {
        width: 1.5rem;
        height: 1.5rem;
        border: 2px solid rgba(59, 130, 246, 0.2);
        border-radius: 50%;
        border-top-color: var(--tree-primary);
        animation: tree-spin 0.6s linear infinite;
      }
      @keyframes tree-spin {
        to { transform: rotate(360deg); }
      }
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('tree-data-table')) {
  customElements.define('tree-data-table', TreeDataTableElement);
}
