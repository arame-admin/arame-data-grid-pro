# <filterable-data-table>

A framework-agnostic, responsive Web Component data table with multi-column filtering. Features global search, column-level filters (text, select, multi-select, number range min/max, date range start/end, and custom controls), active filter indicators, batch clear, client-side data engine, and optional server-side integration.

---

## 1. Features

- 🔍 **Global Search + Per-Column Controls**: Search across all fields in the top toolbar or target individual columns in the dedicated filter row.
- 🎛️ **5 Supported Filter Types**:
  - `text`: Substring match.
  - `select`: Exact dropdown option match.
  - `multi-select`: Set inclusion match.
  - `number-range`: Min and/or max numeric boundaries.
  - `date-range`: Start and/or end calendar date boundaries.
  - `custom`: Consumer-provided interactive filter widget callback.
- 🏷️ **Active Filter Counter & Quick Clear**: Displays an active filter badge and a "Clear all" button when one or more filters are populated.
- 🌐 **Client & Server-Side Execution**: Supports in-memory filtering or asynchronous server-side querying with automatic request cancellation (`AbortSignal`).

---

## 2. API Reference

### Column Filter Definition (`FilterConfig`)
```typescript
{
  type: 'text' | 'select' | 'multi-select' | 'number-range' | 'date-range' | 'custom';
  placeholder?: string;
  options?: { label: string; value: string | number }[]; // for 'select' / 'multi-select'
  customControl?: (params: CustomFilterControlParams) => HTMLElement;
}
```

### Table Options (`FilterableTableOptions`)
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `showGlobalSearch` | `boolean` | `true` | Displays global search input in toolbar. |
| `searchPlaceholder` | `string` | `'Search records...'` | Placeholder text for global search. |
| `serverSide` | `boolean` | `false` | Toggles server-side querying. |
| `serverDataLoader` | `(params: ServerFilterQueryParams) => Promise<...>` | `undefined` | Asynchronous server loader callback. |
| `density` | `'compact' \| 'comfortable' \| 'spacious'` | `'comfortable'` | Sizing scale. |

### Typed Custom Events
| Event Name | Detail Payload | Description |
| :--- | :--- | :--- |
| `filter-table:filter-change` | `{ filters: FilterCriterion[], globalSearch: string, activeFilterCount: number }` | Fired when any filter value mutates. |
| `filter-table:filter-clear` | `{ columnId?: string, remainingFilters: FilterCriterion[] }` | Fired when a filter or all filters are reset. |
| `filter-table:loading` | `{ loading: boolean }` | Fired when a server-side request begins or completes. |

---

## 3. Quick Start

### Plain JavaScript
```html
<filterable-data-table id="my-table"></filterable-data-table>

<script type="module">
  import 'arame-data-grid-pro/filterable-table';

  const table = document.getElementById('my-table');
  table.columns = [
    { id: 'client', header: 'Client', field: 'client', filter: { type: 'text' } },
    { id: 'status', header: 'Status', field: 'status', filter: { type: 'select', options: [{ label: 'Paid', value: 'Paid' }, { label: 'Pending', value: 'Pending' }] } },
    { id: 'amount', header: 'Amount', field: 'amount', filter: { type: 'number-range' } }
  ];
  table.rows = [{ client: 'Acme Inc', status: 'Paid', amount: 4500 }];
</script>
```

### Next.js App Router
```tsx
'use client';
import { FilterableTableWrapper } from '@/components/FilterableTableWrapper';

export default function Page() {
  return (
    <FilterableTableWrapper
      rows={invoices}
      columns={columns}
      options={{ showGlobalSearch: true }}
    />
  );
}
```
