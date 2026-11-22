# Shared Cross-Cutting Data Table Primitives (`arame-data-grid-pro/common`)

This package directory contains the unified, reusable cross-cutting primitives shared across all data table components in the library.

---

## 📦 What is Provided

1. **Selection & Bulk Actions (`TableSelectionManager`)**:
   - Single and multiple row selection management.
   - Batch selection for visible records with indeterminate status check (`isSomeVisibleSelected`, `areAllVisibleSelected`).
   - Configurable selection preservation across pagination and search filters (`preserveAcrossPages`).

2. **State Management & Pluggable Storage Adapters (`table-state-manager.ts`)**:
   - Strongly typed `TableState` covering pagination, sorting, global search, column filters, selection, column ordering, and column visibility.
   - Pluggable `StateStorageAdapter` interface.
   - Built-in `LocalStorageStateAdapter` for local persistence.
   - Built-in `UrlSearchParamsStateAdapter` for synchronizing table query state directly with browser URLs without third-party router lock-in.

3. **Universal CSV Export (`universal-exporter.ts`)**:
   - Escapes delimiters, quotes, and newlines accurately according to RFC 4180.
   - Formatter callbacks for custom value serialization.
   - Optional `serverFetchAll` asynchronous callback for fetching and exporting complete datasets from the server without silent in-memory accumulation.

4. **Accessibility & Assistive Technology Helpers (`accessibility-helpers.ts`)**:
   - `LiveRegionAnnouncer`: Visually-hidden dynamic `aria-live` region for announcing record loads, sort changes, and filter updates.
   - `handleGridCellKeyboardNav`: Standard 2D grid cell keyboard navigation supporting Arrow keys, `Home`, `End`, `PageUp`, and `PageDown`.

5. **Localization & Formatting (`table-localization.ts`)**:
   - Extensible `TableLocale` interface with default English strings and function formatters.

---

## 🛠️ Usage Example

```typescript
import {
  TableSelectionManager,
  LocalStorageStateAdapter,
  triggerCsvExport,
  LiveRegionAnnouncer
} from 'arame-data-grid-pro/common';

// 1. Selection
const selection = new TableSelectionManager({ mode: 'multiple', preserveAcrossPages: true });
selection.select('row-1');
selection.toggle('row-2');
console.log('Selected count:', selection.count);

// 2. State Persistence
const storage = new LocalStorageStateAdapter();
storage.save('my_grid_state', {
  pagination: { pageIndex: 0, pageSize: 25 },
  sorting: { criteria: [{ columnId: 'name', direction: 'asc' }] },
  search: { query: 'acme' },
  filters: { columnFilters: {} },
  selection: { selectedRowIds: ['row-1'] },
  columns: { order: ['id', 'name'], visibility: {}, widths: {} }
});

// 3. Universal CSV Export
await triggerCsvExport(myRows, myColumns, {
  filename: 'clients-export.csv',
  download: true
});
```
