# Infinite Scrolling & Virtualized Data Table (`<infinite-data-table>`)

A high-performance, framework-agnostic Web Component for rendering large and continuous datasets using **infinite incremental loading** and optional **DOM row virtualization**.

---

## 💡 Virtualization vs. Infinite Scrolling: Solving Different Problems

It is vital to distinguish between **Infinite Scrolling** and **DOM Virtualization**, as they solve two fundamentally different performance bottlenecks:

| Dimension | Infinite Scrolling (Incremental Ingestion) | Row Virtualization (DOM Recycling) |
| :--- | :--- | :--- |
| **Problem Solved** | **Network and backend payload size.** Fetching 50,000 records at once causes massive database latency, excessive JSON serialization, and high memory spikes. | **Browser DOM node count.** Rendering 5,000 `<tr>` elements in the DOM destroys layout computation performance, frame rate, and scrolling smoothness. |
| **How It Works** | Requests records lazily in discrete batches (e.g., 25 rows) only when the user scrolls near the threshold at the bottom. | Computes the visible window (`scrollTop` to `scrollTop + viewportHeight`) and only mounts ~15-25 visible rows, using CSS spacers for scroll height. |
| **Memory Impact** | Keeps server response time and client memory bounded during initial page render. | Keeps client DOM tree lightweight (~20 nodes) regardless of whether 100 or 100,000 items are loaded in memory. |
| **Requirement** | Backend API supporting offset or cursor pagination. | Fixed, predictable row height (`rowHeight: number`) so the scroller can calculate heights without DOM measurements. |

`<infinite-data-table>` allows using **infinite scroll alone** (appending DOM nodes as data streams in) or **combining infinite scroll with virtualization** for virtually unlimited datasets.

---

## ✨ Features

- **Proximity Prefetching**: Automatically pre-fetches the next batch before the user hits the exact bottom (configurable threshold, default `150px`).
- **Concurrent Request Lock & Deduplication**: Prevents duplicate in-flight requests and discards duplicate rows via `rowIdKey`.
- **Query Change Reset**: Automatically clears loaded batches and resets scroll position to `0` whenever sorting, searching, or filtering changes.
- **Request Cancellation**: Passes native `AbortSignal` to cancel stale in-flight fetches when the query changes.
- **Inline Loading & Retry**: Inline animated spinner during fetch, retry bar on network errors, and an end-of-records badge.
- **Accessible "Load more" Mode**: Optional fallback button mode for users with assistive devices or motion sensitivities.
- **Graceful Fallback Pagination**: Disabling infinite scrolling automatically activates clean numbered pagination.

---

## 🚀 Quick Usage

### Vanilla HTML & JS
```html
<infinite-data-table id="myTable"></infinite-data-table>

<script type="module">
  import 'arame-data-grid-pro/infinite-table';

  const table = document.getElementById('myTable');

  table.columns = [
    { key: 'id', header: 'ID', width: '100px' },
    { key: 'name', header: 'Customer' },
    { key: 'amount', header: 'Amount', render: (val) => `$${val.toFixed(2)}` }
  ];

  // Configure remote data loader
  table.config = {
    batchSize: 25,
    prefetchThresholdPx: 150,
    dataLoader: async ({ pagination, searchTerm, sortRule, signal }) => {
      const url = new URL('/api/orders', window.location.origin);
      url.searchParams.set('offset', pagination.offset);
      url.searchParams.set('limit', pagination.limit);
      if (searchTerm) url.searchParams.set('q', searchTerm);
      if (sortRule) {
        url.searchParams.set('sortBy', sortRule.column);
        url.searchParams.set('sortDir', sortRule.direction);
      }

      const res = await fetch(url.toString(), { signal });
      const data = await res.json();
      return {
        rows: data.items,
        totalRows: data.total,
        hasMore: pagination.offset + data.items.length < data.total
      };
    },
    virtualization: {
      enabled: true,
      rowHeight: 46,
      viewportHeight: 500
    }
  };
</script>
```

---

## ⚙️ Configuration (`InfiniteScrollConfig<T>`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `enabled` | `boolean` | `true` | When `false`, activates standard numbered pagination fallback. |
| `batchSize` | `number` | `25` | Number of items requested per batch. |
| `prefetchThresholdPx` | `number` | `150` | Proximity to bottom (in pixels) that triggers the next batch fetch. |
| `rowIdKey` | `keyof T \| string` | `'id'` | Primary key property used for row deduplication. |
| `dataLoader` | `InfiniteDataLoader<T>` | `undefined` | Async function returning `{ rows, hasMore, totalRows }`. |
| `manualLoadMode` | `boolean` | `false` | When `true`, displays a "Load more" button instead of automatic scroll detection. |
| `virtualization.enabled` | `boolean` | `false` | Enables virtual row recycling. |
| `virtualization.rowHeight`| `number` | `44` | Mandatory fixed height in pixels for each table row. |
| `virtualization.viewportHeight`| `number` | `500` | Height in pixels for the scrollable container. |

---

## 📡 Custom Events

| Event Name | Detail Payload | Description |
| :--- | :--- | :--- |
| `infinite-table:load-batch` | `{ batchIndex, loadedCount, totalLoaded, totalAvailable, hasMore }` | Emitted when a batch is successfully appended. |
| `infinite-table:complete` | `{ totalLoaded, totalAvailable }` | Emitted when all records have been loaded (`hasMore: false`). |
| `infinite-table:error` | `{ error, params, retry }` | Emitted if a batch fetch rejects. |

---

## 🎨 CSS Variables

```css
infinite-data-table {
  --ift-primary: #3b82f6;
  --ift-primary-hover: #2563eb;
  --ift-bg: #ffffff;
  --ift-header-bg: #f8fafc;
  --ift-row-hover: #f1f5f9;
  --ift-row-alt: #fdfdfe;
  --ift-border-color: #e2e8f0;
  --ift-text-main: #0f172a;
  --ift-text-muted: #64748b;
  --ift-font-size: 0.875rem;
  --ift-border-radius: 0.5rem;
}
```
