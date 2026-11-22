# arame-data-grid-pro

A fast, lightweight, and customizable data table library for the modern web.

<p align="center">
  <a href="https://www.npmjs.com/package/arame-data-grid-pro"><strong>📦 npm Package</strong></a> •
  <a href="https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/index.html"><strong>🚀 Live Demos & Gallery (One-Click)</strong></a> •
  <a href="https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/docs.html"><strong>📖 Interactive Docs</strong></a> •
  <a href="https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/configurable-table-demo.html"><strong>⚙️ Configurable Playground</strong></a>
</p>

---

### Quick Demo Links

Explore all 15 pre-built standalone HTML demos (open directly with zero build tools required):

| Demo | Description | 🚀 Live Browser Demo | 📄 Source Code |
| :--- | :--- | :--- | :--- |
| 🎨 **Navigation Hub** | Visual catalog of all components | [**Open Live Demo**](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/index.html) | [`examples/vanilla/index.html`](examples/vanilla/index.html) |
| 📖 **Documentation Guide** | Comprehensive beginner & API guide | [**Open Live Demo**](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/docs.html) | [`examples/vanilla/docs.html`](examples/vanilla/docs.html) |
| ⚙️ **Configurable Studio** | Live feature toggles & playground | [**Open Live Demo**](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/configurable-table-demo.html) | [`examples/vanilla/configurable-table-demo.html`](examples/vanilla/configurable-table-demo.html) |
| ⚡ **Core Data Grid** | Default search, sort, pagination, drag & drop | [**Open Live Demo**](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/core-grid-demo.html) | [`examples/vanilla/core-grid-demo.html`](examples/vanilla/core-grid-demo.html) |
| 📌 **Sticky Column Table** | Pinned columns with scroll elevation drop-shadows | [**Open Live Demo**](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/sticky-table-demo.html) | [`examples/vanilla/sticky-table-demo.html`](examples/vanilla/sticky-table-demo.html) |
| 📂 **Expandable Row Table** | Master-detail expandable nested records | [**Open Live Demo**](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/expandable-table-demo.html) | [`examples/vanilla/expandable-table-demo.html`](examples/vanilla/expandable-table-demo.html) |
| 👁️ **Column Visibility Table** | Dropdown menu to show/hide columns with persistence | [**Open Live Demo**](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/column-visibility-demo.html) | [`examples/vanilla/column-visibility-demo.html`](examples/vanilla/column-visibility-demo.html) |
| 🔍 **Filterable Table** | Multi-column client filters (Text, Select, Range, Date) | [**Open Live Demo**](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/filterable-table-demo.html) | [`examples/vanilla/filterable-table-demo.html`](examples/vanilla/filterable-table-demo.html) |
| ✏️ **Editable Table** | In-place double-click editing with live validation | [**Open Live Demo**](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/editable-table-demo.html) | [`examples/vanilla/editable-table-demo.html`](examples/vanilla/editable-table-demo.html) |
| 📑 **Row-Grouped Table** | Multi-level collapsible category groupings | [**Open Live Demo**](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/grouped-table-demo.html) | [`examples/vanilla/grouped-table-demo.html`](examples/vanilla/grouped-table-demo.html) |
| 📋 **Context Menu Table** | Header column menus and row action right-click context menus | [**Open Live Demo**](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/context-menu-table-demo.html) | [`examples/vanilla/context-menu-table-demo.html`](examples/vanilla/context-menu-table-demo.html) |
| 📜 **Infinite Scrolling** | Virtualized endless scrolling dataset | [**Open Live Demo**](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/infinite-table-demo.html) | [`examples/vanilla/infinite-table-demo.html`](examples/vanilla/infinite-table-demo.html) |
| 💰 **Calculated Payroll Table** | Reactive formula calculations (Salary, Bonus, Net Pay) | [**Open Live Demo**](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/calculated-table-demo.html) | [`examples/vanilla/calculated-table-demo.html`](examples/vanilla/calculated-table-demo.html) |
| 🏷️ **Header Filter Table** | Filter controls integrated directly into header cells | [**Open Live Demo**](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/header-filter-table-demo.html) | [`examples/vanilla/header-filter-table-demo.html`](examples/vanilla/header-filter-table-demo.html) |
| 🌲 **Tree Data Table** | Hierarchical parent-child nested folder structures | [**Open Live Demo**](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/tree-table-demo.html) | [`examples/vanilla/tree-table-demo.html`](examples/vanilla/tree-table-demo.html) |
| 🎯 **Advanced Filter Table** | Visual rule builder supporting complex AND/OR rules | [**Open Live Demo**](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/advanced-filter-table-demo.html) | [`examples/vanilla/advanced-filter-table-demo.html`](examples/vanilla/advanced-filter-table-demo.html) |
| 🌐 **Server-Side Data Grid** | Remote server latency simulation with cancelable searches | [**Open Live Demo**](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/server-demo.html) | [`examples/vanilla/server-demo.html`](examples/vanilla/server-demo.html) |

