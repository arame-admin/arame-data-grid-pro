import {
  AdvancedFilterColumn,
  AdvancedFilterTableOptions,
  FilterExpressionGroup,
  FilterRule,
  SavedFilterPreset,
  PresetChangeEventDetail,
  ExpressionChangeEventDetail
} from './types.js';
import { SortRule } from '../common/base-table-types.js';
import {
  evaluateExpressionGroup,
  extractActiveRules,
  formatRuleChipLabel,
  serializeExpression
} from './expression-engine.js';

export class AdvancedFilterDataTableElement<T = Record<string, unknown>> extends HTMLElement {
  private _columns: AdvancedFilterColumn<T>[] = [];
  private _allRows: T[] = []; // In-memory dataset
  private _presets: SavedFilterPreset[] = [];
  private _activePresetId: string | null = null;
  private _activeExpression: FilterExpressionGroup = {
    id: 'root-group',
    logic: 'AND',
    rules: []
  };

  private _options: AdvancedFilterTableOptions<T> = {
    presets: [],
    quickFilters: [],
    debounceMs: 300,
    pagination: { enabled: true, pageSize: 10, pageSizeOptions: [5, 10, 25, 50] },
    sorting: { enabled: true, initialSort: null },
    search: { enabled: true, placeholder: 'Global search...' }
  };

  // State
  private _currentPage = 1;
  private _pageSize = 10;
  private _searchTerm = '';
  private _sortRule: SortRule<T> | null = null;
  private _totalRows = 0;
  private _isLoading = false;
  private _isBuilderOpen = false;

  // Request cancellation sequence
  private _requestId = 0;
  private _abortController: AbortController | null = null;
  private _searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // DOM Elements
  private _container!: HTMLDivElement;
  private _toolbar!: HTMLDivElement;
  private _quickBar!: HTMLDivElement;
  private _chipsBar!: HTMLDivElement;
  private _builderDrawer!: HTMLDivElement;
  private _viewport!: HTMLDivElement;
  private _table!: HTMLTableElement;
  private _thead!: HTMLTableSectionElement;
  private _tbody!: HTMLTableSectionElement;
  private _searchInput!: HTMLInputElement;
  private _metaBadge!: HTMLElement;
  private _presetSelect!: HTMLSelectElement;
  private _toggleBuilderBtn!: HTMLButtonElement;
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
    this.loadPersistedPresets();
    this.renderDomStructure();
    this.setupEventListeners();

