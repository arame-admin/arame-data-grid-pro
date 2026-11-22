import {
  Density,
  EditableColumnDef,
  EditableTableEventPayloads,
  EditableTableOptions
} from './types.js';
import {
  BaseTableController,
  createElement,
  removeAllChildren,
  resolveValue
} from '../common/base-table-controller.js';

export class EditableDataTable<T = Record<string, any>> extends HTMLElement {
  static get observedAttributes() {
    return ['density'];
  }

  private _rows: T[] = [];
  private _columns: EditableColumnDef<T>[] = [];
  private _options: EditableTableOptions<T> = {
    rowIdKey: 'id',
    density: 'comfortable',
    optimisticUpdates: true,
    editOnSingleClick: false,
    emptyMessage: 'No records available.'
  };

  private _controller!: BaseTableController<T>;
  private _editingCell: { rowId: string | number; columnId: string; initialValue: any; currentValue: any } | null = null;
  private _validationError: string | null = null;

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

  get columns(): EditableColumnDef<T>[] {
    return this._columns;
  }
  set columns(val: EditableColumnDef<T>[]) {
    this._columns = Array.isArray(val) ? val : [];
    this.render();
  }

  get options(): EditableTableOptions<T> {
    return this._options;
  }
  set options(opts: Partial<EditableTableOptions<T>>) {
    this._options = { ...this._options, ...opts };
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
    this.containerEl = createElement('div', 'et-wrapper');
    this.toolbarEl = createElement('div', 'et-toolbar');
    this.tableContainerEl = createElement('div', 'et-table-container');
    this.tableEl = createElement('table', 'et-table');
    this.theadEl = createElement('thead', 'et-thead');
    this.tbodyEl = createElement('tbody', 'et-tbody');
    this.footerEl = createElement('div', 'et-pagination-footer');

    this.tableEl.appendChild(this.theadEl);
    this.tableEl.appendChild(this.tbodyEl);
    this.tableContainerEl.appendChild(this.tableEl);

    this.containerEl.appendChild(this.toolbarEl);
    this.containerEl.appendChild(this.tableContainerEl);
    this.containerEl.appendChild(this.footerEl);
    this.appendChild(this.containerEl);

    // Initialize controller for default pagination, sorting, search, and server-side loader
    this._controller = new BaseTableController<T>(
      () => this._options,
      () => this.render(),
      (name, detail) => this.dispatchGridEvent(name as any, detail)
    );
  }

  private dispatchGridEvent<K extends keyof EditableTableEventPayloads<T>>(
    eventName: K,
    detail: EditableTableEventPayloads<T>[K]
  ): void {
    this.dispatchEvent(
      new CustomEvent(eventName, {
        detail,
        bubbles: true,
        composed: true
      })
    );
  }

  public startEditing(rowId: string | number, columnId: string, row: T, currentValue: any): void {
    this._editingCell = {
      rowId,
      columnId,
      initialValue: currentValue,
      currentValue
    };
    this._validationError = null;

    this.dispatchGridEvent('editable-table:edit-start', {
      rowId,
      columnId,
      value: currentValue,
      row
    });
    this.renderBody();
  }

  public async commitEditing(row: T, col: EditableColumnDef<T>, newValue: any): Promise<void> {
    if (!this._editingCell) return;
    const rowId = this._editingCell.rowId;
    const oldValue = this._editingCell.initialValue;

    // 1. Validation Step
    if (col.validator) {
      const err = await col.validator(newValue, oldValue, row, col);
      if (err) {
        this._validationError = err;
        this.dispatchGridEvent('editable-table:validation-error', {
          rowId,
          columnId: col.id,
          error: err,
          invalidValue: newValue,
          row
        });
        this.renderBody();
        return;
      }
    }

    this._validationError = null;

    // 2. Optimistic Update
    const prevFieldValue = col.field ? (row as any)[col.field] : undefined;
    if (this._options.optimisticUpdates !== false && col.field) {
      (row as any)[col.field] = newValue;
    }

    this._editingCell = null;
    this.dispatchGridEvent('editable-table:save', {
      rowId,
      columnId: col.id,
      oldValue,
      newValue,
      row
    });

    // 3. Save Handler Callback with Error Recovery
    if (this._options.onSave) {
      try {
        await this._options.onSave({
          rowId,
          columnId: col.id,
          oldValue,
          newValue,
          row
        });
      } catch (err: any) {
        // Rollback optimistic update
        if (col.field && this._options.optimisticUpdates !== false) {
          (row as any)[col.field] = prevFieldValue;
        }
        this.dispatchGridEvent('editable-table:save-error', {
          rowId,
          columnId: col.id,
          error: err,
          attemptedValue: newValue,
          row
        });
      }
    }

    this.renderBody();
  }

