# <sticky-data-table>

A framework-agnostic, responsive Web Component data table with a locked/sticky first column, horizontal scrolling for remaining columns, column resizing, interactive sorting, full Right-to-Left (RTL) support, and edge shadow indicators.

---

## 1. Architectural Highlights

- **Sticky Stacking Order**: Header corner cell (`th.st-col-sticky`) is assigned `z-index: 20`, sticky body cells (`td.st-col-sticky`) are assigned `z-index: 5`, and scrolling thead cells have `z-index: 10`.
- **Zero Transparency Bleed**: Cells in the sticky column use strictly opaque CSS background variables (`--st-bg-sticky`, `--st-bg-sticky-hover`, `--st-bg-sticky-selected`) so background text never bleeds through during horizontal scrolling.
- **Dynamic Edge Divider & Shadow**: Listens to viewport scroll events and activates `.st-is-scrolled` with `box-shadow: 4px 0 8px -2px var(--st-sticky-shadow-color)` when non-sticky columns are scrolled underneath.
- **Full RTL Support**: Supports `[dir="rtl"]` natively, anchoring the sticky column to `right: 0` with reverse directional drop shadows.

---

## 2. API Reference

### Attributes & Options (`StickyTableOptions`)
| Option / Attribute | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `sticky-first-column` / `stickyFirstColumn` | `boolean` | `true` | Locks the first column to the horizontal edge. |
| `stickyColumnWidth` | `string` | `'220px'` | Default width for the pinned sticky column. |
| `density` | `'compact' \| 'comfortable' \| 'spacious'` | `'comfortable'` | Row padding and typography scale. |
| `selectable` | `boolean` | `false` | Enables row selection checkboxes (pins selection column). |
| `dir` | `'ltr' \| 'rtl'` | `'ltr'` | Layout direction. |

### CSS Variables
| Variable | Default (Light) | Purpose |
| :--- | :--- | :--- |
| `--st-primary` | `#2563eb` | Focus rings and active column resizer handle. |
| `--st-bg-sticky` | `#ffffff` | Opaque background for body sticky cells. |
| `--st-bg-sticky-header` | `#f8fafc` | Opaque background for header sticky cell. |
| `--st-bg-sticky-hover` | `#f1f5f9` | Opaque background for hovered sticky cells. |
| `--st-sticky-shadow-color` | `rgba(0, 0, 0, 0.12)` | Edge shadow cast onto scrolled columns. |

---

## 3. Usage Examples

### Plain HTML / JavaScript
```html
<sticky-data-table id="my-table" sticky-first-column="true"></sticky-data-table>

<script type="module">
  import 'arame-data-grid-pro/sticky-table';

  const table = document.getElementById('my-table');
  table.columns = [
    { id: 'sku', header: 'SKU Code', field: 'sku', width: '220px', sortable: true },
    { id: 'desc', header: 'Description', field: 'desc', width: '250px' },
    { id: 'qty', header: 'Stock Units', field: 'qty', width: '140px', sortable: true }
  ];
  table.rows = [
    { sku: 'GPU-4090', desc: 'GeForce RTX 4090 24GB', qty: 15 },
    { sku: 'CPU-7950', desc: 'Ryzen 9 7950X 16-Core', qty: 28 }
  ];
</script>
```

### Next.js App Router (Client Component)
```tsx
'use client';
import { StickyTableWrapper } from '@/components/StickyTableWrapper';

export default function Page() {
  return (
    <StickyTableWrapper
      rows={data}
      columns={columns}
      options={{ stickyFirstColumn: true, density: 'comfortable' }}
    />
  );
}
```
