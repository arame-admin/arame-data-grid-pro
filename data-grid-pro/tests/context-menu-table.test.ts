import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContextMenuDataTable } from '../src/context-menu-table/context-menu-data-table.element.js';
import { ContextMenuColumnDef } from '../src/context-menu-table/types.js';

interface Task {
  id: string;
  title: string;
  assignee: string;
  status: string;
}

const mockTasks: Task[] = [
  { id: 't1', title: 'Refactor Auth Provider', assignee: 'Alex', status: 'In Progress' },
  { id: 't2', title: 'Fix Layout Bleed on Mobile', assignee: 'Taylor', status: 'Completed' }
];

const mockColumns: ContextMenuColumnDef<Task>[] = [
  { id: 'title', header: 'Task Title', field: 'title', required: true },
  { id: 'assignee', header: 'Assigned To', field: 'assignee' },
  { id: 'status', header: 'Status', field: 'status' }
];

describe('ContextMenuDataTable Component', () => {
  let table: ContextMenuDataTable<Task>;

  beforeEach(() => {
    if (!window.customElements.get('cmt-test-table')) {
      window.customElements.define('cmt-test-table', class extends ContextMenuDataTable<Task> {});
    }
    table = document.createElement('cmt-test-table') as ContextMenuDataTable<Task>;
    document.body.appendChild(table);

    table.columns = mockColumns;
    table.rows = [...mockTasks];
  });

  it('opens column header menu when clicking header trigger button', () => {
    const headerTrigger = table.querySelector('.cmt-th-menu-trigger') as HTMLElement;
    expect(headerTrigger).not.toBeNull();

    headerTrigger.click();

    const popup = table.querySelector('.cmt-menu-popup') as HTMLElement;
    expect(popup.classList.contains('cmt-open')).toBe(true);
    expect(popup.textContent).toContain('Sort Ascending');
    expect(popup.textContent).toContain('Toggle Columns');
  });

  it('opens row context menu on right-click contextmenu event', () => {
    const rowOpenSpy = vi.fn();
    table.addEventListener('menu-table:row-context-menu-open', rowOpenSpy);

    table.options = {
      rowContextMenu: {
        enabled: true,
        items: [
          { id: 'edit', label: 'Edit Record', action: vi.fn() },
          { id: 'del', label: 'Delete Record', isDestructive: true, action: vi.fn() }
        ]
      }
    };

    const firstRow = table.querySelector('.cmt-tbody .cmt-row') as HTMLElement;
    firstRow.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 200 }));

    expect(rowOpenSpy).toHaveBeenCalled();
    const popup = table.querySelector('.cmt-menu-popup') as HTMLElement;
    expect(popup.classList.contains('cmt-open')).toBe(true);
    expect(popup.textContent).toContain('Edit Record');
    expect(popup.textContent).toContain('Delete Record');
  });

  it('executes menu action callback when context menu item is clicked', () => {
    const editActionSpy = vi.fn();
    table.options = {
      rowContextMenu: {
        enabled: true,
        items: [{ id: 'edit', label: 'Edit Task', action: editActionSpy }]
      }
    };

    // Open row context menu directly
    table.openRowContextMenu(mockTasks[0], 50, 50);

    const editBtn = table.querySelector('.cmt-menu-item') as HTMLElement;
    expect(editBtn.textContent).toContain('Edit Task');

    editBtn.click();
    expect(editActionSpy).toHaveBeenCalled();
  });

  it('closes active menu upon pressing Escape', () => {
    table.openRowContextMenu(mockTasks[0], 50, 50);
    const popup = table.querySelector('.cmt-menu-popup') as HTMLElement;
    expect(popup.classList.contains('cmt-open')).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(popup.classList.contains('cmt-open')).toBe(false);
  });
});
