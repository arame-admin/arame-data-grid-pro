import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../src/calculated-table/index.js';
import { CalculatedDataTableElement } from '../src/calculated-table/calculated-data-table.element.js';
import { CalculatedTableColumn } from '../src/calculated-table/types.js';
import { evaluateRowCalculations, recalculateOnFieldChange } from '../src/calculated-table/calculation-engine.js';

interface InvoiceItem {
  id: string;
  item: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  subtotal?: number;
  taxAmount?: number;
  total?: number;
}

describe('CalculatedDataTableElement (<calculated-data-table>)', () => {
  let table: CalculatedDataTableElement<InvoiceItem>;

  const sampleColumns: CalculatedTableColumn<InvoiceItem>[] = [
    { key: 'id', header: 'ID', width: '80px' },
    { key: 'item', header: 'Description', width: '200px' },
    { key: 'quantity', header: 'Qty', width: '90px', editable: true, editorType: 'number' },
    { key: 'unitPrice', header: 'Unit Price', width: '110px', editable: true, editorType: 'number' },
    { key: 'taxRate', header: 'Tax %', width: '90px', editable: true, editorType: 'number' },
    {
      key: 'subtotal',
      header: 'Subtotal',
      width: '120px',
      dependencies: ['quantity', 'unitPrice'],
      calculate: (row) => row.quantity * row.unitPrice,
      formatter: (val) => `$${Number(val).toFixed(2)}`
    },
    {
      key: 'taxAmount',
      header: 'Tax Amount',
      width: '120px',
      dependencies: ['subtotal', 'taxRate'],
      calculate: (row) => (row.subtotal ?? (row.quantity * row.unitPrice)) * (row.taxRate / 100),
      formatter: (val) => `$${Number(val).toFixed(2)}`
    },
    {
      key: 'total',
      header: 'Total Due',
      width: '130px',
      dependencies: ['subtotal', 'taxAmount'],
      calculate: (row) => {
        const sub = row.subtotal ?? (row.quantity * row.unitPrice);
        const tax = row.taxAmount ?? (sub * (row.taxRate / 100));
        return sub + tax;
      },
      formatter: (val) => `$${Number(val).toFixed(2)}`
    }
  ];

  const sampleData: InvoiceItem[] = [
    { id: 'INV-1', item: 'Cloud Hosting Server', quantity: 2, unitPrice: 150, taxRate: 10 },
    { id: 'INV-2', item: 'SSL Wildcard Certificate', quantity: 1, unitPrice: 200, taxRate: 8 },
    { id: 'INV-3', item: 'Domain Registration', quantity: 3, unitPrice: 15, taxRate: 0 }
  ];

  beforeEach(() => {
    document.body.innerHTML = '';
    table = document.createElement('calculated-data-table') as CalculatedDataTableElement<InvoiceItem>;
    table.columns = sampleColumns;
    // Deep-clone so cell-edit tests cannot mutate fixtures used by later cases
    table.data = sampleData.map((row) => ({ ...row }));
    document.body.appendChild(table);
  });

  describe('Calculation Engine', () => {
    it('accurately computes calculated columns on initial evaluateRowCalculations', () => {
      const row: InvoiceItem = { id: 'TEST-1', item: 'Gadget', quantity: 4, unitPrice: 25, taxRate: 10 };
      const { row: evaluated, recalculatedFields } = evaluateRowCalculations(row, 0, sampleColumns);

      expect(evaluated.subtotal).toBe(100); // 4 * 25
      expect(evaluated.taxAmount).toBe(10);  // 100 * 0.1
      expect(evaluated.total).toBe(110);      // 100 + 10
      expect(recalculatedFields).toEqual(['subtotal', 'taxAmount', 'total']);
    });

    it('recalculates dependent fields when a source cell is modified', () => {
      const row: InvoiceItem = {
        id: 'TEST-1',
        item: 'Gadget',
        quantity: 4,
        unitPrice: 25,
        taxRate: 10,
        subtotal: 100,
        taxAmount: 10,
        total: 110
      };

      // Change quantity to 10
      row.quantity = 10;
      const { row: updated, recalculatedFields } = recalculateOnFieldChange(row, 0, 'quantity', sampleColumns);

      expect(recalculatedFields).toContain('subtotal');
      expect(recalculatedFields).toContain('taxAmount');
      expect(recalculatedFields).toContain('total');
      expect(updated.subtotal).toBe(250); // 10 * 25
      expect(updated.taxAmount).toBe(25); // 250 * 0.1
      expect(updated.total).toBe(275); // 250 + 25
    });

    it('handles non-numeric and division by zero predictably', () => {
      const columnsWithDivision: CalculatedTableColumn[] = [
        {
          key: 'ratio',
          header: 'Ratio',
          calculate: (row: any) => row.a / row.b
        }
      ];

      const row = { a: 10, b: 0 };
      const { row: result } = evaluateRowCalculations(row, 0, columnsWithDivision);
      expect(result.ratio).toBe(Infinity);
    });
  });

  describe('Web Component Behavior', () => {
    it('renders sticky first and last columns with appropriate classes', () => {
      const shadow = table.shadowRoot!;
      const headers = shadow.querySelectorAll('.calc-th');

      expect(headers.length).toBe(8);
      // First column (ID)
      expect(headers[0].classList.contains('calc-sticky-first')).toBe(true);
      // Last column (Total Due)
      expect(headers[7].classList.contains('calc-sticky-last')).toBe(true);
      // Middle columns are not sticky
      expect(headers[1].classList.contains('calc-sticky-first')).toBe(false);
      expect(headers[1].classList.contains('calc-sticky-last')).toBe(false);
    });

    it('disables sticky last column when stickyLast is set to false', () => {
      table.options = {
        sticky: { stickyFirst: true, stickyLast: false }
      };

      const shadow = table.shadowRoot!;
      const headers = shadow.querySelectorAll('.calc-th');
      expect(headers[0].classList.contains('calc-sticky-first')).toBe(true);
      expect(headers[7].classList.contains('calc-sticky-last')).toBe(false);
    });

    it('renders calculated values with custom formatters in table cells', () => {
      const shadow = table.shadowRoot!;
      const rows = shadow.querySelectorAll('.calc-tbody .calc-tr');
      expect(rows.length).toBe(3);

      const firstRowCells = rows[0].querySelectorAll('.calc-td');
      // Subtotal (2 * 150 = $300.00)
      expect(firstRowCells[5].textContent).toBe('$300.00');
      // Tax (300 * 0.10 = $30.00)
      expect(firstRowCells[6].textContent).toBe('$30.00');
      // Total (300 + 30 = $330.00)
      expect(firstRowCells[7].textContent).toBe('$330.00');
    });

    it('updates cell value, triggers recalculation, and emits typed cell-change event', () => {
      const changeSpy = vi.fn();
      table.addEventListener('calculated-table:cell-change', changeSpy);

      // Change quantity of first row from 2 to 5
      table.updateCellValue(0, 'quantity', 5);

      expect(changeSpy).toHaveBeenCalledTimes(1);
      const detail = changeSpy.mock.calls[0][0].detail;
      expect(detail.columnKey).toBe('quantity');
      expect(detail.oldValue).toBe(2);
      expect(detail.newValue).toBe(5);
      expect(detail.updatedRow.subtotal).toBe(750); // 5 * 150
      expect(detail.updatedRow.taxAmount).toBe(75); // 750 * 0.1
      expect(detail.updatedRow.total).toBe(825);     // 750 + 75

      // Check updated DOM
      const shadow = table.shadowRoot!;
      const firstRowCells = shadow.querySelectorAll('.calc-tbody .calc-tr')[0].querySelectorAll('.calc-td');
      expect(firstRowCells[5].textContent).toBe('$750.00');
      expect(firstRowCells[6].textContent).toBe('$75.00');
      expect(firstRowCells[7].textContent).toBe('$825.00');
    });

    it('supports global search and filters displayed rows', () => {
      table.setSearchTerm('Domain');
      const shadow = table.shadowRoot!;
      const rows = shadow.querySelectorAll('.calc-tbody .calc-tr');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('Domain Registration');
    });

    it('supports column sorting', () => {
      table.setSortRule({ column: 'quantity', direction: 'desc' });
      const shadow = table.shadowRoot!;
      const rows = shadow.querySelectorAll('.calc-tbody .calc-tr');
      // Quantity 3 (Domain) should be first, then 2 (Hosting), then 1 (SSL)
      expect(rows[0].textContent).toContain('Domain Registration');
      expect(rows[2].textContent).toContain('SSL Wildcard Certificate');
    });

    it('supports server-side dataLoader callback', async () => {
      const mockLoader = vi.fn().mockResolvedValue({
        rows: [
          { id: 'SRV-1', item: 'Server Loaded Row', quantity: 10, unitPrice: 50, taxRate: 5 }
        ],
        totalRows: 1
      });

      table.options = { dataLoader: mockLoader };
      await new Promise(r => setTimeout(r, 20));

      expect(mockLoader).toHaveBeenCalled();
      const shadow = table.shadowRoot!;
      const rows = shadow.querySelectorAll('.calc-tbody .calc-tr');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('Server Loaded Row');
      // Calculated column computed on returned server page: 10 * 50 = $500.00
      const cells = rows[0].querySelectorAll('.calc-td');
      expect(cells[5].textContent).toBe('$500.00');
    });

    it('dynamically aggregates and recalculates final totals when cell values change', () => {
      const rows = [
        { id: '1', item: 'Item 1', quantity: 2, unitPrice: 100, taxRate: 10, subtotal: 200 },
        { id: '2', item: 'Item 2', quantity: 5, unitPrice: 20, taxRate: 10, subtotal: 100 }
      ];

      // Initial sum of subtotal
      let initialSubtotalSum = rows.reduce((acc, r) => acc + r.subtotal, 0);
      expect(initialSubtotalSum).toBe(300);

      // Simulate cell change: quantity changed from 2 to 4 in row 0
      rows[0].quantity = 4;
      rows[0].subtotal = rows[0].quantity * rows[0].unitPrice; // 400

      // Final sum recalculated
      let updatedSubtotalSum = rows.reduce((acc, r) => acc + r.subtotal, 0);
      expect(updatedSubtotalSum).toBe(500);
    });
  });
});
