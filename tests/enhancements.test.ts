import { describe, it, expect, vi, beforeEach } from 'vitest';
import '../src/ui/pro-data-grid.element.js';
import type { ProDataGrid } from '../src/ui/pro-data-grid.element.js';

interface User {
  id: string;
  name: string;
  role: string;
}

const mockUsers: User[] = [
  { id: '1', name: 'Alice Admin', role: 'Super Admin' },
  { id: '2', name: 'Bob Baker', role: 'Staff' },
  { id: '3', name: 'Charlie Clark', role: 'Manager' }
];

describe('Enhancements Suite (ENH-01 through ENH-06)', () => {
  let grid: ProDataGrid<User>;

  beforeEach(() => {
    grid = document.createElement('pro-data-grid') as ProDataGrid<User>;
    document.body.appendChild(grid);
  });

  it('ENH-04: suppresses toolbar completely when options.toolbar is false', () => {
    grid.options = { toolbar: false };
    grid.columns = [{ id: 'name', header: 'Name', field: 'name' }];
    grid.rows = mockUsers;

    const toolbar = grid.querySelector('.pdg-toolbar') as HTMLElement;
    expect(toolbar.style.display).toBe('none');
  });

  it('ENH-04: suppresses Export CSV button when options.exportable is false', () => {
    grid.options = { toolbar: true, exportable: false };
    grid.columns = [{ id: 'name', header: 'Name', field: 'name' }];
    grid.rows = mockUsers;

    const toolbar = grid.querySelector('.pdg-toolbar') as HTMLElement;
    expect(toolbar.style.display).not.toBe('none');
    const exportBtn = toolbar.querySelector('.pdg-btn');
    expect(exportBtn).toBeNull();
  });

  it('ENH-03: supports controlled/server pagination state with totalRows and currentPage', () => {
    grid.options = {
      pagination: true,
      paginationMode: 'controlled',
      pageSize: 10,
      totalRows: 150,
      currentPage: 3
    };
    grid.columns = [{ id: 'name', header: 'Name', field: 'name' }];
    grid.rows = mockUsers;

    const footer = grid.querySelector('.pdg-footer') as HTMLElement;
    expect(footer).not.toBeNull();
    const info = footer.querySelector('.pdg-pagination-info');
    expect(info?.textContent).toContain('Showing 21 to 30 of 150 entries');
    expect(info?.textContent).toContain('Page 3 of 15');
  });

  it('ENH-05: renders custom Action Column with actions.render function', () => {
    const actionSpy = vi.fn();
    grid.options = {
      actions: {
        header: 'Manage',
        width: '120px',
        render: (row) => {
          const btn = document.createElement('button');
          btn.className = 'custom-edit-btn';
          btn.textContent = `Edit ${row.name}`;
          btn.onclick = () => actionSpy(row.id);
          return btn;
        }
      }
    };
    grid.columns = [{ id: 'name', header: 'Name', field: 'name' }];
    grid.rows = mockUsers;

    const actionHeader = grid.querySelector('.pdg-th.pdg-th-actions');
    expect(actionHeader?.textContent).toBe('Manage');

    const actionButtons = grid.querySelectorAll('.custom-edit-btn');
    expect(actionButtons.length).toBe(3);
    (actionButtons[0] as HTMLElement).click();
    expect(actionSpy).toHaveBeenCalledWith('1');
  });
});
