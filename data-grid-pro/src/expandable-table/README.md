# <expandable-data-table>

A framework-agnostic, responsive Web Component data table with row expansion. Clicking a row or its control smoothly unveils nested details directly beneath that row with full accessibility, animations, asynchronous loading, and single/multi-expansion modes.

---

## 1. Features

- 🔍 **Direct Row Association**: Details are rendered directly beneath the row in an aligned container with a subtle primary color accent border.
- ⚙️ **Synchronous or Asynchronous Detail Loading**: Supports synchronous callbacks (`detailRenderer`) as well as async promises (`asyncDetailRenderer`) with built-in loading spinners, error retry messages, and request cancellation.
- 🔀 **Single-Row Accordion or Multi-Row Mode**: Toggle between allowing multiple rows expanded simultaneously or collapsing others automatically (`multiExpand: false`).
- 🛡️ **Interactive Conflict Shield**: Prevents accidental row expansion when clicking inside interactive elements such as checkboxes, buttons, text fields, and links (`ignoreClickSelectors`).
- ♿ **Full Accessibility**: Uses standard ARIA attributes (`role="row"`, `aria-expanded="true/false"`, `aria-controls="xt-detail-{id}"`) with keyboard expansion support (`Enter` / `Space`).
- 🎬 **Hardware-Accelerated Transitions**: Smooth expand/collapse drawer animations that respect `prefers-reduced-motion: reduce`.

---

## 2. API Reference

### Configuration Options (`ExpandableTableOptions`)
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `multiExpand` | `boolean` | `true` | When `false`, opening a row collapses all others. |
| `expandOnRowClick` | `boolean` | `true` | Allows expanding by clicking anywhere on the row. |
| `ignoreClickSelectors` | `string[]` | `['button', 'input', 'a', ...]` | Prevents expansion when clicking matching elements. |
| `detailRenderer` | `(row: T) => HTMLElement \| string` | `undefined` | Synchronous drawer renderer callback. |
| `asyncDetailRenderer` | `(row: T, signal: AbortSignal) => Promise<HTMLElement \| string>` | `undefined` | Asynchronous detail loader. |
| `animations` | `{ enabled?: boolean, duration?: number, easing?: string }` | `{ enabled: true, duration: 200 }` | Expand/collapse CSS transitions. |

### Typed Custom Events
| Event Name | Detail Payload | Description |
| :--- | :--- | :--- |
| `expandable-table:expand` | `{ rowId: string\|number, row: T }` | Emitted when a row is expanded. |
| `expandable-table:collapse` | `{ rowId: string\|number, row: T }` | Emitted when a row is collapsed. |
| `expandable-table:toggle` | `{ rowId: string\|number, expanded: boolean, row: T }` | Emitted on every expand/collapse change. |
| `expandable-table:async-load-start` | `{ rowId: string\|number, row: T }` | Emitted when async detail fetching begins. |
| `expandable-table:async-load-success`| `{ rowId: string\|number, row: T }` | Emitted when async detail content is resolved. |

---

## 3. Quick Start

### Plain JavaScript
```html
<expandable-data-table id="my-table"></expandable-data-table>

<script type="module">
  import 'arame-data-grid-pro/expandable-table';

  const table = document.getElementById('my-table');
  table.columns = [
    { id: 'name', header: 'Cluster', field: 'name' },
    { id: 'status', header: 'Status', field: 'status' }
  ];
  table.rows = [{ id: 'c1', name: 'us-east-prod', status: 'Healthy' }];
  table.options = {
    detailRenderer: (row) => `<div>Cluster details for ${row.name}</div>`
  };
</script>
```

### Next.js App Router (SSR-Safe)
```tsx
'use client';
import { ExpandableTableWrapper } from '@/components/ExpandableTableWrapper';

export default function Page() {
  return (
    <ExpandableTableWrapper
      rows={data}
      columns={columns}
      options={{
        multiExpand: true,
        detailRenderer: (row) => `<div>Live metrics for ${row.name}</div>`
      }}
    />
  );
}
```