  public cancelEditing(row: T, col: EditableColumnDef<T>): void {
    if (!this._editingCell) return;
    const { rowId, initialValue } = this._editingCell;
    this._editingCell = null;
    this._validationError = null;

    this.dispatchGridEvent('editable-table:cancel', {
      rowId,
      columnId: col.id,
      value: initialValue,
      row
    });
    this.renderBody();
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

    const searchInput = createElement('input', 'et-search-input', {
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
    const tr = createElement('tr', 'et-header-row');

    this._columns.forEach((col) => {
      const th = createElement('th', 'et-th');
      if (col.width) th.style.width = col.width;

      const inner = createElement('div', 'et-th-inner');
      const titleSpan = createElement('span');
      titleSpan.textContent = col.header;
      inner.appendChild(titleSpan);

      const isSortable = col.sortable !== false && this._options.sorting?.enabled !== false;
      if (isSortable) {
        th.classList.add('et-sortable');
        const active = this._controller.sortCriteria.find((c) => c.columnId === col.id);
        const icon = createElement('span', 'et-sort-icon');
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

    const rowsToDisplay = this._options.serverSide
      ? this._rows
      : this._controller.processClientData(this._rows, this._columns as any);

    if (rowsToDisplay.length === 0) {
      const trEmpty = createElement('tr', 'et-row');
      const tdEmpty = createElement('td', 'et-td', { colspan: this._columns.length });
      tdEmpty.style.textAlign = 'center';
      tdEmpty.textContent = this._options.emptyMessage || 'No records available.';
      trEmpty.appendChild(tdEmpty);
      this.tbodyEl.appendChild(trEmpty);
      return;
    }

    for (let i = 0; i < rowsToDisplay.length; i++) {
      const row = rowsToDisplay[i];
      const rowId = this.getRowId(row);
      const tr = createElement('tr', 'et-row');

      this._columns.forEach((col) => {
        const td = createElement('td', 'et-td');
        if (col.width) td.style.width = col.width;
        const val = resolveValue(row, col.field);

        const isEditingThis =
          this._editingCell &&
          this._editingCell.rowId === rowId &&
          this._editingCell.columnId === col.id;

        if (isEditingThis) {
          td.classList.add('et-cell-editing');
          this.renderCellEditor(td, row, col, val);
        } else {
          if (col.editable) {
            td.classList.add('et-cell-editable');
            td.setAttribute('tabindex', '0');
            td.setAttribute('aria-label', `${col.header}: ${val}. Press Enter to edit.`);

            const triggerEdit = (e: Event) => {
              e.stopPropagation();
              this.startEditing(rowId, col.id, row, val);
            };

            if (this._options.editOnSingleClick) {
              td.addEventListener('click', triggerEdit);
            } else {
              td.addEventListener('dblclick', triggerEdit);
            }

            td.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                this.startEditing(rowId, col.id, row, val);
              }
            });
          }

          if (col.renderer) {
            const res = col.renderer(val, row, i);
            if (typeof res === 'string') td.innerHTML = res;
            else td.appendChild(res);
          } else if (col.formatter) {
            td.textContent = col.formatter(val, row);
          } else {
            td.textContent = val == null ? '' : String(val);
          }
        }

        tr.appendChild(td);
      });

      this.tbodyEl.appendChild(tr);
    }
  }

  private renderCellEditor(td: HTMLElement, row: T, col: EditableColumnDef<T>, val: any): void {
    const wrapper = createElement('div', 'et-editor-wrapper');
    const editorConfig = col.editor || { type: 'text' };

    // Validation Error Bubble
    if (this._validationError) {
      const bubble = createElement('div', 'et-validation-error-bubble', { role: 'alert' });
      bubble.textContent = this._validationError;
      wrapper.appendChild(bubble);
    }

    if (editorConfig.customEditor) {
      const customEl = editorConfig.customEditor({
        value: val,
        row,
        column: col,
        onCommit: (newVal) => this.commitEditing(row, col, newVal),
        onCancel: () => this.cancelEditing(row, col),
        setError: (msg) => {
          this._validationError = msg;
          this.renderBody();
        }
      });
      wrapper.appendChild(customEl);
      td.appendChild(wrapper);
      return;
    }

    let inputEl: HTMLElement;

    switch (editorConfig.type) {
      case 'number': {
        const input = createElement('input', 'et-input', {
          type: 'number',
          value: val == null ? '' : String(val),
          step: editorConfig.step != null ? String(editorConfig.step) : 'any'
        }) as HTMLInputElement;
        if (editorConfig.min != null) input.min = String(editorConfig.min);
        if (editorConfig.max != null) input.max = String(editorConfig.max);
        inputEl = input;
        break;
      }
      case 'date': {
        inputEl = createElement('input', 'et-input', {
          type: 'date',
          value: val == null ? '' : String(val)
        });
        break;
      }
      case 'select': {
        const select = createElement('select', 'et-select') as HTMLSelectElement;
        (editorConfig.options || []).forEach((opt) => {
          const o = createElement('option');
          o.value = String(opt.value);
          o.textContent = opt.label;
          if (String(opt.value) === String(val)) o.selected = true;
          select.appendChild(o);
        });
        inputEl = select;
        break;
      }
      case 'checkbox': {
        inputEl = createElement('input', 'et-checkbox', {
          type: 'checkbox'
        }) as HTMLInputElement;
        (inputEl as HTMLInputElement).checked = Boolean(val);
        break;
      }
      case 'text':
      default: {
        inputEl = createElement('input', 'et-input', {
          type: 'text',
          value: val == null ? '' : String(val),
          placeholder: editorConfig.placeholder || ''
        });
        break;
      }
    }

    if (this._validationError) {
      inputEl.classList.add('et-input-error');
    }

    const getRawValue = () => {
      if (editorConfig.type === 'checkbox') return (inputEl as HTMLInputElement).checked;
      if (editorConfig.type === 'number') return (inputEl as HTMLInputElement).value === '' ? null : Number((inputEl as HTMLInputElement).value);
      return (inputEl as HTMLInputElement).value;
    };

    // Keyboard controls: Enter to save, Escape to cancel
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        this.commitEditing(row, col, getRawValue());
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.cancelEditing(row, col);
      }
    });

