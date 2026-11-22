# In-Header Filtering Data Table (`<header-filter-data-table>`)

A reusable, framework-agnostic data table Web Component in TypeScript providing **column-specific in-header filters** embedded directly within table headers below column labels and sorting controls.

---

## 🚀 Key Capabilities

- **In-Header Filters**: Each column header can configure its own dedicated filter control:
  - `text`: Instant text matching with configurable debounce delay (default `300ms`).
  - `select`: Single-choice dropdown populated with custom options.
  - `multi-select`: Multi-selection checkboxes dropdown.
  - `number-range`: Min and Max numeric inputs.
  - `date-range`: Start Date and End Date range inputs.
  - `custom`: Pluggable custom DOM renderer callback (`renderControl`).
- **Composite Filtering**: Seamlessly combines in-header filters with the global search toolbar across multiple columns.
- **Active Filter Indicators**: Visually highlights filtered column headers, presents an active filters count badge, and offers one-click per-column or global "Clear all filters" actions.
- **Default Universal Project Features**:
  - Client-side pagination with configurable page sizes.
  - Single-column sorting with clear ascending/descending visual indicators.
  - Global search field searching across all record values.
  - Draggable column width resizing that does not disturb filter controls or sticky layout.
- **Optional Server-Side Mode**:
  - Dispatches page number, page size, search term, sort rules, and active header filters directly to `dataLoader`.
  - Emits `AbortSignal` to cancel stale in-flight requests during rapid keystroke entries.
  - Disables client-side re-filtering on returned server records.
- **Responsive & Accessible**:
  - Full keyboard navigability, clear focus rings, and explicit ARIA labels.
  - Scoped CSS variables (`--hft-*`), light & dark themes, and `prefers-reduced-motion` compliance.

---

## 🛠️ Usage Example

```html
<header-filter-data-table id="myTable"></header-filter-data-table>

<script type="module">
  import 'arame-data-grid-pro/header-filter-table';

  const table = document.getElementById('myTable');

  table.columns = [
    { key: 'id', header: 'ID', width: '90px' },
    {
      key: 'name',
      header: 'Full Name',
      width: '200px',
      filter: { type: 'text', placeholder: 'Search name...' }
    },
    {
      key: 'department',
      header: 'Department',
      width: '160px',
      filter: {
        type: 'select',
        options: [
          { label: 'Engineering', value: 'Engineering' },
          { label: 'Design', value: 'Design' },
          { label: 'Sales', value: 'Sales' }
        ]
      }
    },
    {
      key: 'salary',
      header: 'Salary',
      width: '180px',
      filter: { type: 'number-range' },
      render: (val) => `$${Number(val).toLocaleString()}`
    }
  ];

  table.data = [
    { id: '1', name: 'Alice Cooper', department: 'Engineering', salary: 115000 },
    { id: '2', name: 'Bob Dylan', department: 'Design', salary: 92000 }
  ];
</script>
```

---

## 📐 Column Header Filter Configuration (`ColumnFilterConfig<T>`)

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `type` | `'text' \| 'select' \| 'multi-select' \| 'number-range' \| 'date-range' \| 'custom'` | **Required** | Filter input widget type. |
| `placeholder` | `string` | `'Filter...'` | Placeholder label for inputs. |
| `options` | `Array<{ label: string, value: any }>` | `[]` | Options for `select` and `multi-select`. |
| `debounceMs` | `number` | `300` (text), `0` (others) | Debounce delay in milliseconds before filter executes. |
| `predicate` | `(rowVal, filterVal, row) => boolean` | `undefined` | Custom client-side filter function. |
| `renderControl` | `(val, onChange) => HTMLElement` | `undefined` | Custom filter input DOM builder. |

---

## ⚙️ Options (`HeaderFilterTableOptions<T>`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `pagination.enabled` | `boolean` | `true` | Enables pagination controls. |
| `pagination.pageSize` | `number` | `10` | Rows displayed per page. |
| `sorting.enabled` | `boolean` | `true` | Enables header sort click interactions. |
| `search.enabled` | `boolean` | `true` | Enables top global search input. |
| `resizableColumns` | `boolean` | `true` | Enables column resize handles. |
| `dataLoader` | `HeaderFilterDataLoader<T>` | `undefined` | Server-side query callback. |

---

## 📡 Events

| Event Name | Detail Payload | Description |
| :--- | :--- | :--- |
| `header-filter:change` | `{ columnKey, filterValue, activeFilters }` | Dispatched when any in-header filter changes. |
| `header-filter:clear` | `{ clearedColumnKey, activeFilters }` | Dispatched when a specific column or all filters are cleared. |

---

## 🎨 CSS Variables

```css
header-filter-data-table {
  --hft-primary: #3b82f6;
  --hft-bg: #ffffff;
  --hft-header-bg: #f8fafc;
  --hft-border-color: #e2e8f0;
  --hft-text-main: #0f172a;
  --hft-text-muted: #64748b;
  --hft-filter-active-bg: #eff6ff;
  --hft-filter-active-border: #3b82f6;
}
```
