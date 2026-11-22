# <context-menu-data-table>

A framework-agnostic, responsive Web Component data table with **column-header dropdown menus** and **row context menus**. Users can access column-specific controls (sorting ascending/descending, hiding, custom actions, and a built-in column visibility checkbox menu) and right-click any row (or click the row's `⋮` button) to trigger contextual actions (view, edit, duplicate, delete with confirmation).

---

## 1. Features

- ⚙️ **Column-Header Menus**:
  - Click the `⋮` trigger next to any column title to open the header popup.
  - Sort ascending / descending quick toggles.
  - One-click "Hide this column" (blocked if `required: true`).
  - Built-in "Toggle Columns" checkbox list showing all headers with checkboxes and "Required" badges.
  - Custom column menu items and action handlers.
- 🖱️ **Row Context Menus**:
  - Right-click anywhere on a row to open the context menu at pointer coordinates.
  - Only suppresses the browser's native context menu when a custom row menu is defined.
  - An accessible `⋮` action button column is included for touch devices and keyboard users.
  - Supports custom items, action callbacks, disabled states, visual separators, and destructive action confirmation dialogs.
- ♿ **Full Accessibility**:
  - Keyboard focus management (`Escape` key closes active menu and restores focus).
  - Outside click detection closes menus immediately.
  - Automatic viewport edge collision prevention avoids off-screen overflow.
- 🌐 **Universal Defaults Active**:
  - Automatically includes numbered pagination, column sorting, and real-time global search.
  - Supports client-side processing or server-side `serverDataLoader` routines with automatic request cancellation (`AbortSignal`).

---

## 2. API Reference

### Column Definition (`ContextMenuColumnDef`)
```typescript
{
  id: string;
  header: string;
  field?: keyof T | string;
  width?: string;
  sortable?: boolean;        // default: true
  visible?: boolean;         // default: true
  required?: boolean;        // default: false (if true, cannot be hidden in column menu)
  headerMenuItems?: {
    id: string;
    label: string;
    icon?: string;
    action: (col: ContextMenuColumnDef, table: unknown) => void;
  }[];
}
```

### Row Context Menu Config (`RowContextMenuConfig`)
```typescript
{
  enabled?: boolean;         // default: true
  showActionButton?: boolean; // default: true (adds an accessible "⋮" button column)
  items: {
    id: string;
    label?: string;
    icon?: string;
    isSeparator?: boolean;
    disabled?: boolean | ((row: T) => boolean);
    isDestructive?: boolean;
    confirmMessage?: string | ((row: T) => string);
    action?: (row: T, table: unknown) => void;
  }[];
}
```

### Typed Custom Events
| Event Name | Detail Payload | Description |
| :--- | :--- | :--- |
| `menu-table:header-menu-open` | `{ columnId: string }` | Fired when a column header menu is opened. |
| `menu-table:row-context-menu-open` | `{ rowId, row, clientX, clientY }` | Fired when a row context menu is opened. |
| `menu-table:row-menu-action` | `{ actionId, rowId, row }` | Fired when a context menu item is clicked. |
| `menu-table:column-visibility-change` | `{ columnId, visible, visibleColumnIds }` | Fired when columns are shown/hidden. |

---

## 3. Quick Start

### Plain JavaScript
```html
<context-menu-data-table id="my-table"></context-menu-data-table>

<script type="module">
  import 'arame-data-grid-pro/context-menu-table';

  const table = document.getElementById('my-table');
  table.columns = [
    { id: 'title', header: 'Title', field: 'title', required: true },
    { id: 'status', header: 'Status', field: 'status' }
  ];
  table.rows = [{ id: '1', title: 'Security Audit', status: 'In Review' }];
  table.options = {
    rowContextMenu: {
      enabled: true,
      items: [
        { id: 'edit', label: 'Edit Record', icon: '✎', action: (row) => console.log('Edit', row) },
        { isSeparator: true },
        { id: 'delete', label: 'Delete Record', icon: '🗑', isDestructive: true, action: (row) => console.log('Delete', row) }
      ]
    }
  };
</script>
```

### Next.js App Router (SSR-Safe)
```tsx
'use client';
import { ContextMenuTableWrapper } from '@/components/ContextMenuTableWrapper';

export default function Page() {
  return (
    <ContextMenuTableWrapper
      rows={tasks}
      columns={columns}
      options={{
        rowContextMenu: {
          items: [
            { id: 'view', label: 'View Details', action: (row) => console.log(row) }
          ]
        }
      }}
    />
  );
}
```
