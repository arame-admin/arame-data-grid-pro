# <column-visibility-table>

A framework-agnostic, responsive Web Component data table with a column-visibility filter dropdown. Allows users to choose which columns to show or hide via checkboxes, enforce non-hideable required columns, execute "Show all" / "Hide optional" quick actions, and persist preferences to `localStorage`.

---

## 1. Features

- ⚙️ **"Columns" Dropdown Control**: Accessible toolbar menu listing all configurable column headers with checkboxes.
- 🔒 **Required Column Protection**: Columns marked `required: true` display a subtle badge and have their checkboxes disabled, preventing accidental hiding.
- ⚡ **Quick Batch Actions**: Provides "Show all" and "Hide optional" buttons at the top of the menu.
- 💾 **Local Storage Persistence**: Pass `storageKey: 'my-grid-columns'` to automatically save and restore the user's visible columns across page reloads.
- ⌨️ **Keyboard & Screen Reader Accessible**: Supports keyboard focus trapping, Escape key closing, and `aria-haspopup="true"` / `aria-expanded="true/false"`.

---

## 2. API Reference

### Column Definition (`ColumnVisibilityDef`)
| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | *(Required)* | Unique column identifier. |
| `header` | `string` | *(Required)* | Label displayed in the table header and column menu. |
| `visible` | `boolean` | `true` | Initial visibility status. |
| `required`| `boolean` | `false` | If `true`, the column is permanently locked visible. |
| `sortable`| `boolean` | `false` | Enables sorting on this column. |

### Table Options (`ColumnVisibilityTableOptions`)
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `storageKey` | `string` | `undefined` | Key for storing visibility map in `localStorage`. |
| `menuButtonLabel` | `string` | `'Columns'` | Button text on toolbar menu trigger. |
| `density` | `'compact' \| 'comfortable' \| 'spacious'` | `'comfortable'` | Sizing scale. |

### Typed Custom Events
| Event Name | Detail Payload | Description |
| :--- | :--- | :--- |
| `column-visibility:change` | `{ columnId: string, visible: boolean, visibleColumnIds: string[] }` | Emitted when any column is toggled. |
| `column-visibility:reset` | `{ visibleColumnIds: string[] }` | Emitted when "Show all" or "Hide optional" is triggered. |

---

## 3. Quick Start

### Plain JavaScript
```html
<column-visibility-table id="my-table"></column-visibility-table>

<script type="module">
  import 'arame-data-grid-pro/column-visibility-table';

  const table = document.getElementById('my-table');
  table.columns = [
    { id: 'name', header: 'Name', field: 'name', required: true },
    { id: 'email', header: 'Email', field: 'email' },
    { id: 'role', header: 'Role', field: 'role', visible: false }
  ];
  table.rows = [{ id: '1', name: 'Alice', email: 'alice@corp.io', role: 'Lead Architect' }];
  table.options = { storageKey: 'users-column-prefs' };
</script>
```

### Next.js App Router (SSR-Safe)
```tsx
'use client';
import { ColumnVisibilityWrapper } from '@/components/ColumnVisibilityWrapper';

export default function Page() {
  return (
    <ColumnVisibilityWrapper
      rows={data}
      columns={columns}
      options={{ storageKey: 'admin-table-columns' }}
    />
  );
}
```
