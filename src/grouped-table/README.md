# <grouped-data-table>

A framework-agnostic, responsive Web Component data table with **multi-level row grouping**, expandable/collapsible groups, nested group hierarchies, calculated column aggregates (sum, average, minimum, maximum, count, and custom functions), group header summaries, and universal default pagination, sorting, and global search.

---

## 1. Features

- 📂 **Multi-Level Nested Grouping**: Group by one column (`groupBy: ['department']`) or multiple nested hierarchies (`groupBy: ['department', 'team']`).
- 📊 **Column Aggregates**: Automatically computes `sum`, `avg`, `min`, `max`, `count`, or custom aggregate functions across grouped bucket rows and displays them directly in group headers.
- 🔄 **Expand / Collapse All**: One-click actions to expand all or collapse all groups, with animated chevron indicators (`▶`).
- 🔍 **Filtering & Search with Group Consistency**: Searches displayed data while dynamically updating group row counts and aggregates.
- 🌐 **Universal Defaults Enabled**: Includes responsive pagination, column sorting, and global search out-of-the-box, supporting client-side computation or server-side `serverDataLoader`.

---

## 2. API Reference

### Grouping Options (`GroupingOptions`)
```typescript
{
  groupBy?: string[];                  // Array of column IDs e.g. ['department', 'team']
  defaultExpanded?: boolean;           // default: true
  paginationMode?: 'rows' | 'groups';  // default: 'rows'
  showAggregatesInHeader?: boolean;    // default: true
}
```

### Column Aggregate Configuration (`AggregateConfig`)
```typescript
{
  type: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'custom';
  label?: string;                      // Label shown in header e.g. "Total Payroll"
  formatter?: (val: any) => string;
  customFn?: (rows: T[], field: string) => any;
}
```

### Typed Custom Events
| Event Name | Detail Payload | Description |
| :--- | :--- | :--- |
| `grouped-table:group-toggle` | `{ groupKey, expanded, level, rowCount }` | Fired when any group is expanded/collapsed. |
| `grouped-table:expand-all` | `{ expandedCount: number }` | Fired when "Expand all" is clicked. |
| `grouped-table:collapse-all` | `{ collapsedCount: number }` | Fired when "Collapse all" is clicked. |
| `grouped-table:group-change` | `{ groupBy: string[] }` | Fired when grouping columns are updated. |

---

## 3. Quick Start

### Plain JavaScript
```html
<grouped-data-table id="my-table"></grouped-data-table>

<script type="module">
  import 'arame-data-grid-pro/grouped-table';

  const table = document.getElementById('my-table');
  table.columns = [
    { id: 'name', header: 'Name', field: 'name' },
    { id: 'dept', header: 'Department', field: 'dept' },
    { id: 'salary', header: 'Salary', field: 'salary', aggregate: { type: 'sum', label: 'Payroll' } }
  ];
  table.rows = [
    { name: 'Alice', dept: 'Engineering', salary: 150000 },
    { name: 'Bob', dept: 'Engineering', salary: 160000 }
  ];
  table.options = {
    grouping: { groupBy: ['dept'] }
  };
</script>
```

### Next.js App Router (SSR-Safe)
```tsx
'use client';
import { GroupedTableWrapper } from '@/components/GroupedTableWrapper';

export default function Page() {
  return (
    <GroupedTableWrapper
      rows={data}
      columns={columns}
      options={{
        grouping: { groupBy: ['department', 'team'] }
      }}
    />
  );
}
```