---

## Introduction

**`arame-data-grid-pro`** is an enterprise-ready, high-performance data grid component designed for web applications that require fast, flexible, and interactive tabular data presentation. Built on native W3C **Web Components (Custom Elements v1)** with TypeScript, it runs anywhere without framework lock-in—whether in plain vanilla HTML, Next.js, React, Vue, Svelte, or Angular.

### Application Overview
The component solves the common challenge of rendering, filtering, sorting, and editing complex datasets without pulling in massive UI libraries or external dependencies. It ships with 15 specialized table variations covering diverse real-world use cases:
- **Enterprise Operations & Dashboards**: Instant global searching, multi-column sorting with priority badges, and windowed pagination (`«`, `»`, `…`).
- **Data Editing & Calculations**: In-place double-click editing with instant recalculation of dependent formula columns (such as payroll, bonuses, and tax deductions).
- **Advanced Navigation & Structure**: Master-detail row expansion, hierarchical parent-child tree navigation, and frozen sticky columns with automatic scroll elevation drop-shadows.
- **Enterprise Security & Reliability**: Comprehensive mitigations for CSV Formula Injection (CWE-1236) across all export utilities, Prototype Pollution protection (CWE-1321) across all nested dotted property resolvers, and normalized directional null/undefined sorting.

---

## What is this library for?

When building web applications, you often need to show lists of items—such as users, orders, products, or financial records. 

`arame-data-grid-pro` gives you ready-to-use tables with built-in:
- **Interactive Column Resizing**: Draggable header border handles with double-click auto-fit to longest cell content.
- **Pinned Footer Aggregations**: Live summary row (`SUM`, `AVG`, `MIN`, `MAX`, `COUNT`) pinned at the bottom of the table.
- **State Persistence**: Automatic sync of user customizations (column widths, ordering, visibility, sorts, and search) to `localStorage`.
- **Clipboard TSV Copy (Excel / Google Sheets)**: Copy selected rows to system clipboard (<kbd>Ctrl</kbd>+<kbd>C</kbd> or action bar) for instant pasting directly into spreadsheets without downloading files.
- **Right-Column Actions Pinning**: Freeze the Actions column (`stickyActions`) on the right edge with drop-shadow scroll indicators.
- **Bulk Batch Edit**: Modal dialog to batch-update values across multiple selected records in a single action.
- **Search**: Quickly find rows by typing in a search box.
- **Sorting**: Multi-column sorting with priority badges (`▲ (1)`, `▼ (2)`).
- **Pagination**: Break large lists into numbered pages with «, », and ellipsis windowing.
- **Selection & Batch Actions**: Single/multi-row checkbox selection with `grid.getSelectedRows()`, batch deletion, and CSV export.
- **Inline Editing**: Double-click cells to edit numbers or text on the fly with instant recalculation.
- **Row & Column Reordering**: Drag and drop rows or columns with your mouse or accessible keyboard arrows.
- **Sticky Columns**: Solid opaque pinning with automatic horizontal scroll drop-shadows.
- **Security Protections**: Built-in CSV formula injection protection (CWE-1236) and prototype pollution prevention.
- **15 Specialized Table Variations**: Pre-built tables for sticky columns, expandable details, tree hierarchies, live payroll calculations, and more.