    inputEl.addEventListener('input', () => {
      this.dispatchGridEvent('editable-table:change', {
        rowId: this.getRowId(row),
        columnId: col.id,
        currentValue: getRawValue(),
        row
      });
    });

    wrapper.appendChild(inputEl);

    // Save and Cancel buttons
    const controls = createElement('div', 'et-editor-controls');
    const saveBtn = createElement('button', 'et-btn-save', { type: 'button', title: 'Save (Enter)' });
    saveBtn.innerHTML = '✓';
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.commitEditing(row, col, getRawValue());
    });

    const cancelBtn = createElement('button', 'et-btn-cancel', { type: 'button', title: 'Cancel (Esc)' });
    cancelBtn.innerHTML = '✕';
    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cancelEditing(row, col);
    });

    controls.appendChild(saveBtn);
    controls.appendChild(cancelBtn);
    wrapper.appendChild(controls);

    td.appendChild(wrapper);

    // Auto focus
    requestAnimationFrame(() => {
      inputEl.focus();
      if (inputEl instanceof HTMLInputElement && inputEl.type === 'text') {
        inputEl.select();
      }
    });
  }

  private renderFooter(): void {
    this._controller.renderPaginationFooter(this.footerEl);
  }

  private getRowId(row: T): string | number {
    const key = (this._options.rowIdKey as keyof T) || 'id';
    return (row as any)[key] ?? JSON.stringify(row);
  }
}

export function defineEditableDataTable(tagName = 'editable-data-table'): void {
  if (typeof window !== 'undefined' && !window.customElements.get(tagName)) {
    window.customElements.define(tagName, EditableDataTable);
  }
}
