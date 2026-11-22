import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FilterableDataTable } from '../src/filterable-table/filterable-data-table.element.js';
import { filterRows } from '../src/filterable-table/filter-engine.js';
import { FilterableColumnDef } from '../src/filterable-table/types.js';

interface Invoice {
  id: string;
  client: string;
  status: string;
  amount: number;
  date: string;
}

const mockInvoices: Invoice[] = [
  { id: '1', client: 'Alpha Corp', status: 'Paid', amount: 1200, date: '2024-01-15' },
  { id: '2', client: 'Beta LLC', status: 'Pending', amount: 4500, date: '2024-02-10' },
  { id: '3', client: 'Gamma Inc', status: 'Paid', amount: 8900, date: '2024-03-01' },
  { id: '4', client: 'Delta Systems', status: 'Overdue', amount: 300, date: '2024-03-25' }
];

const mockColumns: FilterableColumnDef<Invoice>[] = [
  { id: 'client', header: 'Client', field: 'client', filter: { type: 'text' } },
  { id: 'status', header: 'Status', field: 'status', filter: { type: 'select', options: [{ label: 'Paid', value: 'Paid' }, { label: 'Pending', value: 'Pending' }] } },
  { id: 'amount', header: 'Amount', field: 'amount', filter: { type: 'number-range' } },
  { id: 'date', header: 'Invoice Date', field: 'date', filter: { type: 'date-range' } }
];

describe('FilterableDataTable Engine & Component', () => {
  it('filters by text contains', () => {
    const res = filterRows(mockInvoices, [{ columnId: 'client', type: 'text', value: 'alp' }], '', mockColumns);
    expect(res).toHaveLength(1);
    expect(res[0].client).toBe('Alpha Corp');
  });

  it('filters by select exact match', () => {
    const res = filterRows(mockInvoices, [{ columnId: 'status', type: 'select', value: 'Paid' }], '', mockColumns);
    expect(res).toHaveLength(2);
  });

  it('filters by number range (min and max)', () => {
    const res = filterRows(mockInvoices, [{ columnId: 'amount', type: 'number-range', value: { min: 1000, max: 5000 } }], '', mockColumns);
    expect(res).toHaveLength(2); // 1200 and 4500
  });

  it('filters by date range (start and end)', () => {
    const res = filterRows(mockInvoices, [{ columnId: 'date', type: 'date-range', value: { start: '2024-02-01', end: '2024-03-15' } }], '', mockColumns);
    expect(res).toHaveLength(2); // Feb 10 and Mar 01
  });

  it('combines multiple filters simultaneously', () => {
    const res = filterRows(mockInvoices, [
      { columnId: 'status', type: 'select', value: 'Paid' },
      { columnId: 'amount', type: 'number-range', value: { min: 5000 } }
    ], '', mockColumns);
    expect(res).toHaveLength(1);
    expect(res[0].client).toBe('Gamma Inc');
  });

  it('invokes server data loader with active filters and signal', async () => {
    if (!window.customElements.get('ft-test-table')) {
      window.customElements.define('ft-test-table', class extends FilterableDataTable<Invoice> {});
    }
    const table = document.createElement('ft-test-table') as FilterableDataTable<Invoice>;
    document.body.appendChild(table);

    const loaderSpy = vi.fn(async (params) => {
      expect(params.signal).toBeInstanceOf(AbortSignal);
      expect(params.filters).toHaveLength(1);
      return { rows: [mockInvoices[0]], totalRows: 1 };
    });

    table.columns = mockColumns;
    table.options = { serverSide: true, serverDataLoader: loaderSpy };

    table.setFilter('client', 'Alpha');
    await vi.waitFor(() => expect(loaderSpy).toHaveBeenCalled());
  });
});