---

## Key Terms Explained Simply

If you are new to web development, here are plain explanations of terms you will see in this guide:

- **Web Component / Custom Element**: A special, reusable HTML tag defined in JavaScript (like `<pro-data-grid>`). Once registered, the browser treats it just like a native `<button>` or `<table>`.
- **Client-Side Data**: All data is already loaded in your user's browser memory (good for hundreds or a few thousand rows). The browser handles searching, sorting, and page splitting instantly.
- **Server-Side Data**: The data lives on a remote computer or database (good for millions of rows). The table asks your server for only 10 or 25 rows at a time when the user types in the search box or changes pages.
- **Debounce (`searchDebounceMs`)**: When someone types quickly, "debounce" waits a short moment (e.g., 300 milliseconds) before running the search, so it doesn't fire requests on every single keystroke.
- **AbortSignal**: A browser helper that cancels older search requests if the user types a new letter before the previous search finishes.
- **Events**: Signals the table sends out when something happens (e.g., when a user clicks a row, saves an edit, or deletes an item).

---

## Prerequisites & Environment Requirements

Before using or integrating `arame-data-grid-pro`, ensure your development and runtime environments meet the following criteria:

### 1. Browser Support (Client Runtime)
Because the library is built on standard native W3C Web Components (Custom Elements v1 & Shadow DOM / Light DOM), it runs on all evergreen desktop and mobile browsers without polyfills:
- **Google Chrome**: Version 75+ (or any Chromium-based browser like Microsoft Edge, Brave, Opera)
- **Mozilla Firefox**: Version 63+
- **Apple Safari**: Version 12.1+ (macOS & iOS)
- **Android WebView & Chrome**: Android 7.0+

> **Zero External UI Dependencies**: No external CSS libraries (Bootstrap, Tailwind, Material) or runtime frameworks (React, Vue, Angular) are required.

### 2. Development Environment (Build & Package Manager)
If you are compiling, testing, or contributing to the library source:
- **Node.js**: `v18.0.0` or higher (recommended: Node LTS v20+)
- **Package Manager**: Any standard package manager:
  - `npm` (v9+)
  - `pnpm` (v8+)
  - `yarn` (v1.22+ or Berry)
- **TypeScript**: `v5.0+` (if integrating in a TypeScript project for full type safety with `ColumnDef<T>` and `GridOptions<T>`)

### 3. Local Offline / Zero-CORS Mode
- **Zero Build / Standalone Mode**: No build tools, bundlers, or local HTTP servers are needed to test the demos. You can open any demo in `examples/vanilla/*.html` directly via the `file:///` protocol in your browser.

---

## 5-Minute Quick Start

Here is a complete, working HTML example. You can copy and save this file as `table.html` and open it directly in any browser:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Quick Start Data Grid</title>
  <!-- Load the stylesheet -->
  <link rel="stylesheet" href="./dist/styles.css" />
