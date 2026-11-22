# <editable-data-table>

A framework-agnostic, responsive Web Component data table with in-place cell editing. Consumers can mark columns as editable, customize editors (text, number, date, select, checkbox, or custom widgets), enforce asynchronous/synchronous validation, and manage optimistic updates with rollback error recovery. Includes universal pagination, sorting, and global search by default.

---

## 1. Features

- ✏️ **In-Place Cell Editing**: Enter editing mode via double-click or keyboard <kbd>Enter</kbd>.
- 🎛️ **Built-In Editor Types**:
  - `text`: Standard text input.
  - `number`: Numeric input with `min`, `max`, and `step` boundaries.
  - `date`: HTML5 date picker.
  - `select`: Dropdown selection from typed options.
  - `checkbox`: Boolean toggle.
  - `custom`: Consumer-provided DOM widget with typed callbacks (`onCommit`, `onCancel`, `setError`).
- ⌨️ **Keyboard Controls**: <kbd>Enter</kbd> to save, <kbd>Escape</kbd> to cancel.
- 🛡️ **Validation & Error Bubbles**: Validates input before commit, displaying accessible error tooltips directly on the cell.
- 🔄 **Optimistic Updates & Error Rollback**: Updates data immediately on save; rolls back to original value if the consumer's `onSave` promise rejects.
- 🌐 **Universal Defaults Active**: Universal pagination (10 per page), single-column sorting, and real-time global search out-of-the-box. Supports client-side or server-side `serverDataLoader`.

---

## 2. API Reference

### Column Configuration (`EditableColumnDef`)
| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `editable` | `boolean` | `false` | Enables editing on this column. |
| `editor` | `EditorConfig` | `{ type: 'text' }` | Editor type (`text`, `number`, `date`, `select`, `checkbox`, `custom`). |
| `validator`| `CellValidator`| `undefined` | Callback returning error message string if invalid, or `null` if valid. |

### Table Options (`EditableTableOptions`)
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `optimisticUpdates` | `boolean` | `true` | Updates UI immediately and rolls back if `onSave` rejects. |
| `onSave` | `CellSaveHandler` | `undefined` | Async consumer handler to persist changes. |
| `editOnSingleClick` | `boolean` | `false` | Enter edit mode on single click rather than double click. |

### Typed Custom Events
| Event Name | Detail Payload | Description |
| :--- | :--- | :--- |
| `editable-table:edit-start` | `{ rowId, columnId, value, row }` | Fired when a cell enters editing mode. |
| `editable-table:change` | `{ rowId, columnId, currentValue, row }` | Fired on keystrokes/input change. |
| `editable-table:save` | `{ rowId, columnId, oldValue, newValue, row }` | Fired when a valid edit is committed. |
| `editable-table:cancel` | `{ rowId, columnId, value, row }` | Fired when editing is canceled via Esc/button. |
| `editable-table:validation-error` | `{ rowId, columnId, error, invalidValue, row }` | Fired when validation check fails. |
| `editable-table:save-error` | `{ rowId, columnId, error, attemptedValue, row }` | Fired if `onSave` rejects (triggers rollback). |

---

## 3. Quick Start

### Plain JavaScript
```html
<editable-data-table id="my-table"></editable-data-table>

<script type="module">
  import 'arame-data-grid-pro/editable-table';

  const table = document.getElementById('my-table');
  table.columns = [
    { 
      id: 'name', 
      header: 'Product', 
      field: 'name', 
      editable: true,
      validator: (val) => (!val || val.length < 3 ? 'Must be at least 3 chars' : null)
    },
    { 
      id: 'price', 
      header: 'Price ($)', 
      field: 'price', 
      editable: true,
      editor: { type: 'number', min: 0 }
    }
  ];
  table.rows = [{ id: '1', name: 'Workstation 8000', price: 2499 }];
  table.options = {
    onSave: async ({ rowId, columnId, newValue }) => {
      await fetch(`/api/products/${rowId}`, {
        method: 'PATCH',
        body: JSON.stringify({ [columnId]: newValue })
      });
    }
  };
</script>
```

### Next.js App Router (SSR-Safe)
```tsx
'use client';
import { EditableTableWrapper } from '@/components/EditableTableWrapper';

export default function Page() {
  return (
    <EditableTableWrapper
      rows={products}
      columns={columns}
      options={{
        optimisticUpdates: true,
        onSave: async (payload) => {
          await updateProduct(payload);
        }
      }}
    />
  );
}
```
