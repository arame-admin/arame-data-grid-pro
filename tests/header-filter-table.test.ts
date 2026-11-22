import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../src/header-filter-table/index.js';
import { HeaderFilterDataTableElement } from '../src/header-filter-table/header-filter-data-table.element.js';
import { HeaderFilterTableColumn, HeaderFilterDataLoaderRequest } from '../src/header-filter-table/types.js';
import { applyClientFilters, matchColumnFilter } from '../src/header-filter-table/filter-engine.js';

interface Employee {
  id: string;
  name: string;
  department: string;
  role: string;
  salary: number;
  startDate: string;
}

describe('HeaderFilterDataTableElement (<header-filter-data-table>)', () => {
  let table: HeaderFilterDataTableElement<Employee>;

  const sampleColumns: HeaderFilterTableColumn<Employee>[] = [
    {
      key: 'id',
      header: 'ID',
      width: '90px',
      filter: { type: 'text', placeholder: 'ID...' }
    },
    {
      key: 'name',
      header: 'Full Name',
      width: '180px',
      filter: { type: 'text', placeholder: 'Name...' }
    },
    {
      key: 'department',
      header: 'Department',
      width: '150px',
      filter: {
        type: 'select',
        options: [
          { label: 'Engineering', value: 'Engineering' },
          { label: 'Design', value: 'Design' },
          { label: 'Marketing', value: 'Marketing' }
        ]
      }
    },
    {
      key: 'role',
      header: 'Role',
      width: '160px',
      filter: {
        type: 'multi-select',
        options: [
          { label: 'Frontend', value: 'Frontend' },
          { label: 'Backend', value: 'Backend' },
          { label: 'Lead', value: 'Lead' }
        ]
      }
    },
    {
      key: 'salary',
      header: 'Salary',
      width: '160px',
      filter: { type: 'number-range' }
    },
    {
      key: 'startDate',
      header: 'Start Date',
      width: '190px',
      filter: { type: 'date-range' }
    }
  ];

  const sampleData: Employee[] = [
    { id: 'EMP-01', name: 'Alice Cooper', department: 'Engineering', role: 'Frontend', salary: 110000, startDate: '2021-03-15' },
    { id: 'EMP-02', name: 'Bob Dylan', department: 'Design', role: 'Lead', salary: 95000, startDate: '2022-06-01' },
    { id: 'EMP-03', name: 'Charlie Watts', department: 'Engineering', role: 'Backend', salary: 125000, startDate: '2020-01-10' },
    { id: 'EMP-04', name: 'Diana Ross', department: 'Marketing', role: 'Lead', salary: 105000, startDate: '2023-09-12' },
    { id: 'EMP-05', name: 'David Bowie', department: 'Engineering', role: 'Frontend', salary: 130000, startDate: '2019-11-20' }
  ];

  beforeEach(() => {
    document.body.innerHTML = '';
    table = document.createElement('header-filter-data-table') as HeaderFilterDataTableElement<Employee>;
    table.columns = sampleColumns;
    table.data = sampleData;
    document.body.appendChild(table);
  });

  describe('Filter Engine Unit Logic', () => {
    it('filters correctly by text search', () => {
      const filtered = applyClientFilters(sampleData, sampleColumns, { name: 'Alice' });
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Alice Cooper');
    });

    it('filters correctly by single select', () => {
      const filtered = applyClientFilters(sampleData, sampleColumns, { department: 'Engineering' });
      expect(filtered.length).toBe(3);
    });

    it('filters correctly by multi-select array', () => {
      const filtered = applyClientFilters(sampleData, sampleColumns, { role: ['Frontend', 'Lead'] });
      // Alice (Frontend), Bob (Lead), Diana (Lead), David (Frontend) = 4
      expect(filtered.length).toBe(4);
    });

    it('filters correctly by number-range (min and max)', () => {
      const filtered = applyClientFilters(sampleData, sampleColumns, { salary: { min: 100000, max: 120000 } });
      // Alice (110k), Diana (105k)
      expect(filtered.length).toBe(2);
    });

    it('filters correctly by date-range (start and end)', () => {
      const filtered = applyClientFilters(sampleData, sampleColumns, { startDate: { start: '2021-01-01', end: '2022-12-31' } });
      // Alice (2021-03-15), Bob (2022-06-01)
      expect(filtered.length).toBe(2);
    });

    it('supports custom predicate function', () => {
      const customCol: HeaderFilterTableColumn<Employee> = {
        key: 'salary',
        header: 'Custom High Earner',
        filter: {
          type: 'text',
          predicate: (val) => Number(val) > 120000
        }
      };
      const filtered = applyClientFilters(sampleData, [customCol], { salary: 'active' });
      expect(filtered.length).toBe(2); // Charlie (125k), David (130k)
    });
  });

  describe('Web Component Header Filter Interaction', () => {
    it('renders header controls for all columns and sets up inputs', () => {
      const shadow = table.shadowRoot!;
      const headers = shadow.querySelectorAll('.hft-th');
      expect(headers.length).toBe(6);

      // Check text input in name col
      const nameInput = shadow.querySelector('th[data-col-key="name"] .hft-filter-input');
      expect(nameInput).toBeTruthy();

      // Check select in department col
      const deptSelect = shadow.querySelector('th[data-col-key="department"] .hft-filter-select');
      expect(deptSelect).toBeTruthy();
    });

    it('updates displayed rows when setting filter value programmatically', () => {
      table.setFilterValue('department', 'Engineering');

      const shadow = table.shadowRoot!;
      const rows = shadow.querySelectorAll('.hft-tbody .hft-tr');
      expect(rows.length).toBe(3);

      const activeBadge = shadow.querySelector('.hft-filter-count-badge') as HTMLElement;
      expect(activeBadge.style.display).not.toBe('none');
      expect(activeBadge.textContent).toContain('1 filter active');
    });

    it('clears specific column filter and restores rows', () => {
      table.setFilterValue('name', 'Diana');
      expect(table.activeFilters['name']).toBe('Diana');

      table.clearFilter('name');
      expect(table.activeFilters['name']).toBeUndefined();

      const shadow = table.shadowRoot!;
      const rows = shadow.querySelectorAll('.hft-tbody .hft-tr');
      expect(rows.length).toBe(5);
    });

    it('clears all active filters when clearAllFilters is called', () => {
      table.setFilterValue('department', 'Engineering');
      table.setFilterValue('name', 'Alice');
      expect(Object.keys(table.activeFilters).length).toBe(2);

      table.clearAllFilters();
      expect(Object.keys(table.activeFilters).length).toBe(0);

      const shadow = table.shadowRoot!;
      const rows = shadow.querySelectorAll('.hft-tbody .hft-tr');
      expect(rows.length).toBe(5);
    });

    it('resets to page 1 on filter change', () => {
      table.options = { pagination: { pageSize: 2 } };
      table.setPage(3);
      expect((table as any)._currentPage).toBe(3);

      table.setFilterValue('department', 'Engineering');
      // Should reset to page 1
      expect((table as any)._currentPage).toBe(1);
    });

    it('supports debounced filter value changes', async () => {
      vi.useFakeTimers();
      table.setFilterValue('name', 'David', true); // debounced

      // Immediately before debounce fires
      expect(table.activeFilters['name']).toBeUndefined();

      // Fast-forward timer
      vi.advanceTimersByTime(350);
      expect(table.activeFilters['name']).toBe('David');
      vi.useRealTimers();
    });

    it('supports server-side filtering via dataLoader callback', async () => {
      const mockLoader = vi.fn().mockImplementation(async (req: HeaderFilterDataLoaderRequest<Employee>) => {
        return {
          rows: req.filters.department ? [{ id: 'SRV-1', name: 'Server Dev', department: 'Engineering', role: 'Dev', salary: 99000, startDate: '2022-01-01' }] : sampleData,
          totalRows: req.filters.department ? 1 : 5
        };
      });

      table.options = { dataLoader: mockLoader };
      await new Promise(r => setTimeout(r, 20));

      expect(mockLoader).toHaveBeenCalled();

      // Trigger filter
      table.setFilterValue('department', 'Engineering');
      await new Promise(r => setTimeout(r, 20));

      expect(mockLoader).toHaveBeenCalledTimes(2);
      const lastCall = mockLoader.mock.calls[1][0];
      expect(lastCall.filters.department).toBe('Engineering');

      const shadow = table.shadowRoot!;
      const rows = shadow.querySelectorAll('.hft-tbody .hft-tr');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('Server Dev');
    });
  });
});
