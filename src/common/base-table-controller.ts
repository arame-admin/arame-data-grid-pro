import { BaseTableOptions, BaseTableQueryParams, SortCriterion } from './base-table-types.js';
import { LiveRegionAnnouncer } from './accessibility-helpers.js';
import { TableLocale, defaultEnglishLocale } from './table-localization.js';

export function resolveValue<T>(row: T, fieldPath?: keyof T | string): any {
  if (!fieldPath || !row || typeof row !== 'object') return undefined;
  const path = String(fieldPath);
  if (!path.includes('.')) {
    if (path === '__proto__' || path === 'constructor' || path === 'prototype') return undefined;
    return (row as any)[path];
  }
  const parts = path.split('.');
  let current: any = row;
  for (const part of parts) {
    if (part === '__proto__' || part === 'constructor' || part === 'prototype') return undefined;
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
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

export function removeAllChildren(parent: HTMLElement): void {
  while (parent.firstChild) parent.removeChild(parent.firstChild);
}

export interface BaseTableColumn<T = any> {
  id: string;
  header: string;
  field?: keyof T | string;
  sortable?: boolean;
  comparator?: (a: any, b: any, rowA: T, rowB: T) => number;
}

export class BaseTableController<T = Record<string, any>> {
  public pageIndex = 0;
  public pageSize = 10;
  public pageSizes = [10, 25, 50, 100];
  public totalRows = 0;
  public totalPages = 1;
  public globalSearch = '';
  public sortCriteria: SortCriterion[] = [];
  public isLoading = false;

  private _abortController: AbortController | null = null;
  private _debounceTimer: any = null;
  private _reqId = 0;
  private _announcer: LiveRegionAnnouncer | null = null;

  constructor(
    private getOptions: () => BaseTableOptions<T>,
    private onStateChange: () => void,
    private dispatchEvent: (name: string, detail: any) => void,
    announcerHost?: HTMLElement | ShadowRoot
  ) {
    const opts = this.getOptions();
    if (opts.pagination?.pageSize) this.pageSize = opts.pagination.pageSize;
    if (opts.pagination?.pageSizes) this.pageSizes = opts.pagination.pageSizes;
    if (typeof document !== 'undefined') {
      this._announcer = new LiveRegionAnnouncer(announcerHost ?? document.body);
    }
  }

  public getLocale(): TableLocale {
    const partial = this.getOptions().locale;
    if (!partial) return defaultEnglishLocale;
    return {
      ...defaultEnglishLocale,
      ...partial,
      pagination: { ...defaultEnglishLocale.pagination, ...partial.pagination },
      selection: { ...defaultEnglishLocale.selection, ...partial.selection },
      columns: { ...defaultEnglishLocale.columns, ...partial.columns },
      export: { ...defaultEnglishLocale.export, ...partial.export }
    };
  }

  public announce(message: string): void {
    this._announcer?.announce(message);
  }

  public destroy(): void {
    this._announcer?.destroy();
    this._announcer = null;
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._abortController?.abort();
  }

  public setGlobalSearch(val: string): void {
    this.globalSearch = val;
    this.pageIndex = 0; // Reset page on search change
    this.dispatchEvent('table:search', { query: val });
    this.announce(val ? `Search updated: ${val}` : 'Search cleared');

    const opts = this.getOptions();
    if (opts.serverSide) {
      if (this._debounceTimer) clearTimeout(this._debounceTimer);
      const delay = opts.search?.debounceMs ?? 250;
      this._debounceTimer = setTimeout(() => this.triggerServerLoad(), delay);
    } else {
      this.onStateChange();
    }
  }

  public handleSort(columnId: string, _columns: BaseTableColumn<T>[]): void {
    const opts = this.getOptions();
    if (opts.sorting?.enabled === false) return;

    const existingIdx = this.sortCriteria.findIndex((c) => c.columnId === columnId);
    let next: 'asc' | 'desc' | null = 'asc';
    if (existingIdx > -1) {
      const cur = this.sortCriteria[existingIdx];
      if (cur.direction === 'asc') next = 'desc';
      else if (cur.direction === 'desc') next = null;
    }

    if (opts.sorting?.multiSort) {
      if (next === null) this.sortCriteria.splice(existingIdx, 1);
      else if (existingIdx > -1) this.sortCriteria[existingIdx].direction = next;
      else this.sortCriteria.push({ columnId, direction: next });
    } else {
      this.sortCriteria = next ? [{ columnId, direction: next }] : [];
    }

    this.pageIndex = 0; // Reset pagination to page 0 on sort change
    this.dispatchEvent('table:sort', { criteria: [...this.sortCriteria] });

    if (opts.serverSide) {
      this.triggerServerLoad();
    } else {
      this.onStateChange();
    }
  }

  public goToPage(idx: number): void {
    // Allow setting page before client data is processed (totalPages may still be 1).
    // Clamp only when we already know a real page count from prior processing/server load.
    const maxPage = this.totalRows > 0 ? Math.max(0, this.totalPages - 1) : Math.max(0, idx);
    this.pageIndex = Math.max(0, Math.min(idx, maxPage));
    this.dispatchEvent('table:page', {
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
      totalPages: this.totalPages,
      totalRows: this.totalRows
    });

    const opts = this.getOptions();
    if (opts.serverSide) {
      this.triggerServerLoad();
    } else {
      this.onStateChange();
    }
  }

  public setPageSize(sz: number): void {
    this.pageSize = sz;
    this.pageIndex = 0;
    this.goToPage(0);
  }

  public processClientData(rows: T[], columns: BaseTableColumn<T>[]): T[] {
    const opts = this.getOptions();

    // 1. Search
    let result = rows;
    const q = this.globalSearch.trim().toLowerCase();
    if (opts.search?.enabled !== false && q) {
      result = result.filter((row) =>
        columns.some((col) => {
          if (!col.field) return false;
          const v = resolveValue(row, col.field);
          return v != null && String(v).toLowerCase().includes(q);
        })
      );
    }

    // 2. Sort
    if (opts.sorting?.enabled !== false && this.sortCriteria.length > 0) {
      result = [...result].sort((a, b) => {
        for (const crit of this.sortCriteria) {
          const col = columns.find((c) => c.id === crit.columnId);
          if (!col || !col.field) continue;
          const valA = resolveValue(a, col.field);
          const valB = resolveValue(b, col.field);

          let cmp = 0;
          if (col.comparator) {
            cmp = col.comparator(valA, valB, a, b);
          } else {
            if (valA === valB) cmp = 0;
            else if (valA == null) return crit.direction === 'asc' ? 1 : -1;
            else if (valB == null) return crit.direction === 'asc' ? -1 : 1;
            else if (typeof valA === 'number' && typeof valB === 'number') {
              cmp = valA - valB;
            } else {
              cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
            }
          }
          if (cmp !== 0) return crit.direction === 'asc' ? cmp : -cmp;
        }
        return 0;
      });
    }

    // 3. Paginate
    this.totalRows = result.length;
    if (opts.pagination?.enabled !== false) {
      this.totalPages = Math.max(1, Math.ceil(this.totalRows / this.pageSize));
      if (this.pageIndex > this.totalPages - 1) {
        this.pageIndex = Math.max(0, this.totalPages - 1);
      }
      const start = this.pageIndex * this.pageSize;
      return result.slice(start, start + this.pageSize);
    } else {
      this.totalPages = 1;
      return result;
    }
  }

  public async triggerServerLoad(): Promise<T[] | undefined> {
    const opts = this.getOptions();
    if (!opts.serverSide || !opts.serverDataLoader) return undefined;

    if (this._abortController && this.isLoading) this._abortController.abort();
    this._abortController = new AbortController();
    const signal = this._abortController.signal;
    const currentId = ++this._reqId;

    this.isLoading = true;
    this.dispatchEvent('table:loading', { loading: true });

    const params: BaseTableQueryParams = {
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
      globalSearch: this.globalSearch,
      sortCriteria: [...this.sortCriteria],
      signal
    };

    try {
      const res = await opts.serverDataLoader(params);
      if (currentId !== this._reqId || signal.aborted) return undefined;
      this.totalRows = res.totalRows;
      this.totalPages = Math.max(1, Math.ceil(res.totalRows / this.pageSize));
      return res.rows;
    } catch (err: any) {
      if (err.name === 'AbortError' || signal.aborted) return undefined;
      this.dispatchEvent('table:error', { error: err });
      return undefined;
    } finally {
      if (currentId === this._reqId) {
        this.isLoading = false;
        this.dispatchEvent('table:loading', { loading: false });
        this.onStateChange();
      }
    }
  }

  public renderPaginationFooter(parent: HTMLElement): void {
    const opts = this.getOptions();
    removeAllChildren(parent);
    if (opts.pagination?.enabled === false) return;

    const locale = this.getLocale();
    const info = createElement('div', 'tbl-pagination-info');
    const start = this.totalRows > 0 ? this.pageIndex * this.pageSize + 1 : 0;
    const end = Math.min((this.pageIndex + 1) * this.pageSize, this.totalRows);
    info.textContent = `${locale.pagination.showing(start, end, this.totalRows)} (${locale.pagination.page(this.pageIndex + 1, this.totalPages)})`;

    const controls = createElement('div', 'tbl-pagination-controls');

    // First (<<)
    const firstBtn = createElement('button', 'tbl-btn tbl-btn-sm', { type: 'button', disabled: this.pageIndex === 0 });
    firstBtn.textContent = '«';
    firstBtn.title = 'First Page';
    firstBtn.addEventListener('click', () => this.goToPage(0));
    controls.appendChild(firstBtn);

    // Prev (<)
    const prevBtn = createElement('button', 'tbl-btn tbl-btn-sm', { type: 'button', disabled: this.pageIndex === 0 });
    prevBtn.textContent = `‹ ${locale.pagination.prev}`;
    prevBtn.addEventListener('click', () => this.goToPage(this.pageIndex - 1));
    controls.appendChild(prevBtn);

    // Numbered Buttons with smart windowing
    const pageWindow = 2;
    for (let p = 0; p < this.totalPages; p++) {
      if (p === 0 || p === this.totalPages - 1 || (p >= this.pageIndex - pageWindow && p <= this.pageIndex + pageWindow)) {
        const btn = createElement('button', 'tbl-btn tbl-btn-sm', { type: 'button' });
        btn.textContent = String(p + 1);
        if (p === this.pageIndex) {
          btn.style.backgroundColor = 'var(--pdg-primary, #2563eb)';
          btn.style.color = '#ffffff';
          btn.style.fontWeight = 'bold';
        }
        const target = p;
        btn.addEventListener('click', () => this.goToPage(target));
        controls.appendChild(btn);
      } else if ((p === this.pageIndex - pageWindow - 1 && p > 0) || (p === this.pageIndex + pageWindow + 1 && p < this.totalPages - 1)) {
        const ellipsis = createElement('span');
        ellipsis.textContent = '…';
        ellipsis.style.padding = '0 0.25rem';
        ellipsis.style.color = 'var(--tbl-text-muted, #64748b)';
        controls.appendChild(ellipsis);
      }
    }

    // Next (>)
    const nextBtn = createElement('button', 'tbl-btn tbl-btn-sm', { type: 'button', disabled: this.pageIndex >= this.totalPages - 1 });
    nextBtn.textContent = `${locale.pagination.next} ›`;
    nextBtn.addEventListener('click', () => this.goToPage(this.pageIndex + 1));
    controls.appendChild(nextBtn);

    // Last (>>)
    const lastBtn = createElement('button', 'tbl-btn tbl-btn-sm', { type: 'button', disabled: this.pageIndex >= this.totalPages - 1 });
    lastBtn.textContent = '»';
    lastBtn.title = 'Last Page';
    lastBtn.addEventListener('click', () => this.goToPage(this.totalPages - 1));
    controls.appendChild(lastBtn);

    // Page size dropdown
    const select = createElement('select', 'tbl-btn tbl-btn-sm');
    select.style.marginLeft = '0.5rem';
    this.pageSizes.forEach((sz) => {
      const opt = createElement('option');
      opt.value = String(sz);
      opt.textContent = `${sz} ${locale.pagination.rowsPerPage}`;
      if (sz === this.pageSize) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => this.setPageSize(Number(select.value)));
    controls.appendChild(select);

    parent.appendChild(info);
    parent.appendChild(controls);
  }
}
