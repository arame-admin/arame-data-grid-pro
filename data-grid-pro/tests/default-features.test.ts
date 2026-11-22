import { describe, it, expect, vi } from 'vitest';
import { BaseTableController } from '../src/common/base-table-controller.js';
import { BaseTableOptions } from '../src/common/base-table-types.js';

interface TestItem {
  id: number;
  name: string;
  category: string;
}

const mockData: TestItem[] = Array.from({ length: 45 }, (_, i) => ({
  id: i + 1,
  name: `Item ${String(i + 1).padStart(2, '0')}`,
  category: i % 2 === 0 ? 'Hardware' : 'Software'
}));

const mockCols = [
  { id: 'name', header: 'Name', field: 'name', sortable: true },
  { id: 'category', header: 'Category', field: 'category', sortable: true }
];

describe('Default Pagination, Sorting, and Search across All Tables', () => {
  it('defaults to 10 rows per page with search and sorting active out-of-the-box', () => {
    const opts: BaseTableOptions<TestItem> = {};
    const ctrl = new BaseTableController<TestItem>(() => opts, () => {}, () => {});

    expect(ctrl.pageSize).toBe(10);
    expect(ctrl.pageIndex).toBe(0);

    const paged = ctrl.processClientData(mockData, mockCols);
    expect(paged).toHaveLength(10);
    expect(ctrl.totalRows).toBe(45);
    expect(ctrl.totalPages).toBe(5);
  });

  it('filters data using global search and automatically resets to page 0', () => {
    const opts: BaseTableOptions<TestItem> = {};
    const ctrl = new BaseTableController<TestItem>(() => opts, () => {}, () => {});

    // Move to page 2 first
    ctrl.goToPage(2);
    expect(ctrl.pageIndex).toBe(2);

    // Apply search
    ctrl.setGlobalSearch('Item 05');
    expect(ctrl.pageIndex).toBe(0); // Reset verified

    const paged = ctrl.processClientData(mockData, mockCols);
    expect(paged).toHaveLength(1);
    expect(paged[0].name).toBe('Item 05');
  });

  it('sorts columns ascending and descending by default', () => {
    const opts: BaseTableOptions<TestItem> = {};
    const ctrl = new BaseTableController<TestItem>(() => opts, () => {}, () => {});

    // Sort descending
    ctrl.handleSort('name', mockCols); // asc
    ctrl.handleSort('name', mockCols); // desc

    const paged = ctrl.processClientData(mockData, mockCols);
    expect(paged[0].name).toBe('Item 45');
  });

  it('dispatches server queries with current page, pageSize, search, and sorting', async () => {
    const loaderSpy = vi.fn(async (params) => {
      return { rows: [mockData[0]], totalRows: 1 };
    });

    const opts: BaseTableOptions<TestItem> = {
      serverSide: true,
      serverDataLoader: loaderSpy
    };

    const ctrl = new BaseTableController<TestItem>(() => opts, () => {}, () => {});
    ctrl.sortCriteria = [{ columnId: 'name', direction: 'desc' }];
    ctrl.globalSearch = 'TestQuery';
    ctrl.pageIndex = 3;

    await ctrl.triggerServerLoad();

    expect(loaderSpy).toHaveBeenCalledTimes(1);
    const sentParams = loaderSpy.mock.calls[0][0];
    expect(sentParams.pageIndex).toBe(3);
    expect(sentParams.pageSize).toBe(10);
    expect(sentParams.globalSearch).toBe('TestQuery');
    expect(sentParams.sortCriteria[0].columnId).toBe('name');
    expect(sentParams.sortCriteria[0].direction).toBe('desc');
    expect(sentParams.signal).toBeInstanceOf(AbortSignal);
  });
});