</head>
<body style="font-family: sans-serif; padding: 2rem;">

  <h1>Employee Directory</h1>

  <!-- 1. Place the custom tag on the page -->
  <pro-data-grid id="myGrid"></pro-data-grid>

  <!-- 2. Set up columns and rows using JavaScript -->
  <script type="module">
    import './dist/index.js';

    const grid = document.getElementById('myGrid');

    // Define the columns you want to display
    grid.columns = [
      { id: 'id', header: 'ID', field: 'id', width: '80px' },
      { id: 'name', header: 'Full Name', field: 'name', sortable: true },
      { id: 'role', header: 'Department Role', field: 'role', sortable: true },
      { 
        id: 'salary', 
        header: 'Annual Salary', 
        field: 'salary', 
        sortable: true,
        formatter: (val) => `$${Number(val).toLocaleString()}`
      }
    ];

    // Supply your row data
    grid.rows = [
      { id: '1', name: 'Alice Walker', role: 'Engineering Lead', salary: 145000 },
      { id: '2', name: 'Brian Miller', role: 'Product Manager', salary: 130000 },
      { id: '3', name: 'Clara Patel', role: 'UI/UX Designer', salary: 115000 },
      { id: '4', name: 'David Kim', role: 'Backend Developer', salary: 122000 }
    ];
  </script>
</body>
</html>
```

---

## Installation

### Option 1: Install using a package manager

If you are using Node.js, Next.js, or Vite, install the library locally:

```bash
# Using npm
npm install arame-data-grid-pro

# Using pnpm
pnpm add arame-data-grid-pro

# Using yarn
yarn add arame-data-grid-pro
```

### Option 2: Use directly in standard HTML (Zero Build Step)

You do not need a bundler or compiler. You can open any of the standalone HTML demos in `examples/vanilla/` directly by double-clicking them in your file explorer.

---

## Step-by-Step Guide

### Step 1: Defining Columns

Columns tell the table which data fields to display, how headers should look, and which features are enabled.

```javascript
grid.columns = [
  {
    id: 'name',          // Unique identifier for this column
    header: 'User Name', // Title shown at the top of the column
    field: 'name',       // Key name in your row data objects
    sortable: true,      // Let users click the header to sort A-Z / Z-A
    editable: true,      // Let users double-click to edit cell text
    width: '200px'       // Optional column width
  }
];
```

### Step 2: Providing Row Data

Row data is a simple JavaScript array of objects. Each object should have a unique `id` property:

```javascript
grid.rows = [
  { id: '101', name: 'Sarah Connor', status: 'Active' },
  { id: '102', name: 'John Connor', status: 'Pending' }
];
```

### Step 3: Configuring Table Options

Customize how your table behaves using the `.options` object:

```javascript
grid.options = {
  pagination: true,           // Show page numbers and next/previous buttons
  pageSize: 10,               // Number of rows to show per page
  searchable: true,           // Show the global search text box
  editable: true,             // Enable in-place cell editing
  deletable: true,            // Show a delete button on each row
  confirmDelete: true,        // Ask for confirmation before deleting a row
  rowReordering: true,        // Allow dragging rows up and down
  columnReordering: true      // Allow dragging column headers left and right
};
```

---

## Loading Data: Client-Side vs. Server-Side

### 1. In-Memory Client-Side Data (Default)
Assign your full dataset to `grid.rows`. Searching, sorting, and pagination happen immediately in the browser without any network requests.

### 2. Remote Server-Side Data Loading
When working with thousands or millions of records in a remote database, enable `serverSide: true` and provide a `serverDataLoader` function. The table calls this function whenever the user changes pages, types in the search box, or sorts a column.

```javascript
grid.options = {
  serverSide: true,
  searchDebounceMs: 300,              // Wait 300ms after typing before requesting data
  keepPreviousDataWhileLoading: true, // Keep existing rows visible while fetching new ones

  serverDataLoader: async (params) => {
    // params contains: pageIndex, pageSize, globalSearch, sortCriteria, and signal

    // 1. Send query parameters to your backend API
    const url = `/api/employees?page=${params.pageIndex}&limit=${params.pageSize}&search=${encodeURIComponent(params.globalSearch)}`;
    
    // 2. Pass params.signal so slow or outdated searches get cancelled automatically
    const response = await fetch(url, { signal: params.signal });
    const data = await response.json();

    // 3. Return the rows for this page and the total count of matching records
    return {
      rows: data.items,        // Array of rows for current page
      totalRows: data.total    // Total number of rows in the whole database
    };
  }
};
```

---

## Listening to Events

The table emits standard browser `CustomEvent` events when users interact with it. You can listen to them using standard `.addEventListener()`:

```javascript
// 1. When a user selects or unselects rows with checkboxes
grid.addEventListener('pdg:select', (event) => {
  const { selectedIds, selectedRows } = event.detail;
  console.log('Selected row IDs:', selectedIds);
});

