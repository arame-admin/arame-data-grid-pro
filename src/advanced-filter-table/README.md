# Advanced Filtering Data Table (`<advanced-filter-data-table>`)

A reusable, framework-agnostic data table component written in TypeScript using native browser Web Components. It delivers **complex boolean filter expressions** (`AND` / `OR` logic trees), **saved presets with persistence**, **quick-filter buttons**, **cascading select dependencies**, and **interactive filter chip management**.

---

## 🚀 Key Capabilities

- **Zero-`eval` Expression Engine**: Complex boolean rules and nested groups evaluated using typed, pure functions. **Never uses `eval` or `Function` constructors**, preventing arbitrary code execution.
- **`AND` / `OR` Logic Combinations**: Transparent toggle between matching all rules (`AND`) or any rule (`OR`).
- **Saved Presets**: Consumers can provide default presets, and users can save, rename, and delete custom presets with optional `localStorage` persistence.
- **Quick-Filter Pills**: One-click filter pills for immediate lookup of common queries.
- **Cascading Select Filters**: Child options dynamically re-query based on parent field selections (e.g. selecting State `CA` populates City with Californian cities).
- **Date & Numeric Rules**:
  - Date: `dateBefore`, `dateAfter`, `dateOn`, `dateBetween`, and relative date periods (`today`, `yesterday`, `last7Days`, `last30Days`, `thisMonth`, `thisYear`).
  - Numeric: `<`, `≤`, `>`, `≥`, `=`, and `between` (min/max range).
- **Removable Filter Chips**: Active rules are displayed as distinct chips that can be removed individually or cleared in bulk.
- **Universal Project Defaults**: Includes client-side pagination, single-column sorting, and debounced global search.
- **Server-Side Compatibility**: Transmits active filter expressions as structured JSON and serialized query strings via `AdvancedFilterDataLoader<T>` with `AbortSignal` cancellation.

---

## 🛠️ Usage Example

```html
<advanced-filter-data-table id="advTable"></advanced-filter-data-table>

<script type="module">
  import 'arame-data-grid-pro/advanced-filter-table';

  const table = document.getElementById('advTable');

  table.columns = [
    { key: 'name', header: 'Product Name', type: 'string' },
    { key: 'category', header: 'Category', type: 'select', options: [{ label: 'Electronics', value: 'Electronics' }] },
    { key: 'price', header: 'Price', type: 'number' },
    { key: 'releaseDate', header: 'Release Date', type: 'date' }
  ];

  table.options = {
    presets: [
      {
        id: 'high-value',
        name: 'High Value Items ($1k+)',
        expression: {
          id: 'exp-1',
          logic: 'AND',
          rules: [{ id: 'r1', field: 'price', operator: 'greaterThan', value: 1000 }]
        }
      }
    ],
    quickFilters: [
      {
        id: 'q-electronics',
        label: 'Electronics',
        expression: {
          id: 'q1',
          logic: 'AND',
          rules: [{ id: 'r2', field: 'category', operator: 'equals', value: 'Electronics' }]
        }
      }
    ]
  };

  table.data = [
    { id: '1', name: '4K Camera', category: 'Electronics', price: 1400, releaseDate: '2024-01-10' }
  ];
</script>
```

---

## 📐 Expression Format (`FilterExpressionGroup`)

```typescript
interface FilterExpressionGroup {
  id: string;
  logic: 'AND' | 'OR';
  rules: (FilterRule | FilterExpressionGroup)[];
}

interface FilterRule {
  id: string;
  field: string;
  operator: FilterOperator;
  value: unknown;
}
```

---

## ⚙️ Options (`AdvancedFilterTableOptions<T>`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `presets` | `SavedFilterPreset[]` | `[]` | Pre-configured filter presets. |
| `persistPresetsKey` | `string` | `undefined` | Key for storing user presets in `localStorage`. |
| `quickFilters` | `QuickFilterOption[]` | `[]` | Quick-search pill shortcuts. |
| `debounceMs` | `number` | `300` | Input debounce delay in milliseconds. |
| `pagination.enabled`| `boolean` | `true` | Enables pagination controls. |
| `pagination.pageSize`| `number` | `10` | Rows displayed per page. |
| `sorting.enabled` | `boolean` | `true` | Enables header sort click interactions. |
| `search.enabled` | `boolean` | `true` | Enables top global search input. |
| `dataLoader` | `AdvancedFilterDataLoader<T>`| `undefined`| Async callback for server-side queries. |

---

## 📡 Custom Events

| Event Name | Detail Payload | Description |
| :--- | :--- | :--- |
| `advanced-filter:expression-change`| `{ expression, flatRules, activeChips }` | Dispatched when active rules or logic group change. |
| `advanced-filter:preset-change` | `{ preset, expression }` | Dispatched when a preset is selected. |
| `advanced-filter:preset-save` | `SavedFilterPreset` | Dispatched when a new preset is created. |

---

## 🎨 CSS Variables

```css
advanced-filter-data-table {
  --aft-primary: #3b82f6;
  --aft-primary-hover: #2563eb;
  --aft-bg: #ffffff;
  --aft-panel-bg: #f8fafc;
  --aft-header-bg: #f8fafc;
  --aft-row-hover: #f1f5f9;
  --aft-border-color: #e2e8f0;
  --aft-text-main: #0f172a;
  --aft-text-muted: #64748b;
  --aft-chip-bg: #f1f5f9;
  --aft-chip-border: #cbd5e1;
}
```
