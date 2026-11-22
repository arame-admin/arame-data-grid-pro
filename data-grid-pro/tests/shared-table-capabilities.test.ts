import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TableSelectionManager } from '../src/common/selection-manager.js';
import {
  LocalStorageStateAdapter,
  UrlSearchParamsStateAdapter,
  TableState
} from '../src/common/table-state-manager.js';
import {
  generateCsvString,
  escapeCsvValue,
  triggerCsvExport
} from '../src/common/universal-exporter.js';
import { LiveRegionAnnouncer, handleGridCellKeyboardNav } from '../src/common/accessibility-helpers.js';
import { defaultEnglishLocale } from '../src/common/table-localization.js';

describe('Shared Cross-Cutting Table Capabilities', () => {
  describe('Selection & Bulk Actions (TableSelectionManager)', () => {
    let selection: TableSelectionManager;

    beforeEach(() => {
      selection = new TableSelectionManager({ mode: 'multiple', preserveAcrossPages: true });
    });

    it('toggles selection and supports single/multiple modes', () => {
      selection.toggle('row-1');
      expect(selection.isSelected('row-1')).toBe(true);
      expect(selection.count).toBe(1);

      selection.toggle('row-2');
      expect(selection.count).toBe(2);

      // Switch to single mode: only 1 remains
      selection.mode = 'single';
      expect(selection.count).toBe(1);

      selection.select('row-3');
      expect(selection.isSelected('row-3')).toBe(true);
      expect(selection.count).toBe(1);
    });

    it('supports selecting all visible and checking indeterminate state', () => {
      const visible = ['r-1', 'r-2', 'r-3'];
      selection.selectAllVisible(visible);
      expect(selection.areAllVisibleSelected(visible)).toBe(true);
      expect(selection.isSomeVisibleSelected(visible)).toBe(false);

      selection.deselect('r-2');
      expect(selection.areAllVisibleSelected(visible)).toBe(false);
      expect(selection.isSomeVisibleSelected(visible)).toBe(true);

      selection.deselectAllVisible(visible);
      expect(selection.count).toBe(0);
    });

    it('clears or preserves selections on data invalidation based on config', () => {
      selection.select('r-1');
      selection.onDataInvalidated(); // preserveAcrossPages: true
      expect(selection.count).toBe(1);

      const noPreserve = new TableSelectionManager({ preserveAcrossPages: false });
      noPreserve.select('r-1');
      noPreserve.onDataInvalidated();
      expect(noPreserve.count).toBe(0);
    });
  });

  describe('Universal CSV Export (UniversalExporter)', () => {
    interface TestData {
      id: string;
      title: string;
      price: number;
    }

    const testRows: TestData[] = [
      { id: '1', title: 'Widget, Deluxe', price: 99.99 },
      { id: '2', title: 'Standard "Pro" Kit\nSpecial', price: 150.00 }
    ];

    const columns = [
      { id: 'id', header: 'ID', field: 'id' as const },
      { id: 'title', header: 'Item Name', field: 'title' as const },
      { id: 'price', header: 'Price ($)', field: 'price' as const, formatter: (val: number) => `$${val.toFixed(2)}` }
    ];

    it('escapes delimiters, quotes, and newlines correctly', () => {
      expect(escapeCsvValue('Simple')).toBe('Simple');
      expect(escapeCsvValue('Comma, Value')).toBe('"Comma, Value"');
      expect(escapeCsvValue('Quote "Inside"')).toBe('"Quote ""Inside"""');
    });

    it('generates well-formed CSV strings with formatting', () => {
      const csv = generateCsvString(testRows, columns);
      expect(csv).toContain('Item Name');
      expect(csv).toContain('"Widget, Deluxe"');
      expect(csv).toContain('$99.99');
      expect(csv).toContain('"Standard ""Pro"" Kit\nSpecial"');
    });

    it('supports serverFetchAll hook for exporting entire remote datasets without silent auto-load', async () => {
      const mockServerFetch = vi.fn().mockResolvedValue([
        { id: 'server-1', title: 'Server Item', price: 500 }
      ]);

      const csv = await triggerCsvExport(testRows, columns, {
        download: false,
        serverFetchAll: mockServerFetch
      });

      expect(mockServerFetch).toHaveBeenCalledTimes(1);
      expect(csv).toContain('Server Item');
      expect(csv).not.toContain('Widget, Deluxe');
    });
  });

  describe('State Management & Pluggable Storage Adapters', () => {
    it('saves and loads state via LocalStorageStateAdapter safely', () => {
      const adapter = new LocalStorageStateAdapter();
      const mockState: TableState = {
        pagination: { pageIndex: 2, pageSize: 25 },
        sorting: { criteria: [{ columnId: 'price', direction: 'asc' }] },
        search: { query: 'test query' },
        filters: { columnFilters: {} },
        selection: { selectedRowIds: ['1', '2'] },
        columns: { order: ['id', 'price'], visibility: {}, widths: {} }
      };

      adapter.save('test_state_key', mockState);
      const loaded = adapter.load('test_state_key');
      expect(loaded?.search?.query).toBe('test query');
      expect(loaded?.pagination?.pageIndex).toBe(2);

      adapter.clear('test_state_key');
      expect(adapter.load('test_state_key')).toBeNull();
    });
  });

  describe('Accessibility & Keyboard Navigation Helpers', () => {
    it('creates an accessible live region for screen-reader announcements', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const announcer = new LiveRegionAnnouncer(container);

      announcer.announce('Loaded 25 records');
      await new Promise(r => setTimeout(r, 60));

      const liveEl = container.querySelector('[aria-live="polite"]');
      expect(liveEl).toBeTruthy();
      expect(liveEl?.textContent).toBe('Loaded 25 records');

      announcer.destroy();
      expect(container.querySelector('[aria-live]')).toBeNull();
    });

    it('navigates grid cells with arrow keys and home/end', () => {
      const focusSpy = vi.fn();
      const evtRight = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      vi.spyOn(evtRight, 'preventDefault');

      const handled = handleGridCellKeyboardNav(evtRight, 0, 0, 5, 5, focusSpy);
      expect(handled).toBe(true);
      expect(evtRight.preventDefault).toHaveBeenCalled();
      expect(focusSpy).toHaveBeenCalledWith(0, 1);
    });
  });

  describe('Localization Support', () => {
    it('provides standard English locale formatters', () => {
      expect(defaultEnglishLocale.pagination.showing(1, 10, 50)).toBe('Showing 1 to 10 of 50 entries');
      expect(defaultEnglishLocale.selection.selectedCount(5)).toBe('5 selected');
    });
  });
});
