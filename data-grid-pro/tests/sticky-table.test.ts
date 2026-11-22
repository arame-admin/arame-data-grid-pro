import { describe, it, expect, beforeEach } from 'vitest';
import { StickyDataTable } from '../src/sticky-table/sticky-data-table.element.js';

interface Employee {
  id: string;
  name: string;
  department: string;
  email: string;
  location: string;
  salary: number;
}

const mockData: Employee[] = [
  { id: 'e1', name: 'Alice Freeman', department: 'Platform Engineering', email: 'alice@acme.corp', location: 'San Francisco, CA', salary: 175000 },
  { id: 'e2', name: 'Bob Henderson', department: 'Product Design', email: 'bob@acme.corp', location: 'New York, NY', salary: 155000 },
  { id: 'e3', name: 'Clara Oswald', department: 'Infrastructure', email: 'clara@acme.corp', location: 'London, UK', salary: 168000 }
];

describe('StickyDataTable Web Component', () => {
  let table: StickyDataTable<Employee>;

  beforeEach(() => {
    if (!window.customElements.get('sticky-table-test')) {
      window.customElements.define('sticky-table-test', class extends StickyDataTable<Employee> {});
    }
    table = document.createElement('sticky-table-test') as StickyDataTable<Employee>;
    document.body.appendChild(table);

    table.columns = [
      { id: 'name', header: 'Full Name', field: 'name', width: '200px' },
      { id: 'dept', header: 'Department', field: 'department', width: '180px' },
      { id: 'email', header: 'Corporate Email', field: 'email', width: '220px' },
      { id: 'loc', header: 'Office Location', field: 'location', width: '180px' },
      { id: 'sal', header: 'Annual Salary', field: 'salary', width: '140px', sortable: true }
    ];
    table.rows = [...mockData];
  });

  it('assigns sticky class st-col-sticky to the first column when stickyFirstColumn is true', () => {
    table.options = { stickyFirstColumn: true };

    const firstHeader = table.querySelector('thead th:first-child');
    expect(firstHeader?.classList.contains('st-col-sticky')).toBe(true);

    const firstBodyCell = table.querySelector('tbody tr:first-child td:first-child');
    expect(firstBodyCell?.classList.contains('st-col-sticky')).toBe(true);
  });

  it('removes sticky class from first column when stickyFirstColumn is disabled', () => {
    table.options = { stickyFirstColumn: false };

    const firstHeader = table.querySelector('thead th:first-child');
    expect(firstHeader?.classList.contains('st-col-sticky')).toBe(false);

    const firstBodyCell = table.querySelector('tbody tr:first-child td:first-child');
    expect(firstBodyCell?.classList.contains('st-col-sticky')).toBe(false);
  });

  it('applies scrolled shadow class st-is-scrolled when horizontal scroll occurs', () => {
    table.options = { stickyFirstColumn: true };
    const viewport = table.querySelector('.st-scroll-viewport') as HTMLElement;
    expect(viewport).not.toBeNull();

    // Mock scrolling viewport
    Object.defineProperty(viewport, 'scrollLeft', { value: 50, writable: true });
    viewport.dispatchEvent(new Event('scroll'));

    expect(viewport.classList.contains('st-is-scrolled')).toBe(true);
  });

  it('sorts rows correctly without altering sticky column attachment', () => {
    table.options = { stickyFirstColumn: true };

    // Trigger sort on salary
    const salaryHeader = table.querySelector('thead th:nth-child(5)') as HTMLElement;
    salaryHeader.click(); // asc: Bob (155k) -> Clara (168k) -> Alice (175k)

    const firstRowName = table.querySelector('tbody tr:first-child td:first-child')?.textContent;
    expect(firstRowName).toBe('Bob Henderson');

    // Confirm first column remains sticky after re-render
    const stickyHeader = table.querySelector('thead th:first-child');
    expect(stickyHeader?.classList.contains('st-col-sticky')).toBe(true);
  });
});
