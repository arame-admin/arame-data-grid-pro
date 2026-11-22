# Calculated Data Table with Sticky First & Last Columns (`<calculated-data-table>`)

A high-performance, framework-agnostic Web Component built in TypeScript. It provides **strongly-typed reactive calculations**, inline source cell editing, and **dual sticky columns** (first and last columns remain pinned at opposite viewport edges while inner columns scroll horizontally).

---

## 🚀 Key Features

- **Safe Calculated Columns**: Evaluates cell calculations using strongly-typed TypeScript callbacks. **Zero usage of `eval` or `new Function()`**, eliminating code injection and XSS vulnerabilities.
- **Selective Recalculation Engine**: When an editable cell changes, only columns that list it as a dependency in `dependencies: [...]` are re-computed and re-rendered.
- **Dual Sticky Columns (First & Last)**:
  - Pinned first column stays fixed at the starting edge.
  - Pinned last column stays fixed at the ending edge.
  - All columns between them scroll smoothly horizontally.
  - Subtle dynamic box shadows appear along pinned borders only when horizontal scroll room exists.
  - Supports RTL layouts (`dir="rtl"`), pinning first column to the right and last column to the left automatically.
- **Universal Project Defaults**: Includes client-side pagination, single-column sorting, and global searching out-of-the-box.
- **Server-Side Data Mode**: Optional async `dataLoader` callback that handles remote page queries, search terms, and sort rules without double-filtering on the client.
- **Responsive Tailwind-Inspired Design**: Scoped CSS custom properties (`--calc-*`), light & dark themes, and `prefers-reduced-motion` compliance.

---

## 🛠️ Installation & Setup

```html
<calculated-data-table id="salesTable"></calculated-data-table>

<script type="module">
  import 'arame-data-grid-pro/calculated-table';

  const table = document.getElementById('salesTable');

  table.columns = [
    // Pinned First Edge
    { key: 'sku', header: 'SKU Code', width: '120px' },

    // Middle Scrollable Columns
    { key: 'product', header: 'Product', width: '220px' },
    { key: 'qty', header: 'Quantity (Editable)', width: '120px', editable: true, editorType: 'number' },
    { key: 'price', header: 'Unit Price (Editable)', width: '120px', editable: true, editorType: 'number' },

    // Calculated Column
    {
      key: 'subtotal',
      header: 'Subtotal',
      width: '140px',
      dependencies: ['qty', 'price'],
      calculate: (row) => row.qty * row.price,
      formatter: (val) => `$${Number(val).toFixed(2)}`
    },

    // Pinned Last Edge
    {
      key: 'totalWithTax',
      header: 'Total With 10% Tax',
      width: '150px',
      dependencies: ['subtotal', 'qty', 'price'],
      calculate: (row) => (row.qty * row.price) * 1.10,
      formatter: (val) => `<strong>$${Number(val).toFixed(2)}</strong>`
    }
  ];

  table.data = [
    { sku: 'ITEM-01', product: 'Wireless Mouse', qty: 5, price: 29.99 },
    { sku: 'ITEM-02', product: 'USB-C Cable', qty: 10, price: 9.50 }
  ];
</script>
```

---

## 📐 Column Definition (`CalculatedTableColumn<T>`)

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `key` | `keyof T \| string` | **Required** | Column identifier. |
| `header` | `string` | **Required** | Column header display text. |
| `width` | `string` | `auto` | Explicit column width (e.g., `'140px'`). |
| `calculate` | `(row: T, index: number) => any` | `undefined` | Safe calculation callback. Receives the updated row. |
| `dependencies` | `Array<keyof T \| string>` | `undefined` | Source fields whose change triggers recalculation. If omitted, recalculates on any change. |
| `formatter` | `(value: any, row: T) => string \| HTMLElement` | `undefined` | Custom cell formatting output. |
| `editable` | `boolean` | `false` | Enables inline editing for source values. |
| `editorType` | `'text' \| 'number' \| 'select'` | `'text'` | Input editor type. |
| `sortable` | `boolean` | `true` | Allows sorting by this column. |

---

## ⚙️ Options (`CalculatedTableOptions<T>`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `sticky.stickyFirst` | `boolean` | `true` | Pins the first column to the leading edge. |
| `sticky.stickyLast` | `boolean` | `true` | Pins the last column to the trailing edge. |
| `pagination.enabled`| `boolean` | `true` | Enables bottom pagination controls. |
| `pagination.pageSize`| `number` | `10` | Rows displayed per page. |
| `sorting.enabled` | `boolean` | `true` | Enables click-to-sort headers. |
| `search.enabled` | `boolean` | `true` | Enables top toolbar search box. |
| `dir` | `'ltr' \| 'rtl'` | `'ltr'` | Direction mode for sticky borders and text alignment. |
| `dataLoader` | `CalculatedDataLoader<T>` | `undefined` | Server-side loader for remote pagination/sorting/filtering. |

---

## 📡 Events

| Event Name | Detail | Description |
| :--- | :--- | :--- |
| `calculated-table:cell-change` | `CellChangeDetail<T>` | Dispatched whenever an editable cell is modified and dependent formulas recalculate. |
| `calculated-table:page-change` | `{ page, pageSize }` | Dispatched on page or page size change. |
| `calculated-table:sort-change` | `SortRule<T> \| null` | Dispatched when sorting column or direction changes. |
| `calculated-table:search-change` | `{ searchTerm }` | Dispatched when the user inputs a search query. |

---

## 🎨 CSS Variables

```css
calculated-data-table {
  --calc-primary: #2563eb;
  --calc-bg: #ffffff;
  --calc-header-bg: #f8fafc;
  --calc-cell-sticky-bg: #ffffff;
  --calc-border-color: #e2e8f0;
  --calc-text-main: #0f172a;
  --calc-text-muted: #64748b;
  --calc-sticky-shadow-start: 4px 0 6px -1px rgba(0, 0, 0, 0.08);
  --calc-sticky-shadow-end: -4px 0 6px -1px rgba(0, 0, 0, 0.08);
}
```
