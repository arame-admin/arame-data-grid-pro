import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EditableDataTable } from '../src/editable-table/editable-data-table.element.js';
import { EditableColumnDef } from '../src/editable-table/types.js';

interface ProductItem {
  id: string;
  title: string;
  price: number;
  active: boolean;
}

const mockProducts: ProductItem[] = [
  { id: 'p1', title: 'Wireless Keyboard', price: 89, active: true },
  { id: 'p2', title: 'Ergonomic Mouse', price: 59, active: false }
];

const mockColumns: EditableColumnDef<ProductItem>[] = [
  {
    id: 'title',
    header: 'Product Title',
    field: 'title',
    editable: true,
    validator: (newVal) => (newVal.trim().length < 3 ? 'Title must be at least 3 chars' : null)
  },
  {
    id: 'price',
    header: 'Price ($)',
    field: 'price',
    editable: true,
    editor: { type: 'number', min: 0 }
  },
  {
    id: 'active',
    header: 'In Stock',
    field: 'active',
    editable: true,
    editor: { type: 'checkbox' }
  }
];

describe('EditableDataTable Component', () => {
  let table: EditableDataTable<ProductItem>;

  beforeEach(() => {
    if (!window.customElements.get('et-test-table')) {
      window.customElements.define('et-test-table', class extends EditableDataTable<ProductItem> {});
    }
    table = document.createElement('et-test-table') as EditableDataTable<ProductItem>;
    document.body.appendChild(table);
    table.columns = mockColumns;
    table.rows = [...mockProducts];
  });

  it('triggers edit start event when a cell enters editing mode', () => {
    const editStartSpy = vi.fn();
    table.addEventListener('editable-table:edit-start', editStartSpy);

    table.startEditing('p1', 'title', mockProducts[0], 'Wireless Keyboard');

    expect(editStartSpy).toHaveBeenCalled();
    const event = editStartSpy.mock.calls[0][0] as CustomEvent;
    expect(event.detail.columnId).toBe('title');
    expect(event.detail.value).toBe('Wireless Keyboard');
  });

  it('validates edited cell value and fires validation error on invalid input', async () => {
    const valErrorSpy = vi.fn();
    table.addEventListener('editable-table:validation-error', valErrorSpy);

    table.startEditing('p1', 'title', mockProducts[0], 'Wireless Keyboard');
    await table.commitEditing(mockProducts[0], table.columns[0], 'AB'); // shorter than 3 chars

    expect(valErrorSpy).toHaveBeenCalled();
    const event = valErrorSpy.mock.calls[0][0] as CustomEvent;
    expect(event.detail.error).toBe('Title must be at least 3 chars');
  });

  it('optimistically updates cell value and calls onSave handler', async () => {
    const onSaveSpy = vi.fn();
    table.options = { onSave: onSaveSpy, optimisticUpdates: true };

    table.startEditing('p1', 'price', mockProducts[0], 89);
    await table.commitEditing(mockProducts[0], table.columns[1], 120);

    expect(onSaveSpy).toHaveBeenCalled();
    expect(mockProducts[0].price).toBe(120);
  });

  it('rolls back optimistic update when onSave fails', async () => {
    const saveErrorSpy = vi.fn();
    table.addEventListener('editable-table:save-error', saveErrorSpy);

    table.options = {
      optimisticUpdates: true,
      onSave: async () => {
        throw new Error('Database server offline');
      }
    };

    const row = mockProducts[0];
    table.startEditing('p1', 'price', row, 120);
    await table.commitEditing(row, table.columns[1], 250);

    expect(saveErrorSpy).toHaveBeenCalled();
    expect(row.price).toBe(120); // Successfully rolled back to prior value
  });
});
