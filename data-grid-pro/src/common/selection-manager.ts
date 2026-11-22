export type SelectionMode = 'none' | 'single' | 'multiple';

export interface SelectionState {
  selectedIds: Set<string>;
  lastSelectedId: string | null;
}

export interface SelectionOptions {
  mode?: SelectionMode;
  /**
   * Preserve selected IDs when changing pages or filtering. Default: true.
   */
  preserveAcrossPages?: boolean;
}

export class TableSelectionManager {
  private _selectedIds: Set<string> = new Set();
  private _lastSelectedId: string | null = null;
  private _mode: SelectionMode = 'multiple';
  private _preserveAcrossPages = true;

  constructor(options?: SelectionOptions) {
    if (options?.mode) this._mode = options.mode;
    if (options?.preserveAcrossPages !== undefined) this._preserveAcrossPages = options.preserveAcrossPages;
  }

  get mode(): SelectionMode {
    return this._mode;
  }

  set mode(val: SelectionMode) {
    this._mode = val;
    if (val === 'none') {
      this.clear();
    } else if (val === 'single' && this._selectedIds.size > 1) {
      // Keep only first or last
      const first = Array.from(this._selectedIds)[0];
      this._selectedIds.clear();
      if (first) this._selectedIds.add(first);
    }
  }

  get selectedIds(): string[] {
    return Array.from(this._selectedIds);
  }

  get count(): number {
    return this._selectedIds.size;
  }

  public isSelected(id: string): boolean {
    return this._selectedIds.has(id);
  }

  public select(id: string): void {
    if (this._mode === 'none') return;
    if (this._mode === 'single') {
      this._selectedIds.clear();
    }
    this._selectedIds.add(id);
    this._lastSelectedId = id;
  }

  public deselect(id: string): void {
    this._selectedIds.delete(id);
    if (this._lastSelectedId === id) {
      this._lastSelectedId = null;
    }
  }

  public toggle(id: string): boolean {
    if (this.isSelected(id)) {
      this.deselect(id);
      return false;
    } else {
      this.select(id);
      return true;
    }
  }

  /**
   * Selects all visible rows on current page or filtered view.
   */
  public selectAllVisible(visibleIds: string[]): void {
    if (this._mode === 'none') return;
    if (this._mode === 'single') {
      if (visibleIds.length > 0) this.select(visibleIds[0]);
      return;
    }
    for (const id of visibleIds) {
      this._selectedIds.add(id);
    }
  }

  /**
   * Deselects all visible rows.
   */
  public deselectAllVisible(visibleIds: string[]): void {
    for (const id of visibleIds) {
      this._selectedIds.delete(id);
    }
  }

  /**
   * Toggles selection for an entire batch (e.g. Header checkbox).
   * If all are selected -> deselects all.
   * Otherwise -> selects all.
   */
  public toggleSelectAllVisible(visibleIds: string[]): boolean {
    if (this._mode === 'none' || visibleIds.length === 0) return false;
    const allSelected = this.areAllVisibleSelected(visibleIds);
    if (allSelected) {
      this.deselectAllVisible(visibleIds);
      return false;
    } else {
      this.selectAllVisible(visibleIds);
      return true;
    }
  }

  public areAllVisibleSelected(visibleIds: string[]): boolean {
    if (visibleIds.length === 0) return false;
    return visibleIds.every((id) => this._selectedIds.has(id));
  }

  public isSomeVisibleSelected(visibleIds: string[]): boolean {
    if (visibleIds.length === 0) return false;
    const hasAny = visibleIds.some((id) => this._selectedIds.has(id));
    return hasAny && !this.areAllVisibleSelected(visibleIds);
  }

  /**
   * Clears entire selection set.
   */
  public clear(): void {
    this._selectedIds.clear();
    this._lastSelectedId = null;
  }

  /**
   * Called on page change or filter update if preserveAcrossPages is false.
   */
  public onDataInvalidated(): void {
    if (!this._preserveAcrossPages) {
      this.clear();
    }
  }
}