// 2. When a user edits a cell and presses Enter or clicks away
grid.addEventListener('pdg:edit-save', (event) => {
  const { rowId, columnId, newValue, oldValue } = event.detail;
  console.log(`Saved row ${rowId}: changed ${columnId} to "${newValue}"`);
});

// 3. When a user clicks the delete button for a row
grid.addEventListener('pdg:delete', (event) => {
  const { rowId, row } = event.detail;
  console.log('User deleted row:', rowId);
});

// 4. When a user changes the sort column or direction
grid.addEventListener('pdg:sort', (event) => {
  console.log('Current sort criteria:', event.detail.criteria);
});
```

---

## Working with Selected Items & Batch Actions

When row selection is enabled (`selectable: true`), you can react to selection changes, retrieve full row objects, and run bulk actions:

```javascript
// 1. Listen for selection changes in real-time
grid.addEventListener('pdg:select', (event) => {
  const selectedIds = event.detail.selectedIds; // e.g. ['1', '3']
  console.log(`${selectedIds.length} rows selected:`, selectedIds);

  // Toggle batch action button state
  const btnBatch = document.getElementById('btnBatchAction');
  if (btnBatch) btnBatch.disabled = selectedIds.length === 0;
});

// 2. Retrieve the complete row data records for selected items
const selectedRows = grid.getSelectedRows();
console.log('Selected row records:', selectedRows);

// 3. Programmatic selection controls & batch deletion
grid.selectAll();          // Selects all currently filtered rows
grid.deleteSelectedRows(); // Removes selected rows and updates UI
grid.clearSelection();     // Deselects all rows
```

---

## Using with Next.js App Router (React)

Because Web Components use browser APIs (`customElements` and `window`), you should use them inside client components in Next.js:

```tsx
// app/dashboard/page.tsx
'use client';

import { useEffect, useRef } from 'react';
// Imports and registers the custom element in the browser
import 'arame-data-grid-pro';
import 'arame-data-grid-pro/styles.css';