    if (this._options.dataLoader) {
      this.fetchServerData();
    } else {
      this.refresh();
    }
  }

  disconnectedCallback(): void {
    if (this._abortController) this._abortController.abort();
    if (this._searchDebounceTimer) if (this._searchDebounceTimer) clearTimeout(this._searchDebounceTimer);
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

  get columns(): AdvancedFilterColumn<T>[] {
    return this._columns;
  }

  set columns(cols: AdvancedFilterColumn<T>[]) {
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

  get options(): AdvancedFilterTableOptions<T> {
    return this._options;
  }

  set options(opts: Partial<AdvancedFilterTableOptions<T>>) {
    this._options = {
      ...this._options,
      ...opts,
      pagination: { ...this._options.pagination, ...opts.pagination },
      sorting: { ...this._options.sorting, ...opts.sorting },
      search: { ...this._options.search, ...opts.search }
    };

    if (opts.presets) {
      this._presets = [...opts.presets];
    }
    if (opts.pagination?.pageSize) {
      this._pageSize = opts.pagination.pageSize;
    }
    if (opts.sorting?.initialSort !== undefined) {
      this._sortRule = opts.sorting.initialSort;
    }

    if (this.isConnected) {
      this.renderHeader();
      this.renderPresetsSelect();
      this.renderQuickFilters();
      // Fetch when a dataLoader is assigned after the element is already connected
      if (this._options.dataLoader && opts.dataLoader) {
        this.fetchServerData();
      } else {
        this.refresh();
      }
    }
  }

  get expression(): FilterExpressionGroup {
    return this._activeExpression;
  }

  set expression(exp: FilterExpressionGroup) {
    this._activeExpression = exp;
    this._currentPage = 1;
    this.onExpressionChanged();
  }

  // --- Expression & Filter Modification ---

  public addRule(rule: FilterRule): void {
    this._activeExpression.rules.push(rule);
    this._currentPage = 1;
    this.onExpressionChanged();
  }

  public removeRule(ruleId: string): void {
    function removeRecursive(group: FilterExpressionGroup): void {
      group.rules = group.rules.filter(r => {
        if ('logic' in r) {
          removeRecursive(r as FilterExpressionGroup);
          return (r as FilterExpressionGroup).rules.length > 0;
        }
        return (r as FilterRule).id !== ruleId;
      });
    }

    removeRecursive(this._activeExpression);
    this._currentPage = 1;
    this.onExpressionChanged();
  }

  public clearAllFilters(): void {
    this._activeExpression.rules = [];
    this._activePresetId = null;
    this._currentPage = 1;
    this.onExpressionChanged();
  }

  public setLogic(logic: 'AND' | 'OR'): void {
    this._activeExpression.logic = logic;
    this.onExpressionChanged();
  }

  private onExpressionChanged(): void {
    const flat = extractActiveRules(this._activeExpression);
    const activeChips = flat.map(r => ({
      id: r.id,
      label: formatRuleChipLabel(r, this._columns as any),
      rule: r
    }));

    const detail: ExpressionChangeEventDetail = {
      expression: this._activeExpression,
      flatRules: flat,
      activeChips
    };
    this.dispatchEvent(new CustomEvent('advanced-filter:expression-change', { detail, bubbles: true, composed: true }));

    this.renderActiveChips();
    this.renderBuilderDrawer();

    if (this._options.dataLoader) {
      this.fetchServerData();
    } else {
      this.refresh();
    }
  }

  // --- Presets Persistence & Management ---

  public applyPreset(presetId: string): void {
    const found = this._presets.find(p => p.id === presetId);
    if (!found) return;

    this._activePresetId = presetId;
    this._activeExpression = JSON.parse(JSON.stringify(found.expression));
    if (found.searchTerm !== undefined) {
      this.setSearchTerm(found.searchTerm);
    }

    this._currentPage = 1;
    if (this._presetSelect) this._presetSelect.value = presetId;

    const detail: PresetChangeEventDetail = {
      preset: found,
      expression: this._activeExpression
    };
    this.dispatchEvent(new CustomEvent('advanced-filter:preset-change', { detail, bubbles: true, composed: true }));

    this.onExpressionChanged();
  }

  public saveCurrentAsPreset(name: string): SavedFilterPreset {
    const newPreset: SavedFilterPreset = {
      id: `preset-${Date.now()}`,
      name,
      isRemovable: true,
      expression: JSON.parse(JSON.stringify(this._activeExpression)),
      searchTerm: this._searchTerm
    };

    this._presets.push(newPreset);
    this.persistPresets();
    this.renderPresetsSelect();

    this.dispatchEvent(new CustomEvent('advanced-filter:preset-save', { detail: newPreset, bubbles: true, composed: true }));
    return newPreset;
  }

  public deletePreset(presetId: string): void {
    this._presets = this._presets.filter(p => p.id !== presetId);
    if (this._activePresetId === presetId) {
      this._activePresetId = null;
    }
    this.persistPresets();
    this.renderPresetsSelect();
  }

  private persistPresets(): void {
    const key = this._options.persistPresetsKey;
    if (!key || typeof localStorage === 'undefined') return;
    try {
      const userPresets = this._presets.filter(p => p.isRemovable);
      localStorage.setItem(key, JSON.stringify(userPresets));
    } catch (e) {
      console.warn('[advanced-filter-table] Failed to persist presets:', e);
    }
  }

  private loadPersistedPresets(): void {
    const key = this._options.persistPresetsKey;
    if (!key || typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this._presets = [...(this._options.presets || []), ...parsed];
        }
      }
    } catch (e) {
      console.warn('[advanced-filter-table] Failed to load presets:', e);
    }
  }

  // --- Filtering, Sorting & Pagination Controls ---

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

    if (this._abortController) this._abortController.abort();
    this._abortController = new AbortController();
    const signal = this._abortController.signal;
    const currentReqId = ++this._requestId;

    this.setLoading(true);

    try {
      const response = await this._options.dataLoader({
        page: this._currentPage,
        pageSize: this._pageSize,
        searchTerm: this._searchTerm,
        sortRule: this._sortRule,
        expression: this._activeExpression,
        serializedQuery: serializeExpression(this._activeExpression),
        signal
      });

      if (currentReqId !== this._requestId || signal.aborted) return;

      this._allRows = response.rows || [];
      this._totalRows = response.totalRows || 0;
      this.renderBodyRows();
      this.renderPaginationBar();
      this.updateMetaInfo();
    } catch (err) {
      if (signal.aborted || currentReqId !== this._requestId) return;
      console.error('[advanced-filter-table] Error fetching data:', err);
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

  // --- Rendering Architecture ---

  private renderDomStructure(): void {
    const shadow = this.shadowRoot!;
    shadow.innerHTML = `
      <style>
        ${this.getInlineStyles()}
      </style>
      <div class="aft-container">
        <div class="aft-loading-overlay" style="display: none;">
          <div class="aft-spinner"></div>
        </div>

        <div class="aft-toolbar">
          <div class="aft-search-wrapper">
            <svg class="aft-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <input type="text" class="aft-search-input" placeholder="${this._options.search?.placeholder || 'Global search...'}" />
          </div>

          <div class="aft-toolbar-actions">
            <select class="aft-preset-select" aria-label="Saved Presets">
              <option value="">Presets...</option>
            </select>
            <button class="aft-btn aft-btn-toggle-builder">Filter Builder</button>
            <span class="aft-meta-badge">0 records</span>
          </div>
        </div>

        <div class="aft-quick-filters-bar" style="display: none;"></div>
        <div class="aft-active-chips-bar" style="display: none;"></div>
        <div class="aft-builder-drawer" style="display: none;"></div>

        <div class="aft-viewport" tabindex="0" role="region" aria-label="Advanced Filter Table Viewport">
          <table class="aft-table">
            <thead class="aft-thead"><tr class="aft-header-tr"></tr></thead>
            <tbody class="aft-tbody"></tbody>
          </table>
        </div>

        <div class="aft-pagination"></div>
      </div>
    `;

    this._container = shadow.querySelector('.aft-container') as HTMLDivElement;
    this._toolbar = shadow.querySelector('.aft-toolbar') as HTMLDivElement;
    this._quickBar = shadow.querySelector('.aft-quick-filters-bar') as HTMLDivElement;
    this._chipsBar = shadow.querySelector('.aft-active-chips-bar') as HTMLDivElement;
    this._builderDrawer = shadow.querySelector('.aft-builder-drawer') as HTMLDivElement;
    this._viewport = shadow.querySelector('.aft-viewport') as HTMLDivElement;
    this._table = shadow.querySelector('.aft-table') as HTMLTableElement;
    this._thead = shadow.querySelector('.aft-thead') as HTMLTableSectionElement;
    this._tbody = shadow.querySelector('.aft-tbody') as HTMLTableSectionElement;
    this._searchInput = shadow.querySelector('.aft-search-input') as HTMLInputElement;
    this._metaBadge = shadow.querySelector('.aft-meta-badge') as HTMLElement;
    this._presetSelect = shadow.querySelector('.aft-preset-select') as HTMLSelectElement;
    this._toggleBuilderBtn = shadow.querySelector('.aft-btn-toggle-builder') as HTMLButtonElement;
    this._paginationBar = shadow.querySelector('.aft-pagination') as HTMLDivElement;
    this._loadingOverlay = shadow.querySelector('.aft-loading-overlay') as HTMLDivElement;

    this.renderHeader();
    this.renderPresetsSelect();
    this.renderQuickFilters();
    this.renderActiveChips();
  }

  private setupEventListeners(): void {
    const debounceMs = this._options.debounceMs ?? 300;
    this._searchInput.addEventListener('input', (e) => {
      if (this._searchDebounceTimer) clearTimeout(this._searchDebounceTimer);
      this._searchDebounceTimer = setTimeout(() => {
        this.setSearchTerm((e.target as HTMLInputElement).value.trim());
      }, debounceMs);
    });

    this._presetSelect.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value;
      if (val) this.applyPreset(val);
    });

    this._toggleBuilderBtn.addEventListener('click', () => {
      this._isBuilderOpen = !this._isBuilderOpen;
      this._builderDrawer.style.display = this._isBuilderOpen ? 'flex' : 'none';
      if (this._isBuilderOpen) {
        this.renderBuilderDrawer();
      }
    });
  }

  private renderPresetsSelect(): void {
    if (!this._presetSelect) return;
    this._presetSelect.innerHTML = '<option value="">Choose Preset...</option>';

    this._presets.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      if (p.id === this._activePresetId) opt.selected = true;
      this._presetSelect.appendChild(opt);
    });
  }

  private renderQuickFilters(): void {
    const quicks = this._options.quickFilters || [];
    if (quicks.length === 0) {
      this._quickBar.style.display = 'none';
      return;
    }

    this._quickBar.style.display = 'flex';
    this._quickBar.innerHTML = '';

    quicks.forEach(q => {
      const pill = document.createElement('button');
      pill.className = 'aft-quick-filter-pill';
      pill.textContent = q.label;
      pill.addEventListener('click', () => {
        this.expression = JSON.parse(JSON.stringify(q.expression));
      });
      this._quickBar.appendChild(pill);
    });
  }

  private renderActiveChips(): void {
    const rules = extractActiveRules(this._activeExpression);
    if (rules.length === 0) {
      this._chipsBar.style.display = 'none';
      return;
    }

    this._chipsBar.style.display = 'flex';
    this._chipsBar.innerHTML = '';

    rules.forEach(rule => {
      const chip = document.createElement('span');
      chip.className = 'aft-chip';

      const label = document.createElement('span');
      label.textContent = formatRuleChipLabel(rule, this._columns as any);
      chip.appendChild(label);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'aft-chip-remove';
      removeBtn.innerHTML = '&times;';
      removeBtn.title = 'Remove filter';
      removeBtn.addEventListener('click', () => {
        this.removeRule(rule.id);
      });
      chip.appendChild(removeBtn);

      this._chipsBar.appendChild(chip);
    });

    const clearAllBtn = document.createElement('button');
    clearAllBtn.className = 'aft-btn-clear-chips';
    clearAllBtn.textContent = 'Clear all';
    clearAllBtn.addEventListener('click', () => {
      this.clearAllFilters();
    });
    this._chipsBar.appendChild(clearAllBtn);
  }

  private renderBuilderDrawer(): void {
    if (!this._isBuilderOpen) return;
    this._builderDrawer.innerHTML = '';

    // Header logic toggle (AND / OR)
    const header = document.createElement('div');
    header.className = 'aft-builder-header';
    header.innerHTML = `
      <div style="display:flex;align-items:center;gap:0.75rem;">
        <span style="font-weight:600;font-size:0.8125rem;">Match Rules:</span>
        <div class="aft-logic-toggle">
          <button type="button" class="aft-logic-btn ${this._activeExpression.logic === 'AND' ? 'active' : ''}" id="btn-logic-and">AND</button>
          <button type="button" class="aft-logic-btn ${this._activeExpression.logic === 'OR' ? 'active' : ''}" id="btn-logic-or">OR</button>
        </div>
      </div>
      <div>
        <button class="aft-btn aft-btn-add-rule">+ Add Rule</button>
      </div>
    `;

    header.querySelector('#btn-logic-and')?.addEventListener('click', () => this.setLogic('AND'));
    header.querySelector('#btn-logic-or')?.addEventListener('click', () => this.setLogic('OR'));
    header.querySelector('.aft-btn-add-rule')?.addEventListener('click', () => {
      const firstCol = this._columns[0]?.key as string || 'id';
      this.addRule({
        id: `rule-${Date.now()}`,
        field: firstCol,
        operator: 'contains',
        value: ''
      });
    });

    this._builderDrawer.appendChild(header);

    // Render each rule row
    const rulesContainer = document.createElement('div');
    rulesContainer.style.display = 'flex';
    rulesContainer.style.flexDirection = 'column';
    rulesContainer.style.gap = '0.5rem';

    const flatRules = extractActiveRules(this._activeExpression);

    flatRules.forEach(rule => {
      const rowEl = document.createElement('div');
      rowEl.className = 'aft-rule-row';

      // 1. Column Field Select
      const colSelect = document.createElement('select');
      colSelect.className = 'aft-rule-select';
      this._columns.forEach(col => {
        const opt = document.createElement('option');
        opt.value = String(col.key);
        opt.textContent = col.header;
        if (String(col.key) === rule.field) opt.selected = true;
        colSelect.appendChild(opt);
      });

      // 2. Operator Select
      const colDef = this._columns.find(c => String(c.key) === rule.field);
      const opSelect = document.createElement('select');
      opSelect.className = 'aft-rule-select';

      const operators = this.getOperatorsForColumn(colDef as any);
      operators.forEach(op => {
        const opt = document.createElement('option');
        opt.value = op.value;
        opt.textContent = op.label;
        if (op.value === rule.operator) opt.selected = true;
        opSelect.appendChild(opt);
      });

      // 3. Value Input / Control
      const valContainer = document.createElement('div');
      this.renderRuleValueControl(rule, colDef as any, valContainer);

      // 4. Remove rule button
      const removeBtn = document.createElement('button');
      removeBtn.className = 'aft-btn';
      removeBtn.style.color = '#ef4444';
      removeBtn.textContent = '✕';
      removeBtn.addEventListener('click', () => this.removeRule(rule.id));

      colSelect.addEventListener('change', (e) => {
        rule.field = (e.target as HTMLSelectElement).value;
        this.onExpressionChanged();
      });

      opSelect.addEventListener('change', (e) => {
        rule.operator = (e.target as HTMLSelectElement).value as any;
        this.onExpressionChanged();
      });

      rowEl.appendChild(colSelect);
      rowEl.appendChild(opSelect);
      rowEl.appendChild(valContainer);
      rowEl.appendChild(removeBtn);
      rulesContainer.appendChild(rowEl);
    });

    this._builderDrawer.appendChild(rulesContainer);
  }

  private getOperatorsForColumn(col?: AdvancedFilterColumn): Array<{ value: string; label: string }> {
    const type = col?.type || 'string';
    if (type === 'number') {
      return [
        { value: 'equals', label: 'Equals (=)' },
        { value: 'greaterThan', label: 'Greater Than (>)' },
        { value: 'greaterThanOrEqual', label: 'Greater Or Equal (≥)' },
        { value: 'lessThan', label: 'Less Than (<)' },
        { value: 'lessThanOrEqual', label: 'Less Or Equal (≤)' },
        { value: 'between', label: 'Between (Range)' }
      ];
    }
    if (type === 'date') {
      return [
        { value: 'dateOn', label: 'On Date' },
        { value: 'dateBefore', label: 'Before' },
        { value: 'dateAfter', label: 'After' },
        { value: 'dateBetween', label: 'Between Dates' },
        { value: 'dateRelative', label: 'Relative Period' }
      ];
    }
    if (type === 'select') {
      return [
        { value: 'equals', label: 'Equals' },
        { value: 'notEquals', label: 'Not Equals' },
        { value: 'in', label: 'In list' }
      ];
    }
    return [
      { value: 'contains', label: 'Contains' },
      { value: 'notContains', label: 'Does Not Contain' },
      { value: 'equals', label: 'Equals' },
      { value: 'startsWith', label: 'Starts With' },
      { value: 'endsWith', label: 'Ends With' }
    ];
  }

  private renderRuleValueControl(rule: FilterRule, col: AdvancedFilterColumn | undefined, container: HTMLElement): void {
    // Cascading select options
    if (col?.cascading) {
      const activeRules = extractActiveRules(this._activeExpression);
      const parentRule = activeRules.find(r => r.field === col.cascading!.parentField);
      const dynamicOptions = col.cascading.getOptions(parentRule?.value, activeRules);

      const sel = document.createElement('select');
      sel.className = 'aft-rule-select';
      dynamicOptions.forEach(opt => {
        const o = document.createElement('option');
        o.value = String(opt.value);
        o.textContent = opt.label;
        if (String(opt.value) === String(rule.value)) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', (e) => {
        rule.value = (e.target as HTMLSelectElement).value;
        this.onExpressionChanged();
      });
      container.appendChild(sel);
      return;
    }

    if (rule.operator === 'dateRelative') {
      const sel = document.createElement('select');
      sel.className = 'aft-rule-select';
      const presets = ['today', 'yesterday', 'last7Days', 'last30Days', 'thisMonth', 'lastMonth', 'thisYear'];
      presets.forEach(p => {
        const o = document.createElement('option');
        o.value = p;
        o.textContent = p;
        if (p === rule.value) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', (e) => {
        rule.value = (e.target as HTMLSelectElement).value;
        this.onExpressionChanged();
      });
      container.appendChild(sel);
      return;
    }

    if (rule.operator === 'between') {
      const minI = document.createElement('input');
      minI.type = 'number';
      minI.className = 'aft-rule-input';
      minI.placeholder = 'Min';
      minI.style.width = '75px';
      minI.value = (rule.value as { min?: string })?.min ?? '';

      const maxI = document.createElement('input');
      maxI.type = 'number';
      maxI.className = 'aft-rule-input';
      maxI.placeholder = 'Max';
      maxI.style.width = '75px';
      maxI.value = (rule.value as { max?: string })?.max ?? '';

      const onRange = () => {
        rule.value = { min: minI.value, max: maxI.value };
        this.onExpressionChanged();
      };
      minI.addEventListener('change', onRange);
      maxI.addEventListener('change', onRange);

      container.appendChild(minI);
      container.appendChild(document.createTextNode(' .. '));
      container.appendChild(maxI);
      return;
    }

    // Default text/date input
    const input = document.createElement('input');
    input.type = col?.type === 'date' ? 'date' : col?.type === 'number' ? 'number' : 'text';
    input.className = 'aft-rule-input';
    input.value = rule.value !== undefined ? String(rule.value) : '';
    input.addEventListener('change', (e) => {
      rule.value = (e.target as HTMLInputElement).value;
      this.onExpressionChanged();
    });
    container.appendChild(input);
  }

  private renderHeader(): void {
    const headerTr = this._thead.querySelector('.aft-header-tr') as HTMLTableRowElement;
    if (!headerTr) return;
    headerTr.innerHTML = '';

    this._columns.forEach(col => {
      const th = document.createElement('th');
      th.className = 'aft-th';
      if (col.width) th.style.width = col.width;
      if (col.minWidth) th.style.minWidth = col.minWidth;
      if (col.align) th.style.textAlign = col.align;

      const inner = document.createElement('div');
      inner.className = 'aft-th-inner';

      const label = document.createElement('span');
      label.textContent = col.header;
      inner.appendChild(label);

      if (col.sortable !== false && this._options.sorting?.enabled !== false) {
        const sortIcon = document.createElement('span');
        sortIcon.className = 'aft-sort-icon';
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

  private getDisplayRows(): T[] {
    if (this._options.dataLoader) {
      return this._allRows;
    }

    let rows = [...this._allRows];

    // Global Search
    if (this._searchTerm && this._options.search?.enabled !== false) {
      const q = this._searchTerm.toLowerCase();
      rows = rows.filter(r => Object.values(r as any).some(v => v !== null && v !== undefined && String(v).toLowerCase().includes(q)));
    }

    // Expression Filtering
    rows = rows.filter(r => evaluateExpressionGroup(r, this._activeExpression, this._options.customOperators));

    // Sorting
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

    // Pagination
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

    if (displayRows.length === 0) {
      const tr = document.createElement('tr');
      tr.className = 'aft-tr';
      const td = document.createElement('td');
      td.className = 'aft-td';
      td.colSpan = this._columns.length || 1;
      td.style.textAlign = 'center';
      td.style.padding = '2.5rem 1rem';
      td.style.color = 'var(--aft-text-muted)';
      td.textContent = 'No matching records found';
      tr.appendChild(td);
      this._tbody.appendChild(tr);
      return;
    }

    const fragment = document.createDocumentFragment();

    displayRows.forEach((row, rIdx) => {
      const tr = document.createElement('tr');
      tr.className = `aft-tr ${rIdx % 2 === 1 ? 'alt' : ''}`;

      this._columns.forEach(col => {
        const td = document.createElement('td');
        td.className = 'aft-td';
        if (col.align) td.style.textAlign = col.align;

        const val = (row as any)[col.key];
        if (col.render) {
          const res = col.render(val, row, rIdx);
          if (res instanceof HTMLElement) td.appendChild(res);
          else td.innerHTML = String(res ?? '');
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
      <div class="aft-pagination-info">
        Showing <strong>${start}</strong> to <strong>${end}</strong> of <strong>${totalItems}</strong> entries
      </div>
      <div class="aft-pagination-controls">
        <select class="aft-pagination-size-select" aria-label="Page size">
          ${optionsHtml}
        </select>
        <div style="display:flex;align-items:center;gap:0.25rem;">
          <button class="aft-page-btn prev-btn" ${this._currentPage <= 1 ? 'disabled' : ''}>Previous</button>
          <span class="aft-page-btn active" style="cursor: default;">${this._currentPage}</span>
          <button class="aft-page-btn next-btn" ${this._currentPage >= totalPages ? 'disabled' : ''}>Next</button>
        </div>
      </div>
    `;

    this._paginationBar.querySelector('.prev-btn')?.addEventListener('click', () => this.setPage(this._currentPage - 1));
    this._paginationBar.querySelector('.next-btn')?.addEventListener('click', () => this.setPage(this._currentPage + 1));
    this._paginationBar.querySelector('.aft-pagination-size-select')?.addEventListener('change', (e) => {
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
        display: block; width: 100%;
        --aft-primary: #3b82f6; --aft-primary-hover: #2563eb; --aft-primary-light: #eff6ff;
        --aft-bg: #ffffff; --aft-panel-bg: #f8fafc; --aft-header-bg: #f8fafc;
        --aft-row-hover: #f1f5f9; --aft-row-alt: #fdfdfe; --aft-border-color: #e2e8f0;
        --aft-text-main: #0f172a; --aft-text-muted: #64748b;
        --aft-chip-bg: #f1f5f9; --aft-chip-border: #cbd5e1;
        --aft-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        --aft-font-size: 0.875rem; --aft-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
      }
      :host([theme="dark"]) {
        --aft-primary: #60a5fa; --aft-bg: #0f172a; --aft-panel-bg: #1e293b;
        --aft-header-bg: #1e293b; --aft-row-hover: #1e293b; --aft-row-alt: #0b1120;
        --aft-border-color: #334155; --aft-text-main: #f8fafc; --aft-text-muted: #94a3b8;
        --aft-chip-bg: #334155; --aft-chip-border: #475569;
      }
      .aft-container {
        display: flex; flex-direction: column; width: 100%;
        font-family: var(--aft-font-family); font-size: var(--aft-font-size);
        color: var(--aft-text-main); background: var(--aft-bg);
        border: 1px solid var(--aft-border-color); border-radius: 0.5rem;
        box-shadow: var(--aft-shadow); overflow: hidden; position: relative;
      }
      .aft-toolbar {
        display: flex; align-items: center; justify-content: space-between;
        padding: 0.75rem 1rem; border-bottom: 1px solid var(--aft-border-color); gap: 1rem;
      }
      .aft-search-input {
        padding: 0.35rem 0.6rem; border: 1px solid var(--aft-border-color);
        border-radius: 0.375rem; outline: none; font-size: var(--aft-font-size);
        background: var(--aft-bg); color: var(--aft-text-main); min-width: 260px;
      }
      .aft-toolbar-actions { display: flex; align-items: center; gap: 0.5rem; }
      .aft-btn {
        padding: 0.35rem 0.75rem; font-size: 0.8125rem; font-weight: 500;
        border-radius: 0.375rem; border: 1px solid var(--aft-border-color);
        background: var(--aft-bg); color: var(--aft-text-main); cursor: pointer;
      }
      .aft-btn:hover { background: var(--aft-row-hover); }
      .aft-preset-select {
        padding: 0.35rem 0.6rem; font-size: 0.8125rem; border: 1px solid var(--aft-border-color);
        border-radius: 0.375rem; background: var(--aft-bg); color: var(--aft-text-main);
      }
      .aft-quick-filters-bar {
        display: flex; gap: 0.5rem; padding: 0.5rem 1rem; background: var(--aft-panel-bg);
        border-bottom: 1px solid var(--aft-border-color); overflow-x: auto;
      }
      .aft-quick-filter-pill {
        padding: 0.2rem 0.65rem; border-radius: 9999px; font-size: 0.75rem;
        border: 1px solid var(--aft-border-color); background: var(--aft-bg);
        color: var(--aft-text-muted); cursor: pointer; white-space: nowrap;
      }
      .aft-quick-filter-pill:hover { background: var(--aft-primary-light); color: var(--aft-primary); }
      .aft-active-chips-bar {
        display: flex; align-items: center; flex-wrap: wrap; gap: 0.4rem;
        padding: 0.5rem 1rem; border-bottom: 1px solid var(--aft-border-color); background: var(--aft-bg);
      }
      .aft-chip {
        display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.2rem 0.55rem;
        font-size: 0.75rem; font-weight: 500; border-radius: 0.375rem;
        background: var(--aft-chip-bg); border: 1px solid var(--aft-chip-border);
      }
      .aft-chip-remove { background: none; border: none; cursor: pointer; color: var(--aft-text-muted); }
      .aft-chip-remove:hover { color: #ef4444; }
      .aft-btn-clear-chips { background: none; border: none; font-size: 0.75rem; color: #ef4444; cursor: pointer; }
      .aft-builder-drawer {
        background: var(--aft-panel-bg); border-bottom: 1px solid var(--aft-border-color);
        padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;
      }
      .aft-builder-header { display: flex; align-items: center; justify-content: space-between; }
      .aft-logic-toggle { display: inline-flex; border-radius: 0.375rem; border: 1px solid var(--aft-border-color); overflow: hidden; }
      .aft-logic-btn { padding: 0.25rem 0.65rem; font-size: 0.75rem; border: none; background: var(--aft-bg); color: var(--aft-text-muted); cursor: pointer; }
      .aft-logic-btn.active { background: var(--aft-primary); color: white; }
      .aft-rule-row {
        display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem;
        background: var(--aft-bg); border: 1px solid var(--aft-border-color); border-radius: 0.375rem;
      }
      .aft-rule-select, .aft-rule-input {
        padding: 0.3rem 0.5rem; font-size: 0.8125rem; border: 1px solid var(--aft-border-color);
        border-radius: 0.25rem; background: var(--aft-bg); color: var(--aft-text-main);
      }
      .aft-viewport { overflow: auto; max-height: 540px; }
      .aft-table { width: 100%; border-collapse: separate; border-spacing: 0; text-align: left; }
      .aft-thead { position: sticky; top: 0; z-index: 20; background: var(--aft-header-bg); }
      .aft-th {
        padding: 0.75rem 1rem; font-weight: 600; color: var(--aft-text-main);
        border-bottom: 1px solid var(--aft-border-color); cursor: pointer;
      }
      .aft-tr { background: var(--aft-bg); }
      .aft-tr:hover { background: var(--aft-row-hover); }
      .aft-tr.alt { background: var(--aft-row-alt); }
      .aft-td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--aft-border-color); white-space: nowrap; }
      .aft-pagination {
        display: flex; align-items: center; justify-content: space-between;
        padding: 0.75rem 1rem; border-top: 1px solid var(--aft-border-color);
        font-size: 0.8125rem; color: var(--aft-text-muted);
      }
      .aft-page-btn {
        padding: 0.25rem 0.6rem; border-radius: 0.375rem; border: 1px solid var(--aft-border-color);
        background: var(--aft-bg); color: var(--aft-text-main); cursor: pointer;
      }
      .aft-page-btn:hover:not(:disabled) { background: var(--aft-row-hover); }
      .aft-page-btn.active { background: var(--aft-primary); color: white; border-color: var(--aft-primary); }
      .aft-loading-overlay {
        position: absolute; inset: 0; background: rgba(255, 255, 255, 0.65);
        display: flex; align-items: center; justify-content: center; z-index: 50;
      }
      .aft-spinner {
        width: 1.5rem; height: 1.5rem; border: 2px solid rgba(59, 130, 246, 0.2);
        border-radius: 50%; border-top-color: var(--aft-primary);
        animation: aft-spin 0.6s linear infinite;
      }
      @keyframes aft-spin { to { transform: rotate(360deg); } }
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('advanced-filter-data-table')) {
  customElements.define('advanced-filter-data-table', AdvancedFilterDataTableElement);
}
