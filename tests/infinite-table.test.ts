import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../src/infinite-table/index.js';
import { InfiniteDataTableElement } from '../src/infinite-table/infinite-data-table.element.js';
import { InfiniteBatchResult, InfiniteDataRequest } from '../src/infinite-table/types.js';

interface TestItem {
  id: string;
  name: string;
  role: string;
  department: string;
}

describe('InfiniteDataTableElement (<infinite-data-table>)', () => {
  let table: InfiniteDataTableElement<TestItem>;

  beforeEach(() => {
    document.body.innerHTML = '';
    table = document.createElement('infinite-data-table') as InfiniteDataTableElement<TestItem>;
    table.columns = [
      { key: 'id', header: 'ID' },
      { key: 'name', header: 'Name' },
      { key: 'role', header: 'Role' },
      { key: 'department', header: 'Department' }
    ];
    document.body.appendChild(table);
  });

  it('renders initial table headers and search input', () => {
    const shadow = table.shadowRoot!;
    const headers = shadow.querySelectorAll('.ift-th');
    expect(headers.length).toBe(4);
    expect(headers[0].textContent).toContain('ID');
    expect(headers[1].textContent).toContain('Name');
  });

  it('loads batch using server dataLoader and appends rows', async () => {
    const mockLoader = vi.fn().mockImplementation(async (req: InfiniteDataRequest<TestItem>): Promise<InfiniteBatchResult<TestItem>> => {
      const page = req.pagination.mode === 'offset' ? req.pagination.page : 1;
      return {
        rows: [
          { id: `id-${page}-1`, name: `User ${page}.1`, role: 'Dev', department: 'Eng' },
          { id: `id-${page}-2`, name: `User ${page}.2`, role: 'QA', department: 'Eng' }
        ],
        hasMore: page < 2,
        totalRows: 4
      };
    });

    table.config = {
      batchSize: 2,
      dataLoader: mockLoader
    };

    // Wait for initial batch
    await new Promise(r => setTimeout(r, 20));

    expect(mockLoader).toHaveBeenCalledTimes(1);
    expect(table.data.length).toBe(2);

    const shadow = table.shadowRoot!;
    let rows = shadow.querySelectorAll('.ift-tbody .ift-tr');
    expect(rows.length).toBe(2);

    // Fetch next batch
    await table.fetchNextBatch();
    expect(mockLoader).toHaveBeenCalledTimes(2);
    expect(table.data.length).toBe(4);

    rows = shadow.querySelectorAll('.ift-tbody .ift-tr');
    expect(rows.length).toBe(4);
    expect(table.hasMore).toBe(false);
  });

  it('deduplicates rows based on rowIdKey', async () => {
    const mockLoader = vi.fn().mockResolvedValue({
      rows: [
        { id: '1', name: 'Alice', role: 'Dev', department: 'Eng' },
        { id: '1', name: 'Alice Duplicate', role: 'Dev', department: 'Eng' },
        { id: '2', name: 'Bob', role: 'Designer', department: 'Design' }
      ],
      hasMore: false,
      totalRows: 2
    });

    table.config = {
      rowIdKey: 'id',
      dataLoader: mockLoader
    };

    await new Promise(r => setTimeout(r, 20));

    expect(table.data.length).toBe(2);
    expect(table.data[0].name).toBe('Alice');
    expect(table.data[1].name).toBe('Bob');
  });

  it('resets loaded rows and scroll on search term change', async () => {
    const mockLoader = vi.fn().mockImplementation(async (req: InfiniteDataRequest<TestItem>) => {
      return {
        rows: req.searchTerm ? [{ id: 'search-1', name: `Match ${req.searchTerm}`, role: 'Dev', department: 'Eng' }] : [
          { id: '1', name: 'Alice', role: 'Dev', department: 'Eng' },
          { id: '2', name: 'Bob', role: 'QA', department: 'Eng' }
        ],
        hasMore: false,
        totalRows: 1
      };
    });

    table.config = { dataLoader: mockLoader };
    await new Promise(r => setTimeout(r, 20));

    expect(table.data.length).toBe(2);

    // Trigger search
    table.setSearchTerm('Bob');
    await new Promise(r => setTimeout(r, 20));

    expect(mockLoader).toHaveBeenCalledTimes(2);
    expect(table.data.length).toBe(1);
    expect(table.data[0].name).toBe('Match Bob');
  });

  it('renders retry button and triggers retry on batch fetch error', async () => {
    let shouldFail = true;
    const mockLoader = vi.fn().mockImplementation(async () => {
      if (shouldFail) {
        throw new Error('Network timeout');
      }
      return {
        rows: [{ id: 'success-1', name: 'Recovered User', role: 'Dev', department: 'Eng' }],
        hasMore: false,
        totalRows: 1
      };
    });

    table.config = { dataLoader: mockLoader };
    await new Promise(r => setTimeout(r, 20));

    const shadow = table.shadowRoot!;
    const errorBar = shadow.querySelector('.ift-error-bar');
    expect(errorBar).toBeTruthy();
    expect(errorBar?.textContent).toContain('Network timeout');

    // Simulate clicking retry
    shouldFail = false;
    const retryBtn = shadow.querySelector('.ift-btn-retry') as HTMLButtonElement;
    expect(retryBtn).toBeTruthy();
    retryBtn.click();

    await new Promise(r => setTimeout(r, 20));

    expect(table.data.length).toBe(1);
    expect(table.data[0].name).toBe('Recovered User');
  });

  it('falls back to numbered pagination bar when disabled is true', async () => {
    table.data = [
      { id: '1', name: 'User 1', role: 'Dev', department: 'Eng' },
      { id: '2', name: 'User 2', role: 'QA', department: 'Eng' },
      { id: '3', name: 'User 3', role: 'PM', department: 'Product' }
    ];

    // Disable infinite scroll
    table.config = { enabled: false };

    const shadow = table.shadowRoot!;
    const paginationBar = shadow.querySelector('.ift-pagination-bar') as HTMLElement;
    const footerStatus = shadow.querySelector('.ift-footer-status') as HTMLElement;

    expect(paginationBar.style.display).toBe('flex');
    expect(footerStatus.style.display).toBe('none');
    expect(paginationBar.textContent).toContain('Showing 1 to 3 of 3 entries');
  });
});