export default function EmployeePage() {
  const gridRef = useRef<any>(null);

  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.columns = [
        { id: 'id', header: 'ID', field: 'id' },
        { id: 'name', header: 'Name', field: 'name', sortable: true },
        { id: 'department', header: 'Department', field: 'dept' }
      ];

      gridRef.current.rows = [
        { id: '1', name: 'Jordan Hayes', dept: 'Operations' },
        { id: '2', name: 'Taylor Reed', dept: 'Marketing' }
      ];
    }
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Employee List</h2>
      <pro-data-grid ref={gridRef}></pro-data-grid>
    </div>
  );
}
```

---

## Complete API Reference

### Column Definition Properties (`ColumnDef<T>`)

Each column passed into `grid.columns = [...]` supports the following properties:

| Property | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | **Required.** Unique key identifier for the column. |
| `header` | `string` | Display label rendered inside the column header cell. |
| `field` | `keyof T \| string` | Data path on the row object (supports nested dotted keys, e.g., `'address.city'`). |
| `width` | `string` | Optional CSS column width (e.g., `'120px'`, `'25%'`). |
| `sortable` | `boolean` | Allows users to click the column header to sort ascending or descending. |
| `editable` | `boolean` | Allows in-place cell editing on double-click or <kbd>Enter</kbd>. |
| `visible` | `boolean` | Determines if the column is displayed (`false` hides the column). |
| `calculate` | `(row: T) => any` | Reactive formula function recalculated when dependent editable fields change. |
| `formatter` | `(value: any, row: T) => string` | Formats the raw value for display without altering underlying data. |
| `renderer` | `(value: any, row: T, idx: number) => HTMLElement \| string` | Custom DOM node renderer for custom badges, status pills, or progress meters. |
| `comparator` | `(a: any, b: any, rowA: T, rowB: T) => number` | Custom sort comparator function. |

---

### Grid Options Properties (`GridOptions<T>`)

Configured via `grid.options = { ... }`:

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `pagination` | `boolean` | `true` | Enables pagination controls and page information footer. |
| `pageSize` | `number` | `10` | Number of rows displayed per page. |
| `searchable` | `boolean` | `true` | Enables the global search filter input. |
| `searchDebounceMs` | `number` | `300` | Typing delay before triggering filter/search queries. |
| `sorting` | `boolean` | `true` | Enables header click sorting. |
| `multiSort` | `boolean` | `false` | Enables multi-column sorting with priority badges (`▲ (1)`, `▼ (2)`). |
| `selectable` | `boolean` | `false` | Shows row checkboxes for selection. |
| `multiSelect` | `boolean` | `true` | Allows selecting multiple rows (set to `false` for radio-style single selection). |
| `editable` | `boolean` | `false` | Enables double-click in-place editing across editable columns. |
| `deletable` | `boolean` | `false` | Displays a delete row action button (`✕`). |
| `confirmDelete` | `boolean` | `true` | Shows confirmation prompt before removing rows. |
| `stickyFirstColumn` | `boolean` | `false` | Pins first column to `left: 0` with scroll elevation drop-shadows. |
| `stickyActions` | `boolean` | `false` | Pins Actions column to `right: 0` with scroll elevation drop-shadows. |
| `rowReordering` | `boolean` | `false` | Enables drag-and-drop row reordering with accessible keyboard controls. |
| `columnReordering` | `boolean` | `false` | Enables drag-and-drop column header reordering. |
| `expandable` | `boolean` | `false` | Enables master-detail row expansion toggles. |
| `rowDetailRenderer` | `(row: T) => HTMLElement \| string` | `undefined` | Custom renderer for expanded row content. |
| `density` | `'compact' \| 'comfortable' \| 'spacious'` | `'comfortable'` | Sets cell padding and row height. |
| `serverSide` | `boolean` | `false` | Enables remote data fetching with query params. |
| `serverDataLoader` | `(params: ServerQueryParams) => Promise<...>` | `undefined` | Async data loading hook for remote servers. |

---

### Public Grid Methods

| Method | Parameters | Return | Description |
| :--- | :--- | :--- | :--- |
| `grid.getSelectedRows()` | None | `T[]` | Returns array of full row data objects for all selected rows. |
| `grid.selectAll()` | None | `void` | Selects all currently matching rows across pages. |
| `grid.clearSelection()` | None | `void` | Deselects all rows and resets selection state. |
| `grid.deleteSelectedRows()` | None | `number` | Deletes all selected rows and returns the count of deleted items. |
| `grid.getSelectedRowsTSV()` | None | `string` | Returns tab-separated values (TSV) formatted string of selected rows for Excel. |
| `grid.copySelectionToClipboard()` | None | `Promise<boolean>` | Copies selected rows directly into system clipboard in TSV format. |
| `grid.batchUpdateSelected(updates)` | `updates: Partial<T>` | `number` | Applies updates across all selected rows and triggers re-render. |
| `grid.exportToCSV(filename?)` | `filename?: string` | `void` | Downloads current records as an injection-safe CSV file. |
| `grid.clearAllFilters()` | None | `void` | Resets all active column filters and search input. |

---

### Standard Grid Events (`pdg:*`)

Listen using standard `grid.addEventListener(eventName, handler)`:

| Event Name | Detail Payload | Description |
| :--- | :--- | :--- |
| `pdg:select` | `{ selectedIds: (string \| number)[] }` | Fired when rows are selected or deselected. |
| `pdg:sort` | `{ criteria: SortCriterion[] }` | Fired when column sorting changes. |
| `pdg:page` | `{ pageIndex: number, pageSize: number }` | Fired on page navigation or page size change. |
| `pdg:edit-save` | `{ rowId, columnId, oldValue, newValue }` | Fired when a cell edit is committed. |
| `pdg:delete` | `{ rowId, row }` | Fired when a row is removed. |
| `pdg:row-expand` | `{ rowId, expanded, row }` | Fired when a row is expanded or collapsed. |
| `pdg:row-reorder` | `{ fromIndex, toIndex, row }` | Fired when a row is moved to a new index. |
| `pdg:column-reorder` | `{ fromIndex, toIndex, column }` | Fired when a column is rearranged. |

---

## Security & Reliability Standards

`arame-data-grid-pro` is engineered to comply with enterprise web application security benchmarks:

### 1. CSV Formula Injection Defense (CWE-1236)
Spreadsheet applications (Excel, Google Sheets, Calc) automatically evaluate cells starting with execution operators (`=`, `+`, `-`, `@`, tab `\t`, carriage return `\r`) as formulas. In `exportToCSV()`, `universal-exporter`, and `exportTreeToCsv()`, values beginning with formula operators are safely escaped with a leading single quote (`'`) inside RFC-4180-compliant quotation marks:
```typescript
if (/^[=+\-@\t\r]/.test(str)) {
  str = `'${str}`;
}
```

### 2. Prototype Pollution Prevention (CWE-1321)
All deep-property resolution functions (`resolveValue`) traversing dotted field paths (e.g., `'profile.address.city'`) explicitly block toxic traversal properties:
- `__proto__`
- `constructor`
- `prototype`

Attempts to traverse or access object prototypes return `undefined` immediately, shielding client applications from remote state tampering.

### 3. Null & Undefined Directional Sort Predictability
Sort algorithms across all modules guarantee that empty, null, or undefined data consistently position at the end of sorted datasets for both ascending (`asc`) and descending (`desc`) sort requests without inverting or polluting record displays.

### 4. Zero-CORS, Zero-Bundler Architecture
All demos and components run natively across both `http://` / `https://` servers and local `file:///` protocols without triggering Cross-Origin Resource Sharing (CORS) exceptions.

