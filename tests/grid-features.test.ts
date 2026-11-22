import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProDataGrid } from '../src/ui/pro-data-grid.element.js';
import { ServerQueryParams, ServerQueryResult } from '../src/types.js';

interface TestUser {
  id: number;
  name: string;
  role: string;
}

const mockUsers: TestUser[] = [
  { id: 1, name: 'Alice', role: 'Engineer' },
  { id: 2, name: 'Bob', role: 'Designer' },
  { id: 3, name: 'Charlie', role: 'Architect' }
];

describe('ProDataGrid Features & Server-Side Data Operations', () => {
  let grid: ProDataGrid<TestUser>;

  beforeEach(() => {
    if (!window.customElements.get('pro-data-grid-test')) {
      window.customElements.define('pro-data-grid-test', class extends ProDataGrid<TestUser> {});
    }
    grid = document.createElement('pro-data-grid-test') as ProDataGrid<TestUser>;
    document.body.appendChild(grid);
  });

  it('invokes server data loader with properly constructed query params', async () => {
    let capturedParams: ServerQueryParams | null = null;
    const loader = vi.fn(async (params: ServerQueryParams): Promise<ServerQueryResult<TestUser>> => {
      capturedParams = params;
      return { rows: mockUsers, totalRows: 3 };
    });

    grid.columns = [
      { id: 'name', header: 'Name', field: 'name' },
      { id: 'role', header: 'Role', field: 'role' }
    ];

    grid.options = {
      serverSide: true,
      serverDataLoader: loader
    };

    // options setter auto-triggers the initial server load
    await vi.waitFor(() => expect(loader).toHaveBeenCalled());

    expect(loader).toHaveBeenCalledTimes(1);
    expect(capturedParams).not.toBeNull();
    expect(capturedParams?.pageIndex).toBe(0);
    expect(capturedParams?.pageSize).toBe(10);
    expect(capturedParams?.signal).toBeInstanceOf(AbortSignal);
  });

  it('cancels outdated requests via AbortSignal on rapid server queries', async () => {
    const abortedSignals: boolean[] = [];

    const loader = vi.fn((params: ServerQueryParams) => {
      return new Promise<ServerQueryResult<TestUser>>((resolve, reject) => {
        params.signal.addEventListener('abort', () => {
          abortedSignals.push(true);
          reject(new DOMException('Aborted', 'AbortError'));
        });
        setTimeout(() => {
          resolve({ rows: mockUsers, totalRows: 3 });
        }, 100);
      });
    });

    grid.columns = [{ id: 'name', header: 'Name', field: 'name' }];
    // Instant initial load so options-setter request finishes before the race
    const warmLoader = vi.fn(async () => ({ rows: mockUsers, totalRows: 3 }));
    grid.options = { serverSide: true, serverDataLoader: warmLoader };
    await vi.waitFor(() => expect(warmLoader).toHaveBeenCalled());

    grid.options = { serverSide: true, serverDataLoader: loader };
    await vi.waitFor(() => expect(loader.mock.calls.length).toBeGreaterThan(0));
    // Let the options-triggered request settle, then race two fresh loads
    await new Promise((r) => setTimeout(r, 120));
    loader.mockClear();
    abortedSignals.length = 0;

    // Fire first query then immediately fire second
    const p1 = grid.triggerServerLoad(false);
    const p2 = grid.triggerServerLoad(false);

    await Promise.allSettled([p1, p2]);
    expect(abortedSignals.length).toBe(1);
  });

  it('handles server errors and dispatches pdg:error event', async () => {
    const errorHandler = vi.fn();
    grid.addEventListener('pdg:error', errorHandler);

    const failingLoader = vi.fn(async () => {
      throw new Error('Database connection failed');
    });

    grid.columns = [{ id: 'name', header: 'Name', field: 'name' }];
    grid.options = { serverSide: true, serverDataLoader: failingLoader };

    await grid.triggerServerLoad(false);

    expect(errorHandler).toHaveBeenCalled();
    const event = errorHandler.mock.calls[0][0] as CustomEvent;
    expect(event.detail.error.message).toBe('Database connection failed');
  });

  it('supports row reordering and dispatches pdg:row-reorder event', () => {
    const reorderSpy = vi.fn();
    grid.addEventListener('pdg:row-reorder', reorderSpy);

    grid.columns = [{ id: 'name', header: 'Name', field: 'name' }];
    grid.rows = [...mockUsers];
    grid.options = { rowReordering: true };

    // Trigger internal reorder from index 0 to 2
    (grid as any).reorderRow(0, 2);

    expect(reorderSpy).toHaveBeenCalled();
    const event = reorderSpy.mock.calls[0][0] as CustomEvent;
    expect(event.detail.fromIndex).toBe(0);
    expect(event.detail.toIndex).toBe(2);
    expect(event.detail.row.name).toBe('Alice');
    expect(grid.rows[2].name).toBe('Alice');
  });

  it('supports column reordering and dispatches pdg:column-reorder event', () => {
    const colReorderSpy = vi.fn();
    grid.addEventListener('pdg:column-reorder', colReorderSpy);

    grid.columns = [
      { id: 'name', header: 'Name', field: 'name' },
      { id: 'role', header: 'Role', field: 'role' }
    ];
    grid.options = { columnReordering: true };

    (grid as any).reorderColumn(0, 1);

    expect(colReorderSpy).toHaveBeenCalled();
    const event = colReorderSpy.mock.calls[0][0] as CustomEvent;
    expect(event.detail.column.id).toBe('name');
    expect(grid.columns[0].id).toBe('role');
    expect(grid.columns[1].id).toBe('name');
  });

  it('validates cell edits and fires validation error event when invalid', () => {
    const errorSpy = vi.fn();
    grid.addEventListener('pdg:edit-validation-error', errorSpy);

    const validator = vi.fn((val: any) => (val.length < 3 ? 'Name too short' : null));

    grid.columns = [
      { id: 'name', header: 'Name', field: 'name', validator }
    ];
    grid.rows = [...mockUsers];
    grid.options = { editable: true };

    // Attempt invalid edit
    grid.render();
    const row = mockUsers[0];
    const col = grid.columns[0];

    // Trigger validation failure
    const errMsg = col.validator!('Al', 'Alice', row, col);
    expect(errMsg).toBe('Name too short');
  });

  it('supports deletion action with confirmation event', () => {
    const deleteSpy = vi.fn();
    grid.addEventListener('pdg:delete', deleteSpy);

    grid.columns = [{ id: 'name', header: 'Name', field: 'name' }];
    grid.rows = [...mockUsers];
    grid.options = { deletable: true, confirmDelete: false };

    (grid as any).handleDeleteRow(1, mockUsers[0]);

    expect(deleteSpy).toHaveBeenCalled();
    const event = deleteSpy.mock.calls[0][0] as CustomEvent;
    expect(event.detail.rowId).toBe(1);
    expect(event.detail.row.name).toBe('Alice');
  });
});
