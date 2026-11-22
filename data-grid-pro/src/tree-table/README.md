# Tree Data Table Component (`<tree-data-table>`)

An enterprise-grade, framework-agnostic Web Component built in TypeScript for displaying multi-level **hierarchical datasets** with expandable/collapsible rows, **sticky parent headers**, **drag-and-drop row reordering**, **cascading selection**, and **CSV export**.

---

## 🚀 Key Capabilities

- **Deep Hierarchical Nesting**: Multi-level parent-child relationships with configurable indent guides, expand/collapse toggles, and customizable accessors (`idAccessor`, `childrenAccessor`).
- **Sticky Parent Rows During Scroll**: Parent rows automatically become sticky (`position: sticky`) while their descendants are scrolled into view, providing continuous hierarchy context.
- **Drag-and-Drop Reordering**: Allows reordering sibling rows or reparenting into different hierarchy levels (`before`, `after`, or `inside`), complete with visual drop markers and keyboard accessibility alternatives.
- **Cascading Selection**: Supports multiple selection modes:
  - `cascade-all`: Selecting a parent checks all descendants; selecting all siblings checks the parent.
  - `cascade-down`: Selecting a parent checks all descendants without affecting ancestors.
  - `independent`: Each checkbox operates independently.
- **Deep Hierarchical Search & Sibling Sorting**:
  - Global search auto-expands parent paths to reveal matching child rows.
  - Sibling sorting orders nodes within their parent scope without disrupting hierarchy relationships.
- **Hierarchical Pagination Modes**:
  - `root-nodes` (Default): Paginates by top-level root entities, ensuring parent rows are never separated from their visible children across page boundaries.
  - `flattened-rows`: Paginates by all currently visible flattened rows.
- **CSV Hierarchy Export**: One-click export including indentation level and path columns (`Path: Engineering / Platform / Core`).

---

## 🛠️ Usage Example

```html
<tree-data-table id="myTreeTable"></tree-data-table>

<script type="module">
  import 'arame-data-grid-pro/tree-table';

  const table = document.getElementById('myTreeTable');

  table.columns = [
    { key: 'name', header: 'Name', width: '300px', isTreeColumn: true },
    { key: 'role', header: 'Role', width: '180px' },
    { key: 'budget', header: 'Budget', width: '140px', render: (v) => `$${v.toLocaleString()}` }
  ];

  table.data = [
    {
      id: 'org-1',
      name: 'Engineering',
      role: 'Division',
      budget: 1500000,
      children: [
        { id: 'team-1', name: 'Frontend Infrastructure', role: 'Team', budget: 600000 },
        { id: 'team-2', name: 'Core API Services', role: 'Team', budget: 900000 }
      ]
    }
  ];
</script>
```

---

## ⚙️ Configuration (`TreeDataOptions<T>`)

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `idAccessor` | `(row: T) => string` | `row => row.id` | Identifier function for row keys. |
| `childrenAccessor` | `(row: T) => T[]` | `row => row.children` | Child accessor function. |
| `treeColumnKey` | `string` | First column | Column displaying indent and toggle buttons. |
| `stickyParentRows` | `boolean` | `true` | Pinned parent row while children scroll. |
| `selection.mode` | `'cascade-all' \| 'cascade-down' \| 'independent'` | `'cascade-all'` | Checkbox selection cascade rule. |
| `dragAndDrop.enabled`| `boolean` | `true` | Enables draggable row reordering. |
| `pagination.mode` | `'root-nodes' \| 'flattened-rows'` | `'root-nodes'` | Mode preventing parent/child page separation. |
| `dataLoader` | `TreeDataLoader<T>` | `undefined` | Async loader for server-side hierarchy. |

---

## 📡 Custom Events

| Event Name | Detail Payload | Description |
| :--- | :--- | :--- |
| `tree-table:expansion-change` | `{ nodeId, isExpanded, expandedIds }` | Emitted when a parent node expands or collapses. |
| `tree-table:selection-change` | `{ selectedIds, lastToggledId, isSelected }` | Emitted when checkbox selections change. |
| `tree-table:reorder` | `{ draggedId, targetId, position, updatedTree }` | Emitted when a drag-and-drop reorder operation completes. |
| `tree-table:export` | `{ fileName, rowCount }` | Emitted when a CSV export is generated. |

---

## 🎨 CSS Variables

```css
tree-data-table {
  --tree-primary: #3b82f6;
  --tree-bg: #ffffff;
  --tree-header-bg: #f8fafc;
  --tree-row-hover: #f1f5f9;
  --tree-row-selected: #eff6ff;
  --tree-row-sticky-bg: #ffffff;
  --tree-border-color: #e2e8f0;
  --tree-text-main: #0f172a;
  --tree-text-muted: #64748b;
  --tree-indent-guide: #cbd5e1;
}
```
