import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProDataGrid } from '../src/ui/pro-data-grid.element.js';
import { reorderTreeNodes } from '../src/tree-table/tree-engine.js';

describe('Drag-and-Drop Reordering Enhancements', () => {
  let grid: ProDataGrid;

  beforeEach(() => {
    if (!window.customElements.get('pro-data-grid-dnd-test')) {
      window.customElements.define('pro-data-grid-dnd-test', class extends ProDataGrid {});
    }
    grid = document.createElement('pro-data-grid-dnd-test') as ProDataGrid;
    document.body.appendChild(grid);
  });

  it('renders draggable row handles when rowReordering is enabled', () => {
    grid.columns = [
      { id: 'name', header: 'Name', field: 'name' }
    ];
    grid.rows = [
      { id: '1', name: 'Alpha' },
      { id: '2', name: 'Beta' },
      { id: '3', name: 'Gamma' }
    ];
    grid.options = {
      rowReordering: true
    };

    const handles = grid.querySelectorAll('.pdg-drag-handle');
    expect(handles.length).toBe(3);
    expect(handles[0].getAttribute('draggable')).toBe('true');
    expect(handles[0].getAttribute('aria-label')).toContain('Drag or press Up/Down');
  });

  it('adds visual feedback classes on row drag start and clean up on drag end', () => {
    grid.columns = [{ id: 'name', header: 'Name', field: 'name' }];
    grid.rows = [
      { id: '1', name: 'Alpha' },
      { id: '2', name: 'Beta' }
    ];
    grid.options = { rowReordering: true };

    const rows = grid.querySelectorAll('.pdg-row');
    const handle = rows[0].querySelector('.pdg-drag-handle') as HTMLElement;
    expect(handle).toBeTruthy();

    const dataTransfer = {
      setData: vi.fn(),
      effectAllowed: 'none'
    };

    // Drag start
    handle.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dataTransfer as any, bubbles: true }));
    expect(rows[0].classList.contains('pdg-row-dragging')).toBe(true);
    expect(handle.classList.contains('is-grabbing')).toBe(true);

    // Drag end
    handle.dispatchEvent(new DragEvent('dragend', { bubbles: true }));
    expect(rows[0].classList.contains('pdg-row-dragging')).toBe(false);
    expect(handle.classList.contains('is-grabbing')).toBe(false);
  });

  it('indicates invalid drop target when dragging over same row', () => {
    grid.columns = [{ id: 'name', header: 'Name', field: 'name' }];
    grid.rows = [
      { id: '1', name: 'Alpha' },
      { id: '2', name: 'Beta' }
    ];
    grid.options = { rowReordering: true };

    const rows = grid.querySelectorAll('.pdg-row');
    const handle = rows[0].querySelector('.pdg-drag-handle') as HTMLElement;

    const dataTransfer = {
      setData: vi.fn(),
      dropEffect: 'none'
    };

    handle.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dataTransfer as any, bubbles: true }));

    // Drag over same row
    const dragOverEvt = new DragEvent('dragover', {
      dataTransfer: dataTransfer as any,
      bubbles: true,
      clientY: 10
    });
    vi.spyOn(rows[0], 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 40,
      height: 40,
      left: 0,
      right: 200,
      width: 200
    } as DOMRect);

    rows[0].dispatchEvent(dragOverEvt);
    expect(rows[0].classList.contains('pdg-drag-not-allowed')).toBe(true);
  });

  it('marks valid drop target top or bottom based on pointer position', () => {
    grid.columns = [{ id: 'name', header: 'Name', field: 'name' }];
    grid.rows = [
      { id: '1', name: 'Alpha' },
      { id: '2', name: 'Beta' }
    ];
    grid.options = { rowReordering: true };

    const rows = grid.querySelectorAll('.pdg-row');
    const handle0 = rows[0].querySelector('.pdg-drag-handle') as HTMLElement;

    const dataTransfer = { setData: vi.fn(), dropEffect: 'move' };
    handle0.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dataTransfer as any, bubbles: true }));

    vi.spyOn(rows[1], 'getBoundingClientRect').mockReturnValue({
      top: 50,
      bottom: 90,
      height: 40,
      left: 0,
      right: 200,
      width: 200
    } as DOMRect);

    // happy-dom may ignore clientY in DragEventInit — define it on the event instance
    const fireDragOver = (clientY: number) => {
      const evt = new DragEvent('dragover', {
        dataTransfer: dataTransfer as any,
        bubbles: true
      });
      Object.defineProperty(evt, 'clientY', { get: () => clientY });
      rows[1].dispatchEvent(evt);
    };

    // Over upper half of row 2 -> pdg-drag-over-top
    fireDragOver(60); // 10px from top of mocked rect
    expect(rows[1].classList.contains('pdg-drag-over-top')).toBe(true);
    expect(rows[1].classList.contains('pdg-drag-over-bottom')).toBe(false);

    // Over lower half of row 2 -> pdg-drag-over-bottom
    fireDragOver(80); // 30px from top
    expect(rows[1].classList.contains('pdg-drag-over-bottom')).toBe(true);
    expect(rows[1].classList.contains('pdg-drag-over-top')).toBe(false);
  });

  it('reorders rows with keyboard ArrowUp and ArrowDown and announces position', () => {
    grid.columns = [{ id: 'name', header: 'Name', field: 'name' }];
    grid.rows = [
      { id: '1', name: 'Alpha' },
      { id: '2', name: 'Beta' },
      { id: '3', name: 'Gamma' }
    ];
    grid.options = { rowReordering: true };

    let reorderedDetail: any = null;
    grid.addEventListener('pdg:row-reorder', (e: any) => {
      reorderedDetail = e.detail;
    });

    const rows = grid.querySelectorAll('.pdg-row');
    const handle1 = rows[1].querySelector('.pdg-drag-handle') as HTMLElement;

    // Press ArrowUp on second row
    handle1.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));

    expect(reorderedDetail).toBeTruthy();
    expect(reorderedDetail.fromIndex).toBe(1);
    expect(reorderedDetail.toIndex).toBe(0);
    expect((grid as any)._rows[0].name).toBe('Beta');
    expect((grid as any)._rows[1].name).toBe('Alpha');
  });

  it('reorders columns with keyboard and applies drop confirmation highlight', () => {
    grid.columns = [
      { id: 'col1', header: 'Col 1', field: 'c1' },
      { id: 'col2', header: 'Col 2', field: 'c2' }
    ];
    grid.rows = [{ id: '1', c1: 'A', c2: 'B' }];
    grid.options = { columnReordering: true };

    let columnReorderDetail: any = null;
    grid.addEventListener('pdg:column-reorder', (e: any) => {
      columnReorderDetail = e.detail;
    });

    const headers = grid.querySelectorAll('.pdg-th');
    expect(headers[0].classList.contains('pdg-th-draggable')).toBe(true);

    // Press ArrowRight on first column
    headers[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    expect(columnReorderDetail).toBeTruthy();
    expect(columnReorderDetail.fromIndex).toBe(0);
    expect(columnReorderDetail.toIndex).toBe(1);
    expect(columnReorderDetail.column.header).toBe('Col 1');
  });

  it('reorders tree nodes before, after, and inside properly', () => {
    const tree = [
      { id: 'n1', label: 'Node 1', children: [{ id: 'n1-1', label: 'Child 1-1' }] },
      { id: 'n2', label: 'Node 2' }
    ];

    // Reorder n2 before n1
    const reorderedBefore = reorderTreeNodes(tree, 'n2', 'n1', 'before', {});
    expect(reorderedBefore[0].id).toBe('n2');
    expect(reorderedBefore[1].id).toBe('n1');

    // Reorder n2 inside n1
    const reorderedInside = reorderTreeNodes(tree, 'n2', 'n1', 'inside', {});
    expect(reorderedInside[0].id).toBe('n1');
    expect(reorderedInside[0].children?.some((c: any) => c.id === 'n2')).toBe(true);
  });
});