---

## Exploring the Table Demos & Gallery

This repository includes 15 interactive demos you can inspect, test, and adapt for your own apps. All demos are 100% self-contained with inline scripts and styles, meaning you can open them directly with `file:///` by double-clicking them in your file manager—no local HTTP server or build step required.

### How to use the Demo Gallery:
Open [`examples/vanilla/index.html`](examples/vanilla/index.html) in your browser. It provides a visual hub showcasing every table variation with descriptions and direct links.

### How to use the Configurable Table Demo:
Open [`examples/vanilla/configurable-table-demo.html`](examples/vanilla/configurable-table-demo.html). It includes an interactive settings sidebar where you can toggle search, pagination, row selection, row & column drag and drop, density, and borders in real time to see how the table responds.

### Pre-Built Table Demos:
1. **Core Data Grid** ([Live Demo](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/core-grid-demo.html) • [Source](examples/vanilla/core-grid-demo.html)): The standard grid with search, sort, pagination, and multi-row selection.
2. **Sticky Column Table** ([Live Demo](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/sticky-table-demo.html) • [Source](examples/vanilla/sticky-table-demo.html)): Keeps key columns pinned on the left or right while you scroll horizontally.
3. **Expandable Row Table** ([Live Demo](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/expandable-table-demo.html) • [Source](examples/vanilla/expandable-table-demo.html)): Click any row to expand and view nested details or sub-records.
4. **Column Visibility Table** ([Live Demo](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/column-visibility-demo.html) • [Source](examples/vanilla/column-visibility-demo.html)): Includes a dropdown menu to show or hide specific columns.
5. **Filtering Table** ([Live Demo](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/filterable-table-demo.html) • [Source](examples/vanilla/filterable-table-demo.html)): Filter rows using column criteria like "starts with", "greater than", or "equals".
6. **Editable Table** ([Live Demo](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/editable-table-demo.html) • [Source](examples/vanilla/editable-table-demo.html)): Direct double-click in-place editing with built-in validation messages.
7. **Row-Grouped Table** ([Live Demo](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/grouped-table-demo.html) • [Source](examples/vanilla/grouped-table-demo.html)): Groups records together under collapsible category headers.
8. **Context Menu Table** ([Live Demo](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/context-menu-table-demo.html) • [Source](examples/vanilla/context-menu-table-demo.html)): Right-click rows to display a contextual action menu (edit, duplicate, delete).
9. **Infinite Scrolling Table** ([Live Demo](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/infinite-table-demo.html) • [Source](examples/vanilla/infinite-table-demo.html)): Automatically loads more rows as you scroll down instead of using page buttons.
10. **Calculated Payroll Table** ([Live Demo](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/calculated-table-demo.html) • [Source](examples/vanilla/calculated-table-demo.html)): Professional payroll table that recalculates total compensation instantly when salary or bonus inputs change.
11. **Header Filter Table** ([Live Demo](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/header-filter-table-demo.html) • [Source](examples/vanilla/header-filter-table-demo.html)): Filter inputs embedded directly in each column header.
12. **Tree Data Table** ([Live Demo](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/tree-table-demo.html) • [Source](examples/vanilla/tree-table-demo.html)): Displays hierarchical folder structures and parent-child records.
13. **Advanced Filter Table** ([Live Demo](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/advanced-filter-table-demo.html) • [Source](examples/vanilla/advanced-filter-table-demo.html)): Visual filter builder supporting complex `AND`/`OR` logic rules.
14. **Configurable Playground** ([Live Demo](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/configurable-table-demo.html) • [Source](examples/vanilla/configurable-table-demo.html)): Interactive controls to customize options dynamically.
15. **Server-Side Data Grid** ([Live Demo](https://htmlpreview.github.io/?https://github.com/arame-admin/arame-data-grid-pro/blob/main/examples/vanilla/server-demo.html) • [Source](examples/vanilla/server-demo.html)): Live server simulation with debounced search and cancelable requests.

---

## Simple Troubleshooting

### 1. "Access to script at 'file:///...' has been blocked by CORS policy"
- **Why this happens**: Some web browsers block JavaScript `import` statements when opening files locally using `file:///`.
- **How to fix it**: All vanilla HTML demo files in `examples/vanilla/*.html` have their code self-contained inside inline `<script>` tags so they work immediately when double-clicked. If you are writing your own files with `import`, run a simple local web server like `npx serve` or `python -m http.server`.

### 2. "window is not defined" or "customElements is not defined" in Next.js
- **Why this happens**: Next.js tries to render components on your server (Node.js) where there is no browser `window` or `document`.
- **How to fix it**: Add `'use client';` at the top of your component file, and set up your columns and rows inside a `useEffect()` hook.

### 3. The table looks unstyled or lacks colors
- **Why this happens**: The CSS stylesheet was not loaded.
- **How to fix it**: Make sure to import or link `arame-data-grid-pro/styles.css` (or `<link rel="stylesheet" href="./dist/styles.css" />`).

---

## Development & Test Commands

To build or test the library locally:

```bash
# Build the library and compile type declarations
npm run build

# Run unit tests
npm test

# Check for TypeScript errors
npm run typecheck
```

---

## License

Copyright (c) 2026 Arame Global.

This project is licensed under the [MIT License](LICENSE).

